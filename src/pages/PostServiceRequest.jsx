import { requestPortPayload } from "../components/requests/requestPortState.js";
import ScopeEditor from "../components/requests/ScopeEditor";
import PortSelect from "../components/requests/PortSelect";
import ScopeAssistant from "../components/requests/ScopeAssistant";
import { AgentDetailsFields } from "../components/requests/AgentDetails";
import VesselIdentityFields from "../components/requests/VesselIdentityFields";
import { getMyClientOnboarding } from "../api/clientRegistrationApi";
import { isClient } from "../utils/auth";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getServiceRequestDropdowns } from "../api/masterApi";
import { createServiceRequest } from "../api/serviceRequestApi";
import "./PostServiceRequest.css";
import CustomSelect from "../components/experts/CustomSelect";
import InspectionCatalogueSelect from "../components/requests/InspectionCatalogueSelect";

export default function PostServiceRequest() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const submitInFlight = useRef(false);

  const [dropdownData, setDropdownData] = useState({
    serviceTypes: [],
    serviceCategories: {},
    urgencyOptions: [],
    vesselTypes: [],
    flagStates: [],
    inspectionVerticals: [],
  });

  const [formData, setFormData] = useState({
    inspectionMethodId: "",
    inspectionVertical: "",
    serviceType: "",
    serviceCategory: "",
    serviceTypeOther: "",
    title: "",
    scopeOfWork: "",
    urgency: "routine",
    budgetUsd: "",
    requiredBy: "",
    requesterName: "",
    vesselName: "",
    imoNumber: "",
    vesselType: "",
    flagState: "",
    selectedVessel: null,
    portName: "",
    portId: null,
    country: "",
    manualPort: false,
    terminalName: "",
    agentCompanyName: "",
    agentContactName: "",
    agentEmail: "",
    agentPhone: "",
    eta: "",

  });

  useEffect(() => {
    if (isClient()) getMyClientOnboarding().then((response) => {
      setFormData((current) => ({ ...current, requesterName: response.data?.company?.legal_name || "" }));
    }).catch(() => setError("Unable to load your registered Company. Please retry before posting."));
  }, []);

  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        const response = await getServiceRequestDropdowns();

        if (response.success) {
          const data = response.data;

          setDropdownData(data);

          setFormData((prev) => ({
            ...prev,
            urgency: data.urgencyOptions?.[0]?.value || "routine",
          }));
        }
      } catch (err) {
        console.error("Failed to load dropdown data:", err);
      }
    };

    loadDropdownData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitInFlight.current || success) return;
    setError("");
    setSuccess("");
    setFieldErrors({});

    const nextFieldErrors = {};
    const otherDetails = formData.serviceTypeOther.trim();
    if (formData.serviceType === "Other") {
      if (!otherDetails) nextFieldErrors.serviceTypeOther = "Please describe the required service.";
      else if (otherDetails.length < 3) nextFieldErrors.serviceTypeOther = "Service details must be at least 3 characters.";
      else if (otherDetails.length > 500) nextFieldErrors.serviceTypeOther = "Service details must be 500 characters or fewer.";
    } else if (!formData.inspectionMethodId) {
      nextFieldErrors.inspectionMethodId = "Select a service.";
    }
    if (!formData.title.trim()) nextFieldErrors.title = "Enter a request title.";
    if (!formData.scopeOfWork.trim()) nextFieldErrors.scopeOfWork = "Describe the scope of work.";
    if (formData.manualPort && !formData.country.trim()) nextFieldErrors.country = "Enter the country for the new port.";

    if (
      Object.keys(nextFieldErrors).length
    ) {
      setFieldErrors(nextFieldErrors);
      setError("Please correct the highlighted fields.");
      return;
    }

    submitInFlight.current = true;
    setLoading(true);

    try {
      const payload = {
        ...requestPortPayload(formData),
        inspectionMethodId: formData.serviceType === "Other" ? null : Number(formData.inspectionMethodId),
        serviceType: formData.serviceType,
        serviceCategory: formData.serviceType === "Other" ? "Other" : formData.serviceCategory,
        serviceTypeOther: formData.serviceType === "Other" ? otherDetails : null,
        title: formData.title,
        scopeOfWork: formData.scopeOfWork,
        urgency: formData.urgency,
        budgetUsd: formData.budgetUsd ? Number(formData.budgetUsd) : null,
        requiredBy: formData.requiredBy || null,
        requesterName: formData.requesterName || null,

        vesselName: formData.vesselName || null,
        imoNumber: formData.imoNumber || null,
        vesselType: formData.vesselType || null,
        flagState: formData.flagState || null,
        selectedVessel: formData.selectedVessel || null,

        portName: formData.portName || null,
        portId: formData.portId || null,
        country: formData.manualPort ? formData.country.trim() : null,
        terminalName: formData.terminalName || null,
        agentCompanyName: formData.agentCompanyName || null,
        agentContactName: formData.agentContactName || null,
        agentEmail: formData.agentEmail || null,
        agentPhone: formData.agentPhone || null,
        eta: formData.eta || null,

      };

      const response = await createServiceRequest(payload);

      if (response.success) {
        setSuccess("Submitted for Admin review.");
        setTimeout(() => {
          navigate(`/requests/${response.data.id}`);
        }, 1000);
      } else {
        setFieldErrors(response.field_errors || {});
        setError(response.message || "Failed to post service request");
      }
    } catch (err) {
      console.error("Error creating service request:", err);
      setFieldErrors(err.response?.data?.field_errors || {});
      setError(err.response?.data?.message || (err.response ? "Failed to post service request" : "The submission result is unknown. Check Requests before submitting again."));
    } finally {
      submitInFlight.current = false;
      setLoading(false);
    }
  };

  return (
    <main className="psr-page np-page-container np-page-container--detail">
      <section className="psr-wrap">
        <div className="psr-head">
          <span className="psr-eyebrow">New service request</span>
          <h1>Create a service request</h1>
          <p>
            Describe the service, vessel and scope. Your request will be reviewed by NexaPort before consultants can quote.
          </p>
        </div>

        {error && <div className="psr-error-alert" role="alert">{error}</div>}
        {success && <div className="psr-success-alert" role="status">{success}</div>}

        <form onSubmit={handleSubmit} className="psr-form">
          <section className="psr-card">
            <div className="psr-card-header">
              <div className="psr-card-header-content">
                <h2>Service Details</h2>
                <p>Choose the work required and when it is needed.</p>
              </div>
            </div>

            <div className="psr-row">
              <div className="psr-group psr-group-wide">
                <label>Services Required</label>
                <InspectionCatalogueSelect
                  verticals={dropdownData.inspectionVerticals || []}
                  selectedMethodId={formData.inspectionMethodId}
                  isOther={formData.serviceType === "Other"}
                  otherValue={formData.serviceTypeOther}
                  error={fieldErrors.inspectionMethodId}
                  otherError={fieldErrors.serviceTypeOther}
                  onSelectMethod={(method, vertical) => {
                    setFieldErrors((current) => ({ ...current, inspectionMethodId: undefined, serviceTypeOther: undefined }));
                    setFormData((prev) => ({
                      ...prev,
                      inspectionMethodId: method.id,
                      inspectionVertical: vertical.name,
                      serviceType: method.name,
                      serviceCategory: vertical.name,
                      serviceTypeOther: "",
                    }));
                  }}
                  onSelectOther={() => {
                    setFieldErrors((current) => ({ ...current, inspectionMethodId: undefined, serviceTypeOther: undefined }));
                    setFormData((prev) => ({
                      ...prev,
                      inspectionMethodId: "",
                      inspectionVertical: "Other",
                      serviceType: "Other",
                      serviceCategory: "Other",
                      serviceTypeOther: "",
                    }));
                  }}
                  onOtherChange={(value) => {
                    setFieldErrors((current) => ({ ...current, serviceTypeOther: undefined }));
                    setFormData((prev) => ({ ...prev, serviceTypeOther: value }));
                  }}
                />
              </div>
            </div>

            <div className="psr-row full">
              <div className="psr-group">
                <label htmlFor="request-title">Request title <span className="psr-required">Required</span></label>
                <input
                  id="request-title"
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g. Pre-PSC Inspection — Container Vessel at Port of Singapore"
                  className="psr-control"
                  required
                  aria-invalid={Boolean(fieldErrors.title)}
                  aria-describedby={fieldErrors.title ? "request-title-error" : undefined}
                />
                {fieldErrors.title && <small id="request-title-error" className="psr-field-error">{fieldErrors.title}</small>}
              </div>
            </div>

            <div className="psr-row three-col">
              <div className="psr-group">
                <label>Request priority</label>
                <CustomSelect
                  label="Request priority"
                  width="100%"
                  value={
                    dropdownData.urgencyOptions.find(
                      (u) => u.value === formData.urgency
                    )?.label || "Routine (7+ days)"
                  }
                  options={dropdownData.urgencyOptions.map((u) => u.label)}
                  onChange={(label) => {
                    const selected =
                      dropdownData.urgencyOptions.find(
                        (u) => u.label === label
                      );

                    setFormData((prev) => ({
                      ...prev,
                      urgency: selected?.value || "routine",
                    }));
                  }}
                />
              </div>

              <div className="psr-group">
                <label htmlFor="request-budget">Budget (USD)</label>
                <input
                  id="request-budget"
                  type="number"
                  name="budgetUsd"
                  value={formData.budgetUsd}
                  onChange={handleInputChange}
                  placeholder="3500"
                  className="psr-control"
                />
              </div>

              <div className="psr-group">
                <label htmlFor="request-required-by">Required by</label>
                <input
                  id="request-required-by"
                  type="date"
                  name="requiredBy"
                  value={formData.requiredBy}
                  onChange={handleInputChange}
                  className="psr-control"
                />
              </div>
            </div>

            <div className="psr-row full">
              <div className="psr-group">
                <label htmlFor="request-company">
                  Company <span className="opt">(optional)</span>
                </label>
                <input
                  id="request-company"
                  type="text"
                  name="requesterName"
                  value={formData.requesterName}
                  onChange={handleInputChange}
                  placeholder="Registered company"
                  readOnly={isClient()}
                  className="psr-control"
                />
              </div>
            </div>
          </section>

          <section className="psr-card">
            <div className="psr-card-header">
              <div className="psr-card-header-content">
                <h2>Vessel and Port Particulars</h2>
                <p>Provide vessel details to help experts prepare their quotation accurately.</p>
              </div>
            </div>

            {isClient() ? <VesselIdentityFields value={formData} disabled={loading}
              onChange={(patch) => setFormData((current) => ({ ...current, ...patch }))} /> :
              <div className="psr-row"><div className="psr-group"><label htmlFor="request-vessel-name">Vessel Name <span className="opt">(opt.)</span></label><input id="request-vessel-name" name="vesselName" value={formData.vesselName} onChange={handleInputChange} className="psr-control" /></div><div className="psr-group"><label htmlFor="request-imo-number">IMO Number <span className="opt">(opt.)</span></label><input id="request-imo-number" name="imoNumber" value={formData.imoNumber} onChange={handleInputChange} className="psr-control" /></div></div>}
            {fieldErrors.imoNumber && <small role="alert">{fieldErrors.imoNumber}</small>}

            <div className="psr-row">
              <div className="psr-group">
                <label>
                  Vessel Type <span className="opt">(opt.)</span>
                </label>
                <CustomSelect
                  label="Vessel type"
                  width="100%"
                  value={formData.vesselType || "Select type..."}
                  options={[
                    "Select type...",
                    ...dropdownData.vesselTypes.map((type) => type.name),
                  ]}
                  onChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      vesselType:
                        value === "Select type..." ? "" : value,
                    }))
                  }
                />
              </div>

              <div className="psr-group">
                <label>
                  Flag <span className="opt">(opt.)</span>
                </label>
                <CustomSelect
                  label="Flag"
                  width="100%"
                  value={formData.flagState || "Select flag..."}
                  options={[
                    "Select flag...",
                    ...dropdownData.flagStates.map((flag) => flag.name),
                  ]}
                  onChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      flagState:
                        value === "Select flag..." ? "" : value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="psr-row three-col">
              <div className="psr-group">
                <PortSelect ports={formData.ports} terminalName={formData.terminalName} eta={formData.eta} portId={formData.portId} portName={formData.portName} country={formData.country} manualPort={formData.manualPort} allowManual disabled={loading} onChange={(patch) => setFormData((current) => ({ ...current, ...patch }))} />
                {fieldErrors.portId && <small role="alert">{fieldErrors.portId}</small>}
                {fieldErrors.country && <small role="alert">{fieldErrors.country}</small>}
              </div>
              <div className="psr-group"><label htmlFor="request-terminal">Terminal <span className="opt">(opt.)</span></label><input id="request-terminal" name="terminalName" maxLength={240} value={formData.terminalName} onChange={handleInputChange} className="psr-control" /></div>
              <div className="psr-group"><label htmlFor="request-eta">ETA <span className="opt">(opt.)</span></label><input id="request-eta" type="date" name="eta" value={formData.eta} onChange={handleInputChange} className="psr-control" /></div>
            </div>
          </section>

          <section className="psr-card psr-card--scope">
            <div className="psr-card-header"><div className="psr-card-header-content"><h2>Scope of Work</h2><p>Explain the inspection outcome, focus areas and any access or reporting needs.</p></div></div>
            <ScopeAssistant value={formData} disabled={loading} onChange={(scopeOfWork) => setFormData((current) => ({ ...current, scopeOfWork }))} />
            <div className="psr-group">
              <label>Scope of work <span className="psr-required">Required</span></label>
              <ScopeEditor value={formData.scopeOfWork} onChange={(scopeOfWork) => { setFieldErrors((current) => ({ ...current, scopeOfWork: undefined })); setFormData((current) => ({ ...current, scopeOfWork })); }} disabled={loading} required placeholder="Describe the areas to inspect, deliverables, access restrictions and reporting needs…" error={fieldErrors.scopeOfWork} />
              {fieldErrors.scopeOfWork && <small id="request-scope-error" className="psr-field-error" role="alert">{fieldErrors.scopeOfWork}</small>}
            </div>
          </section>

          <section className="psr-card psr-card--coordination"><h2>Coordination & contacts</h2><AgentDetailsFields value={formData} errors={fieldErrors} onChange={(patch) => setFormData((current) => ({ ...current, ...patch }))} /></section>

          <section className="psr-card psr-card--review">
            <div className="psr-card-header"><div className="psr-card-header-content"><h2>Review & submission</h2><p>Confirm the essentials before sending this request for review.</p></div></div>
            <dl className="psr-review-grid">
              <div><dt>Service</dt><dd>{formData.serviceType === "Other" ? formData.serviceTypeOther || "Not selected" : formData.serviceType || "Not selected"}</dd></div>
              <div><dt>Vessel</dt><dd>{formData.vesselName || "Not provided"}</dd></div>
              <div><dt>Primary port</dt><dd>{formData.portName || "Not selected"}</dd></div>
              <div><dt>Required by</dt><dd>{formData.requiredBy || "Not specified"}</dd></div>
            </dl>
            <p className="psr-submit-note">NexaPort will review the request before it becomes available for quotation.</p>
            <button type="submit" className="psr-submit-btn" disabled={loading || Boolean(success)}>{loading ? "Submitting for review..." : "Submit for Admin Review"}</button>
          </section>
        </form>
      </section>
    </main>
  );
}
