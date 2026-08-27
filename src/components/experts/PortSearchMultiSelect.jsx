import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getPorts } from "../../api/portApi";
import "./PortSearchMultiSelect.css";

const DEBOUNCE_MS = 300;

export default function PortSearchMultiSelect({ value, onChange, placeholder }) {
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
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const selectedIds = new Set(value.map((port) => String(port.id)));
  const selectableResults = results.filter((port) => !selectedIds.has(String(port.id)));

  const selectPort = (port) => {
    if (selectedIds.has(String(port.id))) return;

    requestIdRef.current += 1;
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    onChange([...value, port]);
    setInputValue("");
    setResults([]);
    setLoading(false);
    setError("");
    setIsOpen(false);
  };

  const removePort = (portId) => {
    onChange(value.filter((port) => String(port.id) !== String(portId)));
  };

  const handleInputChange = (event) => {
    const nextValue = event.target.value;
    const search = nextValue.trim();

    setInputValue(nextValue);
    setIsOpen(true);

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    if (!search) {
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
        const response = await getPorts({ search, compact: true, limit: 50 });
        if (requestIdRef.current !== requestId) return;

        setResults(response.ports || []);
      } catch (err) {
        if (requestIdRef.current !== requestId) return;

        console.error("Failed to search ports:", err);
        setResults([]);
        setError("Unable to search ports");
      } finally {
        if (requestIdRef.current === requestId) {
          setLoading(false);
        }
      }
    }, DEBOUNCE_MS);
  };

  const handleKeyDown = (event) => {
    if (event.key !== "Enter") return;

    event.preventDefault();
    if (selectableResults.length > 0) {
      selectPort(selectableResults[0]);
    }
  };

  const showDropdown = isOpen && inputValue.trim().length > 0;

  return (
    <div className="port-select-wrapper" ref={wrapperRef}>
      {value.length > 0 && (
        <div className="port-select-tags">
          {value.map((port) => (
            <span key={port.id} className="port-select-tag">
              {port.port_name}
              <button
                type="button"
                onClick={() => removePort(port.id)}
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
            {loading ? (
              <div className="port-select-state">Searching ports...</div>
            ) : error ? (
              <div className="port-select-state error">{error}</div>
            ) : selectableResults.length === 0 ? (
              <div className="port-select-state">No ports found</div>
            ) : (
              selectableResults.map((port) => (
                <button
                  key={port.id}
                  type="button"
                  className="port-select-option"
                  onClick={() => selectPort(port)}
                >
                  <span className="port-select-name">{port.port_name}</span>
                  <span className="port-select-meta">
                    {[port.country, port.region].filter(Boolean).join(" · ")}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
