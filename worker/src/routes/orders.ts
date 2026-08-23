import { Hono } from 'hono';
import type { Bindings, User, Order, RateCard, AgentProfile, Area } from '../types';
import {
  uuid, now, jsonOk, jsonErr,
  volumetricWeight, billableWeight, calculateCharge,
} from '../utils';
import { requireRole } from '../middleware';

type Env = { Bindings: Bindings; Variables: { user: User } };
const orders = new Hono<Env>();

// ─── Helper: log to immutable order_history ──────────────────
async function logHistory(
  db: D1Database,
  orderId: string,
  status: string,
  actorId: string,
  actorRole: string,
  note?: string
) {
  await db.prepare(
    `INSERT INTO order_history (id, order_id, status, actor_id, actor_role, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(uuid(), orderId, status, actorId, actorRole, note || null, now()).run();
}

// ─── Helper: auto-assign agent by zone ───────────────────────
async function autoAssignAgent(
  db: D1Database,
  zoneId: string
): Promise<AgentProfile & { name: string; email: string } | null> {
  // Pick the agent in the same zone with fewest active orders who is available
  const agent = await db.prepare(
    `SELECT ap.*, u.name, u.email
     FROM agent_profiles ap
     JOIN users u ON u.id = ap.user_id
     WHERE ap.zone_id = ?
       AND ap.is_available = 1
       AND ap.active_orders < ap.max_orders
       AND u.is_active = 1
     ORDER BY ap.active_orders ASC
     LIMIT 1`
  ).bind(zoneId).first<AgentProfile & { name: string; email: string }>();
  return agent || null;
}

// ═══════════════════════════════════════════════════════════════
// CREATE ORDER (customer or admin)
// ═══════════════════════════════════════════════════════════════
orders.post('/', requireRole('customer', 'admin'), async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    pickup_address: string;
    delivery_address: string;
    pickup_pincode: string;
    delivery_pincode: string;
    order_type?: 'b2b' | 'b2c';
    payment_mode?: 'prepaid' | 'cod';
    length_cm?: number;
    breadth_cm?: number;
    height_cm?: number;
    actual_weight_kg?: number;
    customer_id?: string; // admin can create on behalf
  }>();

  if (!body.pickup_address || !body.delivery_address || !body.pickup_pincode || !body.delivery_pincode) {
    return jsonErr('pickup_address, delivery_address, pickup_pincode, delivery_pincode are required');
  }

  const customerId = user.role === 'admin' && body.customer_id ? body.customer_id : user.id;
  const orderType = body.order_type || 'b2c';
  const paymentMode = body.payment_mode || 'prepaid';
  const actualKg = body.actual_weight_kg || 0.5;
  const db = c.env.DB;

  // 1. Resolve delivery pincode → zone
  const area = await db.prepare(
    'SELECT * FROM areas WHERE pincode = ?'
  ).bind(body.delivery_pincode).first<Area>();

  if (!area) {
    return jsonErr(`Delivery pincode ${body.delivery_pincode} is not mapped to any zone. Ask admin to add it.`, 422);
  }
  const zoneId = area.zone_id;

  // 2. Fetch rate card
  const rateCard = await db.prepare(
    'SELECT * FROM rate_cards WHERE zone_id = ? AND type = ? AND is_active = 1'
  ).bind(zoneId, orderType).first<RateCard>();

  if (!rateCard) {
    return jsonErr(`No active rate card for zone ${zoneId} / type ${orderType}`, 422);
  }

  // 3. Compute pricing
  const l = body.length_cm || 0;
  const b = body.breadth_cm || 0;
  const h = body.height_cm || 0;
  const volKg = (l && b && h) ? +volumetricWeight(l, b, h).toFixed(4) : 0;
  const billKg = billableWeight(actualKg, volKg);
  const charges = calculateCharge(
    rateCard.base_rate,
    rateCard.per_kg_rate,
    rateCard.base_weight_kg,
    billKg,
    rateCard.cod_surcharge,
    paymentMode === 'cod'
  );

  // 4. Auto-assign agent
  const agent = await autoAssignAgent(db, zoneId);
  const agentId = agent?.user_id || null;
  const initialStatus = agentId ? 'assigned' : 'pending';

  const orderId = uuid();
  const ts = now();

  // 5. Insert order
  await db.prepare(
    `INSERT INTO orders
     (id, customer_id, pickup_address, delivery_address, pickup_pincode, delivery_pincode,
      zone_id, order_type, payment_mode, length_cm, breadth_cm, height_cm,
      actual_weight_kg, volumetric_weight_kg, billable_weight_kg,
      base_charge, weight_charge, cod_charge, total_charge,
      status, agent_id, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(
    orderId, customerId, body.pickup_address, body.delivery_address,
    body.pickup_pincode, body.delivery_pincode,
    zoneId, orderType, paymentMode,
    l || null, b || null, h || null,
    actualKg, volKg || null, billKg,
    charges.base_charge, charges.weight_charge, charges.cod_charge, charges.total_charge,
    initialStatus, agentId, ts, ts
  ).run();

  // 6. Log history
  await logHistory(db, orderId, initialStatus, 'system', 'system', 'Order created');

  // 7. If agent assigned, bump their active_orders
  if (agentId) {
    await db.prepare(
      'UPDATE agent_profiles SET active_orders = active_orders + 1, updated_at = ? WHERE user_id = ?'
    ).bind(ts, agentId).run();
    await logHistory(db, orderId, 'assigned', 'system', 'system', `Auto-assigned to agent ${agent!.name}`);
  }

  return jsonOk({
    id: orderId,
    status: initialStatus,
    agent_id: agentId,
    pricing: { ...charges, billable_weight_kg: billKg, volumetric_weight_kg: volKg },
  }, 201);
});

// ═══════════════════════════════════════════════════════════════
// LIST ORDERS (role-scoped)
// ═══════════════════════════════════════════════════════════════
orders.get('/', async (c) => {
  const user = c.get('user');
  const status = c.req.query('status');
  const db = c.env.DB;
  let query = 'SELECT * FROM orders';
  const conditions: string[] = [];
  const binds: (string)[] = [];

  // scope by role
  if (user.role === 'customer') {
    conditions.push('customer_id = ?');
    binds.push(user.id);
  } else if (user.role === 'agent') {
    conditions.push('agent_id = ?');
    binds.push(user.id);
  }
  // admin sees all

  if (status) {
    conditions.push('status = ?');
    binds.push(status);
  }

  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY created_at DESC';

  const stmt = binds.length ? db.prepare(query).bind(...binds) : db.prepare(query);
  const { results } = await stmt.all<Order>();
  return jsonOk(results);
});

// ═══════════════════════════════════════════════════════════════
// GET SINGLE ORDER
// ═══════════════════════════════════════════════════════════════
orders.get('/:id', async (c) => {
  const user = c.get('user');
  const orderId = c.req.param('id');
  const order = await c.env.DB.prepare('SELECT * FROM orders WHERE id = ?')
    .bind(orderId).first<Order>();

  if (!order) return jsonErr('Order not found', 404);

  // RBAC: customers can only see their own, agents their assigned
  if (user.role === 'customer' && order.customer_id !== user.id) {
    return jsonErr('Forbidden', 403);
  }
  if (user.role === 'agent' && order.agent_id !== user.id) {
    return jsonErr('Forbidden', 403);
  }

  return jsonOk(order);
});

// ═══════════════════════════════════════════════════════════════
// ORDER HISTORY (immutable timeline)
// ═══════════════════════════════════════════════════════════════
orders.get('/:id/history', async (c) => {
  const orderId = c.req.param('id');
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM order_history WHERE order_id = ? ORDER BY created_at ASC'
  ).bind(orderId).all();
  return jsonOk(results);
});

// ═══════════════════════════════════════════════════════════════
// ADMIN: manual assign / reassign agent
// ═══════════════════════════════════════════════════════════════
orders.patch('/:id/assign', requireRole('admin'), async (c) => {
  const orderId = c.req.param('id');
  const { agent_id } = await c.req.json<{ agent_id: string }>();
  if (!agent_id) return jsonErr('agent_id is required');

  const db = c.env.DB;
  const order = await db.prepare('SELECT * FROM orders WHERE id = ?')
    .bind(orderId).first<Order>();
  if (!order) return jsonErr('Order not found', 404);

  const ts = now();

  // Decrement old agent if reassigning
  if (order.agent_id) {
    await db.prepare(
      'UPDATE agent_profiles SET active_orders = MAX(0, active_orders - 1), updated_at = ? WHERE user_id = ?'
    ).bind(ts, order.agent_id).run();
  }

  // Assign new agent
  await db.prepare(
    'UPDATE orders SET agent_id = ?, status = ?, updated_at = ? WHERE id = ?'
  ).bind(agent_id, 'assigned', ts, orderId).run();

  await db.prepare(
    'UPDATE agent_profiles SET active_orders = active_orders + 1, updated_at = ? WHERE user_id = ?'
  ).bind(ts, agent_id).run();

  const admin = c.get('user');
  await logHistory(db, orderId, 'assigned', admin.id, 'admin', `Manually assigned to agent ${agent_id}`);

  return jsonOk({ order_id: orderId, agent_id, status: 'assigned' });
});

// ═══════════════════════════════════════════════════════════════
// ADMIN: cancel order
// ═══════════════════════════════════════════════════════════════
orders.patch('/:id/cancel', requireRole('admin'), async (c) => {
  const orderId = c.req.param('id');
  const db = c.env.DB;
  const order = await db.prepare('SELECT * FROM orders WHERE id = ?')
    .bind(orderId).first<Order>();
  if (!order) return jsonErr('Order not found', 404);
  if (order.status === 'delivered') return jsonErr('Cannot cancel a delivered order', 400);

  const ts = now();
  await db.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?')
    .bind('cancelled', ts, orderId).run();

  if (order.agent_id) {
    await db.prepare(
      'UPDATE agent_profiles SET active_orders = MAX(0, active_orders - 1), updated_at = ? WHERE user_id = ?'
    ).bind(ts, order.agent_id).run();
  }

  const admin = c.get('user');
  await logHistory(db, orderId, 'cancelled', admin.id, 'admin', 'Order cancelled by admin');
  return jsonOk({ order_id: orderId, status: 'cancelled' });
});

// ═══════════════════════════════════════════════════════════════
// RATE CALCULATOR (preview — no order created)
// ═══════════════════════════════════════════════════════════════
orders.post('/calculate-rate', async (c) => {
  const body = await c.req.json<{
    delivery_pincode: string;
    order_type?: 'b2b' | 'b2c';
    payment_mode?: 'prepaid' | 'cod';
    length_cm?: number;
    breadth_cm?: number;
    height_cm?: number;
    actual_weight_kg?: number;
  }>();

  if (!body.delivery_pincode) return jsonErr('delivery_pincode is required');

  const db = c.env.DB;
  const orderType = body.order_type || 'b2c';
  const paymentMode = body.payment_mode || 'prepaid';
  const actualKg = body.actual_weight_kg || 0.5;

  const area = await db.prepare('SELECT * FROM areas WHERE pincode = ?')
    .bind(body.delivery_pincode).first<Area>();
  if (!area) return jsonErr('Pincode not mapped to any zone', 422);

  const rateCard = await db.prepare(
    'SELECT * FROM rate_cards WHERE zone_id = ? AND type = ? AND is_active = 1'
  ).bind(area.zone_id, orderType).first<RateCard>();
  if (!rateCard) return jsonErr('No active rate card found', 422);

  const l = body.length_cm || 0;
  const b = body.breadth_cm || 0;
  const h = body.height_cm || 0;
  const volKg = (l && b && h) ? +volumetricWeight(l, b, h).toFixed(4) : 0;
  const billKg = billableWeight(actualKg, volKg);
  const charges = calculateCharge(
    rateCard.base_rate, rateCard.per_kg_rate, rateCard.base_weight_kg,
    billKg, rateCard.cod_surcharge, paymentMode === 'cod'
  );

  return jsonOk({
    zone_id: area.zone_id,
    rate_card_id: rateCard.id,
    actual_weight_kg: actualKg,
    volumetric_weight_kg: volKg,
    billable_weight_kg: billKg,
    ...charges,
  });
});

export default orders;
