"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  // New agent form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", zone_id: "", max_orders: "10" });

  const showToast = (msg: string, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = async () => {
    setLoading(true);
    const [aRes, zRes] = await Promise.all([api.listAgents(), api.listZones()]);
    if (aRes.ok) setAgents(aRes.data as any[]);
    if (zRes.ok) setZones(zRes.data as any[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    // Register user as agent
    const regRes = await api.register({
      name: form.name, email: form.email, password: form.password,
      role: "agent", phone: form.phone || undefined,
    });
    if (!regRes.ok) { showToast(regRes.error || "Failed", "error"); return; }
    const agentId = (regRes.data as any).id;

    // Create profile
    if (form.zone_id) {
      await api.createAgentProfile({
        user_id: agentId,
        zone_id: form.zone_id,
        max_orders: parseInt(form.max_orders) || 10,
      });
    }

    showToast("Agent created");
    setShowForm(false);
    setForm({ name: "", email: "", password: "", phone: "", zone_id: "", max_orders: "10" });
    load();
  };

  if (loading) return <div className="empty-state">Loading agents...</div>;

  return (
    <div className="animate-in">
      <div className="page-header">
        <h2>Agents Management</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ New Agent</button>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="stat-card">
          <div className="stat-label">Total Agents</div>
          <div className="stat-value">{agents.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Available</div>
          <div className="stat-value" style={{ background: "linear-gradient(135deg, #34d399, #e2e8f0)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {agents.filter((a) => a.is_available).length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Deliveries</div>
          <div className="stat-value">{agents.reduce((s, a) => s + a.active_orders, 0)}</div>
        </div>
      </div>

      {/* Table */}
      <div className="glass" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Agent</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Zone</th>
                <th>Active Orders</th>
                <th>Capacity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.user_id}>
                  <td style={{ fontWeight: 600 }}>{a.name}</td>
                  <td style={{ color: "#94a3b8" }}>{a.email}</td>
                  <td>{a.phone || "—"}</td>
                  <td>
                    <span className="badge badge-assigned">{a.zone_id || "Unassigned"}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: a.active_orders >= a.max_orders ? "#f87171" : "#34d399" }}>
                      {a.active_orders}
                    </span>
                    <span style={{ color: "#64748b" }}>/{a.max_orders}</span>
                  </td>
                  <td>
                    <div style={{
                      width: "100%", height: 6, borderRadius: 999, background: "rgba(99,102,241,0.1)",
                      overflow: "hidden", minWidth: 60,
                    }}>
                      <div style={{
                        width: `${Math.min((a.active_orders / a.max_orders) * 100, 100)}%`,
                        height: "100%", borderRadius: 999,
                        background: a.active_orders >= a.max_orders
                          ? "linear-gradient(90deg, #ef4444, #dc2626)"
                          : "linear-gradient(90deg, #6366f1, #8b5cf6)",
                        transition: "width 0.3s",
                      }} />
                    </div>
                  </td>
                  <td>
                    {a.is_available ? (
                      <span className="badge badge-delivered">Online</span>
                    ) : (
                      <span className="badge badge-cancelled">Offline</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Agent Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Register New Agent</h2>
            <form onSubmit={handleCreate}>
              {[
                { label: "Name", key: "name", type: "text", required: true },
                { label: "Email", key: "email", type: "email", required: true },
                { label: "Password", key: "password", type: "password", required: true },
                { label: "Phone", key: "phone", type: "text", required: false },
              ].map((f) => (
                <div key={f.key} style={{ marginBottom: 14 }}>
                  <label className="label">{f.label}</label>
                  <input
                    className="input" type={f.type} required={f.required}
                    value={(form as any)[f.key]}
                    onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
              <div style={{ marginBottom: 14 }}>
                <label className="label">Zone</label>
                <select className="input" value={form.zone_id} onChange={(e) => setForm((p) => ({ ...p, zone_id: e.target.value }))}>
                  <option value="">Select zone...</option>
                  {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label className="label">Max Orders</label>
                <input className="input" type="number" min="1" value={form.max_orders}
                  onChange={(e) => setForm((p) => ({ ...p, max_orders: e.target.value }))} />
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Agent</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
