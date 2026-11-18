import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, X } from 'lucide-react';
import NexaportBrand from '../components/branding/NexaportBrand';
import { registerUnified } from '../api/Auth';
import { searchCompanies } from '../api/companyClaimsApi';
import './UnifiedRegistration.css';
import { CATEGORIES, SENIORITY, ROLES, COUNTRY_CODES, initialRegistration, validateRegistration } from '../utils/unifiedRegistrationModel.js';

export default function UnifiedRegistration() {
  const navigate = useNavigate();
  const [form,setForm] = useState(initialRegistration);
  const [query,setQuery] = useState('');
  const [errors,setErrors] = useState({});
  const [serverError,setServerError] = useState('');
  const [busy,setBusy] = useState(false);
  const [showPassword,setShowPassword] = useState(false);
  const [matches,setMatches] = useState([]);
  const [searching,setSearching] = useState(false);
  const [searchError,setSearchError] = useState('');
  const findCompany = async () => { if(form.companyName.trim().length<2)return;setSearching(true);setSearchError('');try{setMatches((await searchCompanies({q:form.companyName})).data||[]);}catch{setSearchError('Company search is unavailable. You can continue creating your account.');}finally{setSearching(false);} };
  const set = (key,value) => { setForm(current => ({...current,[key]:value})); setErrors(current => ({...current,[key]:undefined})); };
  const toggle = value => set('categories', form.categories.includes(value) ? form.categories.filter(item => item !== value) : [...form.categories,value]);
  const submit = async event => {
    event.preventDefault();
    const next = validateRegistration(form);
    setErrors(next);
    setServerError('');
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      const result = await registerUnified(form);
      localStorage.setItem('np_token',result.token);
      localStorage.setItem('np_user',JSON.stringify(result.user));
      navigate('/onboarding',{replace:true});
    } catch (error) {
      if (error.response?.data?.field_errors) setErrors(error.response.data.field_errors);
      setServerError(error.response?.data?.message || (error.response ? "We couldn't create your account. Please try again." : 'Unable to connect to the account service. Please try again.'));
    }
    finally { setBusy(false); }
  };
  const field = (key,label,type='text',autoComplete='off') => <label className="unified-field"><span>{label}</span><input name={key} value={form[key]} type={type} autoComplete={autoComplete} onChange={event=>set(key,event.target.value)} aria-invalid={!!errors[key]} aria-describedby={errors[key]?`error-${key}`:undefined}/>{errors[key] && <small id={`error-${key}`}>{errors[key]}</small>}</label>;
  return <main className="unified-page"><div className="unified-shell"><header className="unified-header"><NexaportBrand to="/"/><Link to="/login">Already have an account? Sign in</Link></header><div className="unified-intro"><h1>Start with the essentials</h1><span>Create your account now. Complete your maritime profile when you are ready.</span></div><form onSubmit={submit} noValidate>
    <section><h2>Your details</h2><div className="unified-grid">{field('firstName','First name','text','given-name')}{field('lastName','Last name','text','family-name')}{field('email','Email address','email','email')}<label className="unified-field"><span>Phone number</span><div className="unified-phone"><input name="countryCode" type="tel" list="country-codes" value={form.countryCode} onChange={event=>set('countryCode',event.target.value)} aria-label="Country code"/><datalist id="country-codes">{COUNTRY_CODES.map(([value,label])=><option key={value} value={value}>{label}</option>)}</datalist><input name="phone" value={form.phone} onChange={event=>set('phone',event.target.value)} type="tel" autoComplete="tel-national" aria-invalid={!!errors.phone} aria-describedby={errors.phone?'error-phone':undefined}/></div>{errors.phone && <small id="error-phone">{errors.phone}</small>}</label></div></section>
    <section><h2>Your work</h2><label className="unified-check"><input type="checkbox" checked={form.worksIndependently} onChange={event=>{set('worksIndependently',event.target.checked);if(event.target.checked) set('categories',[...new Set([...form.categories,'marine_consultant_surveyor'])]);}}/>I work independently as a consultant or surveyor</label>{!form.worksIndependently && <>{field('companyName','Company name','text','organization')}<button className="unified-text-button" type="button" onClick={findCompany} disabled={searching||form.companyName.trim().length<2}>{searching?'Searching…':'Check existing companies'}</button>{searchError&&<p role="status">{searchError}</p>}{matches.length>0&&<div className="unified-matches"><strong>Existing listings</strong>{matches.map(company=><Link key={company.id} to={`/companies/${company.id}/claim`}>{company.company_name} — request access after signing in</Link>)}<p>If none is yours, continue creating your account. No company record is created yet.</p></div>}</>}<fieldset className="unified-categories"><legend>Company activities <span>Select all that apply</span></legend><input className="unified-search" type="search" placeholder="Search activities" value={query} onChange={event=>setQuery(event.target.value)} aria-label="Search company activities"/>{form.categories.length>0 && <div className="unified-chips">{form.categories.map(value=><button type="button" key={value} onClick={()=>toggle(value)} aria-label={`Remove ${CATEGORIES.find(item=>item[0]===value)?.[1]}`}>{CATEGORIES.find(item=>item[0]===value)?.[1]} <X size={14}/></button>)}</div>}<div className="unified-options">{CATEGORIES.filter(([,label])=>label.toLowerCase().includes(query.toLowerCase())).map(([value,label])=><label key={value}><input type="checkbox" checked={form.categories.includes(value)} onChange={()=>toggle(value)}/>{label}</label>)}</div>{errors.categories && <small id="error-categories">{errors.categories}</small>}</fieldset><div className="unified-grid"><label className="unified-field"><span>Seniority level <em>Optional</em></span><select name="seniority" value={form.seniority} onChange={event=>set('seniority',event.target.value)}>{SENIORITY.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label className="unified-field"><span>What best describes your role? <em>Optional</em></span><select name="professionalRole" value={form.professionalRole} onChange={event=>set('professionalRole',event.target.value)}>{ROLES.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label></div></section>
    <section><h2>Account security</h2><div className="unified-grid">{['password','confirmPassword'].map((key)=><label className="unified-field" key={key}><span>{key==='password'?'Password':'Confirm password'}</span><div className="unified-password"><input name={key} type={showPassword?'text':'password'} value={form[key]} autoComplete="new-password" onChange={event=>set(key,event.target.value)} aria-invalid={!!errors[key]} aria-describedby={errors[key]?`error-${key}`:undefined}/><button type="button" onClick={()=>setShowPassword(current=>!current)} aria-label={showPassword?'Hide passwords':'Show passwords'}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div>{errors[key] && <small id={`error-${key}`}>{errors[key]}</small>}</label>)}</div><p className="unified-hint">Use at least 8 characters, including a letter and a number.</p></section>{serverError && <p className="unified-error" role="alert">{serverError}</p>}<button className="unified-submit" type="submit" disabled={busy}>{busy?'Creating account…':'Create account'}</button></form></div></main>;
}
