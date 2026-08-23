"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function AgentProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const showToast = (msg: string, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = async () => {
    setLoading(true);
    const res = await api.agentProfile();
    if (res.ok) setProfile(res.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleAvailability = async () => {
    const newVal = !profile.is_available;
    const res = await api.updateAvailability(newVal);
    if (res.ok) { showToast(newVal ? "You are now online" : "You are now offline"); load(); }
    else showToast(res.error || "Error", "error");
  };

  if (loading) return <div className="empty-state">Loading profile...</div>;
  if (!profile) return <div className="empty-state">Profile not set up. Ask your admin.</div>;

  const capacityPct = Math.min((profile.active_orders / profile.max_orders) * 100, 100);

  return (
    <div className="animate-in">
      <div className="page-header">
        <h2>My Profile</h2>
        <button
          className={`btn btn-sm ${profile.is_available ? "btn-danger" : "btn-success"}`}
          onClick={toggleAvailability}
        >
          {profile.is_available ? "Go Offline" : "Go Online"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, maxWidth: 700 }}>
        {/* Info Card */}
        <div className="glass" style={{ padding: 24, gridColumn: "1 / -1" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{
              width: 60, height: 60, borderRadius: "50%",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, color: "white",
            }}>
              🚚
            </div>
            <div>
              <h3 style={{ fontSize: 20, fontWeight: 700 }}>{profile.name}</h3>
              <p style={{ fontSize: 13, color: "#94a3b8" }}>{profile.email}</p>
              {profile.phone && <p style={{ fontSize: 12, color: "#64748b" }}>📞 {profile.phone}</p>}
            </div>
            <div style={{ marginLeft: "auto" }}>
              {profile.is_available ? (
                <span className="badge badge-delivered" style={{ fontSize: 13, padding: "6px 14px" }}>● Online</span>
              ) : (
                <span className="badge badge-cancelled" style={{ fontSize: 13, padding: "6px 14px" }}>● Offline</span>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="stat-card">
          <div className="stat-label">Zone</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{profile.zone_id || "Unassigned"}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Active Orders</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span className="stat-value">{profile.active_orders}</span>
            <span style={{ fontSize: 16, color: "#64748b" }}>/ {profile.max_orders}</span>
          </div>
          <div style={{
            width: "100%", height: 8, borderRadius: 999, background: "rgba(99,102,241,0.1)",
            marginTop: 8, overflow: "hidden",
          }}>
            <div style={{
              width: `${capacityPct}%`, height: "100%", borderRadius: 999,
              background: capacityPct >= 80
                ? "linear-gradient(90deg, #ef4444, #dc2626)"
                : "linear-gradient(90deg, #6366f1, #8b5cf6)",
              transition: "width 0.3s",
            }} />
          </div>
        </div>

        {/* Location */}
        <div className="glass" style={{ padding: 20, gridColumn: "1 / -1" }}>
          <div className="stat-label" style={{ marginBottom: 8 }}>Last Known Location</div>
          {profile.current_lat && profile.current_lng ? (
            <div style={{ fontSize: 14, color: "#cbd5e1" }}>
              📍 {profile.current_lat.toFixed(4)}, {profile.current_lng.toFixed(4)}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "#64748b" }}>No location data. Update your location in the app.</p>
          )}
        </div>
      </div>

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
