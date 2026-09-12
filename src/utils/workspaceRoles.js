export const WORKSPACE_LABELS = { 1: "Super Admin", 2: "Consultant", 3: "Client", 4: "Maritime Company" };
export const workspaceRoles = (user) => [...new Set((user?.roles || [user?.role_id]).map(Number))]
  .filter((role) => Object.hasOwn(WORKSPACE_LABELS, role));
export const hasMultipleRoles = (user) => workspaceRoles(user).length > 1;
export const workspaceDestination = (user) => Number(user?.role_id) === 3 && user?.verification_status !== "approved"
  ? "/client-verification-status" : "/dashboard";
export const loginDestination = (user) => hasMultipleRoles(user) ? "/choose-workspace" : workspaceDestination(user);
export const canSelectRole = (user, role) => Number.isInteger(role) && workspaceRoles(user).includes(role);

export async function selectWorkspace(user, role, switchRole, storage) {
  if (!canSelectRole(user, role)) throw new Error("This workspace is not assigned to your account.");
  const response = await switchRole(role);
  if (!response.token || Number(response.user?.role_id) !== role || !canSelectRole(response.user, role)) {
    throw new Error("Unable to establish the selected workspace.");
  }
  storage.setItem("np_token", response.token);
  storage.setItem("np_user", JSON.stringify(response.user));
  return workspaceDestination(response.user);
}
