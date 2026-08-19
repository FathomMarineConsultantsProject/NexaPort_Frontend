export const WORKFLOW_GROUPS = [
  { label: "Commercial", stages: [["overview","Overview"],["quote","Quote"],["confirm","Confirm"],["surveyor","Surveyor"]] },
  { label: "Inspection", stages: [["preparation","Preparation"],["checklist","Checklist"]] },
  { label: "Reporting", stages: [["report","Report"],["review","Review"],["report_confirmation","Report Confirmation"],["inspection_completed","Inspection Completed"]] },
  { label: "Finance", stages: [["invoice_submitted","Invoice Submitted"],["invoice_approved","Invoice Approved"],["invoice_paid","Invoice Paid"]] },
];

export const WORKFLOW_STAGES = WORKFLOW_GROUPS.flatMap((group) => group.stages);
