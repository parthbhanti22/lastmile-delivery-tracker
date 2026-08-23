"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const showToast = (msg: string, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = async () => {
    setLoading(true);
    const res = await api.listUsers(filter || undefined);
    if (res.ok) setUsers(res.data as any[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const handleToggle = async (id: string) => {
    const res = await api.toggleUser(id);
    if (res.ok) { showToast("User status toggled"); load(); }
    else showToast(res.error || "Failed", "error");
  };

  const ROLES = ["", "admin", "agent", "customer"];

  const roleIcon = (role: string) => {
    if (role === "admin") return "👑";
    if (role === "agent") return "🚚";
    return "📱";
  };

  return (
    <div className="animate-in">
      <div className="page-header">
        <h2>User Management</h2>
        <select className="input" style={{ width: 160 }} value={filter} onChange={(e) => setFilter(e.target.value)}>
          {ROLES.map((r) => <option key={r} value={r}>{r || "All Roles"}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="empty-state">Loading...</div>
      ) : (
        <div className="glass" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{
                          width: 32, height: 32, borderRadius: "50%", fontSize: 14,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          background: "rgba(99,102,241,0.15)",
                        }}>
                          {roleIcon(u.role)}
                        </span>
                        <span style={{ fontWeight: 600 }}>{u.name}</span>
                      </div>
                    </td>
                    <td style={{ color: "#94a3b8" }}>{u.email}</td>
                    <td>
                      <span className="badge badge-assigned" style={{ textTransform: "capitalize" }}>
                        {u.role}
                      </span>
                    </td>
                    <td>{u.phone || "—"}</td>
                    <td>
                      {u.is_active ? (
                        <span className="badge badge-delivered">Active</span>
                      ) : (
                        <span className="badge badge-cancelled">Inactive</span>
                      )}
                    </td>
                    <td style={{ fontSize: 12, color: "#94a3b8" }}>
                      {new Date(u.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td>
                      <button
                        className={`btn btn-sm ${u.is_active ? "btn-danger" : "btn-success"}`}
                        onClick={() => handleToggle(u.id)}
                      >
                        {u.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
