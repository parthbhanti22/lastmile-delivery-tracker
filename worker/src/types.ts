// Cloudflare Worker bindings
export type Bindings = {
  DB: D1Database;
};

// RBAC roles
export type Role = 'admin' | 'agent' | 'customer';
export type ActorRole = Role | 'system';

// Order status enum
export type OrderStatus =
  | 'pending'
  | 'assigned'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'failed'
  | 'rescheduled'
  | 'cancelled';

export type OrderType = 'b2b' | 'b2c';
export type PaymentMode = 'prepaid' | 'cod';
export type NotificationChannel = 'sms' | 'email';

// DB row shapes
export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  phone: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface Zone {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Area {
  id: string;
  zone_id: string;
  name: string;
  pincode: string;
  created_at: string;
}

export interface RateCard {
  id: string;
  zone_id: string;
  type: OrderType;
  base_rate: number;
  per_kg_rate: number;
  base_weight_kg: number;
  cod_surcharge: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  customer_id: string;
  pickup_address: string;
  delivery_address: string;
  pickup_pincode: string;
  delivery_pincode: string;
  zone_id: string | null;
  order_type: OrderType;
  payment_mode: PaymentMode;
  length_cm: number | null;
  breadth_cm: number | null;
  height_cm: number | null;
  actual_weight_kg: number;
  volumetric_weight_kg: number | null;
  billable_weight_kg: number | null;
  base_charge: number | null;
  weight_charge: number | null;
  cod_charge: number | null;
  total_charge: number | null;
  status: OrderStatus;
  agent_id: string | null;
  estimated_delivery: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderHistoryRow {
  id: string;
  order_id: string;
  status: string;
  actor_id: string;
  actor_role: ActorRole;
  note: string | null;
  created_at: string;
}

export interface AgentProfile {
  user_id: string;
  zone_id: string | null;
  is_available: number;
  current_lat: number | null;
  current_lng: number | null;
  max_orders: number;
  active_orders: number;
  updated_at: string;
}

export interface FailedAttempt {
  id: string;
  order_id: string;
  agent_id: string;
  reason: string;
  attempt_number: number;
  reschedule_date: string | null;
  sms_sent: number;
  email_sent: number;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  order_id: string | null;
  channel: NotificationChannel;
  message: string;
  sent_at: string;
}
