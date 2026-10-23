import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAdminCompanyTargetStatus } from "../../api/companyClaimsApi";
import { getAdminProfessionalTargetStatus } from "../../api/professionalClaimsApi";
import { companyClaimUrl, copyClaimUrl, professionalClaimUrl } from "../../utils/claimUrl";
import { isSuperAdmin } from "../../utils/auth";
import "./AdminClaimStatus.css";

function AdminClaimStatusContent({ companyId, professionalType, professionalId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [copyState, setCopyState] = useState("");
  const [fallbackUrl, setFallbackUrl] = useState("");

  useEffect(() => {
    let active = true;
    const request = companyId
      ? getAdminCompanyTargetStatus(companyId)
      : getAdminProfessionalTargetStatus(professionalType, professionalId);
    request.then((result) => { if (active) setData(result); })
      .catch((err) => { if (active) setError(err.response?.data?.message || "Claim status unavailable."); });
    return () => { active = false; };
  }, [companyId, professionalType, professionalId]);

  useEffect(() => {
    if (copyState !== "copied") return undefined;
    const timer = window.setTimeout(() => setCopyState(""), 2400);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  const members = data?.members?.filter((member) => member.status === "approved") || [];
  const pending = data?.history?.filter((claim) => claim.status === "pending") || [];
  const verified = members.some((member) => member.verification_origin === "reviewed_claim") || (!companyId && members.length > 0);
  const status = verified ? "Verified" : members.length ? "Legacy association" : data?.counts?.disputed ? "Disputed" : data?.counts?.pending ? "Pending" : "Unclaimed";
  const queue = `/admin/profile-claims?type=${companyId ? "companies" : "professionals"}`;

  const copy = async () => {
    const url = companyId ? companyClaimUrl(companyId) : professionalClaimUrl(professionalType, professionalId);
    setCopyState("");
    setFallbackUrl("");
    try {
      await copyClaimUrl(url);
      setCopyState("copied");
    } catch {
      setFallbackUrl(url);
      setCopyState("failed");
    }
  };

  return <section className="account-ownership" aria-label="Account ownership">
    <div className="account-ownership__head"><div><h2>Account Ownership</h2><p>Profile access is granted only after claim review.</p></div><strong className="account-ownership__status">{error ? "Unavailable" : data ? status : "Loading…"}</strong></div>
    <dl className="account-ownership__facts"><div><dt>Authorized accounts</dt><dd>{members.length}</dd></div><div><dt>Pending requests</dt><dd>{data?.counts?.pending ?? 0}</dd></div></dl>
    {members.length > 0 && <p className="account-ownership__members">{members.map((member) => member.full_name).join(", ")}</p>}
    {pending.length > 0 && <div className="account-ownership__pending">{pending.slice(0, 3).map((claim) => <Link key={claim.id} to={`/admin/${companyId ? "company" : "professional"}-claims/${claim.id}`}>Review pending request</Link>)}</div>}
    {error && <p role="alert" className="account-ownership__error">{error}</p>}
    <div className="account-ownership__actions"><button type="button" disabled={!data} onClick={copy}>Invite to Claim</button><Link to={queue}>View Claims</Link></div>
    {copyState === "copied" && <span className="account-ownership__toast" role="status">Copied to clipboard</span>}
    {copyState === "failed" && <div className="account-ownership__fallback" role="alert"><label>Clipboard unavailable. Select and copy this link.<input readOnly value={fallbackUrl} onFocus={(event) => event.target.select()} /></label></div>}
  </section>;
}

export default function AdminClaimStatus(props) {
  const targetKey = props.companyId ? `company:${props.companyId}` : `${props.professionalType}:${props.professionalId}`;
  return isSuperAdmin() ? <AdminClaimStatusContent key={targetKey} {...props} /> : null;
}
