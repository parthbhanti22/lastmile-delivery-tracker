"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import Link from "next/link";

interface Order {
  id: string;
  customer_id: string;
  status: string;
  total_charge: number;
  agent_id: string | null;
  delivery_pincode: string;
  created_at: string;
}

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [oRes, aRes] = await Promise.all([api.listOrders(), api.listAgents()]);
      if (oRes.ok) setOrders(oRes.data as Order[]);
      if (aRes.ok) setAgents(aRes.data as any[]);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="empty-state">Loading dashboard...</div>;

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    inTransit: orders.filter((o) => ["assigned", "picked_up", "in_transit"].includes(o.status)).length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    failed: orders.filter((o) => o.status === "failed").length,
    revenue: orders.filter((o) => o.status === "delivered").reduce((s, o) => s + (o.total_charge || 0), 0),
    activeAgents: agents.filter((a) => a.is_available).length,
  };

  const recentOrders = orders.slice(0, 8);

  return (
    <div className="animate-in">
      <div className="page-header">
        <h2>Admin Dashboard</h2>
        <span style={{ fontSize: 12, color: "#64748b" }}>
          {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </span>
      </div>

      {/* Stats Grid */}
      <div className="stat-grid">
        {[
          { label: "Total Orders", value: stats.total, color: "#a5b4fc" },
          { label: "Pending", value: stats.pending, color: "#fbbf24" },
          { label: "In Transit", value: stats.inTransit, color: "#c4b5fd" },
          { label: "Delivered", value: stats.delivered, color: "#34d399" },
          { label: "Failed", value: stats.failed, color: "#f87171" },
          { label: "Revenue (₹)", value: `₹${stats.revenue.toFixed(0)}`, color: "#22d3ee" },
          { label: "Active Agents", value: `${stats.activeAgents}/${agents.length}`, color: "#a5b4fc" },
        ].map((s) => (
          <div className="stat-card" key={s.label}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{
              background: `linear-gradient(135deg, ${s.color}, #e2e8f0)`,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="glass" style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Recent Orders</h3>
          <Link href="/admin/orders" className="btn btn-secondary btn-sm">View All →</Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="empty-state"><div className="icon">📭</div>No orders yet</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Status</th>
                  <th>Pincode</th>
                  <th>Agent</th>
                  <th>Charge</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                      {o.id.slice(0, 8)}...
                    </td>
                    <td><StatusBadge status={o.status} /></td>
                    <td>{o.delivery_pincode}</td>
                    <td>{o.agent_id ? o.agent_id.slice(0, 8) : <span style={{ color: "#64748b" }}>—</span>}</td>
                    <td style={{ fontWeight: 600 }}>₹{o.total_charge?.toFixed(0) || "—"}</td>
                    <td style={{ color: "#94a3b8", fontSize: 12 }}>
                      {new Date(o.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
