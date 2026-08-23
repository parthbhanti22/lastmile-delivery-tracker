"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function NewOrderPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    pickup_address: "", delivery_address: "",
    pickup_pincode: "", delivery_pincode: "",
    order_type: "b2c", payment_mode: "prepaid",
    length_cm: "", breadth_cm: "", height_cm: "",
    actual_weight_kg: "0.5",
  });
  const [preview, setPreview] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const showToast = (msg: string, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handlePreview = async () => {
    setError("");
    setLoading(true);
    const res = await api.calculateRate({
      delivery_pincode: form.delivery_pincode,
      order_type: form.order_type,
      payment_mode: form.payment_mode,
      length_cm: parseFloat(form.length_cm) || undefined,
      breadth_cm: parseFloat(form.breadth_cm) || undefined,
      height_cm: parseFloat(form.height_cm) || undefined,
      actual_weight_kg: parseFloat(form.actual_weight_kg) || 0.5,
    });
    setLoading(false);
    if (res.ok) { setPreview(res.data); setStep(3); }
    else setError(res.error || "Rate calculation failed");
  };

  const handleSubmit = async () => {
    setLoading(true);
    const res = await api.createOrder({
      pickup_address: form.pickup_address,
      delivery_address: form.delivery_address,
      pickup_pincode: form.pickup_pincode,
      delivery_pincode: form.delivery_pincode,
      order_type: form.order_type,
      payment_mode: form.payment_mode,
      length_cm: parseFloat(form.length_cm) || undefined,
      breadth_cm: parseFloat(form.breadth_cm) || undefined,
      height_cm: parseFloat(form.height_cm) || undefined,
      actual_weight_kg: parseFloat(form.actual_weight_kg) || 0.5,
    });
    setLoading(false);
    if (res.ok) {
      showToast("Order created successfully!");
      setTimeout(() => router.push("/customer"), 1500);
    } else setError(res.error || "Order creation failed");
  };

  return (
    <div className="animate-in">
      <div className="page-header">
        <h2>Create New Order</h2>
        <div style={{ display: "flex", gap: 8 }}>
          {[1, 2, 3].map((s) => (
            <div key={s} style={{
              width: 32, height: 32, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700,
              background: step >= s ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "rgba(99,102,241,0.1)",
              color: step >= s ? "white" : "#64748b",
              transition: "all 0.3s",
            }}>
              {s}
            </div>
          ))}
        </div>
      </div>

      <div className="glass" style={{ padding: 28, maxWidth: 600 }}>
        {/* Step 1: Addresses */}
        {step === 1 && (
          <>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>📍 Addresses</h3>
            <div style={{ marginBottom: 14 }}>
              <label className="label">Pickup Address</label>
              <input className="input" required placeholder="123 Warehouse Lane, Sector 5"
                value={form.pickup_address} onChange={(e) => set("pickup_address", e.target.value)} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="label">Pickup Pincode</label>
              <input className="input" required placeholder="110034"
                value={form.pickup_pincode} onChange={(e) => set("pickup_pincode", e.target.value)} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="label">Delivery Address</label>
              <input className="input" required placeholder="456 Customer Street, Block B"
                value={form.delivery_address} onChange={(e) => set("delivery_address", e.target.value)} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label className="label">Delivery Pincode</label>
              <input className="input" required placeholder="110085"
                value={form.delivery_pincode} onChange={(e) => set("delivery_pincode", e.target.value)} />
            </div>
            <button className="btn btn-primary" style={{ width: "100%" }}
              disabled={!form.pickup_address || !form.delivery_address || !form.pickup_pincode || !form.delivery_pincode}
              onClick={() => setStep(2)}>
              Continue →
            </button>
          </>
        )}

        {/* Step 2: Package Details */}
        {step === 2 && (
          <>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>📦 Package Details</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label className="label">Order Type</label>
                <select className="input" value={form.order_type} onChange={(e) => set("order_type", e.target.value)}>
                  <option value="b2c">B2C</option>
                  <option value="b2b">B2B</option>
                </select>
              </div>
              <div>
                <label className="label">Payment Mode</label>
                <select className="input" value={form.payment_mode} onChange={(e) => set("payment_mode", e.target.value)}>
                  <option value="prepaid">Prepaid</option>
                  <option value="cod">Cash on Delivery</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="label">Actual Weight (kg)</label>
              <input className="input" type="number" step="0.1" min="0.1"
                value={form.actual_weight_kg} onChange={(e) => set("actual_weight_kg", e.target.value)} />
            </div>
            <p style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
              📐 Dimensions (optional — for volumetric weight calculation)
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
              <div>
                <label className="label">Length (cm)</label>
                <input className="input" type="number" placeholder="0" value={form.length_cm} onChange={(e) => set("length_cm", e.target.value)} />
              </div>
              <div>
                <label className="label">Breadth (cm)</label>
                <input className="input" type="number" placeholder="0" value={form.breadth_cm} onChange={(e) => set("breadth_cm", e.target.value)} />
              </div>
              <div>
                <label className="label">Height (cm)</label>
                <input className="input" type="number" placeholder="0" value={form.height_cm} onChange={(e) => set("height_cm", e.target.value)} />
              </div>
            </div>

            {error && (
              <div style={{ padding: "10px 14px", marginBottom: 14, borderRadius: 8, fontSize: 13,
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setStep(1)}>← Back</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handlePreview} disabled={loading}>
                {loading ? "Calculating..." : "Preview Rate →"}
              </button>
            </div>
          </>
        )}

        {/* Step 3: Review & Confirm */}
        {step === 3 && preview && (
          <>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>✅ Review & Confirm</h3>

            {/* Address summary */}
            <div className="glass-light" style={{ padding: 14, marginBottom: 16, fontSize: 13 }}>
              <div style={{ marginBottom: 8 }}>
                <span style={{ color: "#64748b", fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>From</span>
                <div>{form.pickup_address} ({form.pickup_pincode})</div>
              </div>
              <div>
                <span style={{ color: "#64748b", fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>To</span>
                <div>{form.delivery_address} ({form.delivery_pincode})</div>
              </div>
            </div>

            {/* Pricing breakdown */}
            <div className="glass-light" style={{ padding: 16, marginBottom: 16 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "#94a3b8" }}>PRICING BREAKDOWN</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
                {[
                  ["Actual Weight", `${preview.actual_weight_kg} kg`],
                  ["Volumetric Weight", `${preview.volumetric_weight_kg?.toFixed(4) || 0} kg`],
                  ["Billable Weight", `${preview.billable_weight_kg?.toFixed(2)} kg`],
                ].map(([l, v]) => (
                  <div key={l} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#94a3b8" }}>{l}</span>
                    <span style={{ fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
                <div style={{ borderTop: "1px solid rgba(99,102,241,0.1)", paddingTop: 8, marginTop: 4 }}>
                  {[
                    ["Base Charge", `₹${preview.base_charge}`],
                    ["Weight Charge", `₹${preview.weight_charge}`],
                    ["COD Surcharge", `₹${preview.cod_charge}`],
                  ].map(([l, v]) => (
                    <div key={l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ color: "#94a3b8" }}>{l}</span>
                      <span>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ borderTop: "1px solid rgba(99,102,241,0.15)", paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>Total</span>
                  <span style={{
                    fontWeight: 800, fontSize: 20,
                    background: "linear-gradient(135deg, #a5b4fc, #22d3ee)",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  }}>₹{preview.total_charge}</span>
                </div>
              </div>
            </div>

            {error && (
              <div style={{ padding: "10px 14px", marginBottom: 14, borderRadius: 8, fontSize: 13,
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => { setStep(2); setError(""); }}>← Back</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSubmit} disabled={loading}>
                {loading ? "Placing Order..." : "Place Order 🚀"}
              </button>
            </div>
          </>
        )}
      </div>

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
