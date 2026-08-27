import { ChevronLeft, ChevronRight, Edit, Eye, Plus, Save, Search, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPort, deletePort, getPortById, getPorts, updatePort } from "../api/portApi";
import { buildPortPayload } from "../utils/portDirectory";
import "./PortDirectory.css";

const regions = ["All Regions", "Unspecified", "NW Europe", "Asia Pacific", "Middle East Gulf", "Americas", "Mediterranean", "South America"];
const emptyForm = {
  port_name: "", country: "", region: "Unspecified", description: "", psc_risk_level: "Medium",
  unlocode: "", country_iso: "", latitude: "", longitude: "", harbour_type: "", harbour_size: "", max_draft_m: "",
  vessel_types: "", services: "", depths: "", restrictions: "", equipment: "", navigation: "", communication: "",
};
const jsonText = (value) => value && Object.keys(value).length ? JSON.stringify(value, null, 2) : "";

export default function PortDirectory() {
  const navigate = useNavigate();
  const [ports, setPorts] = useState([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("All Regions");
  const [harbourType, setHarbourType] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 25, totalPages: 0 });
  const [loading, setLoading] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingPort, setEditingPort] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const user = JSON.parse(localStorage.getItem("np_user") || "null");
  const isSuperAdmin = Number(user?.role_id) === 1;

  useEffect(() => {
    const timer = window.setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1); }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let current = true;
    Promise.resolve().then(() => { if (current) { setLoading(true); setError(""); } });
    getPorts({ search: debouncedSearch, country: country.trim(), region, harbourType: harbourType.trim(), page, limit })
      .then((response) => { if (current) { setPorts(response.ports || []); setPagination(response.pagination || { total: 0, page, limit, totalPages: 0 }); } })
      .catch((requestError) => { if (current) { console.error(requestError); setError("Ports could not be loaded. Check your connection and try again."); setPorts([]); } })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [debouncedSearch, country, region, harbourType, page, limit, refreshToken]);

  const setFilter = (setter) => (event) => { setter(event.target.value); setPage(1); };
  const closeForm = () => { setShowForm(false); setEditingPort(null); setForm(emptyForm); setFormError(""); };
  const openAddForm = () => { setEditingPort(null); setForm(emptyForm); setFormError(""); setShowForm(true); };
  const openEditForm = async (port) => {
    setFormError("");
    try {
      const response = await getPortById(port.id);
      const detail = response.port;
      setEditingPort(detail);
      setForm({
        ...emptyForm, ...Object.fromEntries(Object.keys(emptyForm).map((key) => [key, detail[key] ?? emptyForm[key]])),
        vessel_types: (detail.vessel_types || []).join(", "), services: (detail.services || []).join(", "),
        depths: jsonText(detail.depths), restrictions: jsonText(detail.restrictions), equipment: jsonText(detail.equipment), navigation: jsonText(detail.navigation), communication: jsonText(detail.communication),
      });
      setShowForm(true);
    } catch (requestError) { setError(requestError.response?.data?.message || "Port details could not be loaded for editing."); }
  };
  const changeForm = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const reloadCurrentPage = () => setRefreshToken((current) => current + 1);

  const savePort = async (event) => {
    event.preventDefault(); setFormError("");
    try {
      const payload = buildPortPayload(form);
      if (editingPort) await updatePort(editingPort.id, payload); else await createPort(payload);
      closeForm(); reloadCurrentPage();
    } catch (requestError) { setFormError(requestError.response?.data?.message || requestError.message || "Port could not be saved."); }
  };
  const deactivatePort = async (port) => {
    if (!window.confirm(`Deactivate ${port.port_name}? Existing records will be preserved.`)) return;
    try { await deletePort(port.id); reloadCurrentPage(); } catch (requestError) { setError(requestError.response?.data?.message || "Port could not be deactivated."); }
  };

  const start = pagination.total ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const end = Math.min(pagination.page * pagination.limit, pagination.total);
  const riskClass = (risk) => `risk-badge risk-${String(risk || "not-provided").toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <main className="ports-page">
      <header className="ports-header">
        <div><span className="ports-kicker">PORTS / OPERATIONAL REGISTER</span><h1>Port Directory</h1><p>Search port identity, characteristics and local Nexaport coverage.</p></div>
        {isSuperAdmin && <button className="port-add-btn" onClick={openAddForm}><Plus size={16} />Add port</button>}
      </header>

      {isSuperAdmin && showForm && (
        <section className="port-form-card" aria-label={editingPort ? "Edit port" : "Add port"}>
          <div className="port-form-head"><div><span>ADMIN PORT RECORD</span><h2>{editingPort ? `Edit ${editingPort.port_name}` : "Add port"}</h2></div><button type="button" onClick={closeForm} aria-label="Close form"><X size={18} /></button></div>
          <form onSubmit={savePort}>
            {formError && <div className="port-form-error">{formError}</div>}
            <fieldset><legend>Basic information</legend><div className="port-form-grid">
              <label>Port name*<input name="port_name" value={form.port_name} onChange={changeForm} required /></label>
              <label>Country*<input name="country" value={form.country} onChange={changeForm} required /></label>
              <label>Region*<input name="region" value={form.region} onChange={changeForm} required /></label>
              <label>UNLOCODE<input name="unlocode" value={form.unlocode} onChange={changeForm} maxLength={5} placeholder="SGSIN" /></label>
              <label>Country ISO<input name="country_iso" value={form.country_iso} onChange={changeForm} maxLength={2} placeholder="SG" /></label>
              <label>PSC risk<select name="psc_risk_level" value={form.psc_risk_level} onChange={changeForm}><option>Low</option><option>Medium</option><option>High</option></select></label>
            </div><label className="port-full-field">Description<textarea name="description" value={form.description} onChange={changeForm} /></label></fieldset>
            <details><summary>Location &amp; characteristics <span>Optional</span></summary><div className="port-form-grid port-details-grid">
              <label>Latitude<input type="number" step="any" name="latitude" value={form.latitude} onChange={changeForm} /></label>
              <label>Longitude<input type="number" step="any" name="longitude" value={form.longitude} onChange={changeForm} /></label>
              <label>Harbour type<input name="harbour_type" value={form.harbour_type} onChange={changeForm} /></label>
              <label>Harbour size<input name="harbour_size" value={form.harbour_size} onChange={changeForm} /></label>
              <label>Maximum draft (m)<input type="number" step="0.01" min="0" name="max_draft_m" value={form.max_draft_m} onChange={changeForm} /></label>
            </div></details>
            <details><summary>Facilities <span>Optional</span></summary><div className="port-form-grid port-details-grid"><label>Services<input name="services" value={form.services} onChange={changeForm} placeholder="Pre-PSC, ISM audit" /></label><label>Vessel types<input name="vessel_types" value={form.vessel_types} onChange={changeForm} placeholder="Tanker, Bulk carrier" /></label></div></details>
            <details><summary>Advanced port data <span>Optional structured JSON</span></summary><div className="port-json-grid">
              {[["depths","Depths"],["restrictions","Restrictions"],["equipment","Equipment"],["navigation","Navigation"],["communication","Communication"]].map(([name,label]) => <label key={name}>{label}<textarea name={name} value={form[name]} onChange={changeForm} spellCheck="false" placeholder="{}" /></label>)}
            </div></details>
            <div className="port-form-actions"><button className="port-save-btn" type="submit"><Save size={15} />Save port</button><button className="port-cancel-btn" type="button" onClick={closeForm}>Cancel</button></div>
          </form>
        </section>
      )}

      <section className="ports-toolbar" aria-label="Port filters">
        <label className="ports-search"><Search size={17} /><span className="sr-only">Search</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Port, country or UNLOCODE" /></label>
        <label>Country<input value={country} onChange={setFilter(setCountry)} placeholder="All countries" /></label>
        <label>Region<select value={region} onChange={setFilter(setRegion)}>{regions.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Harbour type<input value={harbourType} onChange={setFilter(setHarbourType)} placeholder="All types" /></label>
        <label>Rows<select value={limit} onChange={(event) => { setLimit(Number(event.target.value)); setPage(1); }}><option>25</option><option>50</option><option>100</option></select></label>
      </section>

      {error && <div className="ports-error">{error}</div>}
      <section className="port-register" aria-busy={loading}>
        <div className="port-register-meta"><span>{loading ? "Loading port register…" : `Showing ${start}–${end} of ${pagination.total} ports`}</span><span>Source records and Nexaport-managed ports</span></div>
        <div className="port-table-scroll"><table className="ports-table"><thead><tr><th>Port</th><th>Country</th><th>Region</th><th>Harbour</th><th>Max draft</th><th>PSC risk</th><th>Experts</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{!loading && ports.map((port) => <tr key={port.id}>
            <td><button className="port-name-link" onClick={() => navigate(`/ports/${port.id}`)}>{port.port_name}</button><span className="unlocode">{port.unlocode || "— — — — —"}</span></td>
            <td>{port.country}<small>{port.country_iso || ""}</small></td><td>{port.region || "Not provided"}</td>
            <td>{port.harbour_type || "Not provided"}<small>{port.harbour_size || ""}</small></td><td>{port.max_draft_m == null ? "Not provided" : `${port.max_draft_m} m`}</td>
            <td><span className={riskClass(port.psc_risk_level)}>{port.psc_risk_level || "Not provided"}</span></td><td>{port.experts_available || 0}</td>
            <td><div className="port-row-actions"><button onClick={() => navigate(`/ports/${port.id}`)} title="View port"><Eye size={15} /><span>View</span></button>{isSuperAdmin && <><button onClick={() => openEditForm(port)} title="Edit port"><Edit size={15} /><span>Edit</span></button><button className="danger" onClick={() => deactivatePort(port)} title="Deactivate port"><Trash2 size={15} /><span>Deactivate</span></button></>}</div></td>
          </tr>)}</tbody></table></div>
        {!loading && ports.length === 0 && <div className="ports-empty">No ports match these filters. Clear a filter or try another search.</div>}
        <div className="port-pagination"><span>Page {pagination.page || 1} of {Math.max(1, pagination.totalPages || 1)}</span><div><button disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}><ChevronLeft size={15} />Previous</button><button disabled={page >= pagination.totalPages || loading || !pagination.totalPages} onClick={() => setPage((current) => current + 1)}>Next<ChevronRight size={15} /></button></div></div>
      </section>
    </main>
  );
}
