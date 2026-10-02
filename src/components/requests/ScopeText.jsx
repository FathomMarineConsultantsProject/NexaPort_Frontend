import { scopeHtml } from "./scopeFormatting";

export default function ScopeText({ value }) {
  return <span dangerouslySetInnerHTML={{ __html: scopeHtml(value) }} />;
}
