import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAdminCompanyTargetStatus } from "../../api/companyClaimsApi";
import { getAdminProfessionalTargetStatus } from "../../api/professionalClaimsApi";
import { issueClaimInvitation, listClaimInvitations, revokeClaimInvitation } from "../../api/claimInvitationsApi";
import "./AdminClaimStatus.css";

function AdminClaimStatusContent({ companyId, professionalType, professionalId }) {
  const [data,setData]=useState(null),[error,setError]=useState("");
  const [open,setOpen]=useState(false),[email,setEmail]=useState(""),[busy,setBusy]=useState("");
  const [invitation,setInvitation]=useState(null),[notice,setNotice]=useState("");
  const [emailError,setEmailError]=useState(""),[copyState,setCopyState]=useState("");
  const [history,setHistory]=useState([]),[historyError,setHistoryError]=useState("");
  useEffect(()=>{let active=true;const request=companyId ? getAdminCompanyTargetStatus(companyId) : getAdminProfessionalTargetStatus(professionalType,professionalId);
    request.then(result=>{if(active)setData(result);}).catch(err=>{if(active)setError(err.response?.data?.message || "Claim status unavailable.");});
    return()=>{active=false;};},[companyId,professionalType,professionalId]);
  const members=data?.members?.filter(member=>member.status==="approved") || [];
  const pending=data?.history?.filter(claim=>claim.status==="pending") || [];
  const verified=members.some(member=>member.verification_origin==="reviewed_claim") || (!companyId && members.length>0);
  const status=verified ? "Verified" : members.length ? "Legacy association" : data?.counts?.disputed ? "Disputed" : data?.counts?.pending ? "Pending" : "Unclaimed";
  const queue=`/admin/profile-claims?type=${companyId?"companies":"professionals"}`;
  const refresh=async()=>{try{setHistory(await listClaimInvitations({targetType:companyId?"company":professionalType,targetId:companyId||professionalId}));setHistoryError("");}
    catch(err){setHistoryError(err.response?.data?.message || "Invitation history unavailable.");}};
  const issue=async mode=>{const recipient=email.trim();setEmailError("");
    if(mode==="email" && !/^\S+@\S+\.\S+$/.test(recipient)){setEmailError("Enter a valid recipient email to send an invitation.");return;}
    if(recipient && !/^\S+@\S+\.\S+$/.test(recipient)){setEmailError("Enter a valid email or leave it blank to generate a shareable claim link.");return;}
    setBusy(mode);setNotice("");setCopyState("");if(mode==="link")setInvitation(null);try{
    const result=await issueClaimInvitation({targetType:companyId?"company":professionalType,targetId:companyId||professionalId,email:recipient,mode});
    if(mode==="link"){setInvitation(result);setNotice(result.status==="shareable"?"Shareable claim link ready. Anyone with the link may request access, subject to Admin review.":"Invitation link ready for the named recipient.");}
    else setNotice("Accepted by email transport. Inbox delivery has not been confirmed.");
    if(result.status!=="shareable")await refresh();
  }catch(err){setNotice(err.response?.data?.message || "Invitation could not be created.");}finally{setBusy("");}};
  const copy=async()=>{setCopyState("copying");try{await navigator.clipboard.writeText(invitation.url);setCopyState("copied");setNotice("Link copied.");}
    catch{setCopyState("failed");setNotice("Clipboard unavailable. Select and copy the link below.");}};
  const revoke=async id=>{setBusy("revoke");try{await revokeClaimInvitation(id);if(invitation?.id===id)setInvitation(null);setNotice("Invitation revoked.");await refresh();}
    catch(err){setNotice(err.response?.data?.message || "Revocation failed.");}finally{setBusy("");}};
  return <section className="account-ownership" aria-label="Account ownership">
    <div className="account-ownership__head"><div><h2>Account Ownership</h2><p>Profile access is granted only after claim review.</p></div><strong className="account-ownership__status">{data?status:"Loading…"}</strong></div>
    <dl className="account-ownership__facts"><div><dt>Authorized accounts</dt><dd>{members.length}</dd></div><div><dt>Pending requests</dt><dd>{data?.counts?.pending ?? 0}</dd></div></dl>
    {members.length>0 && <p className="account-ownership__members">{members.map(member=>member.full_name).join(", ")}</p>}
    {pending.length>0 && <div className="account-ownership__pending">{pending.slice(0,3).map(claim=><Link key={claim.id} to={`/admin/${companyId?"company":"professional"}-claims/${claim.id}`}>Review pending request</Link>)}</div>}
    {error && <p role="alert" className="account-ownership__error">{error}</p>}
    <div className="account-ownership__actions"><button type="button" disabled={!data} onClick={()=>{if(!open)void refresh();setOpen(value=>!value);}} aria-expanded={open}>Invite to Claim</button><Link to={queue}>View Claims</Link></div>
    {open && <div className="account-ownership__invite"><label>Recipient email (required to send; optional for link)<input type="email" value={email} onChange={event=>{setEmail(event.target.value);setEmailError("");}} aria-invalid={Boolean(emailError)} aria-describedby={emailError?"claim-invite-email-error":undefined} /></label>{emailError&&<span id="claim-invite-email-error" role="alert" className="account-ownership__error">{emailError}</span>}<div className="account-ownership__actions"><button type="button" disabled={Boolean(busy)} onClick={()=>issue("email")}>{busy==="email"?"Sending…":"Send Email"}</button><button type="button" disabled={Boolean(busy)} onClick={()=>issue("link")}>{busy==="link"?"Creating…":"Generate Invitation Link"}</button></div>
      {invitation?.url && <div className="account-ownership__link"><strong>{invitation.status==="shareable"?"Claim Link Ready":"Invitation Link Ready"}</strong><label>{invitation.status==="shareable"?"Shareable claim URL":"Secure invitation URL"}<input readOnly value={invitation.url} onFocus={event=>event.target.select()} /></label><small>{invitation.status==="shareable"?"This claim page does not expire or grant access. Admin review is required.":`Expires ${new Date(invitation.expiresAt).toLocaleString()}. Only ${invitation.recipientEmail} can redeem it.`}</small><div className="account-ownership__actions"><button type="button" disabled={copyState==="copying"} onClick={copy}>{copyState==="copying"?"Copying…":copyState==="copied"?"Copied":"Copy Link"}</button>{invitation.id&&<button type="button" disabled={Boolean(busy)} onClick={()=>revoke(invitation.id)}>Revoke</button>}</div></div>}
      {history.length>0 && <div className="account-ownership__history"><strong>Recent invitations</strong>{history.map(row=><div key={row.id}><span>{row.recipient_email} · {row.status} · expires {new Date(row.expires_at).toLocaleDateString()}</span>{["ready","sent"].includes(row.status) && <button type="button" disabled={Boolean(busy)} onClick={()=>revoke(row.id)}>Revoke</button>}</div>)}</div>}
      {historyError && <p role="alert" className="account-ownership__error">{historyError}</p>}
      {notice && <p role="status">{notice}</p>}</div>}
  </section>;
}

export default function AdminClaimStatus(props) {
  const targetKey=props.companyId ? `company:${props.companyId}` : `${props.professionalType}:${props.professionalId}`;
  return <AdminClaimStatusContent key={targetKey} {...props} />;
}
