import { Anchor, Flag, Plus, Search, Ship, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createVessel, getVessels } from "../api/vesselApi";
import "./FleetManagement.css";

export default function FleetManagement() {
  const [vessels, setVessels] = useState([]);
  const [search, setSearch] = useState("");
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const storedUser = localStorage.getItem("np_user");
  const user = storedUser ? JSON.parse(storedUser) : null;
  const roleId = Number(user?.role_id);

  const canManageVessels = roleId === 1 || roleId === 3;
  const isExpert = roleId === 2;

  // Form state
  const [formData, setFormData] = useState({
    vessel_name: "",
    imo_number: "",
    vessel_type: "",
    flag_state: "",
    class_subtype: "",
    dwt: "",
    gt: "",
    year_built: "",
    trading_area: "",
    owner_manager: "",
  });

  useEffect(() => {
    loadVessels();
  }, []);

  const loadVessels = async (searchQuery = "") => {
    setLoading(true);
    try {
      const response = await getVessels(searchQuery);
      setVessels(response.data || response.vessels || []);
    } catch (err) {
      console.error("Failed to load vessels:", err);
      setError("Failed to load vessels");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearch(value);
    loadVessels(value);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!canManageVessels) {
      setError("You do not have permission to register vessels.");
      return;
    }

    if (!formData.vessel_name || !formData.imo_number || !formData.vessel_type || !formData.flag_state) {
      setError("Vessel Name, IMO Number, Vessel Type, and Flag State are required");
      return;
    }

    try {
      const payload = {
        vessel_name: formData.vessel_name,
        imo_number: formData.imo_number,
        vessel_type: formData.vessel_type,
        flag_state: formData.flag_state,
        class_subtype: formData.class_subtype || null,
        dwt: formData.dwt ? parseInt(formData.dwt) : null,
        gt: formData.gt ? parseInt(formData.gt) : null,
        year_built: formData.year_built ? parseInt(formData.year_built) : null,
        trading_area: formData.trading_area || null,
        owner_manager: formData.owner_manager || null,
      };

      await createVessel(payload);

      // Reset form
      setFormData({
        vessel_name: "",
        imo_number: "",
        vessel_type: "",
        flag_state: "",
        class_subtype: "",
        dwt: "",
        gt: "",
        year_built: "",
        trading_area: "",
        owner_manager: "",
      });

      setShowRegisterForm(false);
      loadVessels(search);
    } catch (err) {
      console.error("Failed to create vessel:", err);
      setError(err.response?.data?.message || "Failed to register vessel");
    }
  };

  const vesselTypes = [
    "Container",
    "Tanker",
    "Bulk Carrier",
    "Chemical Tanker",
    "Offshore",
    "General Cargo",
    "LNG Carrier",
    "LPG Carrier",
    "VLCC",
    "ULCC",
    "Ro-Ro",
    "Cruise Ship",
    "Other",
  ];

  const flagStates = [
    "Panama",
    "Liberia",
    "Marshall Islands",
    "Singapore",
    "Malta",
    "Bahamas",
    "Norway",
    "China",
    "United Kingdom",
    "Cyprus",
    "Greece",
    "Japan",
    "Netherlands",
    "Other",
  ];

  return (
    <div className="fleet-page">
      <div className="fleet-header">
        <div className="fleet-header-content">
          <h1>Fleet Management</h1>
          <p>Register and manage vessels in your fleet for service requests.</p>
        </div>
        {canManageVessels && (
          <button onClick={() => setShowRegisterForm(true)} className="register-vessel-btn">
            <Plus size={18} />
            Register Vessel
          </button>
        )}
      </div>

      <div className="fleet-search">
        <div className="search-input-wrapper">
          <Search size={20} />
          <input
            type="text"
            className="search-input"
            placeholder="Search vessels..."
            value={search}
            onChange={handleSearch}
          />
        </div>
      </div>

      {loading ? (
        <div className="empty-state">
          <p>Loading vessels...</p>
        </div>
      ) : vessels.length === 0 ? (
        <div className="empty-state">
          <Ship size={64} />
          <p>
            {isExpert
              ? "No vessels found."
              : "No vessels found. Register your first vessel to get started."}
          </p>
        </div>
      ) : (
        <div className="vessel-grid">
          {vessels.map((vessel) => (
            <div key={vessel.id} className="vessel-card">
              <div className="vessel-card-header">
                <div className="vessel-icon">
                  <Ship size={28} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 className="vessel-name">{vessel.vessel_name}</h3>
                  <div className="vessel-imo">
                    <Anchor size={14} />
                    IMO {vessel.imo_number}
                    {vessel.class_subtype && ` · ${vessel.class_subtype}`}
                  </div>
                </div>
                <span className="vessel-type-badge">{vessel.vessel_type}</span>
              </div>

              <div className="vessel-info-grid">
                <div className="vessel-info-item">
                  <div className="vessel-info-label">Flag</div>
                  <div className="vessel-info-value">
                    <Flag size={14} />
                    {vessel.flag_state}
                  </div>
                </div>
                <div className="vessel-info-item">
                  <div className="vessel-info-label">Class</div>
                  <div className="vessel-info-value">{vessel.class_subtype || "—"}</div>
                </div>
                <div className="vessel-info-item">
                  <div className="vessel-info-label">DWT</div>
                  <div className="vessel-info-value">
                    {vessel.dwt ? `${Number(vessel.dwt).toLocaleString()} T` : "—"}
                  </div>
                </div>
                <div className="vessel-info-item">
                  <div className="vessel-info-label">GT</div>
                  <div className="vessel-info-value">
                    {vessel.gt ? Number(vessel.gt).toLocaleString() : "—"}
                  </div>
                </div>
                <div className="vessel-info-item">
                  <div className="vessel-info-label">Built</div>
                  <div className="vessel-info-value">{vessel.year_built || "—"}</div>
                </div>
                <div className="vessel-info-item">
                  <div className="vessel-info-label">Trading Area</div>
                  <div className="vessel-info-value">{vessel.trading_area || "—"}</div>
                </div>
                <div className="vessel-info-item" style={{ gridColumn: "1 / -1" }}>
                  <div className="vessel-info-label">Owner / Manager</div>
                  <div className="vessel-info-value">{vessel.owner_manager || "—"}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Register Vessel Modal */}
      {canManageVessels && showRegisterForm && (
        <div className="register-modal-overlay" onClick={(e) => {
          if (e.target.className === "register-modal-overlay") {
            setShowRegisterForm(false);
          }
        }}>
          <div className="register-modal">
            <div className="register-modal-header">
              <div className="register-modal-title">
                <h2>Register New Vessel</h2>
                <p>Add a vessel to your fleet for service request assignments.</p>
              </div>
              <button onClick={() => setShowRegisterForm(false)} className="cancel-btn">
                <X size={18} />
                Cancel
              </button>
            </div>

            <div className="register-form-content">
              <form onSubmit={handleSubmit} className="register-vessel-form">
                {error && <div className="error-alert">{error}</div>}

                <div className="form-grid">
                  <div className="form-field">
                    <label>Vessel Name</label>
                    <input
                      type="text"
                      name="vessel_name"
                      value={formData.vessel_name}
                      onChange={handleInputChange}
                      placeholder="MT Nordic Spirit"
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label>IMO Number</label>
                    <input
                      type="text"
                      name="imo_number"
                      value={formData.imo_number}
                      onChange={handleInputChange}
                      placeholder="9378654"
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label>Vessel Type</label>
                    <select
                      name="vessel_type"
                      value={formData.vessel_type}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select type...</option>
                      {vesselTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-field">
                    <label>Flag State</label>
                    <select
                      name="flag_state"
                      value={formData.flag_state}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select flag...</option>
                      {flagStates.map((flag) => (
                        <option key={flag} value={flag}>
                          {flag}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-field">
                    <label>
                      Class / Subtype <span className="opt">(opt.)</span>
                    </label>
                    <input
                      type="text"
                      name="class_subtype"
                      value={formData.class_subtype}
                      onChange={handleInputChange}
                      placeholder="Suezmax, Kamsarmax..."
                    />
                  </div>

                  <div className="form-field">
                    <label>
                      DWT <span className="opt">(opt.)</span>
                    </label>
                    <input
                      type="number"
                      name="dwt"
                      value={formData.dwt}
                      onChange={handleInputChange}
                      placeholder="105000"
                    />
                  </div>

                  <div className="form-field">
                    <label>
                      GT <span className="opt">(opt.)</span>
                    </label>
                    <input
                      type="number"
                      name="gt"
                      value={formData.gt}
                      onChange={handleInputChange}
                      placeholder="58800"
                    />
                  </div>

                  <div className="form-field">
                    <label>
                      Year Built <span className="opt">(opt.)</span>
                    </label>
                    <input
                      type="number"
                      name="year_built"
                      value={formData.year_built}
                      onChange={handleInputChange}
                      placeholder="2018"
                    />
                  </div>

                  <div className="form-field">
                    <label>
                      Trading Area <span className="opt">(opt.)</span>
                    </label>
                    <input
                      type="text"
                      name="trading_area"
                      value={formData.trading_area}
                      onChange={handleInputChange}
                      placeholder="AG / Far East / Atlantic"
                    />
                  </div>

                  <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                    <label>
                      Owner / Manager <span className="opt">(opt.)</span>
                    </label>
                    <input
                      type="text"
                      name="owner_manager"
                      value={formData.owner_manager}
                      onChange={handleInputChange}
                      placeholder="Company name"
                    />
                  </div>
                </div>

                <button type="submit" className="submit-vessel-btn">
                  Register Vessel
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}