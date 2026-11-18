import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import NexaportBrand from '../components/branding/NexaportBrand';
import { getUnifiedOnboarding, saveUnifiedOnboarding } from '../api/Auth';
import './UnifiedRegistration.css';

const steps = {
  personal: [['headline','About you'],['location','Your location']],
  professional: [['experience','Professional experience'],['expertise','Expertise and certifications'],['coverage','Operating ports and regions']],
  company: [['description','Company description'],['address','Company address'],['website','Website'],['services','Services or products']],
  client: [['fleet','Fleet and business details'],['verification','Client verification notes']],
};
export default function UnifiedOnboarding() {
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
