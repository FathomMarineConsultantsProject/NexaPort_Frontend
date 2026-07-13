import { ArrowLeft, Building2, ExternalLink, MapPin, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getFlagInspector } from "../api/flagApi";
import CopyableContact from "../components/common/CopyableContact";
import "./FlagInspectorProfile.css";

const cleanText = (value) => {
  const text = String(value ?? "").trim();
  return /^null$/i.test(text) ? "" : text;
};

const organizationText = (value) => {
  const text = cleanText(value);
  return /^(n\/?a|not applicable)$/i.test(text) ? "" : text;
};

const hasValue = (value) => cleanText(value) !== "";

const splitContactItems = (value) =>
  cleanText(value).split(/\s*;\s*/).filter(Boolean);

const DetailRows = ({ rows }) => {
  const visibleRows = rows.filter(([, value, splitItems]) =>
    splitItems ? splitContactItems(value).length > 0 : hasValue(value));
  if (!visibleRows.length) return null;

  return (
    <div className="flag-profile-detail-list">
      {visibleRows.map(([label, value, splitItems, contactType]) => (
        <div className="flag-profile-detail-row" key={label}>
          <span>{label}</span>
          {splitItems ? (
            <div className="flag-profile-contact-values">
              {splitContactItems(value).map((item, index) => <CopyableContact key={`${label}-${index}`} value={item} type={contactType} />)}
            </div>
          ) : <strong>{cleanText(value)}</strong>}
        </div>
      ))}
    </div>
  );
};

export default function FlagInspectorProfile() {
  const { flagSlug, inspectorId } = useParams();
  const [flag, setFlag] = useState(null);
  const [inspector, setInspector] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadInspector = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await getFlagInspector(flagSlug, inspectorId);
        if (!active) return;
        setFlag(response.flag);
        setInspector(response.inspector);
      } catch (err) {
        if (active) {
          setError(err.response?.data?.message || "Failed to load Flag inspector.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadInspector();

    return () => {
      active = false;
    };
  }, [flagSlug, inspectorId]);

  if (loading) {
    return <main className="flag-profile-page">Loading Flag inspector...</main>;
  }

  if (error || !inspector) {
    return (
      <main className="flag-profile-page">
        <div className="flag-profile-state">{error || "Flag inspector not found."}</div>
      </main>
    );
  }

  const sourceUrl = cleanText(inspector.source_record_url || inspector.source_url);
  const fullName = cleanText(inspector.full_name);
  const organizationName = organizationText(inspector.organization_name);
  const companyOnly = !fullName && !!organizationName;
  const displayName = fullName || organizationName || "Flag inspector";

  return (
    <main className="flag-profile-page">
      <Link className="flag-profile-back" to={`/flag/${flag?.slug || flagSlug}`}>
        <ArrowLeft size={17} />
        Back to Flag Directory
      </Link>

      <section className="flag-profile-hero">
        <div className="flag-profile-icon">
          {companyOnly ? <Building2 size={30} /> : <UserRound size={30} />}
        </div>
        <div>
          <span>{flag?.name || "Flag"} {companyOnly ? "Flag Inspection Company" : "Flag Inspector"}</span>
          <h1>{displayName}</h1>
          <p>
            <MapPin size={16} />
            {[inspector.location, inspector.region, inspector.country]
              .map(cleanText)
              .filter(Boolean)
              .join(", ")}
          </p>
        </div>
      </section>

      <section className="flag-profile-grid">
        <article className="flag-profile-card">
          <h2>Organization</h2>
          <DetailRows
            rows={[
              ["Name", organizationName],
              ["Address", inspector.organization_address],
              ["Email", inspector.organization_email, true, "email"],
              ["Telephone", inspector.organization_telephone, true, "phone"],
              ["Fax", inspector.organization_fax, true, "fax"],
            ]}
          />
        </article>

        <article className="flag-profile-card">
          <h2>Contact Information</h2>
          <DetailRows
            rows={[
              ["Inspector Email", inspector.inspector_email, true, "email"],
              ["Inspector Telephone", inspector.inspector_telephone, true, "phone"],
            ]}
          />
        </article>

        <article className="flag-profile-card">
          <h2>Coverage</h2>
          <DetailRows
            rows={[
              ["Country", inspector.country],
              ["Region", inspector.region],
              ["Location", inspector.location],
              ["Areas Covered", inspector.areas_covered_text],
            ]}
          />
        </article>

        <article className="flag-profile-card">
          <h2>Source Information</h2>
          <DetailRows rows={[["Source Name", inspector.source_name]]} />
          {sourceUrl && (
            <a
              className="flag-source-link"
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              View Source
              <ExternalLink size={16} />
            </a>
          )}
        </article>
      </section>
    </main>
  );
}
