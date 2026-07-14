import { LayoutGrid, List } from "lucide-react";
import "./ViewToggle.css";

export default function ViewToggle({ value, onChange, label = "Results view" }) {
  return (
    <div className="view-toggle" role="group" aria-label={label}>
      <button
        type="button"
        aria-pressed={value === "grid"}
        aria-label="Grid view"
        title="Grid view"
        onClick={() => onChange("grid")}
      >
        <LayoutGrid size={17} />
      </button>
      <button
        type="button"
        aria-pressed={value === "list"}
        aria-label="List view"
        title="List view"
        onClick={() => onChange("list")}
      >
        <List size={18} />
      </button>
    </div>
  );
}
