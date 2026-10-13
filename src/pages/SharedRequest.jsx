import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { resolveRequestLink } from "../api/requestShareApi";
import { loginPathFor } from "../utils/safeReturnPath";
import ServiceRequestDetails from "./ServiceRequestDetails";
import "./SharedRequest.css";

export default function SharedRequest() {
  const { opaqueIdentifier } = useParams();
  const [state, setState] = useState({ status: "idle", requestId: null });
  const [retry, setRetry] = useState(0);
  const signedIn = Boolean(localStorage.getItem("np_token"));
  useEffect(() => {
    document.title = "Inspection request | Nexaport";
    if (!signedIn) return;
    let active = true;
    resolveRequestLink(opaqueIdentifier).then((result) => {
      if (active) setState({ status: "ready", requestId: result.data.requestId });
    }).catch((error) => {
      if (!active) return;
      setState({ status: error.response?.status === 403 ? "denied" : error.response?.status === 404 ? "unavailable" : "error", requestId: null });
    });
    return () => { active = false; };
  }, [opaqueIdentifier, signedIn, retry]);

  if (signedIn && state.status === "ready") return <ServiceRequestDetails requestId={state.requestId} />;
  if (signedIn) return <main className="shared-request-state"><h1>{state.status === "denied" ? "Access denied" : state.status === "unavailable" ? "Link unavailable" : state.status === "error" ? "Unable to open link" : "Opening request…"}</h1>{state.status === "denied" && <p>You don't have permission to view this inspection request.</p>}{state.status === "unavailable" && <p>This link is no longer available.</p>}{state.status === "error" && <button type="button" onClick={() => { setState({ status: "idle", requestId: null }); setRetry((value) => value + 1); }}>Try again</button>}</main>;

  return <main className="shared-request-page">
    <header className="shared-request-brand">NEXAPORT</header>
    <div className="shared-request-backdrop" aria-hidden="true"><div className="shared-request-placeholder"><div className="shared-request-nav" /><div className="shared-request-row" /><div className="shared-request-row short" /><div className="shared-request-box" /></div></div>
    <section className="shared-request-modal" role="dialog" aria-modal="true" aria-labelledby="shared-request-title">
      <h1 id="shared-request-title">Sign in to view this inspection request</h1>
      <p>Sign in to Nexaport to continue.</p>
      <Link className="shared-request-signin" to={loginPathFor(window.location.pathname)}>Sign in</Link>
    </section>
  </main>;
}
