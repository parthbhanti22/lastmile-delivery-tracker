"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";

interface Order {
  id: string; status: string; delivery_address: string; delivery_pincode: string;
  pickup_address: string; total_charge: number; payment_mode: string;
  customer_id: string; created_at: string; order_type: string;
}

const TRANSITIONS: Record<string, { next: string; label: string; icon: string }[]> = {
  assigned: [{ next: "picked_up", label: "Mark Picked Up", icon: "📦" }],
  picked_up: [{ next: "in_transit", label: "Start Transit", icon: "🚚" }],
  in_transit: [
    { next: "delivered", label: "Delivered", icon: "✅" },
    { next: "failed", label: "Report Failed", icon: "❌" },
  ],
};

export default function AgentDeliveries() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [failModal, setFailModal] = useState<Order | null>(null);
  const [failForm, setFailForm] = useState({ reason: "", reschedule_date: "" });

  const showToast = (msg: string, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = async () => {
    setLoading(true);
    const res = await api.listOrders();
    if (res.ok) setOrders(res.data as Order[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleStatusUpdate = async (orderId: string, status: string) => {
    if (status === "failed") {
      const order = orders.find((o) => o.id === orderId);
      if (order) { setFailModal(order); return; }
    }

    const res = await api.updateOrderStatus(orderId, status);
    if (res.ok) { showToast(`Status → ${status}`); load(); }
    else showToast(res.error || "Failed", "error");
  };

  const handleFail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!failModal) return;
    const res = await api.failOrder(
      failModal.id,
      failForm.reason,
      failForm.reschedule_date || undefined
    );
    if (res.ok) {
      showToast("Failed delivery reported");
      setFailModal(null);
      setFailForm({ reason: "", reschedule_date: "" });
      load();
    } else showToast(res.error || "Error", "error");
  };

  const activeOrders = orders.filter((o) => ["assigned", "picked_up", "in_transit"].includes(o.status));
  const completedOrders = orders.filter((o) => ["delivered", "failed", "rescheduled", "cancelled"].includes(o.status));

  if (loading) return <div className="empty-state">Loading deliveries...</div>;

  return (
    <div className="animate-in">
      <div className="page-header">
        <h2>My Deliveries</h2>
        <span className="badge badge-assigned">{activeOrders.length} Active</span>
      </div>

      {/* Active Orders */}
      {activeOrders.length === 0 ? (
        <div className="glass" style={{ padding: 40, textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>☕</div>
          <p style={{ color: "#64748b" }}>No active deliveries. Take a break!</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16, marginBottom: 32 }}>
          {activeOrders.map((o) => (
            <div key={o.id} className="glass" style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <StatusBadge status={o.status} />
                    <span className="badge" style={{
                      background: o.payment_mode === "cod" ? "rgba(245,158,11,0.15)" : "rgba(99,102,241,0.1)",
                      color: o.payment_mode === "cod" ? "#fbbf24" : "#94a3b8",
                    }}>{o.payment_mode.toUpperCase()}</span>
                    <span className="badge" style={{
                      background: o.order_type === "b2b" ? "rgba(139,92,246,0.15)" : "rgba(6,182,212,0.15)",
                      color: o.order_type === "b2b" ? "#c4b5fd" : "#22d3ee",
                    }}>{o.order_type.toUpperCase()}</span>
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#64748b" }}>
                    #{o.id.slice(0, 12)}
                  </span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0" }}>₹{o.total_charge?.toFixed(0)}</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13, marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>Pickup</div>
                  <div style={{ color: "#cbd5e1" }}>{o.pickup_address}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>Deliver to</div>
                  <div style={{ color: "#cbd5e1" }}>{o.delivery_address}</div>
                  <span className="badge badge-assigned" style={{ marginTop: 4, fontSize: 10 }}>{o.delivery_pincode}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(TRANSITIONS[o.status] || []).map((t) => (
                  <button
                    key={t.next}
                    className={`btn btn-sm ${t.next === "failed" ? "btn-danger" : t.next === "delivered" ? "btn-success" : "btn-primary"}`}
                    onClick={() => handleStatusUpdate(o.id, t.next)}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Completed Orders */}
      {completedOrders.length > 0 && (
        <>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: "#94a3b8" }}>
            Completed ({completedOrders.length})
          </h3>
          <div className="glass" style={{ padding: 0, overflow: "hidden" }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Order</th><th>Status</th><th>Pincode</th><th>Charge</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {completedOrders.slice(0, 20).map((o) => (
                    <tr key={o.id}>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{o.id.slice(0, 8)}</td>
                      <td><StatusBadge status={o.status} /></td>
                      <td>{o.delivery_pincode}</td>
                      <td style={{ fontWeight: 600 }}>₹{o.total_charge?.toFixed(0)}</td>
                      <td style={{ fontSize: 12, color: "#94a3b8" }}>
                        {new Date(o.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Fail Modal */}
      {failModal && (
        <div className="modal-overlay" onClick={() => setFailModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Report Failed Delivery</h2>
            <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 16 }}>
              Order #{failModal.id.slice(0, 12)} — {failModal.delivery_address}
            </p>
            <form onSubmit={handleFail}>
              <div style={{ marginBottom: 14 }}>
                <label className="label">Reason *</label>
                <select className="input" required value={failForm.reason}
                  onChange={(e) => setFailForm((p) => ({ ...p, reason: e.target.value }))}>
                  <option value="">Select reason...</option>
                  <option value="Customer not available">Customer not available</option>
                  <option value="Wrong address">Wrong address</option>
                  <option value="Customer refused delivery">Customer refused delivery</option>
                  <option value="Damaged package">Damaged package</option>
                  <option value="Access restricted">Access restricted</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label className="label">Reschedule Date (optional)</label>
                <input className="input" type="date" value={failForm.reschedule_date}
                  onChange={(e) => setFailForm((p) => ({ ...p, reschedule_date: e.target.value }))} />
                <p style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                  If provided, order will be rescheduled and auto-reassigned to another agent.
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setFailModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-danger">Submit Failure</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
