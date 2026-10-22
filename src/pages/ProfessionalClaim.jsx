import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createProfessionalEvidenceUpload, getManagedProfessionals, getMyProfessionalClaims, getProfessionalClaimState,
  getProfessionalProfile, getPublicProfessional, registerProfessionalClaimAccount, searchProfessionals, submitProfessionalClaim, updateProfessionalProfile } from "../api/professionalClaimsApi";
import { redeemClaimInvitation } from "../api/claimInvitationsApi";
import CopyClaimLink from "../components/directories/CopyClaimLink";
import "./CompanyClaim.css";

const claimPath = (type,id) => `/professionals/${encodeURIComponent(type)}/${encodeURIComponent(id)}/claim`;
const types = { expert: "Consultant",flag_inspector: "Flag State Inspector",accredited_inspector: "Accredited Inspector",appointed_surveyor: "Appointed Surveyor" };

export function ProfessionalSearch() {
  const [q,setQ] = useState(""), [rows,setRows] = useState([]), [error,setError] = useState(""), [loading,setLoading] = useState(false);
  const search = async event => { event.preventDefault(); setLoading(true); setError(""); try { setRows(await searchProfessionals({ q })); }
    catch (err) { setError(err.response?.data?.message || "Search is unavailable."); } finally { setLoading(false); } };
  return <main className="claim-page"><div className="claim-panel"><header><small>Professional directory</small><h1>Find your professional profile</h1><p>Select the exact existing listing before creating an account or requesting access.</p></header>
    <form className="claim-search" onSubmit={search}><label htmlFor="professional-search">Name or NexaPort reference</label><div><input id="professional-search" value={q} onChange={e=>setQ(e.target.value)} minLength={2} maxLength={120} required /><button disabled={loading}>{loading ? "Searching…" : "Search"}</button></div></form>
    {error && <p role="alert" className="claim-error">{error}</p>}
    <div className="claim-results">{rows.map(row=><article key={`${row.source_type}:${row.source_id}`}><div><strong>{row.name}</strong><small>{row.public_id} · {types[row.source_type]} · {row.country || "Location not listed"}</small></div><Link to={claimPath(row.source_type,row.source_id)}>View profile</Link></article>)}</div>
    <p className="claim-footnote">Not listed? <Link to="/register-consultant">Register as a new Consultant</Link>.</p></div></main>;
}

export default function ProfessionalClaim() {
  const { type,id } = useParams();
  const [profile,setProfile] = useState(null), [state,setState] = useState(null), [loading,setLoading] = useState(true), [error,setError] = useState(""), [saving,setSaving] = useState(false);
  const [file,setFile] = useState(null);
  const [form,setForm] = useState({ applicantName:"",businessEmail:"",relationship:"",professionalReference:"" });
  const authenticated = Boolean(localStorage.getItem("np_token"));
  useEffect(()=>{ let active=true; Promise.all([getPublicProfessional(type,id),authenticated ? getProfessionalClaimState(type,id) : Promise.resolve(null)])
    .then(([p,s])=>{if(active){setProfile(p);setState(s);}}).catch(err=>{if(active)setError(err.response?.data?.message || "Unable to load this profile.");})
    .finally(()=>{if(active)setLoading(false);}); return ()=>{active=false;}; },[type,id,authenticated]);
  const submit = async e => { e.preventDefault(); setSaving(true); setError(""); try {
    let evidence;
    if (file) {
      if (!["application/pdf","image/jpeg","image/png","image/webp"].includes(file.type) || file.size>5242880) throw new Error("Use PDF or image up to 5 MB.");
      const upload=await createProfessionalEvidenceUpload({ contentType:file.type,size:file.size });
      const result=await fetch(upload.uploadUrl,{ method:"PUT",headers:{"content-type":file.type},body:file });
      if(!result.ok) throw new Error("Evidence upload failed.");
      evidence={ key:upload.key,contentType:file.type,size:file.size };
    }
    await submitProfessionalClaim({ sourceType:type,sourceId:profile.source_id,...form,evidence });
    setState(await getProfessionalClaimState(type,id));
  } catch(err) { setError(err.response?.data?.message || err.message || "Claim could not be submitted."); } finally {setSaving(false);} };
  if(loading) return <main className="claim-page"><p role="status">Loading professional profile…</p></main>;
  if(!profile) return <main className="claim-page"><p role="alert">{error || "Profile unavailable."}</p><Link to="/professionals">Find a profile</Link></main>;
  const current=state?.account_claim_state;
  return <main className="claim-page"><div className="claim-panel"><Link className="claim-back" to="/professionals">← Find another profile</Link>
    <header><small>{types[type]} · {profile.public_id}</small><h1>{profile.name}</h1><p>{profile.country || "Location not listed"}</p></header>
    <CopyClaimLink path={claimPath(type,profile.source_id)} />
    {current==="managed" ? <div className="claim-state"><strong>You manage this profile</strong><p>Your approved access is active.</p><Link to={`/professional-profile/${type}/${profile.source_id}`}>Manage profile</Link></div>
      : current==="pending" ? <div className="claim-state" role="status"><strong>Claim Pending</strong><p>Super Admin is reviewing your identity. Profile editing is unavailable until approval.</p></div>
      : !authenticated ? <div className="claim-state"><h2>Claim this Profile</h2><p>Sign in or create a NexaPort account to request a verified link to this existing listing.</p><div className="claim-actions"><Link to={`/login?returnTo=${encodeURIComponent(claimPath(type,profile.source_id))}`}>Sign in to claim</Link><Link to={`/register-professional-claim?returnTo=${encodeURIComponent(claimPath(type,profile.source_id))}`}>Create account</Link></div></div>
      : <form className="claim-form" onSubmit={submit}><h2>{current==="verified_elsewhere" ? "Request identity review" : "Claim this Profile"}</h2>
        {current==="rejected" && <p role="status">Prior claim rejected. {state.own_claim?.public_reason || "You may submit new evidence."}</p>}
        {current==="verified_elsewhere" && <p>Another verified account controls this profile. Your request will require conflict review.</p>}
        <div className="claim-grid"><label>Your full name<input value={form.applicantName} onChange={e=>setForm({...form,applicantName:e.target.value})} required /></label><label>Business email<input type="email" value={form.businessEmail} onChange={e=>setForm({...form,businessEmail:e.target.value})} required /></label><label>Professional reference (optional)<input value={form.professionalReference} onChange={e=>setForm({...form,professionalReference:e.target.value})} /></label></div>
        <label>How can you verify this is your profile?<textarea value={form.relationship} onChange={e=>setForm({...form,relationship:e.target.value})} minLength={20} maxLength={3000} required /></label>
        <label>Supporting document (optional)<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0] || null)} /><small>Private; visible only to authorized reviewers. PDF or image, up to 5 MB.</small></label>
        {error && <p role="alert" className="claim-error">{error}</p>}<button disabled={saving}>{saving ? "Submitting…" : "Submit for review"}</button></form>}
  </div></main>;
}

export function RegisterProfessionalClaim() {
  const navigate=useNavigate();
  const returnTo=new URLSearchParams(window.location.search).get("returnTo") || "";
  const inviteToken=new URLSearchParams(window.location.search).get("inviteToken");
  const match=/^\/professionals\/(expert|flag_inspector|accredited_inspector|appointed_surveyor)\/([0-9A-Za-z-]{1,100})\/claim$/.exec(returnTo);
  const [form,setForm]=useState({ fullName:"",email:"",username:"",password:"",confirmPassword:"" }),[error,setError]=useState(""),[saving,setSaving]=useState(false);
  const [profile,setProfile]=useState(null);
  useEffect(()=>{const target=/^\/professionals\/(expert|flag_inspector|accredited_inspector|appointed_surveyor)\/([0-9A-Za-z-]{1,100})\/claim$/.exec(returnTo);if(target)getPublicProfessional(target[1],target[2]).then(setProfile).catch(()=>setError("Selected profile is unavailable."));},[returnTo]);
  if(!match) return <main className="claim-page"><p role="alert">Select an existing professional profile first.</p><Link to="/professionals">Find a profile</Link></main>;
  const submit=async e=>{e.preventDefault();setSaving(true);setError("");try {const response=await registerProfessionalClaimAccount({ ...form,sourceType:match[1],sourceId:match[2] });
    localStorage.setItem("np_token",response.token);localStorage.setItem("np_user",JSON.stringify(response.user));
    if(inviteToken && /^[0-9a-f]{64}$/.test(inviteToken)) {try{await redeemClaimInvitation(inviteToken);}catch{navigate(`/claim-invitations/${inviteToken}`,{replace:true});return;}}
    navigate(returnTo,{replace:true});
  }catch(err){setError(err.response?.data?.message || "Registration failed.");}finally{setSaving(false);}};
  return <main className="claim-page"><div className="claim-panel"><header><small>Professional profile claim</small><h1>Create your NexaPort account</h1><p>{profile ? `${profile.name} · ${profile.public_id}` : "Loading selected profile…"}</p></header><form className="claim-form" onSubmit={submit}>
    <div className="claim-grid">{[["fullName","Full name","text"],["email","Email","email"],["username","Username","text"],["password","Password","password"],["confirmPassword","Confirm password","password"]].map(([key,label,type])=><label key={key}>{label}<input type={type} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} required /></label>)}</div>
    <p>Your account will not control this profile until Super Admin approves your claim.</p>{error && <p role="alert" className="claim-error">{error}</p>}<button disabled={!profile || saving}>{saving ? "Creating…" : "Create account and continue"}</button></form></div></main>;
}

export function MyProfessionalClaims() {
  const [claims,setClaims]=useState([]),[managed,setManaged]=useState([]),[error,setError]=useState("");
  useEffect(()=>{Promise.all([getMyProfessionalClaims(),getManagedProfessionals()]).then(([c,m])=>{setClaims(c);setManaged(m);}).catch(err=>setError(err.response?.data?.message || "Unable to load your professional claims."));},[]);
  return <main className="claim-page"><div className="claim-panel"><header><small>Consultant account</small><h1>Professional profiles</h1></header>{error && <p role="alert" className="claim-error">{error}</p>}
    <h2>Managed profiles</h2><div className="claim-results">{managed.map(row=><article key={`${row.source_type}:${row.source_id}`}><div><strong>{row.profile.name}</strong><small>{row.profile.public_id} · {types[row.source_type]}</small></div><Link to={`/professional-profile/${row.source_type}/${row.source_id}`}>Manage</Link></article>)}</div>
    <h2>Claim requests</h2><div className="claim-results">{claims.map(row=><article key={row.id || `${row.source_type}:${row.source_id}`}><div><strong>{types[row.source_type]}</strong><small>{row.status === "not_submitted" ? "Claim not yet submitted" : row.status} · {row.source_id}</small>{row.decision_note && <p>{row.decision_note}</p>}</div><Link to={claimPath(row.source_type,row.source_id)}>{row.status === "not_submitted" ? "Complete claim" : "View"}</Link></article>)}</div>
    {!claims.length && !managed.length && <p>No linked profile yet. <Link to="/professionals">Find your existing listing</Link>.</p>}</div></main>;
}

export function ManagedProfessionalProfile() {
  const {type,id}=useParams();
  const [data,setData]=useState(null),[form,setForm]=useState({biography:"",publicEmail:"",publicPhone:"",availability:""}),[error,setError]=useState(""),[saved,setSaved]=useState(false);
  useEffect(()=>{getProfessionalProfile(type,id).then(result=>{setData(result);setForm({biography:result.overlay?.biography || "",publicEmail:result.overlay?.public_email || "",publicPhone:result.overlay?.public_phone || "",availability:result.overlay?.availability || ""});}).catch(err=>setError(err.response?.data?.message || "Profile unavailable."));},[type,id]);
  const submit=async e=>{e.preventDefault();setError("");setSaved(false);try {await updateProfessionalProfile(type,id,form);setSaved(true);}catch(err){setError(err.response?.data?.message || "Update failed.");}};
  if(!data) return <main className="claim-page"><p role={error?"alert":"status"}>{error || "Loading profile…"}</p></main>;
  return <main className="claim-page"><div className="claim-panel"><header><small>{types[type]} · {data.profile.public_id}</small><h1>{data.profile.name}</h1><p>Personal and business details you control. Imported credentials remain maintained by NexaPort.</p></header>
    <form className="claim-form" onSubmit={submit}><label>Biography<textarea value={form.biography} onChange={e=>setForm({...form,biography:e.target.value})} maxLength={3000} /></label><div className="claim-grid">
      {[["publicEmail","Public business email","email"],["publicPhone","Public phone","tel"],["availability","Availability","text"]].map(([key,label,inputType])=><label key={key}>{label}<input type={inputType} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} /></label>)}</div>
      {error && <p role="alert" className="claim-error">{error}</p>}{saved && <p role="status">Profile details saved.</p>}<button>Save profile details</button></form><Link to="/professional-claims">All professional profiles</Link></div></main>;
}
