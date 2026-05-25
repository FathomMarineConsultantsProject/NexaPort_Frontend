import { ChevronDown } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import "./MultiSelect.css";

export default function MultiSelect({
  options,
  value,
  onChange,
  placeholder,
  multiSelect = false,
}) {
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

  const handleSelect = (option) => {
    if (multiSelect) {
      const isSelected = value.includes(option);
      if (isSelected) {
        onChange(value.filter((v) => v !== option));
      } else {
        onChange([...value, option]);
      }
    } else {
      onChange(option);
      setOpen(false);
    }
  };

  const displayText = () => {
    if (multiSelect) {
      return value.length > 0 ? `${value.length} selected` : placeholder;
    }
    return value || placeholder;
  };

  return (
    <div className="multi-select" ref={selectRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="multi-select-trigger"
      >
        <span>{displayText()}</span>
        <ChevronDown size={18} />
      </button>

      {open && (
        <div className="multi-select-menu">
          {options.map((option) => {
            const isSelected = multiSelect
              ? value.includes(option)
              : value === option;

            return (
              <button
                key={option}
                type="button"
                className={`multi-select-option ${isSelected ? "active" : ""}`}
                onClick={() => handleSelect(option)}
              >
                {option}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}