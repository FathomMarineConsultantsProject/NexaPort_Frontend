import { useEffect, useId, useState } from "react";
import { getPorts } from "../../api/portApi";

export default function PortSelect({ portId, portName, onChange, disabled = false }) {
  const listId = useId();
  const [search, setSearch] = useState("");
  const [ports, setPorts] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    const timer = setTimeout(async () => {
      try {
        const response = await getPorts({ compact: true, search, limit: 30 });
        if (live) { setPorts(response.ports || []); setError(""); }
      } catch { if (live) setError("Unable to search ports. Please try again."); }
    }, 250);
    return () => { live = false; clearTimeout(timer); };
  }, [search]);
  return <div className="request-port-select">
    {portName && <div>{portName} <button type="button" disabled={disabled} onClick={() => onChange({ portId: null, portName: "" })}>Clear Port</button></div>}
    <label htmlFor={listId}>Search Ports</label>
    <input id={listId} type="search" placeholder="Search by port, country or UN/LOCODE" value={search} disabled={disabled} onChange={(event) => setSearch(event.target.value)} />
    <select aria-label="Port" value="" disabled={disabled} onChange={(event) => {
      const port = ports.find((item) => String(item.id) === event.target.value);
      if (port) { onChange({ portId: port.id, portName: port.port_name }); setSearch(""); }
    }}>
      <option value="">{portId ? "Change Port…" : "Select Port…"}</option>
      {ports.map((port) => <option key={port.id} value={port.id}>{port.port_name}{port.country ? `, ${port.country}` : ""}{port.unlocode ? ` (${port.unlocode})` : ""}</option>)}
    </select>
    {error && <small role="alert">{error}</small>}
  </div>;
}
