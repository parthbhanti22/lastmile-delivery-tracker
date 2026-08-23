-- ============================================================
-- Seed data for local development
-- ============================================================

-- Admin user (password: admin123)
INSERT OR IGNORE INTO users (id, name, email, password_hash, role, phone, created_at, updated_at)
VALUES ('admin-001', 'Admin User', 'admin@lastmile.dev', 'YWRtaW4xMjM=', 'admin', '9999900000', datetime('now'), datetime('now'));

-- Delivery Agents (password: agent123)
INSERT OR IGNORE INTO users (id, name, email, password_hash, role, phone, created_at, updated_at)
VALUES ('agent-001', 'Ravi Kumar', 'ravi@lastmile.dev', 'YWdlbnQxMjM=', 'agent', '9999900001', datetime('now'), datetime('now'));

INSERT OR IGNORE INTO users (id, name, email, password_hash, role, phone, created_at, updated_at)
VALUES ('agent-002', 'Priya Sharma', 'priya@lastmile.dev', 'YWdlbnQxMjM=', 'agent', '9999900002', datetime('now'), datetime('now'));

INSERT OR IGNORE INTO users (id, name, email, password_hash, role, phone, created_at, updated_at)
VALUES ('agent-003', 'Amit Verma', 'amit@lastmile.dev', 'YWdlbnQxMjM=', 'agent', '9999900003', datetime('now'), datetime('now'));

-- Customers (password: cust123)
INSERT OR IGNORE INTO users (id, name, email, password_hash, role, phone, created_at, updated_at)
VALUES ('cust-001', 'Parth Gupta', 'parth@example.com', 'Y3VzdDEyMw==', 'customer', '9999800001', datetime('now'), datetime('now'));

INSERT OR IGNORE INTO users (id, name, email, password_hash, role, phone, created_at, updated_at)
VALUES ('cust-002', 'Neha Patel', 'neha@example.com', 'Y3VzdDEyMw==', 'customer', '9999800002', datetime('now'), datetime('now'));

-- Zones
INSERT OR IGNORE INTO zones (id, name, description, created_at)
VALUES ('zone-north', 'North Delhi', 'Covers North Delhi areas', datetime('now'));

INSERT OR IGNORE INTO zones (id, name, description, created_at)
VALUES ('zone-south', 'South Delhi', 'Covers South Delhi areas', datetime('now'));

INSERT OR IGNORE INTO zones (id, name, description, created_at)
VALUES ('zone-east', 'East Delhi', 'Covers East Delhi and NCR-East', datetime('now'));

INSERT OR IGNORE INTO zones (id, name, description, created_at)
VALUES ('zone-west', 'West Delhi', 'Covers West Delhi and Gurugram side', datetime('now'));

-- Areas (pincode → zone mapping)
INSERT OR IGNORE INTO areas (id, zone_id, name, pincode, created_at) VALUES ('area-001', 'zone-north', 'Pitampura', '110034', datetime('now'));
INSERT OR IGNORE INTO areas (id, zone_id, name, pincode, created_at) VALUES ('area-002', 'zone-north', 'Rohini', '110085', datetime('now'));
INSERT OR IGNORE INTO areas (id, zone_id, name, pincode, created_at) VALUES ('area-003', 'zone-south', 'Saket', '110017', datetime('now'));
INSERT OR IGNORE INTO areas (id, zone_id, name, pincode, created_at) VALUES ('area-004', 'zone-south', 'Hauz Khas', '110016', datetime('now'));
INSERT OR IGNORE INTO areas (id, zone_id, name, pincode, created_at) VALUES ('area-005', 'zone-east', 'Laxmi Nagar', '110092', datetime('now'));
INSERT OR IGNORE INTO areas (id, zone_id, name, pincode, created_at) VALUES ('area-006', 'zone-east', 'Preet Vihar', '110092', datetime('now'));
INSERT OR IGNORE INTO areas (id, zone_id, name, pincode, created_at) VALUES ('area-007', 'zone-west', 'Janakpuri', '110058', datetime('now'));
INSERT OR IGNORE INTO areas (id, zone_id, name, pincode, created_at) VALUES ('area-008', 'zone-west', 'Dwarka', '110075', datetime('now'));

-- Rate Cards (B2C and B2B for each zone)
INSERT OR IGNORE INTO rate_cards (id, zone_id, type, base_rate, per_kg_rate, base_weight_kg, cod_surcharge, created_at, updated_at)
VALUES ('rc-north-b2c', 'zone-north', 'b2c', 50, 15, 0.5, 25, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO rate_cards (id, zone_id, type, base_rate, per_kg_rate, base_weight_kg, cod_surcharge, created_at, updated_at)
VALUES ('rc-north-b2b', 'zone-north', 'b2b', 35, 10, 1.0, 20, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO rate_cards (id, zone_id, type, base_rate, per_kg_rate, base_weight_kg, cod_surcharge, created_at, updated_at)
VALUES ('rc-south-b2c', 'zone-south', 'b2c', 55, 18, 0.5, 30, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO rate_cards (id, zone_id, type, base_rate, per_kg_rate, base_weight_kg, cod_surcharge, created_at, updated_at)
VALUES ('rc-south-b2b', 'zone-south', 'b2b', 40, 12, 1.0, 25, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO rate_cards (id, zone_id, type, base_rate, per_kg_rate, base_weight_kg, cod_surcharge, created_at, updated_at)
VALUES ('rc-east-b2c', 'zone-east', 'b2c', 45, 14, 0.5, 20, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO rate_cards (id, zone_id, type, base_rate, per_kg_rate, base_weight_kg, cod_surcharge, created_at, updated_at)
VALUES ('rc-east-b2b', 'zone-east', 'b2b', 30, 9, 1.0, 15, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO rate_cards (id, zone_id, type, base_rate, per_kg_rate, base_weight_kg, cod_surcharge, created_at, updated_at)
VALUES ('rc-west-b2c', 'zone-west', 'b2c', 50, 16, 0.5, 25, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO rate_cards (id, zone_id, type, base_rate, per_kg_rate, base_weight_kg, cod_surcharge, created_at, updated_at)
VALUES ('rc-west-b2b', 'zone-west', 'b2b', 38, 11, 1.0, 20, datetime('now'), datetime('now'));

-- Agent Profiles
INSERT OR IGNORE INTO agent_profiles (user_id, zone_id, is_available, current_lat, current_lng, max_orders, active_orders, updated_at)
VALUES ('agent-001', 'zone-north', 1, 28.7041, 77.1025, 10, 0, datetime('now'));

INSERT OR IGNORE INTO agent_profiles (user_id, zone_id, is_available, current_lat, current_lng, max_orders, active_orders, updated_at)
VALUES ('agent-002', 'zone-south', 1, 28.5244, 77.2066, 10, 0, datetime('now'));

INSERT OR IGNORE INTO agent_profiles (user_id, zone_id, is_available, current_lat, current_lng, max_orders, active_orders, updated_at)
VALUES ('agent-003', 'zone-east', 1, 28.6304, 77.2951, 8, 0, datetime('now'));
