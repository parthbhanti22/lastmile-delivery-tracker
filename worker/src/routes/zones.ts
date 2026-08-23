import { Hono } from 'hono';
import type { Bindings, User, Zone, Area, RateCard } from '../types';
import { uuid, now, jsonOk, jsonErr } from '../utils';
import { requireRole } from '../middleware';

type Env = { Bindings: Bindings; Variables: { user: User } };
const zones = new Hono<Env>();

// ════════════════════════════════════════════════════════════════
// ZONES
// ════════════════════════════════════════════════════════════════

zones.get('/', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM zones ORDER BY name').all<Zone>();
  return jsonOk(results);
});

zones.post('/', requireRole('admin'), async (c) => {
  const { name, description } = await c.req.json<{ name: string; description?: string }>();
  if (!name) return jsonErr('name is required');
  const id = uuid();
  await c.env.DB.prepare(
    'INSERT INTO zones (id, name, description, created_at) VALUES (?, ?, ?, ?)'
  ).bind(id, name, description || null, now()).run();
  return jsonOk({ id, name }, 201);
});

zones.put('/:id', requireRole('admin'), async (c) => {
  const id = c.req.param('id');
  const { name, description } = await c.req.json<{ name?: string; description?: string }>();
  const existing = await c.env.DB.prepare('SELECT id FROM zones WHERE id = ?').bind(id).first();
  if (!existing) return jsonErr('Zone not found', 404);

  await c.env.DB.prepare(
    'UPDATE zones SET name = COALESCE(?, name), description = COALESCE(?, description) WHERE id = ?'
  ).bind(name || null, description || null, id).run();
  return jsonOk({ id, updated: true });
});

zones.delete('/:id', requireRole('admin'), async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM zones WHERE id = ?').bind(id).run();
  return jsonOk({ deleted: true });
});

// ════════════════════════════════════════════════════════════════
// AREAS (pincode → zone mapping)
// ════════════════════════════════════════════════════════════════

zones.get('/:zoneId/areas', async (c) => {
  const zoneId = c.req.param('zoneId');
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM areas WHERE zone_id = ? ORDER BY pincode'
  ).bind(zoneId).all<Area>();
  return jsonOk(results);
});

zones.post('/:zoneId/areas', requireRole('admin'), async (c) => {
  const zoneId = c.req.param('zoneId');
  const { name, pincode } = await c.req.json<{ name: string; pincode: string }>();
  if (!name || !pincode) return jsonErr('name and pincode are required');

  const id = uuid();
  try {
    await c.env.DB.prepare(
      'INSERT INTO areas (id, zone_id, name, pincode, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, zoneId, name, pincode, now()).run();
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) return jsonErr('Pincode already mapped to this zone', 409);
    throw e;
  }
  return jsonOk({ id, zone_id: zoneId, pincode }, 201);
});

zones.delete('/areas/:areaId', requireRole('admin'), async (c) => {
  const areaId = c.req.param('areaId');
  await c.env.DB.prepare('DELETE FROM areas WHERE id = ?').bind(areaId).run();
  return jsonOk({ deleted: true });
});

// ════════════════════════════════════════════════════════════════
// RATE CARDS
// ════════════════════════════════════════════════════════════════

zones.get('/:zoneId/rates', async (c) => {
  const zoneId = c.req.param('zoneId');
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM rate_cards WHERE zone_id = ? ORDER BY type'
  ).bind(zoneId).all<RateCard>();
  return jsonOk(results);
});

zones.post('/:zoneId/rates', requireRole('admin'), async (c) => {
  const zoneId = c.req.param('zoneId');
  const body = await c.req.json<{
    type: 'b2b' | 'b2c';
    base_rate: number;
    per_kg_rate: number;
    base_weight_kg?: number;
    cod_surcharge?: number;
  }>();

  if (!body.type || body.base_rate == null || body.per_kg_rate == null) {
    return jsonErr('type, base_rate, and per_kg_rate are required');
  }

  const id = uuid();
  const ts = now();
  try {
    await c.env.DB.prepare(
      `INSERT INTO rate_cards (id, zone_id, type, base_rate, per_kg_rate, base_weight_kg, cod_surcharge, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id, zoneId, body.type, body.base_rate, body.per_kg_rate,
      body.base_weight_kg ?? 0.5, body.cod_surcharge ?? 0, ts, ts
    ).run();
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) {
      return jsonErr(`Rate card for type '${body.type}' already exists in this zone`, 409);
    }
    throw e;
  }
  return jsonOk({ id, zone_id: zoneId, type: body.type }, 201);
});

zones.put('/:zoneId/rates/:rateId', requireRole('admin'), async (c) => {
  const rateId = c.req.param('rateId');
  const body = await c.req.json<{
    base_rate?: number;
    per_kg_rate?: number;
    base_weight_kg?: number;
    cod_surcharge?: number;
    is_active?: number;
  }>();

  const existing = await c.env.DB.prepare('SELECT id FROM rate_cards WHERE id = ?')
    .bind(rateId).first();
  if (!existing) return jsonErr('Rate card not found', 404);

  await c.env.DB.prepare(
    `UPDATE rate_cards SET
       base_rate = COALESCE(?, base_rate),
       per_kg_rate = COALESCE(?, per_kg_rate),
       base_weight_kg = COALESCE(?, base_weight_kg),
       cod_surcharge = COALESCE(?, cod_surcharge),
       is_active = COALESCE(?, is_active),
       updated_at = ?
     WHERE id = ?`
  ).bind(
    body.base_rate ?? null, body.per_kg_rate ?? null,
    body.base_weight_kg ?? null, body.cod_surcharge ?? null,
    body.is_active ?? null, now(), rateId
  ).run();

  return jsonOk({ id: rateId, updated: true });
});

// ── Lookup: resolve pincode → zone ───────────────────────────
zones.get('/lookup/pincode/:pincode', async (c) => {
  const pincode = c.req.param('pincode');
  const area = await c.env.DB.prepare(
    `SELECT areas.*, zones.name AS zone_name
     FROM areas
     JOIN zones ON zones.id = areas.zone_id
     WHERE areas.pincode = ?`
  ).bind(pincode).first();

  if (!area) return jsonErr('Pincode not mapped to any zone', 404);
  return jsonOk(area);
});

export default zones;
