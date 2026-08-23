import { Context, Next } from 'hono';
import type { Bindings, Role, User } from './types';

/**
 * Lightweight auth middleware.
 * Expects header: `X-User-Id: <uuid>`
 * Looks up the user in DB and injects into context variable `user`.
 *
 * In a production system this would be JWT-based; this approach keeps
 * the demo simple while still exercising real RBAC checks.
 */
export function authMiddleware() {
  return async (c: Context<{ Bindings: Bindings; Variables: { user: User } }>, next: Next) => {
    const userId = c.req.header('X-User-Id');
    if (!userId) {
      return c.json({ ok: false, error: 'Missing X-User-Id header' }, 401);
    }

    const db = c.env.DB;
    const user = await db
      .prepare('SELECT * FROM users WHERE id = ? AND is_active = 1')
      .bind(userId)
      .first<User>();

    if (!user) {
      return c.json({ ok: false, error: 'User not found or inactive' }, 401);
    }

    c.set('user', user);
    await next();
  };
}

/**
 * Role guard — use after authMiddleware.
 * Example: `app.use('/admin/*', requireRole('admin'))`
 */
export function requireRole(...roles: Role[]) {
  return async (c: Context<{ Bindings: Bindings; Variables: { user: User } }>, next: Next) => {
    const user = c.get('user');
    if (!user || !roles.includes(user.role)) {
      return c.json({ ok: false, error: `Requires role: ${roles.join(' | ')}` }, 403);
    }
    await next();
  };
}
