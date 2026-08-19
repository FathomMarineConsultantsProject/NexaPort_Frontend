import { Check, LockKeyhole } from "lucide-react";
import { WORKFLOW_GROUPS, WORKFLOW_STAGES } from "./workflowStages";

export default function WorkflowStageRail({ currentStage, viewedStage, onView, canViewNext = false }) {
  const currentIndex=Math.max(0,WORKFLOW_STAGES.findIndex(([key])=>key===currentStage));
  const terminal=currentStage==="invoice_paid";
  const viewable=WORKFLOW_STAGES.slice(0,currentIndex+1+(canViewNext&&!terminal?1:0));
  return <>
    <aside className="workflow-rail" aria-label="Inspection workflow progress">
      <div className="rail-kicker">Inspection sequence</div>
      {WORKFLOW_GROUPS.map((group)=><section key={group.label} className="rail-group"><h2>{group.label}</h2><ol>
        {group.stages.map(([key,label])=>{const index=WORKFLOW_STAGES.findIndex(([stage])=>stage===key);const state=terminal&&index<=currentIndex?"completed":index<currentIndex?"completed":index===currentIndex?"current":index===currentIndex+1?"available":"locked";const canView=index<=currentIndex||(canViewNext&&index===currentIndex+1);
          return <li key={key} className={`${state} ${viewedStage===key?"viewing":""}`}><button type="button" disabled={!canView} onClick={()=>canView&&onView(key)} aria-current={currentStage===key?"step":undefined}><span className="rail-index">{state==="completed"?<Check size={13}/>:state==="locked"?<LockKeyhole size={12}/>:String(index+1).padStart(2,"0")}</span><span>{label}</span><small>{state}</small></button></li>;
        })}
      </ol></section>)}
    </aside>
    <label className="workflow-stage-select">View stage<select value={viewedStage} onChange={(event)=>onView(event.target.value)}>{viewable.map(([key,label],index)=><option key={key} value={key}>{String(index+1).padStart(2,"0")} — {label}{key===currentStage?" (current)":""}</option>)}</select></label>
  </>;
}
