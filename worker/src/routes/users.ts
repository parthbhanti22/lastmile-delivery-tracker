import { Hono } from 'hono';
import type { Bindings, User } from '../types';
import { uuid, now, jsonOk, jsonErr } from '../utils';
import { authMiddleware, requireRole } from '../middleware';

type Env = { Bindings: Bindings; Variables: { user: User } };
const users = new Hono<Env>();

// ── Register (public) ─────────────────────────────────────────
users.post('/register', async (c) => {
  const body = await c.req.json<{
    name: string;
    email: string;
    password: string;
    role?: string;
    phone?: string;
  }>();

  if (!body.name || !body.email || !body.password) {
    return jsonErr('name, email, and password are required');
  }

  // For register, check if an admin header is provided (optional)
  let callerRole: string | null = null;
  const callerId = c.req.header('X-User-Id');
  if (callerId) {
    const caller = await c.env.DB.prepare('SELECT role FROM users WHERE id = ? AND is_active = 1')
      .bind(callerId).first<{ role: string }>();
    callerRole = caller?.role || null;
  }

  // Only admins can register agents or other admins; default role is customer
  let role = body.role || 'customer';
  if ((role === 'admin' || role === 'agent') && callerRole !== 'admin') {
    role = 'customer'; // silently downgrade
  }

  const id = uuid();
  // Simple hash placeholder (use bcrypt in production — Workers support it via wasm)
  const password_hash = btoa(body.password);
  const ts = now();

  try {
    await c.env.DB.prepare(
      `INSERT INTO users (id, name, email, password_hash, role, phone, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(id, body.name, body.email, password_hash, role, body.phone || null, ts, ts)
      .run();
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) {
      return jsonErr('Email already registered', 409);
    }
    throw e;
  }

  // If agent was registered, also create agent_profiles stub
  if (role === 'agent') {
    await c.env.DB.prepare(
      `INSERT INTO agent_profiles (user_id, zone_id, updated_at)
       VALUES (?, NULL, ?)`
    ).bind(id, ts).run();
  }

  return jsonOk({ id, name: body.name, email: body.email, role }, 201);
});

// ── Login (public) ────────────────────────────────────────────
users.post('/login', async (c) => {
  const { email, password } = await c.req.json<{ email: string; password: string }>();
  if (!email || !password) return jsonErr('email and password required');

  const user = await c.env.DB.prepare(
    'SELECT * FROM users WHERE email = ? AND is_active = 1'
  ).bind(email).first<User>();

  if (!user || user.password_hash !== btoa(password)) {
    return jsonErr('Invalid credentials', 401);
  }

  // In production, return a JWT here
  return jsonOk({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    message: 'Use the id value as X-User-Id header for authenticated requests',
  });
});

// ── Protected routes below ───────────────────────────────────
// List users (admin only)
users.get('/', authMiddleware(), requireRole('admin'), async (c) => {
  const role = c.req.query('role');
  let query = 'SELECT id, name, email, role, phone, is_active, created_at FROM users';
  const binds: string[] = [];
  if (role) {
    query += ' WHERE role = ?';
    binds.push(role);
  }
  query += ' ORDER BY created_at DESC';

  const stmt = binds.length
    ? c.env.DB.prepare(query).bind(...binds)
    : c.env.DB.prepare(query);

  const { results } = await stmt.all();
  return jsonOk(results);
});

// Get user profile
users.get('/me', authMiddleware(), async (c) => {
  const user = c.get('user');
  return jsonOk({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
  });
});

// Admin: toggle active status
users.patch('/:id/toggle', authMiddleware(), requireRole('admin'), async (c) => {
  const targetId = c.req.param('id');
  const target = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(targetId)
    .first<User>();
  if (!target) return jsonErr('User not found', 404);

  const newStatus = target.is_active ? 0 : 1;
  await c.env.DB.prepare('UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?')
    .bind(newStatus, now(), targetId)
    .run();

  return jsonOk({ id: targetId, is_active: newStatus });
});

export default users;
