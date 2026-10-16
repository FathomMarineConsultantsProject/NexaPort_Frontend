import ScopeText from "../requests/ScopeText";
import { workflowScopeBlocks } from "./workflowScopeBlocks";

// Match the Request Details narrative blocks while using its escaped inline formatter.
export default function WorkflowScope({ value }) {
  const blocks = workflowScopeBlocks(value);
  if (!blocks.length) return <p>Not provided</p>;

  return <div className="workflow-scope-content">{blocks.map((block, index) => {
    return block.type === "list"
      ? <ul key={index}>{block.lines.map((line, lineIndex) => <li key={lineIndex}><ScopeText value={line} /></li>)}</ul>
      : <p key={index}><ScopeText value={block.lines.join("\n")} /></p>;
  })}</div>;
}
