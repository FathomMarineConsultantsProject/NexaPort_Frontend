import {
  Anchor,
  AlertTriangle,
  Edit,
  MapPin,
  Plus,
  Save,
  Search,
  Ship,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPort, deletePort, getPorts, updatePort } from "../api/portApi";
import "./PortDirectory.css";

const regions = [
  "All Regions",
  "NW Europe",
  "Asia Pacific",
  "Middle East Gulf",
  "Americas",
  "Mediterranean",
  "South America",
];

const emptyForm = {
  port_name: "",
  country: "",
  region: "Asia Pacific",
  description: "",
  psc_risk_level: "Medium",
  experts_available: 0,
  vessel_types: "",
  services: "",
};

export default function PortDirectory() {
  const [ports, setPorts] = useState([]);
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("All Regions");
  const [loading, setLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingPort, setEditingPort] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const user = JSON.parse(localStorage.getItem("np_user") || "null");
  const isSuperAdmin = Number(user?.role_id) === 1;

  useEffect(() => {
    loadPorts();
  }, [region]);

  const loadPorts = async (searchValue = search) => {
    setLoading(true);
    try {
      const res = await getPorts({ search: searchValue, region });
      setPorts(res.ports || []);
    } catch (error) {
      console.error("Failed to load ports:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearch(value);
    loadPorts(value);
  };

  const openAddForm = () => {
    setEditingPort(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEditForm = (port) => {
    setEditingPort(port);
    setForm({
      port_name: port.port_name || "",
      country: port.country || "",
      region: port.region || "Asia Pacific",
      description: port.description || "",
      psc_risk_level: port.psc_risk_level || "Medium",
      experts_available: port.experts_available || 0,
      vessel_types: (port.vessel_types || []).join(", "),
      services: (port.services || []).join(", "),
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingPort(null);
    setForm(emptyForm);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const buildPayload = () => ({
    port_name: form.port_name,
    country: form.country,
    region: form.region,
    description: form.description,
    psc_risk_level: form.psc_risk_level,
    experts_available: Number(form.experts_available || 0),
    vessel_types: form.vessel_types
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    services: form.services
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isSuperAdmin) {
      alert("Only Super Admin can manage ports.");
      return;
    }

    try {
      if (editingPort) {
        await updatePort(editingPort.id, buildPayload());
      } else {
        await createPort(buildPayload());
      }

      closeForm();
      loadPorts();
    } catch (error) {
      console.error("Failed to save port:", error);
      alert(error.response?.data?.message || "Failed to save port.");
    }
  };

  const handleDelete = async (id) => {
    if (!isSuperAdmin) return;

    const ok = window.confirm("Delete this port?");
    if (!ok) return;

    try {
      await deletePort(id);
      loadPorts();
    } catch (error) {
      console.error("Failed to delete port:", error);
      alert(error.response?.data?.message || "Failed to delete port.");
    }
  };

  const visiblePorts = useMemo(() => ports, [ports]);

  const riskClass = (risk) => {
    const value = (risk || "Medium").toLowerCase();
    if (value === "low") return "risk-low";
    if (value === "high") return "risk-high";
    return "risk-medium";
  };

  return (
    <main className="ports-page">
      <section className="ports-header">
        <div>
          <h1>Port Directory</h1>
          <p>
            Global port intelligence — PSC risk levels, local expert availability,
            and service coverage.
          </p>
        </div>

        {isSuperAdmin && (
          <button className="port-add-btn" onClick={openAddForm}>
            <Plus size={17} />
            Add Port
          </button>
        )}
      </section>

      {isSuperAdmin && showForm && (
        <section className="port-form-card">
          <div className="port-form-head">
            <h2>{editingPort ? "Edit Port" : "Add Port"}</h2>
            <button type="button" onClick={closeForm}>
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="port-form-grid">
              <label>
                Port Name
                <input
                  name="port_name"
                  value={form.port_name}
                  onChange={handleFormChange}
                  placeholder="Port of Busan"
                  required
                />
              </label>

              <label>
                Country
                <input
                  name="country"
                  value={form.country}
                  onChange={handleFormChange}
                  placeholder="South Korea"
                  required
                />
              </label>

              <label>
                Region
                <select name="region" value={form.region} onChange={handleFormChange}>
                  {regions
                    .filter((item) => item !== "All Regions")
                    .map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                </select>
              </label>

              <label>
                PSC Risk
                <select
                  name="psc_risk_level"
                  value={form.psc_risk_level}
                  onChange={handleFormChange}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </label>

              <label>
                Experts Available
                <input
                  name="experts_available"
                  type="number"
                  value={form.experts_available}
                  onChange={handleFormChange}
                  placeholder="2"
                />
              </label>

              <label>
                Vessel Types
                <input
                  name="vessel_types"
                  value={form.vessel_types}
                  onChange={handleFormChange}
                  placeholder="Tanker, Bulk Carrier, Container"
                />
              </label>
            </div>

            <label className="port-full-field">
              Services
              <input
                name="services"
                value={form.services}
                onChange={handleFormChange}
                placeholder="Pre-PSC, ISM Audit"
              />
            </label>

            <label className="port-full-field">
              Description
              <textarea
                name="description"
                value={form.description}
                onChange={handleFormChange}
                placeholder="Tokyo MOU. Pre-inspection essential."
                required
              />
            </label>

            <button className="port-save-btn" type="submit">
              <Save size={16} />
              {editingPort ? "Update Port" : "Create Port"}
            </button>
          </form>
        </section>
      )}

      <section className="ports-toolbar">
        <div className="ports-search">
          <Search size={20} />
          <input
            value={search}
            onChange={handleSearch}
            placeholder="Search ports or countries..."
          />
        </div>

        <div className="region-pills">
          {regions.map((item) => (
            <button
              key={item}
              className={region === item ? "region-pill active" : "region-pill"}
              onClick={() => setRegion(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <div className="ports-empty">Loading ports...</div>
      ) : visiblePorts.length === 0 ? (
        <div className="ports-empty">No ports found.</div>
      ) : (
        <section className="ports-grid">
          {visiblePorts.map((port) => (
            <article className="port-card" key={port.id}>
              <div className="port-card-top">
                <div className="port-icon">
                  <Anchor size={28} />
                </div>

                <span className={`risk-badge ${riskClass(port.psc_risk_level)}`}>
                  {(port.psc_risk_level || "Medium").toLowerCase() === "high" && (
                    <AlertTriangle size={14} />
                  )}
                  PSC Risk: {port.psc_risk_level || "Medium"}
                </span>
              </div>

              <h3>{port.port_name}</h3>

              <div className="port-location">
                <MapPin size={18} />
                {port.country} · {port.region}
              </div>

              <p className="port-description">{port.description}</p>

              <div className="port-section-label">VESSEL TYPES</div>
              <div className="port-tags soft">
                {(port.vessel_types || []).map((item) => (
                  <span key={item}>
                    <Ship size={15} />
                    {item}
                  </span>
                ))}
              </div>

              <div className="port-section-label">SERVICES AVAILABLE</div>
              <div className="port-tags outlined">
                {(port.services || []).map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>

              <div className="port-divider" />

              <div className="experts-nearby">
                <span
                  className={
                    (port.psc_risk_level || "").toLowerCase() === "low"
                      ? "dot-green"
                      : "dot-orange"
                  }
                />
                {port.experts_available || 0}{" "}
                {(port.experts_available || 0) === 1 ? "expert" : "experts"} available nearby
              </div>

              {isSuperAdmin && (
                <div className="port-card-actions">
                  <button type="button" onClick={() => openEditForm(port)}>
                    <Edit size={14} />
                    Edit
                  </button>

                  <button
                    type="button"
                    className="danger"
                    onClick={() => handleDelete(port.id)}
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              )}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}