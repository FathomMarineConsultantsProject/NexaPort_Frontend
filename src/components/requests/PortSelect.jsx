import { useEffect, useId, useRef, useState } from "react";
import { getPorts } from "../../api/portApi";
import { canonicalPortId, selectionPatch, portOptionIndex } from "./requestPortState.js";
import "./RequestPorts.css";
export default function PortSelect({ ports, portId, portName, country, manualPort = false, allowManual = false, terminalName, eta, originalPortSchedule, onChange, disabled = false }) {
  const id = useId(); const wrapper = useRef(null);
  const requestVersion = useRef(0);
  const [search, setSearch] = useState(""); const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const [open, setOpen] = useState(false); const [active, setActive] = useState(-1); const [pending, setPending] = useState(null);
  const selected = ports?.length ? ports : portId ? [{ id: portId, port_name: portName, isPrimary: true }] : [];
  const options = results.filter((p) => !selected.some((s) => canonicalPortId(s) === canonicalPortId(p)));
  useEffect(() => {
    if (search.trim().length < 2) return;
    const controller = new AbortController(); let live = true;
    const version = requestVersion.current;
    const timer = setTimeout(async () => {
      try { const response = await getPorts({ compact: true, search, limit: 30, signal: controller.signal });
        if (live && version === requestVersion.current) { setResults(response.ports || []); setLoading(false); }
      } catch { if (live && version === requestVersion.current) { setError("Unable to search ports. Please retry."); setResults([]); setLoading(false); } }
    }, 250);
    return () => { live = false; clearTimeout(timer); controller.abort(); };
  }, [search]);
  useEffect(() => { const outside = (event) => { if (!wrapper.current?.contains(event.target)) setOpen(false); };
    document.addEventListener("pointerdown", outside); return () => document.removeEventListener("pointerdown", outside);
  }, []);
  const apply = (patch) => { requestVersion.current += 1; onChange(patch); setSearch(""); setResults([]); setLoading(false); setOpen(false); setPending(null); };
  const change = (next, primary) => { const patch = { ...selectionPatch(next, primary), manualPort: false, country: (next.find((p) => Number(p.id) === Number(primary)) || next[0])?.country || "" };
    if (Number(patch.portId || 0) !== Number(portId || 0) && (terminalName || eta || originalPortSchedule?.terminalName || originalPortSchedule?.eta)) setPending(patch); else apply(patch);
  };
  const choose = (port) => change([...selected, port], portId);
  const useManual = () => {
    const name = search.trim();
    if (!name) return;
    requestVersion.current += 1;
    onChange({ manualPort: true, ports: [], portIds: undefined, primaryPortId: null, portId: null, portName: name, country: "" });
    setSearch(""); setResults([]); setOpen(false); setLoading(false);
  };
  const keyDown = (event) => {
    if (event.key === "Escape") { event.preventDefault(); setOpen(false); }
    if (["ArrowDown", "ArrowUp"].includes(event.key)) { event.preventDefault(); setOpen(true);
      setActive((index) => portOptionIndex(index, event.key, options.length)); }
    if (event.key === "Enter") { event.preventDefault(); if (open && !loading && options.length) choose(options[Math.min(Math.max(active, 0), options.length - 1)]); else setOpen(true); }
  };
  return <div className="request-ports" ref={wrapper}>
    <div className="request-port-tokens">{!manualPort && selected.map((p) => <span className="request-port-token" key={p.id}>
      <span>{p.port_name}{p.country ? ", " + p.country : ""}{p.unlocode ? " (" + p.unlocode + ")" : ""}</span>
      {Number(portId) === Number(p.id) ? <strong>Primary</strong> : <button type="button" disabled={disabled || Boolean(pending)} onClick={() => change(selected, p.id)}>Make primary</button>}
      <button type="button" aria-label={"Remove " + p.port_name} disabled={disabled || Boolean(pending)} onClick={() => change(selected.filter((s) => canonicalPortId(s) !== canonicalPortId(p)), portId)}>×</button>
    </span>)}</div>
    {manualPort && allowManual && <div className="request-port-manual"><p className="request-port-help">New port: {portName}. It will be saved with this request.</p><label htmlFor={id + "-country"}>Country</label><input id={id + "-country"} value={country || ""} required disabled={disabled} onChange={(event) => onChange({ country: event.target.value })} placeholder="Country" /><button type="button" disabled={disabled} onClick={() => onChange({ manualPort: false, portName: "", country: "" })}>Choose an existing port</button></div>}
    {!manualPort && !selected.length && portName && <p className="request-port-help">Historical port: {portName}. Select a canonical port to replace it.</p>}
    <label className="request-port-label" htmlFor={id}>Ports</label>
    <input id={id} role="combobox" aria-autocomplete="list" aria-expanded={open && search.trim().length >= 2} aria-controls={id + "-options"} aria-activedescendant={open && active >= 0 && options[active] ? id + "-option-" + options[active].id : undefined}
      placeholder="Search by port, country or UN/LOCODE" value={search} disabled={disabled || Boolean(pending)} autoComplete="off" onFocus={() => setOpen(true)} onKeyDown={keyDown}
      onChange={(event) => { requestVersion.current += 1; setSearch(event.target.value); setResults([]); setError(""); setActive(-1); setOpen(true); setLoading(event.target.value.trim().length >= 2); }}/>
    {open && search.trim().length >= 2 && <div className="request-port-suggestions">
      {loading && <p role="status">Searching ports…</p>}{error && <p role="alert">{error}</p>}
      {!loading && !error && !options.length && <p role="status">No additional matching ports found.</p>}
      <ul id={id + "-options"} role="listbox" aria-label="Matching ports">{!loading && options.map((p, index) => <li id={id + "-option-" + p.id} key={p.id} role="option" aria-selected={index === active} onMouseDown={(event) => event.preventDefault()}>
        <button type="button" tabIndex={-1} disabled={disabled || Boolean(pending)} onClick={() => choose(p)}>{p.port_name} · {p.country || "Country unavailable"}{p.unlocode ? " · " + p.unlocode : ""}</button>
      </li>)}</ul>
      {!loading && results.length === 30 && <p>Showing the first 30 matches. Refine your search for more specific results.</p>}
      {allowManual && !loading && !error && !options.length && search.trim() && <button type="button" disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={useManual}>Use “{search.trim()}” as a new port</button>}
    </div>}
    {pending && <div className="request-port-confirm" role="group" aria-label="Confirm primary port change"><p>Changing the primary port clears its previous Terminal and ETA. Continue, then enter the new port’s details?</p>
      <button type="button" disabled={disabled} onClick={() => setPending(null)}>Keep current port</button>
      <button type="button" disabled={disabled} onClick={() => apply({ ...pending, terminalName: "", eta: "", confirmPrimaryPortChange: true })}>Change primary and clear details</button>
    </div>}
  </div>;
}
