import { Anchor, Ship } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getServiceRequestDropdowns } from "../api/masterApi";
import { createServiceRequest } from "../api/serviceRequestApi";
import "./PostServiceRequest.css";
import CustomSelect from "../components/experts/CustomSelect";

export default function PostServiceRequest() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [dropdownData, setDropdownData] = useState({
    serviceTypes: [],
    serviceCategories: {},
    urgencyOptions: [],
    vesselTypes: [],
    flagStates: [],
  });

  const [formData, setFormData] = useState({
    serviceType: "Inspection",
    serviceCategory: "",
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
    portName: "",
    country: "",
    eta: "",
    locationSummary: "",
    requiredCertification: "",
  });

  useEffect(() => {
    loadDropdownData();
  }, []);

  const loadDropdownData = async () => {
    try {
      const response = await getServiceRequestDropdowns();

      if (response.success) {
        const data = response.data;

        setDropdownData(data);

        setFormData((prev) => ({
          ...prev,
          serviceType: data.serviceTypes?.[0]?.name || "Inspection",
          serviceCategory: "",
          urgency: data.urgencyOptions?.[0]?.value || "routine",
        }));
      }
    } catch (err) {
      console.error("Failed to load dropdown data:", err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "serviceType") {
      setFormData((prev) => ({
        ...prev,
        serviceType: value,
        serviceCategory: "",
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (
      !formData.serviceType ||
      !formData.serviceCategory ||
      !formData.title ||
      !formData.scopeOfWork
    ) {
      setError("Service Type, Service Category, Request Title, and Scope of Work are required");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        serviceType: formData.serviceType,
        serviceCategory: formData.serviceCategory,
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

        portName: formData.portName || null,
        country: formData.country || null,
        eta: formData.eta || null,
        locationSummary: formData.locationSummary || null,

        requiredCertification: formData.requiredCertification || null,
      };

      const response = await createServiceRequest(payload);

      if (response.success) {
        setSuccess("Service request posted successfully. Redirecting...");
        setTimeout(() => {
          navigate(`/requests/${response.data.id}`);
        }, 1000);
      } else {
        setError(response.message || "Failed to post service request");
      }
    } catch (err) {
      console.error("Error creating service request:", err);
      setError(err.response?.data?.message || "Failed to post service request");
    } finally {
      setLoading(false);
    }
  };

  const categoryOptions =
    dropdownData.serviceCategories?.[formData.serviceType] || [];

  return (
    <main className="psr-page">
      <section className="psr-wrap">
        <div className="psr-head">
          <h1>Post Service Request</h1>
          <p>
            Describe your maritime survey, inspection, or audit requirement. Verified experts will
            respond with quotations.
          </p>
        </div>

        {error && <div className="psr-error-alert">{error}</div>}
        {success && <div className="psr-success-alert">{success}</div>}

        <form onSubmit={handleSubmit} className="psr-form">
          <section className="psr-card">
            <div className="psr-card-header">
              <Anchor size={24} />
              <div className="psr-card-header-content">
                <h2>Service Details</h2>
              </div>
            </div>

            <div className="psr-row">
              <div className="psr-group">
                <label>Service Type</label>
                <CustomSelect
                  width="100%"
                  value={formData.serviceType}
                  options={dropdownData.serviceTypes.map((type) => type.name)}
                  onChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      serviceType: value,
                      serviceCategory: "",
                    }))
                  }
                />
              </div>

              <div className="psr-group">
                <label>Service Category</label>
                <CustomSelect
                  width="100%"
                  value={formData.serviceCategory || "Select category..."}
                  options={[
                    "Select category...",
                    ...categoryOptions.map((cat) => cat.name),
                  ]}
                  onChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      serviceCategory:
                        value === "Select category..." ? "" : value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="psr-row full">
              <div className="psr-group">
                <label>Request Title</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g. Pre-PSC Inspection — Container Vessel at Port of Singapore"
                  className="psr-control"
                  required
                />
              </div>
            </div>

            <div className="psr-row full">
              <div className="psr-group">
                <label>Scope of Work</label>
                <textarea
                  name="scopeOfWork"
                  value={formData.scopeOfWork}
                  onChange={handleInputChange}
                  placeholder="Describe the full scope: vessel particulars, specific areas of focus, report format required, access restrictions, any outstanding deficiencies..."
                  className="psr-textarea"
                  required
                />
              </div>
            </div>

            <div className="psr-row three-col">
              <div className="psr-group">
                <label>Urgency</label>
                <CustomSelect
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
                <label>Budget (USD)</label>
                <input
                  type="number"
                  name="budgetUsd"
                  value={formData.budgetUsd}
                  onChange={handleInputChange}
                  placeholder="3500"
                  className="psr-control"
                />
              </div>

              <div className="psr-group">
                <label>Required By</label>
                <input
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
                <label>
                  Company / Requester Name <span className="opt">(optional)</span>
                </label>
                <input
                  type="text"
                  name="requesterName"
                  value={formData.requesterName}
                  onChange={handleInputChange}
                  placeholder="Shipowner, Manager or Charterer name"
                  className="psr-control"
                />
              </div>
            </div>
          </section>

          <section className="psr-card">
            <div className="psr-card-header">
              <Ship size={24} />
              <div className="psr-card-header-content">
                <h2>Vessel & Port Particulars</h2>
                <p>Provide vessel details to help experts prepare their quotation accurately.</p>
              </div>
            </div>

            <div className="psr-row">
              <div className="psr-group">
                <label>
                  Vessel Name <span className="opt">(opt.)</span>
                </label>
                <input
                  type="text"
                  name="vesselName"
                  value={formData.vesselName}
                  onChange={handleInputChange}
                  placeholder="MT Nordic Spirit"
                  className="psr-control"
                />
              </div>

              <div className="psr-group">
                <label>
                  IMO Number <span className="opt">(opt.)</span>
                </label>
                <input
                  type="text"
                  name="imoNumber"
                  value={formData.imoNumber}
                  onChange={handleInputChange}
                  placeholder="9378654"
                  className="psr-control"
                />
              </div>
            </div>

            <div className="psr-row">
              <div className="psr-group">
                <label>
                  Vessel Type <span className="opt">(opt.)</span>
                </label>
                <CustomSelect
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
                  Flag State <span className="opt">(opt.)</span>
                </label>
                <CustomSelect
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
                <label>
                  Port / Terminal <span className="opt">(opt.)</span>
                </label>
                <input
                  type="text"
                  name="portName"
                  value={formData.portName}
                  onChange={handleInputChange}
                  placeholder="Port of Rotterdam"
                  className="psr-control"
                />
              </div>

              <div className="psr-group">
                <label>
                  Country <span className="opt">(opt.)</span>
                </label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  placeholder="Netherlands"
                  className="psr-control"
                />
              </div>

              <div className="psr-group">
                <label>
                  ETA <span className="opt">(opt.)</span>
                </label>
                <input
                  type="date"
                  name="eta"
                  value={formData.eta}
                  onChange={handleInputChange}
                  className="psr-control"
                />
              </div>
            </div>

            <div className="psr-row full">
              <div className="psr-group">
                <label>Location Summary</label>
                <input
                  type="text"
                  name="locationSummary"
                  value={formData.locationSummary}
                  onChange={handleInputChange}
                  placeholder="Rotterdam, Netherlands"
                  className="psr-control"
                />
              </div>
            </div>

            <div className="psr-row full">
              <div className="psr-group">
                <label>
                  Required Certification <span className="opt">(opt.)</span>
                </label>
                <input
                  type="text"
                  name="requiredCertification"
                  value={formData.requiredCertification}
                  onChange={handleInputChange}
                  placeholder="OCIMF SIRE Inspector, ISM Lead Auditor, etc."
                  className="psr-control"
                />
              </div>
            </div>
          </section>

          <button type="submit" className="psr-submit-btn" disabled={loading}>
            {loading ? "Posting Request..." : "Post Service Request"}
          </button>
        </form>
      </section>
    </main>
  );
}