import { Anchor, MapPin, Search, Ship, AlertTriangle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getPorts } from "../api/portApi";
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

export default function PortDirectory() {
  const [ports, setPorts] = useState([]);
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("All Regions");
  const [loading, setLoading] = useState(false);

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
        <h1>Port Directory</h1>
        <p>
          Global port intelligence — PSC risk levels, local expert availability,
          and service coverage.
        </p>
      </section>

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
                  {(port.psc_risk_level || "High").toLowerCase() === "high" && (
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
            </article>
          ))}
        </section>
      )}
    </main>
  );
}