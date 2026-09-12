import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMe, switchUserRole } from "../api/Auth";
import { getStoredUser } from "../utils/auth";
import { hasMultipleRoles, selectWorkspace, workspaceDestination } from "../utils/workspaceRoles.js";
import WorkspaceChoices from "../components/auth/WorkspaceChoices.js";
import "./ChooseWorkspace.css";

export default function ChooseWorkspace() {
  const navigate = useNavigate();
  const [user, setUser] = useState(getStoredUser);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    getMe().then(({ data }) => {
      if (!active) return;
      setUser(data);
      localStorage.setItem("np_user", JSON.stringify(data));
      setReady(true);
      if (!hasMultipleRoles(data)) navigate(workspaceDestination(data), { replace: true });
    }).catch(() => active && setError("Unable to load workspaces. Please reload to try again."));
    return () => { active = false; };
  }, [navigate]);

  const select = async (role) => {
    if (busy || !ready) return;
    setBusy(true);
    setError("");
    try {
      const destination = await selectWorkspace(user, role, switchUserRole, localStorage);
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to switch workspace.");
    } finally { setBusy(false); }
  };

  return <main className="workspace-page">
    <section className="workspace-panel">
      <p className="workspace-identity">Signed in as {user?.full_name}</p>
      <h1>Choose workspace</h1>
      {error && <p role="alert" className="workspace-error">{error}</p>}
      {!ready && !error && <p role="status">Loading workspaces...</p>}
      {ready && <WorkspaceChoices user={user} busy={busy} onSelect={select} />}
      {busy && <p role="status">Switching workspace...</p>}
    </section>
  </main>;
}
