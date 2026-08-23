import { Hono } from 'hono';
import type { Bindings, User, Order, AgentProfile } from '../types';
import { uuid, now, jsonOk, jsonErr } from '../utils';
import { requireRole } from '../middleware';

type Env = { Bindings: Bindings; Variables: { user: User } };
const agents = new Hono<Env>();

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

// ─── Helper: mock notification ───────────────────────────────
async function sendNotification(
  db: D1Database,
  userId: string,
  orderId: string,
  channel: 'sms' | 'email',
  message: string
) {
  await db.prepare(
    `INSERT INTO notifications (id, user_id, order_id, channel, message, sent_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(uuid(), userId, orderId, channel, message, now()).run();
  // In production: call Twilio / SendGrid here
  console.log(`[MOCK ${channel.toUpperCase()}] to user ${userId}: ${message}`);
}

// ════════════════════════════════════════════════════════════════
// AGENT PROFILE MANAGEMENT
// ════════════════════════════════════════════════════════════════

// Create / update agent profile (admin or agent themselves)
agents.post('/profile', requireRole('admin', 'agent'), async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    user_id?: string;
    zone_id: string;
    max_orders?: number;
  }>();

  const targetId = (user.role === 'admin' && body.user_id) ? body.user_id : user.id;

  // Verify user is an agent
  const target = await c.env.DB.prepare(
    'SELECT role FROM users WHERE id = ? AND role = ?'
  ).bind(targetId, 'agent').first();
  if (!target) return jsonErr('Target user is not an agent', 400);

  const ts = now();
  // Upsert
  const existing = await c.env.DB.prepare(
    'SELECT user_id FROM agent_profiles WHERE user_id = ?'
  ).bind(targetId).first();

  if (existing) {
    await c.env.DB.prepare(
      `UPDATE agent_profiles
       SET zone_id = ?, max_orders = COALESCE(?, max_orders), updated_at = ?
       WHERE user_id = ?`
    ).bind(body.zone_id, body.max_orders ?? null, ts, targetId).run();
  } else {
    await c.env.DB.prepare(
      `INSERT INTO agent_profiles (user_id, zone_id, max_orders, updated_at)
       VALUES (?, ?, ?, ?)`
    ).bind(targetId, body.zone_id, body.max_orders || 10, ts).run();
  }

  return jsonOk({ user_id: targetId, zone_id: body.zone_id });
});

// Get agent profile
agents.get('/profile', requireRole('agent'), async (c) => {
  const user = c.get('user');
  const profile = await c.env.DB.prepare(
    `SELECT ap.*, u.name, u.email, u.phone
     FROM agent_profiles ap
     JOIN users u ON u.id = ap.user_id
     WHERE ap.user_id = ?`
  ).bind(user.id).first();

  if (!profile) return jsonErr('Agent profile not found. Ask admin to create one.', 404);
  return jsonOk(profile);
});

// Toggle availability
agents.patch('/availability', requireRole('agent'), async (c) => {
  const user = c.get('user');
  const { is_available } = await c.req.json<{ is_available: boolean }>();

  await c.env.DB.prepare(
    'UPDATE agent_profiles SET is_available = ?, updated_at = ? WHERE user_id = ?'
  ).bind(is_available ? 1 : 0, now(), user.id).run();

  return jsonOk({ user_id: user.id, is_available });
});

// Update location
agents.patch('/location', requireRole('agent'), async (c) => {
  const user = c.get('user');
  const { lat, lng } = await c.req.json<{ lat: number; lng: number }>();
  if (lat == null || lng == null) return jsonErr('lat and lng required');

  await c.env.DB.prepare(
    'UPDATE agent_profiles SET current_lat = ?, current_lng = ?, updated_at = ? WHERE user_id = ?'
  ).bind(lat, lng, now(), user.id).run();

  return jsonOk({ updated: true });
});

// List all agents (admin)
agents.get('/', requireRole('admin'), async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT ap.*, u.name, u.email, u.phone, u.is_active
     FROM agent_profiles ap
     JOIN users u ON u.id = ap.user_id
     ORDER BY ap.active_orders ASC`
  ).all();
  return jsonOk(results);
});

// ════════════════════════════════════════════════════════════════
// ORDER STATUS UPDATES (agent workflow)
// ════════════════════════════════════════════════════════════════

const VALID_TRANSITIONS: Record<string, string[]> = {
  assigned: ['picked_up'],
  picked_up: ['in_transit'],
  in_transit: ['delivered', 'failed'],
};

agents.patch('/orders/:orderId/status', requireRole('agent'), async (c) => {
  const user = c.get('user');
  const orderId = c.req.param('orderId');
  const { status, note } = await c.req.json<{ status: string; note?: string }>();

  if (!status) return jsonErr('status is required');

  const db = c.env.DB;
  const order = await db.prepare('SELECT * FROM orders WHERE id = ? AND agent_id = ?')
    .bind(orderId, user.id).first<Order>();

  if (!order) return jsonErr('Order not found or not assigned to you', 404);

  // Validate transition
  const allowed = VALID_TRANSITIONS[order.status];
  if (!allowed || !allowed.includes(status)) {
    return jsonErr(`Cannot transition from '${order.status}' to '${status}'. Allowed: ${(allowed || []).join(', ')}`, 400);
  }

  const ts = now();

  if (status === 'delivered') {
    await db.prepare(
      'UPDATE orders SET status = ?, delivered_at = ?, updated_at = ? WHERE id = ?'
    ).bind('delivered', ts, ts, orderId).run();

    // Decrement active orders
    await db.prepare(
      'UPDATE agent_profiles SET active_orders = MAX(0, active_orders - 1), updated_at = ? WHERE user_id = ?'
    ).bind(ts, user.id).run();

    await logHistory(db, orderId, 'delivered', user.id, 'agent', note || 'Package delivered');

    // Notify customer
    await sendNotification(db, order.customer_id, orderId, 'sms',
      `Your order ${orderId.slice(0, 8)} has been delivered!`);
    await sendNotification(db, order.customer_id, orderId, 'email',
      `Your order ${orderId.slice(0, 8)} has been delivered! Thank you for choosing us.`);

  } else if (status === 'failed') {
    // Handled in the dedicated failed-delivery route below
    return jsonErr('Use POST /agents/orders/:orderId/fail for failed deliveries', 400);
  } else {
    await db.prepare(
      'UPDATE orders SET status = ?, updated_at = ? WHERE id = ?'
    ).bind(status, ts, orderId).run();
    await logHistory(db, orderId, status, user.id, 'agent', note);
  }

  return jsonOk({ order_id: orderId, status });
});

// ════════════════════════════════════════════════════════════════
// FAILED DELIVERY FLOW
// ════════════════════════════════════════════════════════════════
agents.post('/orders/:orderId/fail', requireRole('agent'), async (c) => {
  const user = c.get('user');
  const orderId = c.req.param('orderId');
  const body = await c.req.json<{
    reason: string;
    reschedule_date?: string; // ISO date
  }>();

  if (!body.reason) return jsonErr('reason is required');

  const db = c.env.DB;
  const order = await db.prepare('SELECT * FROM orders WHERE id = ? AND agent_id = ?')
    .bind(orderId, user.id).first<Order>();

  if (!order) return jsonErr('Order not found or not assigned to you', 404);
  if (!['assigned', 'picked_up', 'in_transit'].includes(order.status)) {
    return jsonErr('Order is not in a deliverable state', 400);
  }

  const ts = now();

  // Count existing attempts
  const { results: prevAttempts } = await db.prepare(
    'SELECT id FROM failed_attempts WHERE order_id = ?'
  ).bind(orderId).all();
  const attemptNumber = prevAttempts.length + 1;

  // Record failed attempt
  const failId = uuid();
  await db.prepare(
    `INSERT INTO failed_attempts (id, order_id, agent_id, reason, attempt_number, reschedule_date, sms_sent, email_sent, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?)`
  ).bind(failId, orderId, user.id, body.reason, attemptNumber, body.reschedule_date || null, ts).run();

  // Send mock notifications to customer
  await sendNotification(db, order.customer_id, orderId, 'sms',
    `Delivery attempt #${attemptNumber} for order ${orderId.slice(0, 8)} failed: ${body.reason}. ${body.reschedule_date ? `Rescheduled for ${body.reschedule_date}` : 'We will reschedule soon.'}`);
  await sendNotification(db, order.customer_id, orderId, 'email',
    `Delivery attempt #${attemptNumber} for order ${orderId.slice(0, 8)} failed. Reason: ${body.reason}. ${body.reschedule_date ? `Next attempt: ${body.reschedule_date}` : 'Our team will reschedule your delivery shortly.'}`);

  // Decrement agent's active orders
  await db.prepare(
    'UPDATE agent_profiles SET active_orders = MAX(0, active_orders - 1), updated_at = ? WHERE user_id = ?'
  ).bind(ts, user.id).run();

  // If reschedule_date provided → set status to rescheduled & attempt re-assignment
  let newAgentId: string | null = null;
  let newStatus: string;

  if (body.reschedule_date) {
    newStatus = 'rescheduled';

    // Try to auto-assign a DIFFERENT agent in the same zone
    const newAgent = await db.prepare(
      `SELECT ap.user_id
       FROM agent_profiles ap
       JOIN users u ON u.id = ap.user_id
       WHERE ap.zone_id = ?
         AND ap.is_available = 1
         AND ap.active_orders < ap.max_orders
         AND u.is_active = 1
         AND ap.user_id != ?
       ORDER BY ap.active_orders ASC
       LIMIT 1`
    ).bind(order.zone_id, user.id).first<{ user_id: string }>();

    if (newAgent) {
      newAgentId = newAgent.user_id;
      newStatus = 'assigned';
      await db.prepare(
        'UPDATE agent_profiles SET active_orders = active_orders + 1, updated_at = ? WHERE user_id = ?'
      ).bind(ts, newAgentId).run();
    }
  } else {
    newStatus = 'failed';
  }

  await db.prepare(
    'UPDATE orders SET status = ?, agent_id = COALESCE(?, agent_id), estimated_delivery = COALESCE(?, estimated_delivery), updated_at = ? WHERE id = ?'
  ).bind(newStatus, newAgentId, body.reschedule_date || null, ts, orderId).run();

  await logHistory(db, orderId, 'failed', user.id, 'agent', `Attempt #${attemptNumber}: ${body.reason}`);
  if (newStatus === 'rescheduled') {
    await logHistory(db, orderId, 'rescheduled', 'system', 'system', `Rescheduled for ${body.reschedule_date}`);
  }
  if (newAgentId) {
    await logHistory(db, orderId, 'assigned', 'system', 'system', `Reassigned to agent ${newAgentId}`);
  }

  return jsonOk({
    order_id: orderId,
    status: newStatus,
    attempt_number: attemptNumber,
    new_agent_id: newAgentId,
    reschedule_date: body.reschedule_date || null,
  });
});

// ── List failed attempts for an order ────────────────────────
agents.get('/orders/:orderId/failures', async (c) => {
  const orderId = c.req.param('orderId');
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM failed_attempts WHERE order_id = ? ORDER BY attempt_number ASC'
  ).bind(orderId).all();
  return jsonOk(results);
});

export default agents;
