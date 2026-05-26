import {
  Award,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  DollarSign,
  Flag,
  MapPin,
  Ship,
  Star,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getExperts } from "../api/expertApi";
import { getServiceRequestById } from "../api/serviceRequestApi";
import { createQuotation, updateQuotationStatus } from "../api/quotationApi";
import "./ServiceRequestDetails.css";

export default function ServiceRequestDetails() {
  const { id } = useParams();

  const [request, setRequest] = useState(null);
  const [experts, setExperts] = useState([]);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [toast, setToast] = useState("");

  const [quoteForm, setQuoteForm] = useState({
    expertId: "",
    totalQuoteUsd: "",
    attendanceDays: "",
    travelCost: "",
    accommodationCost: "",
    reportFee: "",
    urgencySurcharge: "",
    coverLetter: "",
  });

  useEffect(() => {
    loadPage();
  }, [id]);

  const loadPage = async () => {
    const [requestRes, expertRes] = await Promise.all([
      getServiceRequestById(id),
      getExperts(),
    ]);

    setRequest(requestRes.data);
    setExperts(expertRes.data || []);
  };

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const money = (value) => Number(value || 0).toLocaleString();

  const submitQuotation = async (e) => {
    e.preventDefault();

    await createQuotation({
      serviceRequestId: Number(id),
      expertId: Number(quoteForm.expertId),
      totalQuoteUsd: Number(quoteForm.totalQuoteUsd),
      attendanceDays: Number(quoteForm.attendanceDays || 0),
      travelCost: Number(quoteForm.travelCost || 0),
      accommodationCost: Number(quoteForm.accommodationCost || 0),
      reportFee: Number(quoteForm.reportFee || 0),
      urgencySurcharge: Number(quoteForm.urgencySurcharge || 0),
      coverLetter: quoteForm.coverLetter,
    });

    setShowQuoteForm(false);
    setQuoteForm({
      expertId: "",
      totalQuoteUsd: "",
      attendanceDays: "",
      travelCost: "",
      accommodationCost: "",
      reportFee: "",
      urgencySurcharge: "",
      coverLetter: "",
    });

    setToast("Quotation submitted");
    loadPage();
  };

  const changeStatus = async (quotationId, status) => {
    const res = await updateQuotationStatus(quotationId, status);

    setToast(res.message || `Quotation ${status}`);
    loadPage();

    setTimeout(() => setToast(""), 3000);
  };

  if (!request) {
    return <main className="request-details-page">Loading...</main>;
  }

  return (
    <main className="request-details-page">
      <section className="request-details-head">
        <div>
          <div className="request-tags">
            <span className="outline-tag">{request.serviceType}</span>
            <span className="outline-tag">{request.serviceCategory}</span>
            <span className={`urgency-tag ${request.urgency}`}>
              {request.urgency}
            </span>
            <span className={`status-tag ${request.status}`}>
              {request.status}
            </span>
          </div>

          <h1>{request.title}</h1>

          <div className="request-meta-line">
            <span>
              <MapPin size={17} />
              {request.port?.locationSummary || request.port?.name}
            </span>

            <span>
              <CalendarDays size={17} />
              Due {formatDate(request.requiredBy)}
            </span>
          </div>
        </div>

        <div className="budget-block">
          <strong>${money(request.budgetUsd)}</strong>
          <span>
            {request.quotationCount}{" "}
            {request.quotationCount === 1 ? "quotation" : "quotations"}
          </span>
        </div>
      </section>

      <section className="request-details-layout">
        <div className="request-main-col">
          <div className="details-card">
            <h2>Scope of Work</h2>
            <p>{request.scopeOfWork}</p>
          </div>

          <div className="quotation-head">
            <h2>Quotations ({request.quotations?.length || 0})</h2>

            <button
              className="submit-quote-toggle"
              onClick={() => setShowQuoteForm(!showQuoteForm)}
            >
              <Briefcase size={17} />
              Submit Quotation
            </button>
          </div>

          {showQuoteForm && (
            <form className="quote-form-card" onSubmit={submitQuotation}>
              <h3>Submit Quotation</h3>
              <p>Provide a detailed cost breakdown to improve your selection chances.</p>

              <label>Expert / Surveyor</label>
              <select
                value={quoteForm.expertId}
                onChange={(e) =>
                  setQuoteForm({ ...quoteForm, expertId: e.target.value })
                }
                required
              >
                <option value="">Select expert...</option>
                {experts.map((expert) => (
                  <option key={expert.id} value={expert.id}>
                    {expert.full_name}
                  </option>
                ))}
              </select>

              <div className="quote-two-grid">
                <div>
                  <label>Total Quotation (USD)</label>
                  <input
                    value={quoteForm.totalQuoteUsd}
                    onChange={(e) =>
                      setQuoteForm({
                        ...quoteForm,
                        totalQuoteUsd: e.target.value,
                      })
                    }
                    placeholder="3500"
                    required
                  />
                </div>

                <div>
                  <label>Attendance Days (opt.)</label>
                  <input
                    value={quoteForm.attendanceDays}
                    onChange={(e) =>
                      setQuoteForm({
                        ...quoteForm,
                        attendanceDays: e.target.value,
                      })
                    }
                    placeholder="1"
                  />
                </div>

                <div>
                  <label>Travel Cost (opt.)</label>
                  <input
                    value={quoteForm.travelCost}
                    onChange={(e) =>
                      setQuoteForm({
                        ...quoteForm,
                        travelCost: e.target.value,
                      })
                    }
                    placeholder="0"
                  />
                </div>

                <div>
                  <label>Accommodation (opt.)</label>
                  <input
                    value={quoteForm.accommodationCost}
                    onChange={(e) =>
                      setQuoteForm({
                        ...quoteForm,
                        accommodationCost: e.target.value,
                      })
                    }
                    placeholder="0"
                  />
                </div>

                <div>
                  <label>Report Fee (opt.)</label>
                  <input
                    value={quoteForm.reportFee}
                    onChange={(e) =>
                      setQuoteForm({
                        ...quoteForm,
                        reportFee: e.target.value,
                      })
                    }
                    placeholder="0"
                  />
                </div>

                <div>
                  <label>Urgency Surcharge (opt.)</label>
                  <input
                    value={quoteForm.urgencySurcharge}
                    onChange={(e) =>
                      setQuoteForm({
                        ...quoteForm,
                        urgencySurcharge: e.target.value,
                      })
                    }
                    placeholder="0"
                  />
                </div>
              </div>

              <label>Cover Letter / Notes</label>
              <textarea
                value={quoteForm.coverLetter}
                onChange={(e) =>
                  setQuoteForm({
                    ...quoteForm,
                    coverLetter: e.target.value,
                  })
                }
                placeholder="Describe your relevant experience, availability, and approach..."
              />

              <div className="quote-actions">
                <button type="submit" className="primary-btn">
                  Submit Quotation
                </button>

                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowQuoteForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {request.quotations?.map((quote) => (
            <article
              key={quote.id}
              className={`quotation-card ${quote.status === "accepted" ? "accepted" : ""}`}
            >
              <div className="quotation-top">
                <div>
                  <h3>
                    {quote.expertName}
                    <span>
                      <Star size={16} fill="#149d94" color="#149d94" />
                      {quote.expertRating}
                    </span>
                  </h3>

                  <p>{formatDateTime(quote.createdAt)}</p>
                </div>

                <div className="quotation-price">
                  <strong>${money(quote.totalQuoteUsd)}</strong>
                  <span className={`quote-status ${quote.status}`}>
                    {quote.status}
                  </span>
                </div>
              </div>

              <div className="quote-cost-grid">
                <div>
                  <span>Days</span>
                  <strong>{quote.attendanceDays || 0}d</strong>
                </div>
                <div>
                  <span>Travel</span>
                  <strong>${money(quote.travelCost)}</strong>
                </div>
                <div>
                  <span>Accomm.</span>
                  <strong>${money(quote.accommodationCost)}</strong>
                </div>
                <div>
                  <span>Report</span>
                  <strong>${money(quote.reportFee)}</strong>
                </div>
              </div>

              {quote.coverLetter && (
                <blockquote>“{quote.coverLetter}”</blockquote>
              )}

              {quote.status !== "accepted" && (
                <div className="quotation-actions">
                  <button
                    className="accept-btn"
                    onClick={() => changeStatus(quote.id, "accepted")}
                  >
                    <CheckCircle2 size={16} />
                    Accept
                  </button>

                  <button
                    className="reject-btn"
                    onClick={() => changeStatus(quote.id, "rejected")}
                  >
                    Reject
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>

        <aside className="request-side-col">
          <div className="side-info-card">
            <h3>
              <Ship size={18} />
              Vessel Particulars
            </h3>

            <Info label="Name" value={request.vessel?.name} />
            <Info label="IMO" value={request.vessel?.imoNumber} />
            <Info label="Type" value={request.vessel?.type} />
            <Info label="Flag" value={request.vessel?.flagState} icon={<Flag size={14} />} />
          </div>

          <div className="side-info-card">
            <h3>
              <MapPin size={18} />
              Port & Schedule
            </h3>

            <Info label="Port" value={request.port?.name} />
            <Info label="Country" value={request.port?.country} />
            <Info label="ETA" value={formatDate(request.port?.eta)} />
            <Info label="Deadline" value={formatDate(request.requiredBy)} />
          </div>

          <div className="side-info-card">
            <h3>
              <Award size={18} />
              Required Cert.
            </h3>

            <p>{request.requiredCertification || "-"}</p>
          </div>

          <div className="side-info-card">
            <h3>Requested By</h3>
            <p>{request.requesterName || "-"}</p>
          </div>
        </aside>
      </section>

      {toast && (
        <div className="request-toast">
          <strong>{toast}</strong>
          <span>The quotation has been updated.</span>
        </div>
      )}
    </main>
  );
}

function Info({ label, value, icon }) {
  return (
    <div className="info-row">
      <span>{label}</span>
      <strong>
        {icon}
        {value || "-"}
      </strong>
    </div>
  );
}