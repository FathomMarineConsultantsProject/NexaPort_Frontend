import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {listIntakes,listSupplierRfqs} from '../api/procurementIntakeApi';
import RfqLinkControls from './RfqLinkControls';
import './ProcurementIntake.css';

const message=error=>error.response?.data?.message||error.message||'Unable to load RFQ links';

export default function ProcurementRfqLinkAdmin(){
 const [requisitions,setRequisitions]=useState([]),[selected,setSelected]=useState(''),[documents,setDocuments]=useState([]),[error,setError]=useState('');
 useEffect(()=>{listIntakes().then(rows=>{setRequisitions(rows);setSelected(rows[0]?.id||'')}).catch(err=>setError(message(err)))},[]);
 useEffect(()=>{if(!selected)return;let live=true;listSupplierRfqs(selected).then(data=>{if(live){setDocuments(data.documents||[]);setError('')}}).catch(err=>{if(live)setError(message(err))});return()=>{live=false}},[selected]);
 return <main className="intake-page"><header className="intake-heading"><div><h1>RFQ attachment link administration</h1><span>Organization settings, expiry and revocation</span></div><Link to="/procurement/overview">Back to Procurement</Link></header>
  {error&&<p role="alert" className="intake-error">{error}</p>}
  {requisitions.length?<section className="intake-section"><label>Requisition <select value={selected} onChange={event=>{setSelected(event.target.value);setDocuments([])}}>{requisitions.map(row=><option key={row.id} value={row.id}>{row.title||row.internal_reference||row.id}</option>)}</select></label>{selected&&<RfqLinkControls key={selected} requisitionId={selected} documents={documents}/>}</section>:!error&&<p>No requisitions are available for this organization.</p>}
 </main>;
}
