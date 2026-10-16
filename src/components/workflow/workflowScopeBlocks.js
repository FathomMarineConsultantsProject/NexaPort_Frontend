const listLine = /^(?:[-*•]|\d+[.)])\s+/;

export function workflowScopeBlocks(value) {
  return String(value || "").trim().split(/\n\s*\n/).filter(Boolean).flatMap((block) => {
    const lines = block.split(/\n/).map((line) => line.trim()).filter(Boolean);
    const groups = [];
    for (const line of lines) {
      const type = listLine.test(line) ? "list" : "paragraph";
      if (groups.at(-1)?.type !== type) groups.push({ type, lines: [] });
      groups.at(-1).lines.push(type === "list" ? line.replace(listLine, "") : line);
    }
    return groups;
  });
}
