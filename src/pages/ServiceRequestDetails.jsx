// D:\Fathhom Marine\FMC\NexaPort\NexaPort_Frontend\src\pages\ServiceRequestDetails.jsx
import {
  Award,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Flag,
  MapPin,
  Ship,
  Star,
} from "lucide-react";
import { useEffect, useState } from "react";
import { acceptQuotation, createQuotation } from "../api/quotationApi";
import { getServiceRequestById } from "../api/serviceRequestApi";
import { getStoredUser, isClient, isExpert, isSuperAdmin } from "../utils/auth";
import "./ServiceRequestDetails.css";
import { useNavigate, useParams } from "react-router-dom";

export default function ServiceRequestDetails() {
  const { id } = useParams();

  const [request, setRequest] = useState(null);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);
  const [markupByQuote, setMarkupByQuote] = useState({});
  const navigate = useNavigate();

  const [quoteForm, setQuoteForm] = useState({
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
    setLoading(true);

    try {
      const requestRes = await getServiceRequestById(id);
      setRequest(requestRes.data);
    } catch (error) {
      console.error("Failed to load request:", error);
      setRequest(null);
    } finally {
      setLoading(false);
    }
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

    try {

      await createQuotation({
        serviceRequestId: Number(id),
        totalQuoteUsd: Number(quoteForm.totalQuoteUsd),
        attendanceDays: Number(quoteForm.attendanceDays || 0),
        travelCost: Number(quoteForm.travelCost || 0),
        accommodationCost: Number(quoteForm.accommodationCost || 0),
        reportFee: Number(quoteForm.reportFee || 0),
        urgencySurcharge: Number(quoteForm.urgencySurcharge || 0),
        coverLetter: quoteForm.coverLetter,
      });

      setToast("Quotation submitted successfully.");
      loadPage();
      setTimeout(() => setToast(""), 3000);
    } catch (error) {
      console.error("Failed to submit quotation:", error);
      setToast(error.response?.data?.message || "Failed to submit quotation.");
      setTimeout(() => setToast(""), 3000);
    }
  };

  const handleAcceptQuotation = async (quotationId) => {
    try {
      const adminMarkupUsd = Number(markupByQuote[quotationId] || 0);

      const res = await acceptQuotation(quotationId, {
        adminMarkupUsd,
      });

      setToast(res.message || "Quotation accepted and client price finalized.");
      loadPage();
      setTimeout(() => setToast(""), 3000);
    } catch (error) {
      console.error("Failed to accept quotation:", error);
      setToast(error.response?.data?.message || "Failed to accept quotation.");
      setTimeout(() => setToast(""), 3000);
    }
  };

  if (loading) {
    return <main className="request-details-page">Loading request...</main>;
  }

  if (!request) {
    return <main className="request-details-page">Request not found.</main>;
  }

  const quotations = request?.quotations || [];
  const vessel = request?.vessel || {};
  const port = request?.port || {};
  const canSubmitQuote = isExpert();
  const canAcceptQuote = isSuperAdmin();
  const acceptedQuote = quotations.find((q) => q.status === "accepted");
  const currentUser = getStoredUser();

  const visibleQuotations = isClient()
    ? acceptedQuote
      ? [acceptedQuote]
      : []
    : isExpert()
      ? quotations.filter((q) => {
        const quoteExpertId = Number(q.expertId || q.expert_id);
        const userExpertId = Number(currentUser?.expert_id || currentUser?.expertId);
        const userId = Number(currentUser?.id);

        return quoteExpertId === userExpertId || quoteExpertId === userId;
      })
      : quotations;
  const canSeeQuotations =
    isSuperAdmin() || isExpert() || Boolean(acceptedQuote);
  const getQuotePrice = (quote) => {
    if (isClient()) {
      return (
        quote.finalTotalUsd ||
        quote.final_total_usd ||
        quote.clientTotalUsd ||
        quote.client_total_usd ||
        quote.totalQuoteUsd ||
        quote.total_quote_usd ||
        0
      );
    }

    return quote.totalQuoteUsd || quote.total_quote_usd || 0;
  };

  const getExpertQuote = (quote) => {
    return quote.totalQuoteUsd || quote.total_quote_usd || 0;
  };

  const getAdminMarkup = (quote) => {
    return quote.adminMarkupUsd || quote.admin_markup_usd || 0;
  };

  const getClientTotal = (quote) => {
    return quote.clientTotalUsd || quote.client_total_usd || 0;
  };

  return (
    <main className="request-details-page">
      <section className="request-details-head">
        <div>
          <div className="request-tags">
            <span className="outline-tag">{request.serviceType || "Service"}</span>
            <span className="outline-tag">{request.serviceCategory || "General"}</span>
            <span className={`urgency-tag ${request.urgency || ""}`}>
              {request.urgency || "routine"}
            </span>
            <span className={`status-tag ${request.status || ""}`}>
              {request.status || "open"}
            </span>
          </div>

          <h1>{request.title}</h1>

          <div className="request-meta-line">
            <span>
              <MapPin size={17} />
              {port.locationSummary || port.name || port.port_name || "Port not added"}
            </span>

            <span>
              <CalendarDays size={17} />
              Due {formatDate(request.requiredBy)}
            </span>
          </div>
        </div>

        <div className="budget-block">
          <strong>
            $
            {money(
              isClient() && acceptedQuote
                ? getQuotePrice(acceptedQuote)
                : request.budgetUsd
            )}
          </strong>
          <span>
            {isClient()
              ? acceptedQuote
                ? "Accepted quotation"
                : "Awaiting approval"
              : `${Number(request.quotationCount || quotations.length || 0)} ${Number(request.quotationCount || quotations.length || 0) === 1
                ? "quotation"
                : "quotations"
              }`}
          </span>
        </div>
      </section>

      <section className="request-details-layout">
        <div className="request-main-col">
          <div className="details-card">
            <h2>Scope of Work</h2>
            <p>{request.scopeOfWork || "No scope added."}</p>
          </div>

          <div className="quotation-head">
            <h2>
              {isClient() ? "Accepted Quote" : `Quotations (${visibleQuotations.length})`}
            </h2>
            {canSubmitQuote && (
              <button
                className="submit-quote-toggle"
                onClick={() => setShowQuoteForm(!showQuoteForm)}
              >
                <Briefcase size={17} />
                Submit Quotation
              </button>
            )}
          </div>

          {isClient() && !acceptedQuote && (
            <div className="details-card">
              <p>
                Quotations are under admin review. Accepted expert details will be visible once a quote is approved.
              </p>
            </div>
          )}

          {showQuoteForm && canSubmitQuote && (
            <form className="quote-form-card" onSubmit={submitQuotation}>
              <h3>Submit Quotation</h3>
              <p>Provide a detailed cost breakdown for this service request.</p>

              <div className="quote-two-grid">
                <div>
                  <label>Total Quotation (USD)</label>
                  <input
                    value={quoteForm.totalQuoteUsd}
                    onChange={(e) =>
                      setQuoteForm({ ...quoteForm, totalQuoteUsd: e.target.value })
                    }
                    placeholder="3500"
                    required
                  />
                </div>

                <div>
                  <label>Attendance Days</label>
                  <input
                    value={quoteForm.attendanceDays}
                    onChange={(e) =>
                      setQuoteForm({ ...quoteForm, attendanceDays: e.target.value })
                    }
                    placeholder="1"
                  />
                </div>

                <div>
                  <label>Travel Cost</label>
                  <input
                    value={quoteForm.travelCost}
                    onChange={(e) =>
                      setQuoteForm({ ...quoteForm, travelCost: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>

                <div>
                  <label>Accommodation</label>
                  <input
                    value={quoteForm.accommodationCost}
                    onChange={(e) =>
                      setQuoteForm({ ...quoteForm, accommodationCost: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>

                <div>
                  <label>Report Fee</label>
                  <input
                    value={quoteForm.reportFee}
                    onChange={(e) =>
                      setQuoteForm({ ...quoteForm, reportFee: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>

                <div>
                  <label>Urgency Surcharge</label>
                  <input
                    value={quoteForm.urgencySurcharge}
                    onChange={(e) =>
                      setQuoteForm({ ...quoteForm, urgencySurcharge: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>
              </div>

              <label>Cover Letter / Notes</label>
              <textarea
                value={quoteForm.coverLetter}
                onChange={(e) =>
                  setQuoteForm({ ...quoteForm, coverLetter: e.target.value })
                }
                placeholder="Describe your experience, availability, and approach..."
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

          {canSeeQuotations &&
            visibleQuotations.map((quote) => (
              <article
                key={quote.id}
                className={`quotation-card ${quote.status === "accepted" ? "accepted" : ""}`}
              >
                <div className="quotation-top">
                  <div>
                    <h3>
                      {isClient()
                        ? quote.status === "accepted"
                          ? quote.expertName || "Expert"
                          : "Expert details hidden"
                        : quote.expertName || "Expert"}
                      <span>
                        <Star size={16} fill="#149d94" color="#149d94" />
                        {quote.expertRating || 0}
                      </span>
                    </h3>

                    <p>{formatDateTime(quote.createdAt)}</p>
                  </div>

                  <div className="quotation-price">
                    <strong>${money(getQuotePrice(quote))}</strong>
                    <span className={`quote-status ${quote.status}`}>
                      {quote.status}
                    </span>
                    {isSuperAdmin() && quote.status === "accepted" && (
                      <small className="admin-price-breakdown">
                        Expert: ${money(getExpertQuote(quote))} · Markup: $
                        {money(getAdminMarkup(quote))} · Client: ${money(getClientTotal(quote))}
                      </small>
                    )}
                  </div>
                </div>

                {!isClient() && (
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
                )}

                {quote.coverLetter && <blockquote>“{quote.coverLetter}”</blockquote>}

                {isClient() && acceptedQuote && (
                  <button
                    className="primary-btn"
                    onClick={() =>
                      navigate(`/experts/${acceptedQuote.expertId || acceptedQuote.expert_id}`, {
                        state: {
                          canReview: true,
                          jobName: request.title,
                        },
                      })
                    }
                  >
                    Rate & Review Expert
                  </button>
                )}

                {canAcceptQuote && quote.status !== "accepted" && (
                  <div className="admin-accept-box">
                    <label>
                      Admin Markup / Platform Fee (USD)
                      <input
                        type="number"
                        value={markupByQuote[quote.id] || ""}
                        onChange={(e) =>
                          setMarkupByQuote((prev) => ({
                            ...prev,
                            [quote.id]: e.target.value,
                          }))
                        }
                        placeholder="500"
                      />
                    </label>

                    <div className="client-total-preview">
                      Client Final Price: $
                      {money(Number(getExpertQuote(quote)) + Number(markupByQuote[quote.id] || 0))}
                    </div>

                    <button
                      className="accept-btn"
                      onClick={() => handleAcceptQuotation(quote.id)}
                    >
                      <CheckCircle2 size={16} />
                      Accept Quote
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

            <Info label="Name" value={vessel.name || vessel.vessel_name} />
            <Info label="IMO" value={vessel.imoNumber || vessel.imo_number} />
            <Info label="Type" value={vessel.type || vessel.vessel_type} />
            <Info
              label="Flag"
              value={vessel.flagState || vessel.flag_state}
              icon={<Flag size={14} />}
            />
          </div>

          <div className="side-info-card">
            <h3>
              <MapPin size={18} />
              Port & Schedule
            </h3>

            <Info label="Port" value={port.name || port.port_name} />
            <Info label="Country" value={port.country} />
            <Info label="ETA" value={formatDate(port.eta)} />
            <Info label="Deadline" value={formatDate(request.requiredBy)} />
          </div>

          <div className="side-info-card">
            <h3>
              <Award size={18} />
              Required Cert.
            </h3>

            <p>{request.requiredCertification || "-"}</p>
          </div>

          {!isExpert() && (
            <div className="side-info-card">
              <h3>Requested By</h3>
              <p>{request.requesterName || "-"}</p>
            </div>
          )}
        </aside>
      </section>

      {toast && (
        <div className="request-toast">
          <strong>{toast}</strong>
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