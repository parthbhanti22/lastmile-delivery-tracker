"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import Link from "next/link";

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await api.listOrders(filter || undefined);
      if (res.ok) setOrders(res.data as any[]);
      setLoading(false);
    })();
  }, [filter]);

  const STATUSES = ["", "pending", "assigned", "picked_up", "in_transit", "delivered", "failed", "rescheduled", "cancelled"];

  const active = orders.filter((o) => !["delivered", "cancelled"].includes(o.status));
  const completed = orders.filter((o) => ["delivered", "cancelled"].includes(o.status));

  if (loading) return <div className="empty-state">Loading orders...</div>;

  return (
    <div className="animate-in">
      <div className="page-header">
        <h2>My Orders</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <select className="input" style={{ width: 160 }} value={filter} onChange={(e) => setFilter(e.target.value)}>
            {STATUSES.map((s) => <option key={s} value={s}>{s || "All"}</option>)}
          </select>
          <Link href="/customer/new-order" className="btn btn-primary">+ New Order</Link>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="stat-card">
          <div className="stat-label">Total Orders</div>
          <div className="stat-value">{orders.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active</div>
          <div className="stat-value" style={{ background: "linear-gradient(135deg, #fbbf24, #e2e8f0)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {active.length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Spent</div>
          <div className="stat-value" style={{ fontSize: 22 }}>
            ₹{orders.filter((o) => o.status !== "cancelled").reduce((s: number, o: any) => s + (o.total_charge || 0), 0).toFixed(0)}
          </div>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="glass" style={{ padding: 48, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
          <p style={{ color: "#94a3b8", marginBottom: 16 }}>No orders yet. Place your first order!</p>
          <Link href="/customer/new-order" className="btn btn-primary">Create Order</Link>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {orders.map((o) => (
            <div key={o.id} className="glass" style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <StatusBadge status={o.status} />
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#64748b" }}>
                      #{o.id.slice(0, 12)}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: "#cbd5e1", marginTop: 6 }}>
                    📍 {o.delivery_address}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                    Pincode: {o.delivery_pincode} • {o.order_type.toUpperCase()} • {o.payment_mode.toUpperCase()}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0" }}>₹{o.total_charge?.toFixed(0)}</div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                    {new Date(o.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </div>
                  <Link href={`/customer/track?id=${o.id}`} className="btn btn-secondary btn-sm" style={{ marginTop: 8 }}>
                    Track →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
