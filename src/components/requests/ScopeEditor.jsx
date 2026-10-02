import { useLayoutEffect, useRef } from "react";
import { scopeHtml, scopeMarkdown } from "./scopeFormatting";
import "./RequestEnhancements.css";

export default function ScopeEditor({ value = "", onChange, placeholder = "Write your scope of work...", disabled = false, required = false }) {
  const editor = useRef(null);
  const lastValue = useRef(null);
  useLayoutEffect(() => {
    if (lastValue.current !== value) {
      editor.current.innerHTML = scopeHtml(value);
      lastValue.current = value;
    }
  }, [value]);
  const update = () => {
    const text = scopeMarkdown(editor.current);
    lastValue.current = text;
    onChange(text);
  };
  return <div ref={editor} className="scope-editor" role="textbox" aria-label="Scope of Work" aria-multiline="true" aria-required={required} aria-disabled={disabled} contentEditable={!disabled} suppressContentEditableWarning data-placeholder={placeholder}
    onInput={update}
    onBlur={() => { editor.current.innerHTML = scopeHtml(lastValue.current || ""); }}
    onPaste={(event) => {
      event.preventDefault();
      const selection = window.getSelection();
      if (!selection?.rangeCount || !editor.current.contains(selection.anchorNode)) return;
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const text = document.createTextNode(event.clipboardData.getData("text/plain"));
      range.insertNode(text); range.setStartAfter(text); range.collapse(true);
      selection.removeAllRanges(); selection.addRange(range); update();
    }} />;
}
