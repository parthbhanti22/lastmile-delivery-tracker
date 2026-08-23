import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Bindings, User } from './types';
import { authMiddleware } from './middleware';
import usersRouter from './routes/users';
import zonesRouter from './routes/zones';
import ordersRouter from './routes/orders';
import agentsRouter from './routes/agents';

type AppEnv = { Bindings: Bindings; Variables: { user: User } };
const app = new Hono<AppEnv>();

// ── Global middleware ────────────────────────────────────────
app.use('*', cors({
  origin: '*',  // tighten in production
  allowHeaders: ['Content-Type', 'X-User-Id'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));
app.use('*', logger());

// ── Health check (no auth) ───────────────────────────────────
app.get('/', (c) => c.json({
  service: 'Last-Mile Delivery Tracker API',
  version: '1.0.0',
  status: 'healthy',
}));

// ── Public routes (register & login bypass auth) ─────────────
app.route('/api/users', usersRouter);

// ── Protected routes (require X-User-Id header) ──────────────
app.use('/api/zones/*', authMiddleware());
app.use('/api/orders/*', authMiddleware());
app.use('/api/agents/*', authMiddleware());

app.route('/api/zones', zonesRouter);
app.route('/api/orders', ordersRouter);
app.route('/api/agents', agentsRouter);

// ── 404 catch-all ────────────────────────────────────────────
app.notFound((c) => c.json({ ok: false, error: 'Route not found' }, 404));

// ── Global error handler ─────────────────────────────────────
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ ok: false, error: err.message || 'Internal Server Error' }, 500);
});

export default app;
