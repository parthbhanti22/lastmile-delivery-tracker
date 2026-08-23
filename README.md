# Last-Mile Delivery Tracker

A full-stack last-mile delivery management platform built with **Hono.js** (Cloudflare Workers), **Next.js 16**, and **Cloudflare D1** (SQLite).

### 🚀 Live Demo
- **Frontend App:** [https://lastmile-weld.vercel.app](https://lastmile-weld.vercel.app)
- **API Base URL:** [https://lastmile-delivery-api.peterparker67.workers.dev](https://lastmile-delivery-api.peterparker67.workers.dev)

## Architecture

```
┌──────────────────┐       ┌──────────────────────┐
│   Next.js 16     │ ←───→ │  Hono.js API         │
│   Frontend       │ HTTP  │  Cloudflare Workers   │
│   (Port 3000)    │       │  (Port 8787)          │
└──────────────────┘       └────────┬─────────────┘
                                    │
                              ┌─────▼─────┐
                              │ Cloudflare │
                              │ D1 (SQLite)│
                              └────────────┘
```

## Features

- **RBAC** — Three roles: Admin, Delivery Agent, Customer
- **Rate Engine** — Zone-based pricing with B2B/B2C cards, volumetric weight (`L×B×H / 5000`), COD surcharges
- **Auto-Assignment** — Automatically assigns the nearest available agent in the delivery zone
- **Immutable Order History** — Append-only audit log of every status change
- **Failed Delivery Flow** — Failure capture, mock SMS/email, reschedule + auto-reassign
- **Three Portals** — Admin dashboard, Agent updater, Customer tracker

## Quick Start

### Prerequisites

- Node.js ≥ 18
- npm
- Wrangler CLI (`npm i -g wrangler` or use `npx`)

### 1. Clone & Install

```bash
git clone <repo-url>
cd lastmile-delivery-tracker

# Install API dependencies
cd worker
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Set Up the Database

```bash
cd worker

# Create D1 database (if not already created)
npx wrangler d1 create lastmile_db

# Apply schema
npx wrangler d1 execute lastmile_db --local --file=schema.sql

# Seed with test data
npx wrangler d1 execute lastmile_db --local --file=seed.sql
```

### 3. Start the API

```bash
cd worker
npm run dev
# → http://localhost:8787
```

### 4. Start the Frontend

```bash
cd frontend
npm run dev
# → http://localhost:3000
```

### 5. Login

Open `http://localhost:3000` and use the quick-login buttons, or:

| Role     | Email                | Password  |
|----------|----------------------|-----------|
| Admin    | admin@lastmile.dev   | admin123  |
| Agent    | ravi@lastmile.dev    | agent123  |
| Customer | parth@example.com    | cust123   |

## Environment Variables

### `.env.example`

```bash
# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:8787

# Worker (wrangler.toml)
# D1 database binding is configured in wrangler.toml
# database_name = "lastmile_db"
# database_id = "<your-d1-id>"
```

## API Documentation

All endpoints return `{ ok: boolean, data?: T, error?: string }`.

Auth: Pass `X-User-Id: <user-uuid>` header on protected routes.

### Public

| Method | Endpoint                | Description        |
|--------|-------------------------|--------------------|
| GET    | `/`                     | Health check       |
| POST   | `/api/users/register`   | Register user      |
| POST   | `/api/users/login`      | Login (returns id) |

### Users (Admin)

| Method | Endpoint                  | Description                |
|--------|---------------------------|----------------------------|
| GET    | `/api/users`              | List users (?role=)        |
| GET    | `/api/users/me`           | Own profile                |
| PATCH  | `/api/users/:id/toggle`   | Toggle active/inactive     |

### Zones & Areas & Rate Cards

| Method | Endpoint                              | Description              |
|--------|---------------------------------------|--------------------------|
| GET    | `/api/zones`                          | List zones               |
| POST   | `/api/zones`                          | Create zone              |
| PUT    | `/api/zones/:id`                      | Update zone              |
| DELETE | `/api/zones/:id`                      | Delete zone              |
| GET    | `/api/zones/:zoneId/areas`            | List areas               |
| POST   | `/api/zones/:zoneId/areas`            | Add area (pincode map)   |
| DELETE | `/api/zones/areas/:areaId`            | Remove area              |
| GET    | `/api/zones/:zoneId/rates`            | List rate cards          |
| POST   | `/api/zones/:zoneId/rates`            | Create rate card         |
| PUT    | `/api/zones/:zoneId/rates/:rateId`    | Update rate card         |
| GET    | `/api/zones/lookup/pincode/:pincode`  | Resolve pincode → zone   |

### Orders

| Method | Endpoint                         | Description                        |
|--------|----------------------------------|------------------------------------|
| POST   | `/api/orders`                    | Create order (auto-price + assign) |
| GET    | `/api/orders`                    | List orders (?status=)             |
| GET    | `/api/orders/:id`                | Get order detail                   |
| GET    | `/api/orders/:id/history`        | Immutable timeline                 |
| PATCH  | `/api/orders/:id/assign`         | Admin: assign agent                |
| PATCH  | `/api/orders/:id/cancel`         | Admin: cancel order                |
| POST   | `/api/orders/calculate-rate`     | Rate preview (no order created)    |

### Agents

| Method | Endpoint                                 | Description              |
|--------|------------------------------------------|--------------------------|
| POST   | `/api/agents/profile`                    | Create/update profile    |
| GET    | `/api/agents/profile`                    | Get own profile          |
| PATCH  | `/api/agents/availability`               | Toggle online/offline    |
| PATCH  | `/api/agents/location`                   | Update GPS coords        |
| GET    | `/api/agents`                            | Admin: list all agents   |
| PATCH  | `/api/agents/orders/:orderId/status`     | Update delivery status   |
| POST   | `/api/agents/orders/:orderId/fail`       | Report failed delivery   |
| GET    | `/api/agents/orders/:orderId/failures`   | List failed attempts     |

## Database Schema

9 tables — see `worker/schema.sql` for complete DDL:

1. `users` — RBAC (admin, agent, customer)
2. `zones` — Delivery zones
3. `areas` — Pincode → zone mapping
4. `rate_cards` — Per-zone B2B/B2C pricing
5. `orders` — Orders with computed pricing
6. `order_history` — Immutable audit log
7. `agent_profiles` — Agent availability, zone, capacity
8. `failed_attempts` — Failed delivery records
9. `notifications` — Mock SMS/email log

## Tech Stack

| Layer    | Technology              |
|----------|-------------------------|
| API      | Hono.js 4.x             |
| Runtime  | Cloudflare Workers       |
| Database | Cloudflare D1 (SQLite)   |
| Frontend | Next.js 16, React 19    |
| Styling  | Tailwind CSS v4          |
| Language | TypeScript               |

## License

MIT
