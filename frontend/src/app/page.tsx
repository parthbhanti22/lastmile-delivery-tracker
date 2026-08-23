"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, saveAuth } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isRegister) {
        const res = await api.register({
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone || undefined,
        });
        if (!res.ok) { setError(res.error || "Registration failed"); return; }
        // Auto-login after register
      }
      const res = await api.login(form.email, form.password);
      if (!res.ok || !res.data) {
        setError(res.error || "Login failed");
        return;
      }
      saveAuth(res.data.id, res.data.name, res.data.email, res.data.role);
      // Route based on role
      if (res.data.role === "admin") router.push("/admin");
      else if (res.data.role === "agent") router.push("/agent");
      else router.push("/customer");
    } catch {
      setError("Network error. Is the API running on :8787?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-bg">
      {/* Decorative floating orbs */}
      <div
        style={{
          position: "absolute", top: "15%", left: "10%",
          width: 300, height: 300, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.15), transparent 70%)",
          filter: "blur(60px)", pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute", bottom: "10%", right: "15%",
          width: 250, height: 250, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(6,182,212,0.12), transparent 70%)",
          filter: "blur(50px)", pointerEvents: "none",
        }}
      />

      <div className="login-card glass animate-in">
        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📦</div>
          <h1 style={{
            fontSize: 26, fontWeight: 800,
            background: "linear-gradient(135deg, #a5b4fc, #06b6d4)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            LastMile
          </h1>
          <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
            Delivery Management Platform
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, marginBottom: 24, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(99,102,241,0.15)" }}>
          {["Login", "Register"].map((tab, i) => (
            <button
              key={tab}
              onClick={() => { setIsRegister(i === 1); setError(""); }}
              style={{
                flex: 1, padding: "10px 0", fontSize: 13, fontWeight: 600,
                border: "none", cursor: "pointer",
                background: (i === 0 ? !isRegister : isRegister)
                  ? "rgba(99,102,241,0.15)" : "transparent",
                color: (i === 0 ? !isRegister : isRegister) ? "#a5b4fc" : "#64748b",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div style={{ marginBottom: 14 }}>
              <label className="label">Full Name</label>
              <input
                className="input" placeholder="John Doe" required
                value={form.name} onChange={(e) => set("name", e.target.value)}
              />
            </div>
          )}
          <div style={{ marginBottom: 14 }}>
            <label className="label">Email</label>
            <input
              className="input" type="email" placeholder="you@example.com" required
              value={form.email} onChange={(e) => set("email", e.target.value)}
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label className="label">Password</label>
            <input
              className="input" type="password" placeholder="••••••••" required
              value={form.password} onChange={(e) => set("password", e.target.value)}
            />
          </div>
          {isRegister && (
            <div style={{ marginBottom: 14 }}>
              <label className="label">Phone (optional)</label>
              <input
                className="input" placeholder="9876543210"
                value={form.phone} onChange={(e) => set("phone", e.target.value)}
              />
            </div>
          )}

          {error && (
            <div style={{
              padding: "10px 14px", marginBottom: 14, borderRadius: 8, fontSize: 13,
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171",
            }}>
              {error}
            </div>
          )}

          <button className="btn btn-primary" type="submit" disabled={loading}
            style={{ width: "100%", marginTop: 4 }}>
            {loading ? "..." : isRegister ? "Create Account" : "Sign In"}
          </button>
        </form>

        {/* Quick logins */}
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid rgba(99,102,241,0.1)" }}>
          <p style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700, marginBottom: 10 }}>
            Quick Login (Seed Data)
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { label: "Admin", email: "admin@lastmile.dev", pw: "admin123", icon: "👑" },
              { label: "Agent (Ravi)", email: "ravi@lastmile.dev", pw: "agent123", icon: "🚚" },
              { label: "Customer (Parth)", email: "parth@example.com", pw: "cust123", icon: "📱" },
            ].map((u) => (
              <button
                key={u.email}
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: "flex-start" }}
                onClick={() => {
                  setForm({ name: "", email: u.email, password: u.pw, phone: "" });
                  setIsRegister(false);
                }}
              >
                <span>{u.icon}</span> {u.label} — {u.email}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
