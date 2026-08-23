"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function AdminZonesPage() {
  const [zones, setZones] = useState<any[]>([]);
  const [selectedZone, setSelectedZone] = useState<string>("");
  const [areas, setAreas] = useState<any[]>([]);
  const [rates, setRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  // Forms
  const [zoneForm, setZoneForm] = useState({ name: "", description: "" });
  const [areaForm, setAreaForm] = useState({ name: "", pincode: "" });
  const [rateForm, setRateForm] = useState({
    type: "b2c", base_rate: "", per_kg_rate: "", base_weight_kg: "0.5", cod_surcharge: "0",
  });
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);

  const showToast = (msg: string, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadZones = async () => {
    setLoading(true);
    const res = await api.listZones();
    if (res.ok) setZones(res.data as any[]);
    setLoading(false);
  };

  const loadZoneDetails = async (zoneId: string) => {
    setSelectedZone(zoneId);
    const [aRes, rRes] = await Promise.all([api.listAreas(zoneId), api.listRates(zoneId)]);
    if (aRes.ok) setAreas(aRes.data as any[]);
    if (rRes.ok) setRates(rRes.data as any[]);
  };

  useEffect(() => { loadZones(); }, []);

  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.createZone({ name: zoneForm.name, description: zoneForm.description || undefined });
    if (res.ok) {
      showToast("Zone created");
      setShowZoneModal(false);
      setZoneForm({ name: "", description: "" });
      loadZones();
    } else showToast(res.error || "Failed", "error");
  };

  const handleAddArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedZone) return;
    const res = await api.createArea(selectedZone, { name: areaForm.name, pincode: areaForm.pincode });
    if (res.ok) { showToast("Area added"); setAreaForm({ name: "", pincode: "" }); loadZoneDetails(selectedZone); }
    else showToast(res.error || "Failed", "error");
  };

  const handleDeleteArea = async (areaId: string) => {
    await api.deleteArea(areaId);
    showToast("Area removed");
    loadZoneDetails(selectedZone);
  };

  const handleCreateRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedZone) return;
    const res = await api.createRate(selectedZone, {
      type: rateForm.type,
      base_rate: parseFloat(rateForm.base_rate),
      per_kg_rate: parseFloat(rateForm.per_kg_rate),
      base_weight_kg: parseFloat(rateForm.base_weight_kg),
      cod_surcharge: parseFloat(rateForm.cod_surcharge),
    });
    if (res.ok) {
      showToast("Rate card created");
      setShowRateModal(false);
      setRateForm({ type: "b2c", base_rate: "", per_kg_rate: "", base_weight_kg: "0.5", cod_surcharge: "0" });
      loadZoneDetails(selectedZone);
    } else showToast(res.error || "Failed", "error");
  };

  const handleDeleteZone = async (zoneId: string) => {
    await api.deleteZone(zoneId);
    showToast("Zone deleted");
    setSelectedZone("");
    loadZones();
  };

  if (loading) return <div className="empty-state">Loading zones...</div>;

  return (
    <div className="animate-in">
      <div className="page-header">
        <h2>Zones & Rate Configuration</h2>
        <button className="btn btn-primary" onClick={() => setShowZoneModal(true)}>+ New Zone</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20, alignItems: "start" }}>
        {/* Zone List */}
        <div className="glass" style={{ padding: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: "#94a3b8" }}>ZONES</h3>
          {zones.length === 0 ? (
            <div className="empty-state" style={{ padding: 16 }}>No zones</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {zones.map((z) => (
                <button
                  key={z.id}
                  onClick={() => loadZoneDetails(z.id)}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                    background: selectedZone === z.id ? "rgba(99,102,241,0.15)" : "transparent",
                    color: selectedZone === z.id ? "#a5b4fc" : "#cbd5e1",
                    fontSize: 13, fontWeight: selectedZone === z.id ? 600 : 400,
                    textAlign: "left", width: "100%",
                    transition: "all 0.15s",
                  }}
                >
                  <span>🗺️ {z.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteZone(z.id); }}
                    style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 14 }}
                    title="Delete zone"
                  >✕</button>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Zone Detail */}
        {selectedZone ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Areas */}
            <div className="glass" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
                Areas (Pincode Mapping)
              </h3>
              <form onSubmit={handleAddArea} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <input className="input" placeholder="Area name" required
                  value={areaForm.name} onChange={(e) => setAreaForm((p) => ({ ...p, name: e.target.value }))} />
                <input className="input" placeholder="Pincode" required style={{ width: 140 }}
                  value={areaForm.pincode} onChange={(e) => setAreaForm((p) => ({ ...p, pincode: e.target.value }))} />
                <button className="btn btn-primary btn-sm" type="submit">Add</button>
              </form>
              {areas.length === 0 ? (
                <div className="empty-state" style={{ padding: 16 }}>No areas mapped</div>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {areas.map((a) => (
                    <div key={a.id} className="glass-light" style={{
                      display: "inline-flex", alignItems: "center", gap: 8,
                      padding: "8px 14px", borderRadius: 8, fontSize: 13,
                    }}>
                      <span style={{ fontWeight: 600 }}>{a.name}</span>
                      <span className="badge badge-assigned" style={{ fontSize: 10 }}>{a.pincode}</span>
                      <button
                        onClick={() => handleDeleteArea(a.id)}
                        style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 12 }}
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Rate Cards */}
            <div className="glass" style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700 }}>Rate Cards</h3>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowRateModal(true)}>+ Add Rate</button>
              </div>
              {rates.length === 0 ? (
                <div className="empty-state" style={{ padding: 16 }}>No rate cards</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
                  {rates.map((r) => (
                    <div key={r.id} className="glass-light" style={{ padding: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <span className="badge" style={{
                          background: r.type === "b2b" ? "rgba(139,92,246,0.15)" : "rgba(6,182,212,0.15)",
                          color: r.type === "b2b" ? "#c4b5fd" : "#22d3ee",
                        }}>{r.type.toUpperCase()}</span>
                        <span className={`badge ${r.is_active ? "badge-delivered" : "badge-cancelled"}`}>
                          {r.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
                        <div><span style={{ color: "#64748b" }}>Base Rate</span><div style={{ fontWeight: 700, fontSize: 16 }}>₹{r.base_rate}</div></div>
                        <div><span style={{ color: "#64748b" }}>Per Kg</span><div style={{ fontWeight: 700, fontSize: 16 }}>₹{r.per_kg_rate}</div></div>
                        <div><span style={{ color: "#64748b" }}>Base Weight</span><div style={{ fontWeight: 600 }}>{r.base_weight_kg} kg</div></div>
                        <div><span style={{ color: "#64748b" }}>COD Surcharge</span><div style={{ fontWeight: 600 }}>₹{r.cod_surcharge}</div></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="glass" style={{ padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🗺️</div>
            <p style={{ color: "#64748b" }}>Select a zone to view its areas and rate cards</p>
          </div>
        )}
      </div>

      {/* Create Zone Modal */}
      {showZoneModal && (
        <div className="modal-overlay" onClick={() => setShowZoneModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create Zone</h2>
            <form onSubmit={handleCreateZone}>
              <div style={{ marginBottom: 14 }}>
                <label className="label">Zone Name</label>
                <input className="input" required value={zoneForm.name}
                  onChange={(e) => setZoneForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label className="label">Description</label>
                <input className="input" value={zoneForm.description}
                  onChange={(e) => setZoneForm((p) => ({ ...p, description: e.target.value }))} />
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowZoneModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Rate Modal */}
      {showRateModal && (
        <div className="modal-overlay" onClick={() => setShowRateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add Rate Card</h2>
            <form onSubmit={handleCreateRate}>
              <div style={{ marginBottom: 14 }}>
                <label className="label">Type</label>
                <select className="input" value={rateForm.type}
                  onChange={(e) => setRateForm((p) => ({ ...p, type: e.target.value }))}>
                  <option value="b2c">B2C</option>
                  <option value="b2b">B2B</option>
                </select>
              </div>
              {[
                { label: "Base Rate (₹)", key: "base_rate" },
                { label: "Per Kg Rate (₹)", key: "per_kg_rate" },
                { label: "Base Weight (kg)", key: "base_weight_kg" },
                { label: "COD Surcharge (₹)", key: "cod_surcharge" },
              ].map((f) => (
                <div key={f.key} style={{ marginBottom: 14 }}>
                  <label className="label">{f.label}</label>
                  <input className="input" type="number" step="0.01" required
                    value={(rateForm as any)[f.key]}
                    onChange={(e) => setRateForm((p) => ({ ...p, [f.key]: e.target.value }))} />
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowRateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Rate</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
