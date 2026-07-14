import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getMe } from "../../api/Auth";
import { getStoredUser } from "../../utils/auth";

export default function ApprovedClientRoute({ children }) {
  const [state, setState] = useState({ loading: true, user: getStoredUser() });

  useEffect(() => {
    let active = true;
    getMe()
      .then((response) => {
        if (!active) return;
        const user = response.data || {};
        localStorage.setItem("np_user", JSON.stringify(user));
        setState({ loading: false, user });
      })
      .catch(() => active && setState((current) => ({ ...current, loading: false })));
    return () => { active = false; };
  }, []);

  if (state.loading) return <div className="route-loading">Checking account access...</div>;
  if (Number(state.user?.role_id) === 3 && state.user?.verification_status !== "approved") {
    return <Navigate to="/client-verification-status" replace />;
  }
  return children;
}
