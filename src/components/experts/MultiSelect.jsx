import { ChevronDown, X } from "lucide-react";
import { useMemo, useState } from "react";
import "./MultiSelect.css";

export default function MultiSelect({
  options = [],
  value,
  onChange,
  placeholder = "Select...",
  multiSelect = false,
  labelKey = null,
}) {
  const [open, setOpen] = useState(false);

  const getLabel = (item) => {
    if (!item) return "";
    return labelKey && typeof item === "object" ? item[labelKey] : item;
  };

  const getValue = (item) => {
    if (!item) return "";
    return typeof item === "object" ? item.id : item;
  };

  const selectedItems = multiSelect ? value || [] : value ? [value] : [];

  const availableOptions = useMemo(() => {
    if (!multiSelect) return options;

    return options.filter(
      (option) =>
        !selectedItems.some(
          (selected) => getValue(selected) === getValue(option)
        )
    );
  }, [options, selectedItems, multiSelect]);

  const handleSelect = (option) => {
    if (multiSelect) {
      onChange([...(value || []), option]);
    } else {
      onChange(option);
      setOpen(false);
    }
  };

  const handleRemove = (itemToRemove) => {
    onChange(
      (value || []).filter(
        (item) => getValue(item) !== getValue(itemToRemove)
      )
    );
  };

  return (
    <div className="multi-select">
      {multiSelect && selectedItems.length > 0 && (
        <div className="selected-tags">
          {selectedItems.map((item) => (
            <span className="selected-tag" key={getValue(item)}>
              {getLabel(item)}
              <button type="button" onClick={() => handleRemove(item)}>
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      )}

      <button
        type="button"
        className="multi-select-trigger"
        onClick={() => setOpen(!open)}
      >
        <span>{!multiSelect && value ? getLabel(value) : placeholder}</span>
        <ChevronDown size={18} />
      </button>

      {open && (
        <div className="multi-select-menu">
          {availableOptions.map((option) => (
            <button
              type="button"
              className="multi-select-option"
              key={getValue(option)}
              onClick={() => handleSelect(option)}
            >
              {getLabel(option)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}