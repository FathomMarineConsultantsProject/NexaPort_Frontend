import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import NexaportBrand from '../components/branding/NexaportBrand';
import { getUnifiedOnboarding, saveUnifiedOnboarding, getApplications } from '../api/Auth';
import { postRegistrationV2 } from '../utils/postRegistrationRollout.js';
import { safeReturnPath } from '../utils/safeReturnPath.js';
import './UnifiedRegistration.css';

const steps = {
  personal: [['headline','About you'],['location','Your location']],
  professional: [['experience','Professional experience'],['expertise','Expertise and certifications'],['coverage','Operating ports and regions']],
  company: [['description','Company description'],['address','Company address'],['website','Website'],['services','Services or products']],
  client: [['fleet','Fleet and business details'],['verification','Client verification notes']],
};
function OnboardingPaths() {
  const [state,setState] = useState(null);
  const [error,setError] = useState('');
  useEffect(()=>{getApplications().then(setState).catch(()=>setError('Unable to load your application status. Retry by refreshing the page.'));},[]);
  const applications = state?.applications || [];
  const returnTo = safeReturnPath(localStorage.getItem('np_after_verification'));
  const pathways = [
    ['consultant','Consultant or surveyor','Build your professional profile and submit your qualifications for review.'],
    ['client','Shipowner or manager','Verify your company to request maritime services.'],
    ['company','Maritime company','Create a company listing or request access to an existing one.'],
  ];
  return <main className="unified-page"><div className="unified-shell"><header className="unified-header"><NexaportBrand to="/dashboard"/><Link to="/dashboard">Explore NexaPort</Link></header><div className="unified-intro"><h1>Complete a profile</h1><span>Choose the services you need. You can continue browsing while an application is reviewed.</span></div>{error && <p role="alert" className="unified-error">{error}</p>}{!state && !error && <p role="status">Loading applications…</p>}<div className="pathway-list">{pathways.map(([key,title,description])=>{const status=applications.find(item=>item.pathway===key)?.status||'not_started';return <section key={key} className="pathway-row"><div><h2>{title}</h2><p>{description}</p><small>Status: {status.replaceAll('_',' ')}</small></div>{status==='pending'?(key==='client'?<Link to="/client-verification-status">View review status</Link>:<span>Review pending</span>):<Link to={status==='approved'?`/choose-workspace${key==='client'&&returnTo?`?returnTo=${encodeURIComponent(returnTo)}`:''}`:key==='client'&&status==='rejected'?'/client-verification-status':`/onboarding/${key}`}>{status==='not_started'?'Start profile':status==='approved'?'Open approved workspace':'Continue profile'}</Link>}</section>})}</div>{state && Object.keys(state.legacyDraft||{}).length>0 && <details><summary>Earlier saved setup notes</summary><p>Your earlier notes are preserved. Review them as you complete a structured profile.</p>{Object.entries(state.legacyDraft).map(([section,fields])=><section key={section}><h3>{section}</h3>{Object.entries(fields||{}).map(([key,value])=><p key={key}><strong>{key}:</strong> {String(value)}</p>)}</section>)}</details>}</div></main>;
}

export default function UnifiedOnboarding() { return postRegistrationV2 ? <OnboardingPaths/> : <LegacyOnboarding/>; }

function LegacyOnboarding() {
  const navigate=useNavigate();
  const [record,setRecord]=useState(null);
  const [section,setSection]=useState('personal');
  const [draft,setDraft]=useState({});
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  useEffect(()=>{getUnifiedOnboarding().then(result=>{setRecord(result.onboarding);const first=Object.keys(steps).find(key=>!result.onboarding.draft?.[key] || !Object.values(result.onboarding.draft[key]).some(Boolean));setSection(first||'personal');setDraft(result.onboarding.draft||{});}).catch(()=>setMessage('Unable to load your onboarding. Try refreshing the page.'));},[]);
  const save=async()=>{setBusy(true);setMessage('');try{const result=await saveUnifiedOnboarding({section,data:draft[section]||{}});setRecord(result.onboarding);setDraft(result.onboarding.draft);setMessage('Progress saved. You can continue later.');}catch(error){setMessage(error.response?.data?.message||'Unable to save progress.');}finally{setBusy(false);}};
  const signOut=()=>{localStorage.removeItem('np_token');localStorage.removeItem('np_user');navigate('/login',{replace:true});};
  if(!record)return <main className="unified-page"><div className="unified-shell" role="status">{message||'Loading your account…'}</div></main>;
  const categories=record.categories||[];
  const suggested=categories.includes('marine_consultant_surveyor')?'professional':categories.some(item=>['ship_owner_manager','charterer_trader'].includes(item))?'client':'company';
  const complete=Object.keys(steps).filter(key=>Object.values(record.draft?.[key]||{}).some(value=>String(value||'').trim())).length;
  return <main className="unified-page"><div className="unified-shell"><header className="unified-header"><NexaportBrand to="/"/><button type="button" onClick={signOut}>Sign out</button></header><div className="unified-intro"><h1>Welcome, {record.first_name}</h1><span>Your account is ready. Save your profile as you go; verification is requested only for the features that need it.</span></div><div className="onboarding-status"><strong>{complete} of 4 areas started</strong><span>Suggested next step: {suggested==='professional'?'Professional profile':suggested==='client'?'Client details':'Company profile'}</span></div><nav className="onboarding-tabs" aria-label="Onboarding sections">{Object.keys(steps).map(key=><button key={key} type="button" className={section===key?'active':''} onClick={()=>{setSection(key);setMessage('');}}>{key==='client'?'Client verification':key[0].toUpperCase()+key.slice(1)}</button>)}</nav><section className="onboarding-form"><h2>{section==='client'?'Client verification':section[0].toUpperCase()+section.slice(1)}</h2><p className="unified-hint">Draft details are private to your account. Saving this section does not submit a verification request.</p>{section==='company'&&<p className="unified-hint">Already listed in the directory? <Link to="/companies">Find your company and request access</Link>. Access requires NexaPort review.</p>}{steps[section].map(([key,label])=><label className="unified-field" key={key}><span>{label}</span><textarea value={draft[section]?.[key]||''} onChange={event=>setDraft(current=>({...current,[section]:{...current[section],[key]:event.target.value}}))}/></label>)}{message&&<p role="status" className="onboarding-message">{message}</p>}<div className="onboarding-actions"><button type="button" className="unified-submit" onClick={save} disabled={busy}>{busy?'Saving…':'Save progress'}</button><Link to="/profile">View account profile</Link></div></section></div></main>;
}
