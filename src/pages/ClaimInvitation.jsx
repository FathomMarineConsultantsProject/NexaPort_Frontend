import { useEffect,useState } from "react";
import { Link,useNavigate,useParams } from "react-router-dom";
import { previewClaimInvitation,redeemClaimInvitation } from "../api/claimInvitationsApi";
import "./CompanyClaim.css";

export default function ClaimInvitation(){
  const {token}=useParams(),navigate=useNavigate();
  const [target,setTarget]=useState(null),[error,setError]=useState(""),[loading,setLoading]=useState(true),[redeeming,setRedeeming]=useState(false);
  useEffect(()=>{let active=true;previewClaimInvitation(token).then(data=>{if(active)setTarget(data);}).catch(err=>{if(active)setError(err.response?.data?.message || "Invitation is unavailable.");}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[token]);
  const redeem=async()=>{setRedeeming(true);setError("");try{const result=await redeemClaimInvitation(token);navigate(result.path,{replace:true});}catch(err){setError(err.response?.data?.message || "Unable to redeem invitation.");}finally{setRedeeming(false);}};
  if(loading)return <main className="claim-page"><p role="status">Checking invitation…</p></main>;
  if(!target)return <main className="claim-page"><p role="alert">{error}</p><Link to="/companies">Find a company</Link></main>;
  const signedIn=Boolean(localStorage.getItem("np_token"));
  const registration=target.type==="company" ? "/register-maritime-company" : "/register-professional-claim";
  return <main className="claim-page"><div className="claim-panel"><header><small>NexaPort claim invitation · {target.publicId}</small><h1>{target.name}</h1><p>This invitation identifies the exact existing profile. Redeeming it does not grant management access; Super Admin must review your claim.</p></header>
    {signedIn ? <button type="button" disabled={redeeming} onClick={redeem}>{redeeming?"Checking account…":"Continue with this account"}</button>
      : <div className="claim-actions"><Link to={`/login?returnTo=${encodeURIComponent(`/claim-invitations/${token}`)}`}>Sign in</Link><Link to={`${registration}?returnTo=${encodeURIComponent(target.path)}&inviteToken=${token}`}>Create account</Link></div>}
    {error&&<p role="alert" className="claim-error">{error}</p>}</div></main>;
}
