import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import "./CustomSelect.css";

export default function CustomSelect({ value, options, onChange, width }) {
  const [open, setOpen] = useState(false);
  const selectRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div className="custom-select" style={{ width }} ref={selectRef}>
      <button onClick={() => setOpen(!open)} className="select-trigger">
        <span>{value}</span>
        <ChevronDown size={16} />
      </button>

      {open && (
        <div className="select-menu">
          {options.map((option) => (
            <button
              key={option}
              className={`select-option ${value === option ? "active" : ""}`}
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
            >
              <span>{option}</span>
              {value === option && <Check size={16} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}