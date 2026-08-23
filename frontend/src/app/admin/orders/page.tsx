"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";

interface Order {
  id: string; customer_id: string; status: string; total_charge: number;
  agent_id: string | null; delivery_pincode: string; delivery_address: string;
  order_type: string; payment_mode: string; billable_weight_kg: number;
  zone_id: string; created_at: string;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Order | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [assignAgent, setAssignAgent] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await api.listOrders(filter || undefined);
    if (res.ok) setOrders(res.data as Order[]);
    const aRes = await api.listAgents();
    if (aRes.ok) setAgents(aRes.data as any[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const showToast = (msg: string, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openDetail = async (order: Order) => {
    setSelected(order);
    const hRes = await api.getOrderHistory(order.id);
    if (hRes.ok) setHistory(hRes.data as any[]);
  };

  const handleAssign = async () => {
    if (!selected || !assignAgent) return;
    const res = await api.assignOrder(selected.id, assignAgent);
    if (res.ok) { showToast("Agent assigned"); setSelected(null); load(); }
    else showToast(res.error || "Failed", "error");
  };

  const handleCancel = async () => {
    if (!selected) return;
    const res = await api.cancelOrder(selected.id);
    if (res.ok) { showToast("Order cancelled"); setSelected(null); load(); }
    else showToast(res.error || "Failed", "error");
  };

  const STATUSES = ["", "pending", "assigned", "picked_up", "in_transit", "delivered", "failed", "rescheduled", "cancelled"];

  return (
    <div className="animate-in">
      <div className="page-header">
        <h2>Orders Management</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <select className="input" style={{ width: 160 }} value={filter} onChange={(e) => setFilter(e.target.value)}>
            {STATUSES.map((s) => <option key={s} value={s}>{s || "All Statuses"}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="glass" style={{ padding: 24 }}>
          <div className="empty-state"><div className="icon">📭</div>No orders found</div>
        </div>
      ) : (
        <div className="glass" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Status</th>
                  <th>Type</th>
                  <th>Payment</th>
                  <th>Pincode</th>
                  <th>Weight</th>
                  <th>Charge</th>
                  <th>Agent</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{o.id.slice(0, 8)}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td><span className="badge" style={{ background: o.order_type === "b2b" ? "rgba(139,92,246,0.15)" : "rgba(6,182,212,0.15)", color: o.order_type === "b2b" ? "#c4b5fd" : "#22d3ee" }}>{o.order_type.toUpperCase()}</span></td>
                    <td style={{ textTransform: "uppercase", fontSize: 11, fontWeight: 600, color: o.payment_mode === "cod" ? "#fbbf24" : "#94a3b8" }}>{o.payment_mode}</td>
                    <td>{o.delivery_pincode}</td>
                    <td>{o.billable_weight_kg?.toFixed(2)} kg</td>
                    <td style={{ fontWeight: 600 }}>₹{o.total_charge?.toFixed(0)}</td>
                    <td>{o.agent_id ? o.agent_id.slice(0, 8) : "—"}</td>
                    <td style={{ fontSize: 12, color: "#94a3b8" }}>{new Date(o.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => openDetail(o)}>View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>Order Detail</h2>
              <StatusBadge status={selected.status} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13, marginBottom: 20 }}>
              {[
                ["Order ID", selected.id.slice(0, 12) + "..."],
                ["Type", selected.order_type.toUpperCase()],
                ["Payment", selected.payment_mode.toUpperCase()],
                ["Pincode", selected.delivery_pincode],
                ["Weight", `${selected.billable_weight_kg?.toFixed(2)} kg`],
                ["Charge", `₹${selected.total_charge?.toFixed(2)}`],
                ["Agent", selected.agent_id?.slice(0, 12) || "Unassigned"],
                ["Zone", selected.zone_id || "—"],
              ].map(([label, val]) => (
                <div key={label}>
                  <span style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase", fontWeight: 600 }}>{label}</span>
                  <div style={{ color: "#e2e8f0", fontWeight: 500 }}>{val}</div>
                </div>
              ))}
            </div>

            {/* Assign Agent */}
            {!["delivered", "cancelled"].includes(selected.status) && (
              <div className="glass-light" style={{ padding: 16, marginBottom: 16 }}>
                <label className="label">Assign / Reassign Agent</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <select className="input" value={assignAgent} onChange={(e) => setAssignAgent(e.target.value)}>
                    <option value="">Select agent...</option>
                    {agents.map((a) => (
                      <option key={a.user_id} value={a.user_id}>
                        {a.name} ({a.active_orders}/{a.max_orders}) — {a.zone_id || "no zone"}
                      </option>
                    ))}
                  </select>
                  <button className="btn btn-primary btn-sm" onClick={handleAssign} disabled={!assignAgent}>
                    Assign
                  </button>
                </div>
              </div>
            )}

            {/* Timeline */}
            {history.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <label className="label" style={{ marginBottom: 12 }}>Order Timeline</label>
                <div className="timeline">
                  {history.map((h: any) => (
                    <div className="timeline-item" key={h.id}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <StatusBadge status={h.status} />
                        <span style={{ fontSize: 11, color: "#64748b" }}>
                          {new Date(h.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      {h.note && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{h.note}</div>}
                      <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
                        by {h.actor_role} ({h.actor_id.slice(0, 8)})
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              {!["delivered", "cancelled"].includes(selected.status) && (
                <button className="btn btn-danger btn-sm" onClick={handleCancel}>Cancel Order</button>
              )}
              <button className="btn btn-secondary btn-sm" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
