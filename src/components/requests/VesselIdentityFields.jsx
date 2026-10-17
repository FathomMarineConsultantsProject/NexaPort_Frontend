import { useEffect, useId, useRef, useState } from "react";
import { suggestRequestVessels } from "../../api/vesselApi";
import "./VesselIdentityFields.css";

export default function VesselIdentityFields({ value, onChange, disabled = false }) {
  const listId = useId();
  const [focused, setFocused] = useState("");
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(-1);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const requestVersion = useRef(0);
  const term = focused === "imo" ? value.imoNumber : value.vesselName;

  useEffect(() => {
    const version = ++requestVersion.current;
    if (!focused || String(term || "").trim().length < 2 || value.selectedVessel) {
      queueMicrotask(() => { if (version === requestVersion.current) { setItems([]); setMessage(""); setLoading(false); } });
      return undefined;
    }
    const controller = new AbortController();
    queueMicrotask(() => { if (version === requestVersion.current) { setLoading(true); setItems([]); setMessage(""); } });
    const timer = window.setTimeout(() => {
      suggestRequestVessels(term, controller.signal)
        .then((results) => { if (!controller.signal.aborted && version === requestVersion.current) { setItems(results); setActive(-1); setLoading(false); setMessage(results.length ? "" : "No matching vessels found. You can enter the details manually."); } })
        .catch(() => { if (!controller.signal.aborted && version === requestVersion.current) { setItems([]); setLoading(false); setMessage("Suggestions unavailable. You can continue entering vessel details."); } });
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [focused, term, value.selectedVessel]);

  const select = (item) => {
    onChange({ selectedVessel: { source: item.source, id: item.id },
      vesselName: item.name || value.vesselName, imoNumber: item.imo || "",
      vesselType: item.vessel_type || "",
      flagState: item.flag || "" });
    requestVersion.current += 1; setFocused(""); setItems([]); setActive(-1); setMessage(""); setLoading(false);
  };
  const edit = (field, input) => { requestVersion.current += 1; onChange({ [field]: input, selectedVessel: null }); setItems([]); setActive(-1); setMessage(""); };
  const onKeyDown = (event) => {
    if (event.key === "Escape") { requestVersion.current += 1; setFocused(""); setItems([]); setMessage(""); return; }
    if (!items.length) return;
    if (event.key === "ArrowDown") { event.preventDefault(); setActive((index) => (index + 1) % items.length); }
    if (event.key === "ArrowUp") { event.preventDefault(); setActive((index) => (index - 1 + items.length) % items.length); }
    if (event.key === "Enter" && active >= 0) { event.preventDefault(); select(items[active]); }
  };
  const dropdown = String(term || "").trim().length >= 2 && !value.selectedVessel && (loading || items.length || message) ?
    <div className="request-vessel-suggestions">
      {loading && <p className="request-vessel-message" role="status">Searching vessels…</p>}
      {!loading && items.length > 0 && <div id={listId} role="listbox" aria-label="Matching vessels">
        {items.map((item, index) => <button type="button" key={`${item.source}-${item.id}`} id={`${listId}-${index}`} role="option" aria-selected={active === index}
          className={active === index ? "active" : ""} onMouseDown={(event) => event.preventDefault()} onPointerDown={(event) => { if (event.pointerType === "touch") { event.preventDefault(); select(item); } }} onClick={() => select(item)}>
          <strong>{item.name}</strong><span>{[item.imo ? `IMO: ${item.imo}` : "IMO not recorded", item.vessel_type || "Type not recorded", item.flag || "Flag not recorded", item.mmsi && `MMSI ${item.mmsi}`, item.call_sign && `Call sign ${item.call_sign}`].filter(Boolean).join(" · ")}</span>
        </button>)}
      </div>}
      {!loading && message && <p className="request-vessel-message" role="status">{message}</p>}
    </div> : null;
  return <div className="request-vessel-identity psr-row">
    <div className="psr-group request-vessel-field"><label htmlFor="request-vessel-name">Vessel Name <span className="opt">(opt.)</span></label>
      <input id="request-vessel-name" className="psr-control" name="vesselName" value={value.vesselName || ""} disabled={disabled}
        placeholder="MT Nordic Spirit" autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={focused === "name" && items.length > 0}
        aria-controls={listId} aria-activedescendant={focused === "name" && active >= 0 ? `${listId}-${active}` : undefined}
         onFocus={() => setFocused("name")} onBlur={() => { requestVersion.current += 1; setFocused(""); setItems([]); }} onChange={(event) => edit("vesselName", event.target.value)} onKeyDown={onKeyDown} />{focused === "name" && dropdown}</div>
    <div className="psr-group request-vessel-field"><label htmlFor="request-imo-number">IMO Number <span className="opt">(opt.)</span></label>
      <input id="request-imo-number" className="psr-control" name="imoNumber" value={value.imoNumber || ""} disabled={disabled}
        placeholder="9620865" autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={focused === "imo" && items.length > 0}
        aria-controls={listId} aria-activedescendant={focused === "imo" && active >= 0 ? `${listId}-${active}` : undefined}
         onFocus={() => setFocused("imo")} onBlur={() => { requestVersion.current += 1; setFocused(""); setItems([]); }} onChange={(event) => edit("imoNumber", event.target.value)} onKeyDown={onKeyDown} />{focused === "imo" && dropdown}</div>
  </div>;
}
