-- ============================================================
-- Last-Mile Delivery Tracker — Cloudflare D1 Schema
-- ============================================================

-- 1. Users & RBAC
-- Roles: admin | agent | customer
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,        -- UUID
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin', 'agent', 'customer')),
  phone         TEXT,
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. Zones (broad regions)
CREATE TABLE IF NOT EXISTS zones (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 3. Areas (sub-regions within a zone, used for pincode → zone mapping)
CREATE TABLE IF NOT EXISTS areas (
  id        TEXT PRIMARY KEY,
  zone_id   TEXT NOT NULL REFERENCES zones(id),
  name      TEXT NOT NULL,
  pincode   TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(zone_id, pincode)
);
CREATE INDEX IF NOT EXISTS idx_areas_pincode ON areas(pincode);
CREATE INDEX IF NOT EXISTS idx_areas_zone ON areas(zone_id);

-- 4. Rate Cards (Admin-configurable, per-zone pricing)
-- type: b2b | b2c
CREATE TABLE IF NOT EXISTS rate_cards (
  id              TEXT PRIMARY KEY,
  zone_id         TEXT NOT NULL REFERENCES zones(id),
  type            TEXT NOT NULL CHECK (type IN ('b2b', 'b2c')),
  base_rate       REAL NOT NULL,           -- flat charge
  per_kg_rate     REAL NOT NULL,           -- per-kg above base weight
  base_weight_kg  REAL NOT NULL DEFAULT 0.5,
  cod_surcharge   REAL NOT NULL DEFAULT 0, -- extra for cash-on-delivery
  is_active       INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(zone_id, type)
);

-- 5. Orders
-- status: pending | assigned | picked_up | in_transit | delivered | failed | rescheduled | cancelled
-- payment_mode: prepaid | cod
CREATE TABLE IF NOT EXISTS orders (
  id                TEXT PRIMARY KEY,
  customer_id       TEXT NOT NULL REFERENCES users(id),
  pickup_address    TEXT NOT NULL,
  delivery_address  TEXT NOT NULL,
  pickup_pincode    TEXT NOT NULL,
  delivery_pincode  TEXT NOT NULL,
  zone_id           TEXT REFERENCES zones(id),
  order_type        TEXT NOT NULL CHECK (order_type IN ('b2b', 'b2c')) DEFAULT 'b2c',
  payment_mode      TEXT NOT NULL CHECK (payment_mode IN ('prepaid', 'cod')) DEFAULT 'prepaid',

  -- Package dimensions (cm) & weight (kg)
  length_cm         REAL,
  breadth_cm        REAL,
  height_cm         REAL,
  actual_weight_kg  REAL NOT NULL DEFAULT 0.5,
  volumetric_weight_kg REAL,               -- computed: (L*B*H)/5000
  billable_weight_kg   REAL,               -- MAX(actual, volumetric)

  -- Pricing (computed at order creation)
  base_charge       REAL,
  weight_charge     REAL,
  cod_charge        REAL DEFAULT 0,
  total_charge      REAL,

  status            TEXT NOT NULL DEFAULT 'pending',
  agent_id          TEXT REFERENCES users(id),
  estimated_delivery TEXT,
  delivered_at      TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_agent ON orders(agent_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_zone ON orders(zone_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_pincode ON orders(delivery_pincode);

-- 6. Order History (Immutable audit log)
CREATE TABLE IF NOT EXISTS order_history (
  id          TEXT PRIMARY KEY,
  order_id    TEXT NOT NULL REFERENCES orders(id),
  status      TEXT NOT NULL,
  actor_id    TEXT NOT NULL,
  actor_role  TEXT NOT NULL CHECK (actor_role IN ('admin', 'agent', 'customer', 'system')),
  note        TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_history_order ON order_history(order_id);

-- 7. Agent Profiles (extends users with delivery-specific data)
CREATE TABLE IF NOT EXISTS agent_profiles (
  user_id       TEXT PRIMARY KEY REFERENCES users(id),
  zone_id       TEXT REFERENCES zones(id),
  is_available  INTEGER NOT NULL DEFAULT 1,
  current_lat   REAL,
  current_lng   REAL,
  max_orders    INTEGER NOT NULL DEFAULT 10,
  active_orders INTEGER NOT NULL DEFAULT 0,
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_agent_zone ON agent_profiles(zone_id);
CREATE INDEX IF NOT EXISTS idx_agent_available ON agent_profiles(is_available);

-- 8. Failed Delivery Attempts
CREATE TABLE IF NOT EXISTS failed_attempts (
  id              TEXT PRIMARY KEY,
  order_id        TEXT NOT NULL REFERENCES orders(id),
  agent_id        TEXT NOT NULL REFERENCES users(id),
  reason          TEXT NOT NULL,
  attempt_number  INTEGER NOT NULL DEFAULT 1,
  reschedule_date TEXT,
  sms_sent        INTEGER NOT NULL DEFAULT 0,
  email_sent      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_failed_order ON failed_attempts(order_id);

-- 9. Notifications Log (mock SMS/Email)
CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  order_id    TEXT REFERENCES orders(id),
  channel     TEXT NOT NULL CHECK (channel IN ('sms', 'email')),
  message     TEXT NOT NULL,
  sent_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
