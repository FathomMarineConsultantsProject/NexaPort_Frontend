import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getPorts } from "../../api/portApi";
import {
  canAddCustomPort,
  createCustomPort,
  normalizePortName,
  portIdentity,
} from "../../utils/portSelection";
import "./PortSearchMultiSelect.css";

const DEBOUNCE_MS = 300;
const MIN_SEARCH_LENGTH = 2;

export default function PortSearchMultiSelect({
  value,
  onChange,
  placeholder,
  searchPorts = getPorts,
  allowCustom = false,
}) {
  const [inputValue, setInputValue] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);
  const requestIdRef = useRef(0);
  const debounceRef = useRef(null);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => () => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
  }, []);

  const selectedNames = new Set(value.map(portIdentity));
  const selectableResults = results.filter((port) => !selectedNames.has(portIdentity(port)));
  const customName = normalizePortName(inputValue);
  const hasExactDirectoryMatch = results.some(
    (port) => portIdentity(port) === customName.toLowerCase()
  );
  const canAddCustom =
    allowCustom && !hasExactDirectoryMatch && canAddCustomPort(customName, value);

  const selectPort = (port) => {
    const identity = portIdentity(port);
    if (!identity || selectedNames.has(identity)) return;
    requestIdRef.current += 1;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    onChange([...value, port]);
    setInputValue("");
    setResults([]);
    setLoading(false);
    setError("");
    setIsOpen(false);
  };

  const removePort = (portToRemove) => {
    onChange(value.filter((port) => portIdentity(port) !== portIdentity(portToRemove)));
  };

  const addCustomPort = () => {
    if (canAddCustom) selectPort(createCustomPort(customName));
  };

  const handleInputChange = (event) => {
    const nextValue = event.target.value;
    const search = nextValue.trim();
    setInputValue(nextValue);
    setIsOpen(true);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    if (!search || search.length < MIN_SEARCH_LENGTH) {
      requestIdRef.current += 1;
      setResults([]);
      setLoading(false);
      setError("");
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError("");

    debounceRef.current = window.setTimeout(async () => {
      try {
        const response = await searchPorts({ search, compact: true, limit: 50 });
        if (requestIdRef.current !== requestId) return;
        setResults(response.ports || []);
      } catch (err) {
        if (requestIdRef.current !== requestId) return;
        console.error("Failed to search ports:", err);
        setResults([]);
        setError("Unable to search ports. You can try again or add the port manually.");
      } finally {
        if (requestIdRef.current === requestId) setLoading(false);
      }
    }, DEBOUNCE_MS);
  };

  const handleKeyDown = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (selectableResults.length > 0) selectPort(selectableResults[0]);
    else if (canAddCustom) addCustomPort();
  };

  const showDropdown = isOpen && inputValue.trim().length > 0;

  return (
    <div className="port-select-wrapper" ref={wrapperRef}>
      {value.length > 0 && (
        <div className="port-select-tags">
          {value.map((port) => (
            <span key={port.id ?? portIdentity(port)} className="port-select-tag">
              {port.port_name}{port.unlocode ? ` — ${port.unlocode}` : ""}
              <button
                type="button"
                onClick={() => removePort(port)}
                className="port-select-remove"
                aria-label={`Remove ${port.port_name}`}
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="port-select-input-wrap">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="port-select-input"
          autoComplete="off"
        />

        {showDropdown && (
          <div className="port-select-menu">
            {inputValue.trim().length < MIN_SEARCH_LENGTH ? (
              <div className="port-select-state">Type at least 2 characters to search.</div>
            ) : loading ? (
              <div className="port-select-state">Searching ports...</div>
            ) : (
              <>
                {error && <div className="port-select-state error">{error}</div>}
                {!error && selectableResults.length === 0 && !canAddCustom && (
                  <div className="port-select-state">No ports found</div>
                )}
                {selectableResults.map((port) => (
                  <button
                    key={port.id}
                    type="button"
                    className="port-select-option"
                    onClick={() => selectPort(port)}
                  >
                    <span className="port-select-name">
                      {port.port_name}{port.unlocode ? ` — ${port.unlocode}` : ""}
                    </span>
                    <span className="port-select-meta">
                      {[port.country, port.region].filter(Boolean).join(" · ")}
                    </span>
                  </button>
                ))}
                {canAddCustom && (
                  <button
                    type="button"
                    className="port-select-option port-select-custom"
                    onClick={addCustomPort}
                  >
                    <span className="port-select-name">Add “{customName}”</span>
                    <span className="port-select-meta">Add as custom port coverage</span>
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
