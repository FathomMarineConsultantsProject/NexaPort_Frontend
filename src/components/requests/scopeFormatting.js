const escapeHtml = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

// Only bold and line breaks are supported. User/provider HTML always stays text.
export function scopeHtml(value = "") {
  return escapeHtml(String(value)).replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>");
}

export function scopeMarkdown(root) {
  const read = (node) => {
    if (node.nodeType === 3) return node.textContent || "";
    if (node.nodeName === "BR") return "\n";
    const text = Array.from(node.childNodes || []).map(read).join("");
    const bold = ["STRONG", "B"].includes(node.nodeName) || ["bold", "700"].includes(node.style?.fontWeight);
    return bold && text ? text.split("\n").map((line) => line ? `**${line}**` : "").join("\n") : text;
  };
  return Array.from(root.childNodes).map((node, index) => {
    const block = ["DIV", "P"].includes(node.nodeName);
    return `${block && index > 0 ? "\n" : ""}${read(node)}`;
  }).join("");
}
