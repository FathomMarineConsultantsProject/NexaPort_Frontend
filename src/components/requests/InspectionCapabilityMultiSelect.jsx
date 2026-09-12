import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import "./InspectionCapabilityMultiSelect.css";

const normalizeIds = (ids = []) => new Set(ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0));

export const flattenInspectionCatalogue = (verticals = []) =>
  verticals.flatMap((vertical) =>
    (vertical.methods || []).map((method) => ({
      ...method,
      verticalId: vertical.id,
      verticalName: vertical.name,
    }))
  );

export default function InspectionCapabilityMultiSelect({
  verticals = [],
  selectedIds = [],
  onChange,
  error,
}) {
  const [query, setQuery] = useState("");
  const selectedSet = useMemo(() => normalizeIds(selectedIds), [selectedIds]);
  const selectedMethods = useMemo(
    () => flattenInspectionCatalogue(verticals).filter((method) => selectedSet.has(Number(method.id))),
    [selectedSet, verticals]
  );
  const normalizedQuery = query.trim().toLowerCase();
  const visibleVerticals = verticals
    .map((vertical) => ({
      ...vertical,
      methods: (vertical.methods || []).filter((method) => {
        if (!normalizedQuery) return true;
        return `${vertical.name} ${method.name}`.toLowerCase().includes(normalizedQuery);
      }),
    }))
    .filter((vertical) => vertical.methods.length);

  const toggleMethod = (methodId) => {
    const id = Number(methodId);
    const next = new Set(selectedSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(Array.from(next));
  };

  return (
    <div className="inspection-capability-picker">
      <div className="inspection-capability-search">
        <Search size={16} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search inspection capabilities"
        />
      </div>

      <div className="inspection-capability-selected">
        {selectedMethods.length ? selectedMethods.map((method) => (
          <button type="button" key={method.id} onClick={() => toggleMethod(method.id)}>
            {method.name}
            <X size={13} />
          </button>
        )) : <span>Not provided</span>}
      </div>

      <div className="inspection-capability-list">
        {visibleVerticals.map((vertical) => (
          <section key={vertical.id || vertical.slug}>
            <h3>{vertical.name}</h3>
            <div>
              {vertical.methods.map((method) => (
                <label key={method.id}>
                  <input
                    type="checkbox"
                    checked={selectedSet.has(Number(method.id))}
                    onChange={() => toggleMethod(method.id)}
                  />
                  <span>{method.name}</span>
                </label>
              ))}
            </div>
          </section>
        ))}
      </div>

      {error && <p className="inspection-capability-error">{error}</p>}
    </div>
  );
}
