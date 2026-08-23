"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";

export default function TrackOrderPage() {
  const searchParams = useSearchParams();
  const [orderId, setOrderId] = useState(searchParams.get("id") || "");
  const [order, setOrder] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async (id?: string) => {
    const trackId = id || orderId;
    if (!trackId) return;
    setLoading(true);
    setError("");
    const [oRes, hRes] = await Promise.all([
      api.getOrder(trackId),
      api.getOrderHistory(trackId),
    ]);
    if (oRes.ok) { setOrder(oRes.data); }
    else { setError(oRes.error || "Order not found"); setOrder(null); }
    if (hRes.ok) setHistory(hRes.data as any[]);
    setLoading(false);
  };

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) { setOrderId(id); load(id); }
  }, [searchParams]);

  const STATUS_STEPS = ["pending", "assigned", "picked_up", "in_transit", "delivered"];
  const currentIdx = order ? STATUS_STEPS.indexOf(order.status) : -1;

  return (
    <div className="animate-in">
      <div className="page-header">
        <h2>Track Order</h2>
      </div>

      {/* Search */}
      <div className="glass" style={{ padding: 20, marginBottom: 24 }}>
        <label className="label">Enter Order ID</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input className="input" placeholder="Paste your order ID here..."
            value={orderId} onChange={(e) => setOrderId(e.target.value)} />
          <button className="btn btn-primary" onClick={() => load()} disabled={!orderId || loading}>
            {loading ? "..." : "Track"}
          </button>
        </div>
        {error && (
          <div style={{ marginTop: 10, fontSize: 13, color: "#f87171" }}>{error}</div>
        )}
      </div>

      {order && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Progress Bar */}
          {!["failed", "cancelled", "rescheduled"].includes(order.status) && (
            <div className="glass" style={{ padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", position: "relative" }}>
                {/* Line */}
                <div style={{
                  position: "absolute", top: 16, left: "10%", right: "10%", height: 3,
                  background: "rgba(99,102,241,0.15)", borderRadius: 999,
                }}>
                  <div style={{
                    width: `${Math.max(0, (currentIdx / (STATUS_STEPS.length - 1)) * 100)}%`,
                    height: "100%", borderRadius: 999,
                    background: "linear-gradient(90deg, #6366f1, #06b6d4)",
                    transition: "width 0.5s ease",
                  }} />
                </div>
                {/* Steps */}
                {STATUS_STEPS.map((s, i) => (
                  <div key={s} style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 1, flex: 1 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14,
                      background: i <= currentIdx
                        ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                        : "rgba(99,102,241,0.1)",
                      color: i <= currentIdx ? "white" : "#64748b",
                      transition: "all 0.3s",
                      boxShadow: i === currentIdx ? "0 0 0 4px rgba(99,102,241,0.2)" : "none",
                    }}>
                      {i <= currentIdx ? "✓" : i + 1}
                    </div>
                    <span style={{
                      fontSize: 10, marginTop: 6, fontWeight: i <= currentIdx ? 700 : 400,
                      color: i <= currentIdx ? "#a5b4fc" : "#64748b",
                      textTransform: "capitalize",
                    }}>
                      {s.replace("_", " ")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Order Info */}
          <div className="glass" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <StatusBadge status={order.status} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#64748b", marginLeft: 8 }}>
                  #{order.id.slice(0, 16)}
                </span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#e2e8f0" }}>
                ₹{order.total_charge?.toFixed(0)}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontSize: 13 }}>
              <div>
                <span className="label">Pickup</span>
                <div style={{ color: "#cbd5e1" }}>{order.pickup_address}</div>
                <span className="badge badge-assigned" style={{ marginTop: 4, fontSize: 10 }}>{order.pickup_pincode}</span>
              </div>
              <div>
                <span className="label">Delivery</span>
                <div style={{ color: "#cbd5e1" }}>{order.delivery_address}</div>
                <span className="badge badge-assigned" style={{ marginTop: 4, fontSize: 10 }}>{order.delivery_pincode}</span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 16, fontSize: 12 }}>
              {[
                ["Type", order.order_type?.toUpperCase()],
                ["Payment", order.payment_mode?.toUpperCase()],
                ["Weight", `${order.billable_weight_kg?.toFixed(2)} kg`],
                ["Agent", order.agent_id?.slice(0, 8) || "Pending"],
              ].map(([l, v]) => (
                <div key={l}>
                  <span style={{ color: "#64748b", fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>{l}</span>
                  <div style={{ fontWeight: 600, color: "#e2e8f0" }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          {history.length > 0 && (
            <div className="glass" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Order Timeline</h3>
              <div className="timeline">
                {history.map((h: any) => (
                  <div className="timeline-item" key={h.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <StatusBadge status={h.status} />
                      <span style={{ fontSize: 11, color: "#64748b" }}>
                        {new Date(h.created_at).toLocaleString("en-IN", {
                          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit",
                        })}
                      </span>
                    </div>
                    {h.note && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{h.note}</div>}
                    <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
                      by {h.actor_role}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
