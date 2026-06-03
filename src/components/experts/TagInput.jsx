import { X } from "lucide-react";
import { useState } from "react";
import "./Taginput.css";

export default function TagInput({ tags, onChange, placeholder }) {
  const [inputValue, setInputValue] = useState("");

  const handleAddTag = () => {
    const trimmed = inputValue.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
      setInputValue("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    onChange(tags.filter((tag) => tag !== tagToRemove));
  };

  return (
    <div className="tag-input-wrapper">
      {tags.length > 0 && (
        <div className="tag-list">
          {tags.map((tag) => (
            <span key={tag} className="tag-item">
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="tag-remove"
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="tag-input-row">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="tag-input-field"
        />
        <button
          type="button"
          onClick={handleAddTag}
          className="tag-add-btn"
        >
          +
        </button>
      </div>
    </div>
  );
}