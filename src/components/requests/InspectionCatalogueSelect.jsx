import { Search } from "lucide-react";
import { useState } from "react";
import "./InspectionCatalogueSelect.css";

export const findInspectionMethod = (verticals = [], methodId) => {
  const targetId = Number(methodId);
  if (!Number.isInteger(targetId) || targetId <= 0) return null;

  for (const vertical of verticals) {
    const method = (vertical.methods || []).find((item) => Number(item.id) === targetId);
    if (method) return { method, vertical };
  }

  return null;
};

export default function InspectionCatalogueSelect({
  verticals = [],
  selectedMethodId,
  isOther,
  otherValue,
  onSelectMethod,
  onSelectOther,
  onOtherChange,
  error,
  otherError,
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const selected = findInspectionMethod(verticals, selectedMethodId);
  const visibleVerticals = verticals
    .map((vertical) => ({
      ...vertical,
      methods: (vertical.methods || []).filter((method) => {
        if (!normalizedQuery) return true;
        return `${vertical.name} ${method.name}`.toLowerCase().includes(normalizedQuery);
      }),
    }))
    .filter((vertical) => vertical.methods.length);

  return (
    <div className="inspection-catalogue-select">
      <div className="inspection-catalogue-search">
        <Search size={16} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search inspection catalogue"
        />
      </div>

      <div className="inspection-catalogue-list" role="listbox" aria-label="Inspection type">
        {visibleVerticals.map((vertical) => (
          <section className="inspection-catalogue-group" key={vertical.id || vertical.slug}>
            <h3>{vertical.name}</h3>
            <div>
              {vertical.methods.map((method) => {
                const active = !isOther && Number(selected?.method?.id) === Number(method.id);
                return (
                  <button
                    type="button"
                    key={method.id || method.slug}
                    className={active ? "active" : ""}
                    onClick={() => onSelectMethod(method, vertical)}
                  >
                    {method.name}
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        <section className="inspection-catalogue-group">
          <h3>Other</h3>
          <button type="button" className={isOther ? "active" : ""} onClick={onSelectOther}>
            Other / specialist service
          </button>
        </section>
      </div>

      {error && <small className="inspection-catalogue-error">{error}</small>}

      {isOther && (
        <div className="inspection-catalogue-other">
          <label htmlFor="serviceTypeOther">Specify Service Required</label>
          <textarea
            id="serviceTypeOther"
            value={otherValue}
            onChange={(event) => onOtherChange(event.target.value)}
            placeholder="Describe the survey, inspection, audit or specialist maritime service needed."
            maxLength={500}
            aria-invalid={Boolean(otherError)}
          />
          {otherError && <small className="inspection-catalogue-error">{otherError}</small>}
        </div>
      )}
    </div>
  );
}
