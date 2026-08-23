# System Design — Last-Mile Delivery Tracker

## 1. Rate Calculation Engine

The rate engine sits at the heart of order pricing and follows a deterministic pipeline invoked at order creation.

**Zone Resolution:** When a customer submits a delivery pincode, the system queries the `areas` table to map that pincode to a `zone_id`. Each zone can contain multiple areas (pincodes), enabling flexible geographic grouping — e.g., "North Delhi" covering pincodes 110034, 110085. If the pincode is unmapped, the order is rejected with a clear error prompting the admin to configure the zone.

**Rate Card Lookup:** Each zone has up to two active rate cards: one for B2B and one for B2C. A rate card defines four parameters: `base_rate` (flat fee), `per_kg_rate` (incremental per-kilogram charge above base weight), `base_weight_kg` (included weight threshold, default 0.5 kg), and `cod_surcharge` (flat fee added for cash-on-delivery orders). Admins can configure these per zone, enabling differentiated pricing for metro vs. suburban vs. rural zones.

**Weight Computation:** The engine computes two weight values:
- **Actual weight**: provided by the customer or warehouse at booking.
- **Volumetric weight**: `(Length × Breadth × Height) / 5000`, where dimensions are in centimeters. This industry-standard formula (DHL, FedEx divisor) ensures bulky but light packages are priced fairly.
- **Billable weight**: `MAX(actual_weight, volumetric_weight)`. The higher of the two is used for pricing, protecting against under-billing on oversized shipments.

**Charge Calculation:**
```
total = base_rate
      + MAX(0, billable_weight - base_weight) × per_kg_rate
      + (cod_surcharge if payment_mode == 'cod' else 0)
```

All computed fields (`volumetric_weight_kg`, `billable_weight_kg`, `base_charge`, `weight_charge`, `cod_charge`, `total_charge`) are stored on the order record for auditability. A standalone `POST /api/orders/calculate-rate` endpoint allows customers to preview pricing without creating an order.

## 2. Zone Detection Approach

Zone detection uses a **pincode-to-zone mapping table** (`areas`). This is a deliberate design choice over GPS-based geofencing for several reasons:

1. **Simplicity & reliability**: Indian delivery logistics overwhelmingly use pincodes for routing. A pincode lookup is an O(1) indexed query vs. complex polygon-point containment tests.
2. **Admin control**: Admins can add, remove, or reassign pincodes to zones through the dashboard without requiring GIS expertise.
3. **Deterministic**: The same pincode always resolves to the same zone, eliminating edge cases from GPS inaccuracy at zone borders.

The `areas` table has a unique constraint on `(zone_id, pincode)` and an index on `pincode` for fast lookups. Each area record also carries a human-readable name (e.g., "Pitampura") for display purposes.

**Trade-off acknowledged**: This approach doesn't support intra-pincode granularity. For hyper-local delivery (e.g., different pricing within a single pincode), the system would need either sub-zone tables or a coordinate-based approach. The current architecture can be extended by adding a `sub_zones` table keyed by lat/lng bounding boxes without changing the core rate engine.

## 3. Auto-Assignment Logic

When an order is created and a zone is resolved, the system attempts automatic agent assignment before the order enters the "pending" pool.

**Algorithm:**
1. Query `agent_profiles` joined with `users` for agents where:
   - `zone_id` matches the order's delivery zone
   - `is_available = 1` (agent is online)
   - `active_orders < max_orders` (agent has capacity)
   - `user.is_active = 1` (account is not deactivated)
2. Sort by `active_orders ASC` (least-loaded first).
3. Pick the first result.

This is a **least-loaded, zone-constrained** strategy. It ensures workload balancing within a zone without requiring real-time GPS proximity calculations. If no agent meets the criteria, the order remains in "pending" status for manual admin assignment.

**Why not GPS-based nearest-agent?** While the `agent_profiles` table stores `current_lat` and `current_lng`, real-time proximity matching requires continuous location updates and Haversine distance calculations. The zone-based approach is more practical for an MVP: agents are pre-assigned to zones, so any available agent in the zone is "near enough." The GPS fields are reserved for future enhancement (e.g., within-zone proximity ranking).

**Reassignment on failure:** When a delivery fails and a reschedule date is provided, the system automatically attempts to reassign to a *different* agent in the same zone (explicitly excluding the failing agent's `user_id`). This prevents the same agent from repeatedly attempting a problematic delivery.

## 4. Failed Delivery Handling

The failed delivery flow is a multi-step process triggered by the delivery agent via `POST /api/agents/orders/:orderId/fail`.

**Step 1 — Capture failure:**
The agent submits a reason (e.g., "Customer not available", "Wrong address") and an optional reschedule date. The system creates a `failed_attempts` record with an auto-incrementing `attempt_number` (counted per order).

**Step 2 — Notifications (mock):**
The system sends mock SMS and email notifications to the customer via the `notifications` table. Each notification is logged with channel, message body, and timestamp. In production, this would integrate with Twilio (SMS) and SendGrid (email) — the notification insertion serves as the trigger point for that integration.

**Step 3 — Agent release:**
The failing agent's `active_orders` counter is decremented, freeing their capacity for new assignments.

**Step 4 — Status transition:**
- If a `reschedule_date` is provided: order status → `rescheduled`, and the system attempts auto-reassignment to a different agent in the same zone. If reassignment succeeds, status → `assigned`.
- If no reschedule date: order status → `failed`, requiring manual admin intervention.

**Step 5 — Audit trail:**
Every state change is recorded in the immutable `order_history` table with the actor's ID, role, and timestamp. The history table is append-only by design — no UPDATE or DELETE operations are ever performed on it. This provides a complete, tamper-evident audit trail for dispute resolution and operational analytics.

**State machine enforcement:** The API enforces valid status transitions via a whitelist map:
- `assigned` → `picked_up`
- `picked_up` → `in_transit`
- `in_transit` → `delivered` or `failed`

Invalid transitions (e.g., jumping from `assigned` to `delivered`) are rejected with a 400 error. This prevents data integrity issues from client bugs or API misuse.
