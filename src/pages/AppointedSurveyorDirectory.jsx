import {
  Building2,
  ClipboardCheck,
  Mail,
  MapPin,
  Phone,
  RotateCw,
  Search,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getAppointedSurveyors } from "../api/appointedSurveyorApi";
import CopyableContact from "../components/common/CopyableContact";
import DirectoryDetailsModal, { DirectoryDetailGrid } from "../components/common/DirectoryDetailsModal";
import ViewToggle from "../components/common/ViewToggle";
import "./AppointedSurveyorDirectory.css";

const emptySummary = {
  surveyor_count: 0,
  country_count: 0,
  general_count: 0,
  restricted_count: 0,
  mlc_authorized_count: 0,
};
const VIEW_KEY = "np_appointed_surveyors_view";
const initialView = () => {
  try {
    const stored = localStorage.getItem(VIEW_KEY);
    return stored === "list" || stored === "grid" ? stored : "grid";
  } catch {
    return "grid";
  }
};

const splitValues = (value) =>
  String(value || "")
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);

const phoneHref = (value) => `tel:${value.replace(/[^+\d]/g, "")}`;

function ContactRow({ icon: Icon, label, value, type }) {
  if (!value) return null;
  const values = splitValues(value);

  return (
    <div className="appointed-contact-row">
      <Icon size={16} />
      <div>
        <span>{label}</span>
        {type === "phone" &&
          values.map((item, index) => (
            <CopyableContact key={`${item}-${index}`} value={item} href={phoneHref(item)} type="phone" />
          ))}
        {type === "email" &&
          values.map((item, index) => (
            <CopyableContact key={`${item}-${index}`} value={item} href={`mailto:${item}`} type="email" />
          ))}
        {!type && <p>{value}</p>}
      </div>
    </div>
  );
}

export default function AppointedSurveyorDirectory() {
  const [surveyors, setSurveyors] = useState([]);
  const [summary, setSummary] = useState(emptySummary);
  const [countries, setCountries] = useState([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [country, setCountry] = useState("");
  const [scope, setScope] = useState("");
  const [mlc, setMlc] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [view, setView] = useState(initialView);
  const [selectedSurveyor, setSelectedSurveyor] = useState(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;

    const loadDirectory = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await getAppointedSurveyors({
          search: debouncedSearch,
          country,
          scope,
          mlc,
        });
        if (!active) return;
        setSurveyors(response.surveyors || []);
        setSummary(response.summary || emptySummary);
        setCountries(response.filters?.countries || []);
      } catch (requestError) {
        if (!active) return;
        setSurveyors([]);
        setSummary(emptySummary);
        setError(
          requestError.response?.data?.message ||
            "Failed to load appointed ship surveyors."
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    loadDirectory();
    return () => {
      active = false;
    };
  }, [country, debouncedSearch, mlc, retryKey, scope]);

  const hasFilters = Boolean(debouncedSearch || country || scope || mlc);
  const metrics = [
    ["Total Surveyors", summary.surveyor_count],
    ["Countries", summary.country_count],
    ["General", summary.general_count],
    ["Restricted", summary.restricted_count],
    ["MLC Authorized", summary.mlc_authorized_count],
  ];
  const changeView = (nextView) => {
    setView(nextView);
    try { localStorage.setItem(VIEW_KEY, nextView); } catch { /* Preference remains in memory. */ }
  };
  const handleRowKeyDown = (event, surveyor) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSelectedSurveyor(surveyor);
    }
  };

  return (
    <main className="appointed-page">
      <section className="appointed-heading">
        <span className="appointed-eyebrow">External professional directory</span>
        <h1>Appointed Ship Surveyors</h1>
        <p>View appointed ship surveyors and their authorized survey scope.</p>
        <small>List dated 10 July 2026</small>
      </section>

      <section className="appointed-controls" aria-label="Directory filters">
        <label className="appointed-search">
          <span>Search directory</span>
          <div>
            <Search size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search surveyors, organizations, countries, emails or phone numbers..."
            />
          </div>
        </label>

        <label>
          <span>Country</span>
          <select value={country} onChange={(event) => setCountry(event.target.value)}>
            <option value="">All Countries</option>
            {countries.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Appointment type</span>
          <select value={scope} onChange={(event) => setScope(event.target.value)}>
            <option value="">All Appointments</option>
            <option value="general">General</option>
            <option value="restricted">Restricted</option>
          </select>
        </label>

        <label>
          <span>MLC authorization</span>
          <select value={mlc} onChange={(event) => setMlc(event.target.value)}>
            <option value="">All MLC Statuses</option>
            <option value="true">MLC Authorized</option>
            <option value="false">Not MLC Authorized</option>
          </select>
        </label>

        <div className="appointed-summary" aria-live="polite">
          {metrics.map(([label, value]) => (
            <div key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {error && (
        <section className="appointed-state appointed-error" role="alert">
          <h2>Directory unavailable</h2>
          <p>{error}</p>
          <button type="button" onClick={() => setRetryKey((value) => value + 1)}>
            <RotateCw size={15} /> Retry
          </button>
        </section>
      )}

      {!error && loading && (
        <section className="appointed-grid" aria-label="Loading appointed ship surveyors">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div className="appointed-skeleton" key={item} />
          ))}
        </section>
      )}

      {!error && !loading && surveyors.length === 0 && (
        <section className="appointed-state">
          <ClipboardCheck size={28} />
          <h2>
            {hasFilters
              ? "No appointed ship surveyors match the current filters."
              : "No appointed ship surveyors are currently available."}
          </h2>
          {hasFilters && <p>Try changing or clearing one of the filters.</p>}
        </section>
      )}

      {!error && !loading && surveyors.length > 0 && (
        <section className="appointed-results">
          <div className="appointed-results-heading">
            <span>Directory results</span>
            <div><strong>{summary.surveyor_count} {summary.surveyor_count === 1 ? "record" : "records"}</strong><ViewToggle value={view} onChange={changeView} label="Appointed surveyor results view" /></div>
          </div>

          {view === "grid" ? <div className="appointed-grid">
            {surveyors.map((surveyor) => {
              const restricted = surveyor.appointment_scope === "restricted";
              return (
                <article className="appointed-card" key={surveyor.id}>
                  <div className="appointed-card-head">
                    <div className="appointed-card-icon"><ClipboardCheck size={22} /></div>
                    <div>
                      <div className="appointed-badges">
                        <span className={restricted ? "restricted" : "general"}>
                          {restricted
                            ? "Restricted Appointed Surveyor"
                            : "Appointed Surveyor"}
                        </span>
                        {surveyor.mlc_under_500gt_authorized && (
                          <span className="mlc"><ShieldCheck size={12} /> MLC &lt;500 GT Authorized</span>
                        )}
                      </div>
                      <h2>
                        {[surveyor.professional_title, surveyor.full_name]
                          .filter(Boolean)
                          .join(" ")}
                      </h2>
                      {surveyor.organization_name && (
                        <p><Building2 size={14} /> {surveyor.organization_name}</p>
                      )}
                    </div>
                  </div>

                  <div className="appointed-scope">
                    <MapPin size={15} />
                    <strong>{surveyor.country}</strong>
                    {restricted && (
                      <span>Ships up to {Number(surveyor.max_ship_length_meters)} metres</span>
                    )}
                  </div>

                  <div className="appointed-card-body">
                    <ContactRow icon={Smartphone} label="Mobile" value={surveyor.mobile_numbers} type="phone" />
                    <ContactRow icon={Phone} label="Telephone" value={surveyor.telephone_numbers} type="phone" />
                    <ContactRow icon={Mail} label="Email" value={surveyor.email_addresses} type="email" />
                    <ContactRow icon={MapPin} label="Address" value={surveyor.address_text} />
                  </div>

                  <div className="appointed-card-foot">
                    Source: {surveyor.source_document_title}
                  </div>
                </article>
              );
            })}
          </div> : (
            <div className="appointed-table-wrap">
              <table className="appointed-table">
                <thead><tr><th>Name</th><th>Organization</th><th>Appointment type</th><th>Email</th><th>Phone</th><th>Country</th><th>MLC status</th><th><span className="sr-only">Action</span></th></tr></thead>
                <tbody>
                  {surveyors.map((surveyor) => {
                    const email = splitValues(surveyor.email_addresses)[0];
                    const phone = splitValues(surveyor.mobile_numbers || surveyor.telephone_numbers)[0];
                    return (
                      <tr key={surveyor.id} tabIndex={0} onClick={() => setSelectedSurveyor(surveyor)} onKeyDown={(event) => handleRowKeyDown(event, surveyor)}>
                        <td><strong>{[surveyor.professional_title, surveyor.full_name].filter(Boolean).join(" ")}</strong></td>
                        <td>{surveyor.organization_name || "—"}</td>
                        <td className="capitalize">{surveyor.appointment_scope || "—"}</td>
                        <td>{email ? <CopyableContact value={email} href={`mailto:${email}`} type="email" /> : "—"}</td>
                        <td>{phone ? <CopyableContact value={phone} href={phoneHref(phone)} type="phone" /> : "—"}</td>
                        <td>{surveyor.country || "—"}</td>
                        <td>{surveyor.mlc_under_500gt_authorized ? "Authorized" : "Not authorized"}</td>
                        <td><button type="button" onClick={(event) => { event.stopPropagation(); setSelectedSurveyor(surveyor); }}>View details</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {selectedSurveyor && (
        <DirectoryDetailsModal
          eyebrow="Appointed Ship Surveyor"
          title={[selectedSurveyor.professional_title, selectedSurveyor.full_name].filter(Boolean).join(" ")}
          onClose={() => setSelectedSurveyor(null)}
        >
          <DirectoryDetailGrid entries={[
            ["Organization", selectedSurveyor.organization_name],
            ["Appointment scope", selectedSurveyor.appointment_scope],
            ["Country", selectedSurveyor.country],
            ["MLC under 500 GT", selectedSurveyor.mlc_under_500gt_authorized ? "Authorized" : "Not authorized"],
            ["Maximum ship length", selectedSurveyor.max_ship_length_meters ? `${Number(selectedSurveyor.max_ship_length_meters)} metres` : ""],
            ["Email", selectedSurveyor.email_addresses],
            ["Mobile", selectedSurveyor.mobile_numbers],
            ["Telephone", selectedSurveyor.telephone_numbers],
            ["Address", selectedSurveyor.address_text],
            ["Source", selectedSurveyor.source_name],
            ["Source document", selectedSurveyor.source_document_title],
            ["Source published", selectedSurveyor.source_published_date ? new Date(selectedSurveyor.source_published_date).toLocaleDateString() : ""],
          ]} />
        </DirectoryDetailsModal>
      )}
    </main>
  );
}
