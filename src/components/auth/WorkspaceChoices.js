import { createElement as h } from "react";
import { hasMultipleRoles, workspaceRoles, WORKSPACE_LABELS } from "../../utils/workspaceRoles.js";

const descriptions = {
  3: "Manage requests, quotations and inspections",
  2: "View opportunities, assignments and inspections",
};

export default function WorkspaceChoices({ user, busy = false, onSelect }) {
  if (!hasMultipleRoles(user)) return null;
  return h("div", { className: "workspace-choices", "aria-label": "Available workspaces" },
    ...workspaceRoles(user).map((role) => h("button", {
      key: role, type: "button", className: "workspace-choice", disabled: busy,
      onClick: () => onSelect(role), "aria-current": Number(user.role_id) === role ? "true" : undefined,
    }, h("strong", null, WORKSPACE_LABELS[role]),
    Number(user.role_id) === role ? h("small", null, "Current role") : null,
    descriptions[role] ? h("span", null, descriptions[role]) : null)));
}
