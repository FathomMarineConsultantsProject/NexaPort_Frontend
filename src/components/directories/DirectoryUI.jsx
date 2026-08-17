import {
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Globe2,
  Mail,
  MapPin,
  Phone,
  Ruler,
  Search,
} from "lucide-react";
import { useEffect, useId, useState } from "react";
import { Link } from "react-router-dom";
import { DIRECTORY_TYPE_LABELS } from "../../config/maritimeDirectories";
import {
  cleanText,
  listServiceNames,
  parseJson,
  positiveCount,
  safeWebsite,
  validEmail,
  validLogoUrl,
} from "../../utils/directoryData";

const rowText = (row, ...keys) =>
  typeof row === "string"
    ? cleanText(row)
    : keys.map((key) => cleanText(row?.[key])).find(Boolean) || null;

const plural = (count, singular, pluralLabel = `${singular}s`) =>
  `${count} ${count === 1 ? singular : pluralLabel}`;

export function DirectoryLogo({ src, name, icon: Icon = Building2, compact = false }) {
  const logo = validLogoUrl(src);
  const [resolvedLogo, setResolvedLogo] = useState({ source: null, display: null });
  const [failedSrc, setFailedSrc] = useState(null);
  const displaySrc = resolvedLogo.source === logo ? resolvedLogo.display : null;
  const initials = cleanText(name)
    ?.split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = null;
    let active = true;

    if (logo) {
      fetch(logo, { credentials: "omit", signal: controller.signal })
        .then((response) => {
          if (!response.ok) throw new Error("Logo request failed");
          return response.blob();
        })
        .then((blob) => {
          if (!blob.type.startsWith("image/")) throw new Error("Logo response is not an image");
          objectUrl = URL.createObjectURL(blob);
          if (active) setResolvedLogo({ source: logo, display: objectUrl });
          else URL.revokeObjectURL(objectUrl);
        })
        .catch((error) => {
          if (active && error.name !== "AbortError") setResolvedLogo({ source: logo, display: logo });
        });
    }

    return () => {
      active = false;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [logo]);

  const failed = displaySrc && failedSrc === displaySrc;
  const preventLogoAction = (event) => event.preventDefault();

  return (
    <div className={`md-logo${compact ? " md-logo--compact" : ""}`} onContextMenu={preventLogoAction} onDragStart={preventLogoAction}>
      {displaySrc && !failed ? (
        <img
          src={displaySrc}
          alt={`${name} logo`}
          draggable={false}
          onContextMenu={preventLogoAction}
          onDragStart={preventLogoAction}
          onError={() => setFailedSrc(displaySrc)}
        />
      ) : (
        <span aria-label={`${name} logo not available`}>
          {initials || <Icon size={compact ? 22 : 28} aria-hidden="true" />}
        </span>
      )}
    </div>
  );
}

export function CopyButton({ value, label }) {
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    if (status === "idle") return undefined;
    const timeout = window.setTimeout(() => setStatus("idle"), 1800);
    return () => window.clearTimeout(timeout);
  }, [status]);

  const copyValue = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  };

  return (
    <button type="button" className="md-copy-button" aria-label={label} onClick={copyValue}>
      {status === "copied" ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
      <span aria-live="polite">{status === "copied" ? "Copied" : status === "failed" ? "Copy failed" : "Copy"}</span>
    </button>
  );
}

export function StatusBadge({ status, active = true }) {
  const normalized = cleanText(status)?.toLowerCase() || "pending";
  const label = normalized === "pending" ? "Pending review" : normalized;
  const statusClass = ["approved", "rejected", "pending"].includes(normalized) ? normalized : "pending";
  return (
    <span className="md-status-group" aria-label={`${label}; ${active ? "Active" : "Inactive"}`}>
      <span className={`md-status md-status--${statusClass}`}>
        <span aria-hidden="true" />
        {label}
      </span>
      <span className={`md-status md-status--activity${active ? "" : " md-status--inactive"}`}>
        <span aria-hidden="true" />
        {active ? "Active" : "Inactive"}
      </span>
    </span>
  );
}

export function DirectoryPageHeader({ directory, total, canAdd = false }) {
  return (
    <header className="md-page-header">
      <div className="md-page-header__copy">
        <div className="md-eyebrow">Maritime company directory</div>
        <h1>{directory.label}</h1>
        <p>{directory.description}</p>
        <span className="md-result-count">{total.toLocaleString()} {total === 1 ? "company" : "companies"}</span>
      </div>
      {canAdd && (
        <Link className="md-primary-action" to={`/directories/${directory.type}/new`}>
          Add {directory.singular}
        </Link>
      )}
    </header>
  );
}

export function DirectoryResultCard({ row, directory }) {
  const services = listServiceNames(row);
  const visibleServices = services.slice(0, 4);
  const location = [cleanText(row.city), cleanText(row.country)].filter(Boolean).join(", ");
  const parsedTypes = parseJson(row.directory_types ?? row.directoryTypes, []);
  const directoryTypes = [...new Set([
    directory.type,
    ...(Array.isArray(parsedTypes) ? parsedTypes : []),
  ])].filter((type) => DIRECTORY_TYPE_LABELS[type]);
  const counts = [
    [positiveCount(row.service_count ?? row.serviceCount), "service"],
    [positiveCount(row.port_count ?? row.portCount), "port"],
    [positiveCount(row.branch_count ?? row.branchCount), "location"],
    [positiveCount(row.product_count ?? row.productCount), "product"],
  ].filter(([count]) => count > 0);

  return (
    <Link className="md-result-card" to={`/directories/${directory.type}/${row.id}`} aria-label={`View ${row.company_name || row.companyName}`}>
      <DirectoryLogo src={row.logo_url || row.logoUrl} name={row.company_name || row.companyName} icon={directory.icon} compact />
      <div className="md-result-card__body">
        <div className="md-result-card__title">
          <h2>{row.company_name || row.companyName}</h2>
          <StatusBadge status={row.review_status || row.reviewStatus} active={(row.is_active ?? row.isActive) !== false} />
        </div>
        <div className="md-result-card__types" aria-label="Directory classifications">
          {directoryTypes.map((type) => <span key={type}>{DIRECTORY_TYPE_LABELS[type]}</span>)}
        </div>
        {location && <p className="md-result-card__location"><MapPin size={14} aria-hidden="true" />{location}</p>}
        {cleanText(row.description_excerpt || row.descriptionExcerpt || row.description) && (
          <p className="md-result-card__description">{row.description_excerpt || row.descriptionExcerpt || row.description}</p>
        )}
        {visibleServices.length > 0 && (
          <div className="md-chip-list" aria-label="Key services">
            {visibleServices.map((service) => <span key={service}>{service}</span>)}
            {services.length > visibleServices.length && <small>+{services.length - visibleServices.length} more</small>}
          </div>
        )}
        {counts.length > 0 && (
          <div className="md-result-card__counts">
            {counts.map(([count, label]) => <span key={label}>{plural(count, label)}</span>)}
          </div>
        )}
      </div>
      <span className="md-result-card__view">View <ArrowRight size={15} aria-hidden="true" /></span>
    </Link>
  );
}

export function DirectoryDetailHeader({ view, directory, onEdit }) {
  const location = [view.city, view.country].filter(Boolean).join(", ");
  const isShipyard = directory.type === "shipyard";
  return (
    <header className={`md-detail-header md-detail-header--${directory.type}`}>
      <div className="md-detail-header__rail" aria-hidden="true" />
      <DirectoryLogo src={view.logo} name={view.name} icon={directory.icon} />
      <div className="md-detail-header__identity">
        {isShipyard ? <>
          <div className="md-chip-list md-chip-list--types">
            {view.directoryTypes.filter((type) => DIRECTORY_TYPE_LABELS[type]).map((type) => <span key={type}>{DIRECTORY_TYPE_LABELS[type]}</span>)}
          </div>
          <h1>{view.name}</h1>
        </> : <>
          <div className="md-detail-header__eyebrow">Maritime company dossier</div>
          <div className="md-detail-header__title-row">
            <h1>{view.name}</h1>
          </div>
          <div className="md-chip-list md-chip-list--types">
            {view.directoryTypes.filter((type) => DIRECTORY_TYPE_LABELS[type]).map((type) => <span key={type}>{DIRECTORY_TYPE_LABELS[type]}</span>)}
          </div>
        </>}
        <div className="md-detail-header__meta">
          <StatusBadge status={view.reviewStatus} active={view.isActive} />
          {location && <span><MapPin size={14} aria-hidden="true" />{location}</span>}
        </div>
        {!isShipyard && view.description && <p className="md-detail-header__description">{view.description}</p>}
      </div>
      {onEdit && <button type="button" className="md-secondary-action" onClick={onEdit}>{isShipyard ? "Edit" : "Edit company"}</button>}
    </header>
  );
}

export function DirectorySection({ id, title, count = 0, countLabel = "listed", description, children, className = "" }) {
  return (
    <section id={id} className={`md-section ${className}`.trim()} aria-labelledby={`${id}-title`}>
      <header className="md-section__header">
        <div>
          <h2 id={`${id}-title`}>{title}</h2>
          {count > 0 && <span className="md-section__count">{count.toLocaleString()} {countLabel}</span>}
        </div>
        {description && <p>{description}</p>}
      </header>
      {children}
    </section>
  );
}

export function Overview({ view }) {
  if (!view.description && !view.aboutSections.length && !view.yearsExperience) return null;
  return (
    <DirectorySection id="overview" title="Overview" className="md-section--overview">
      {view.aboutSections.length ? (
        <div className="md-prose">
          {view.aboutSections.map((section, index) => (
            <article key={`${section.heading || "about"}-${index}`}>
              {section.heading && <h3>{section.heading}</h3>}
              {section.body?.split(/\n{2,}/).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </article>
          ))}
        </div>
      ) : view.description ? <div className="md-prose"><p>{view.description}</p></div> : null}
      {view.yearsExperience > 0 && <p className="md-experience"><strong>{view.yearsExperience}</strong> years of experience</p>}
    </DirectorySection>
  );
}

export function ContactDetails({ view }) {
  const email = validEmail(view.email);
  const website = safeWebsite(view.website);
  const phoneTarget = view.phone?.replace(/[^\d+*#,;]/g, "") || "";
  const phoneHref = (phoneTarget.match(/\d/g) || []).length >= 3 ? `tel:${phoneTarget}` : null;
  return (
    <DirectorySection id="contact" title="Contact">
      <dl className="md-contact-list">
        <div>
          <dt><Mail size={16} aria-hidden="true" />Email</dt>
          <dd>{email ? <span className="md-contact-value"><a href={`mailto:${email}`}>{email}</a><CopyButton value={email} label="Copy email" /></span> : <span className="md-not-listed">Not listed</span>}</dd>
        </div>
        <div>
          <dt><ExternalLink size={16} aria-hidden="true" />Website</dt>
          <dd>{website ? <a href={website} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${view.name} website (opens in a new tab)`}>Visit website<ExternalLink size={13} aria-hidden="true" /></a> : <span className="md-not-listed">Not listed</span>}</dd>
        </div>
        <div><dt><Phone size={16} aria-hidden="true" />Phone</dt><dd>{view.phone ? <span className="md-contact-value">{phoneHref ? <a href={phoneHref}>{view.phone}</a> : view.phone}{phoneHref && <CopyButton value={view.phone} label="Copy phone number" />}</span> : <span className="md-not-listed">Not listed</span>}</dd></div>
        <div><dt><MapPin size={16} aria-hidden="true" />Address</dt><dd>{view.address ? <address>{view.address}</address> : <span className="md-not-listed">Not listed</span>}</dd></div>
      </dl>
    </DirectorySection>
  );
}

const telephoneLink = (value) => {
  const target = value?.replace(/[^\d+*#,;]/g, "") || "";
  return (target.match(/\d/g) || []).length >= 3 ? `tel:${target}` : null;
};

export function CompanyOverview({ view }) {
  const email = validEmail(view.email);
  const website = safeWebsite(view.website);
  const phoneHref = telephoneLink(view.phone);
  const location = [view.city, view.country].filter(Boolean).join(", ");
  const facts = [
    ["Review status", view.reviewStatus === "pending" ? "Pending review" : view.reviewStatus],
    ["Active status", view.isActive ? "Active" : "Inactive"],
    ["Experience", view.yearsExperience ? `${view.yearsExperience} years` : null],
    ["Claimed status", view.claimedStatus],
  ].filter(([, value]) => cleanText(value));

  return (
    <DirectorySection id="overview" title="Overview" className="md-section--overview md-company-overview">
      <div className={`md-overview-grid${facts.length ? "" : " md-overview-grid--single"}`}>
        <dl className="md-contact-list">
          <div><dt><MapPin size={16} aria-hidden="true" />Location</dt><dd>{location || <span className="md-not-listed">Not listed</span>}</dd></div>
          <div><dt><MapPin size={16} aria-hidden="true" />Address</dt><dd>{view.address ? <address>{view.address}</address> : <span className="md-not-listed">Not listed</span>}</dd></div>
          <div><dt><Mail size={16} aria-hidden="true" />Email</dt><dd>{email ? <span className="md-contact-value"><a href={`mailto:${email}`}>{email}</a><CopyButton value={email} label="Copy email" /></span> : <span className="md-not-listed">Not listed</span>}</dd></div>
          <div><dt><Phone size={16} aria-hidden="true" />Phone</dt><dd>{view.phone ? <span className="md-contact-value">{phoneHref ? <a href={phoneHref}>{view.phone}</a> : view.phone}{phoneHref && <CopyButton value={view.phone} label="Copy phone number" />}</span> : <span className="md-not-listed">Not listed</span>}</dd></div>
          <div><dt><Globe2 size={16} aria-hidden="true" />Website</dt><dd>{website ? <a href={website} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${view.name} website (opens in a new tab)`}>Visit website<ExternalLink size={13} aria-hidden="true" /></a> : <span className="md-not-listed">Not listed</span>}</dd></div>
        </dl>
        {facts.length > 0 && <dl className="md-company-facts">
          {facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl>}
      </div>
    </DirectorySection>
  );
}

export function ExpandableCollection({ count, noun, children, forceExpanded = false }) {
  const [expanded, setExpanded] = useState(false);
  const regionId = useId();
  const open = expanded || forceExpanded;
  const needsDesktopToggle = count > 12;
  const needsMobileToggle = count > 8;
  const itemClass = (index) => [
    index >= 8 ? "md-collapsible-item--mobile" : "",
    index >= 12 ? "md-collapsible-item--desktop" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={`md-expandable${open ? " is-expanded" : " is-collapsed"}`}>
      <div id={regionId}>{children(itemClass)}</div>
      {!forceExpanded && needsMobileToggle && (
        <button type="button" className={`md-expand-toggle${needsDesktopToggle ? "" : " md-expand-toggle--mobile"}`} aria-expanded={expanded} aria-controls={regionId} onClick={() => setExpanded((value) => !value)}>
          {expanded ? "Show fewer" : `Show all ${count} ${noun}`}
        </button>
      )}
    </div>
  );
}

export function ServiceGroups({ rows }) {
  const groups = new Map();
  rows.forEach((service, index) => {
    const category = service.category || "Services";
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push({ ...service, index });
  });
  return (
    <ExpandableCollection count={rows.length} noun="services">
      {(itemClass) => <div className="md-service-groups">
        {[...groups.entries()].map(([category, services]) => (
          <section className="md-service-group" key={category}>
            {groups.size > 1 && <h3>{category}</h3>}
            <div>{services.map((service) => (
              <article className={`md-service-item ${itemClass(service.index)}`} key={`${service.name}-${service.category || ""}`}>
                <span aria-hidden="true" />
                <div><strong>{service.name}</strong>{service.description && <p>{service.description}</p>}</div>
              </article>
            ))}</div>
          </section>
        ))}
      </div>}
    </ExpandableCollection>
  );
}

export function PortsCovered({ rows }) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? rows.filter((port) => `${port.name} ${port.country || ""} ${port.unlocode || ""}`.toLowerCase().includes(normalizedQuery))
    : rows;
  return (
    <>
      {rows.length > 20 && <label className="md-port-search"><span>Search ports</span><div><Search size={16} aria-hidden="true" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search covered ports" /></div></label>}
      <ExpandableCollection count={filtered.length} noun="ports" forceExpanded={Boolean(normalizedQuery)}>
        {(itemClass) => <div className="md-port-list">
          {filtered.map((port, index) => {
            const details = [port.unlocode, port.country].filter(Boolean);
            return <article className={itemClass(index)} key={`${port.name}-${port.unlocode || ""}-${port.country || ""}`}><strong>{port.name}</strong>{details.length > 0 && <span>{details.join(" · ")}</span>}</article>;
          })}
        </div>}
      </ExpandableCollection>
      {normalizedQuery && filtered.length === 0 && <p className="md-collection-empty">No covered ports match “{query.trim()}”.</p>}
    </>
  );
}

export function ProductList({ rows }) {
  return (
    <ExpandableCollection count={rows.length} noun="products">
      {(itemClass) => <div className="md-product-list">{rows.map((product, index) => {
        const details = [product.category, product.manufacturer].filter(Boolean);
        return <article className={itemClass(index)} key={product.name}><strong>{product.name}</strong>{details.length > 0 && <span>{details.join(" · ")}</span>}</article>;
      })}</div>}
    </ExpandableCollection>
  );
}

export function BranchList({ rows }) {
  return <div className="md-branch-list">{rows.map((branch) => {
    const location = [branch.city, branch.country].filter(Boolean).join(", ");
    const email = validEmail(branch.email);
    const phoneHref = telephoneLink(branch.phone);
    return <article key={`${branch.branchName}-${branch.address || ""}`}>
      <h3>{branch.branchName}</h3>
      {location && <p className="md-branch-list__location">{location}</p>}
      {branch.address && <address>{branch.address}</address>}
      {(email || branch.phone) && <div className="md-branch-list__contact">
        {email && <a href={`mailto:${email}`}>{email}</a>}
        {branch.phone && (phoneHref ? <a href={phoneHref}>{branch.phone}</a> : <span>{branch.phone}</span>)}
      </div>}
    </article>;
  })}</div>;
}

export function RecordGrid({ rows, kind }) {
  const definitions = {
    ports: [["port_name", "portName", "name"], ["country", "unlocode"]],
    branches: [["branch_name", "branchName", "name"], ["public_address", "publicAddress", "city", "country", "public_telephone", "publicTelephone", "public_email", "publicEmail"]],
    offices: [["branch_name", "branchName", "name"], ["public_address", "publicAddress", "city", "country", "public_telephone", "publicTelephone", "public_email", "publicEmail"]],
    certifications: [["certification_name", "certificationName", "name"], ["issuer", "standard_code", "standardCode", "reference", "expiry_date", "expiryDate"]],
    class_approvals: [["approval_name", "approvalName", "name", "society_name", "societyName"], ["society_name", "societyName", "approval_details", "approvalDetails"]],
    memberships: [["membership_name", "membershipName", "name", "organization_name", "organizationName"], ["organization_name", "organizationName", "membership_details", "membershipDetails"]],
    products: [["product_name", "productName", "name"], ["category", "manufacturer"]],
    fleet: [["name", "vessel_name", "vesselName", "tug_name", "tugName"], ["type", "bollard_pull", "bollardPull", "power", "imo"]],
  };
  const [primary, secondary] = definitions[kind];
  return (
    <div className={`md-record-grid md-record-grid--${kind}`}>
      {rows.map((row, index) => {
        const title = rowText(row, ...primary);
        const details = secondary.map((key) => rowText(row, key)).filter(Boolean);
        return <article key={row?.id || `${title}-${index}`}><h3>{title}</h3>{details.length > 0 && <p>{details.join(" · ")}</p>}</article>;
      })}
    </div>
  );
}

export function ShipyardDimensions({ dimensions }) {
  if (!dimensions.length) return null;
  return (
    <DirectorySection id="dimensions" title="Dimensions">
      <div className="md-dimensions">
        {dimensions.map(({ label, value }) => (
          <div key={label}><Ruler size={17} aria-hidden="true" /><span>{label}</span><strong>{value}</strong></div>
        ))}
      </div>
    </DirectorySection>
  );
}

function FaqItem({ item, index }) {
  const [open, setOpen] = useState(false);
  const baseId = useId();
  const questionId = `${baseId}-question-${index}`;
  const answerId = `${baseId}-answer-${index}`;
  return (
    <article className={`md-faq__item${open ? " is-open" : ""}`}>
      <h3>
        <button id={questionId} type="button" aria-expanded={open} aria-controls={answerId} onClick={() => setOpen((value) => !value)}>
          <span>{item.question}</span><ChevronDown size={20} aria-hidden="true" />
        </button>
      </h3>
      <div id={answerId} role="region" aria-labelledby={questionId} hidden={!open}><p>{item.answer}</p></div>
    </article>
  );
}

export function FaqAccordion({ rows }) {
  return <div className="md-faq">{rows.map((item, index) => <FaqItem key={item.id || item.question} item={item} index={index} />)}</div>;
}
