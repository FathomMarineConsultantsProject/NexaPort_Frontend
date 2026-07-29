import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  activateMaritimeDirectoryEntity,
  approveMaritimeDirectoryEntity,
  deactivateMaritimeDirectoryEntity,
  getMaritimeDirectoryEntity,
  rejectMaritimeDirectoryEntity,
} from "../api/maritimeDirectoryApi";
import {
  BranchList,
  CompanyOverview,
  ContactDetails,
  DirectoryDetailHeader,
  DirectorySection,
  FaqAccordion,
  Overview,
  PortsCovered,
  ProductList,
  RecordGrid,
  ServiceGroups,
  ShipyardDimensions,
} from "../components/directories/DirectoryUI";
import ShipyardProfile from "../components/directories/ShipyardProfile";
import { DIRECTORY_BY_TYPE } from "../config/maritimeDirectories";
import { directoryView } from "../utils/directoryData";
import "../styles/maritimeDirectory.css";

const SECTION_LABELS = {
  overview: "Overview",
  contact: "Contact",
  services: "Services",
  ports: "Ports Covered",
  branches: "Branches",
  offices: "Offices",
  certifications: "Certifications",
  class_approvals: "Class Approvals",
  memberships: "Memberships",
  products: "Products",
  faqs: "FAQ",
  dimensions: "Dimensions",
  fleet: "Fleet",
};
const DOSSIER_TYPES = new Set(["service_provider", "ship_agent", "supplier"]);

const sectionExists = (section, view, directoryType) => {
  if (section === "contact") return true;
  if (section === "overview") return DOSSIER_TYPES.has(directoryType) || Boolean(view.description || view.aboutSections.length || view.yearsExperience);
  if (section === "dimensions") return view.dimensions.length > 0;
  if (section === "class_approvals") return view.classApprovals.length > 0;
  return Array.isArray(view[section]) && view[section].length > 0;
};

export default function MaritimeDirectoryDetails() {
  const { directoryType, entityId } = useParams();
  const directory = DIRECTORY_BY_TYPE[directoryType];
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");
  const [tabState, setTabState] = useState({ entityId, section: "overview" });
  const tabRefs = useRef([]);

  useEffect(() => {
    let active = true;
    getMaritimeDirectoryEntity(entityId)
      .then((response) => { if (active) setRecord(response.data); })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.message || "Unable to load this company."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [entityId]);

  const view = useMemo(() => directoryView(record || {}, directoryType), [record, directoryType]);
  const isDossier = DOSSIER_TYPES.has(directoryType);
  const isShipyard = directoryType === "shipyard";
  const visibleSections = useMemo(
    () => directory?.sections.filter((section) => sectionExists(section, view, directoryType)) || [],
    [directory, directoryType, view],
  );
  const activeSection = tabState.entityId === entityId ? tabState.section : "overview";
  const selectedSection = visibleSections.includes(activeSection)
    ? activeSection
    : visibleSections.includes("overview") ? "overview" : visibleSections[0];

  if (!directory) return <main className="md-detail-page"><div className="md-empty-state">Unsupported directory type.</div></main>;
  if (loading) return <main className="md-detail-page"><div className="md-empty-state">Loading company dossier…</div></main>;
  if (!record) return <main className="md-detail-page"><Link className="md-back-link" to={directory.path}><ArrowLeft size={16} />Back to {directory.label}</Link><div className="md-alert" role="alert">{error || "Company not found."}</div></main>;

  const runAction = async (work) => {
    setActing(true);
    setError("");
    try {
      setRecord((await work()).data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update this company.");
    } finally {
      setActing(false);
    }
  };
  const reject = () => {
    const reason = window.prompt("Reason for rejecting this directory entry:");
    if (reason?.trim()) runAction(() => rejectMaritimeDirectoryEntity(entityId, reason));
  };
  const deactivate = () => {
    const reason = window.prompt("Reason for deactivating this directory entry:");
    if (reason?.trim()) runAction(() => deactivateMaritimeDirectoryEntity(entityId, reason));
  };

  const renderSection = (section) => {
    if (section === "overview") return isDossier ? <CompanyOverview key={section} view={view} /> : <Overview key={section} view={view} />;
    if (section === "contact") return <ContactDetails key={section} view={view} />;
    if (section === "dimensions") return <ShipyardDimensions key={section} dimensions={view.dimensions} />;
    if (section === "services") return <DirectorySection key={section} id={section} title={directory.serviceLabel} count={view.services.length} countLabel={view.services.length === 1 ? "capability listed" : "capabilities listed"}><ServiceGroups rows={view.services} /></DirectorySection>;
    if (section === "ports") {
      const title = directory.type === "tug_boat" ? "Operating Ports and Regions" : "Ports Covered";
      return <DirectorySection key={section} id={section} title={title} count={view.ports.length} countLabel={view.ports.length === 1 ? "location" : "locations"} className="md-section--coverage"><PortsCovered rows={view.ports} /></DirectorySection>;
    }
    if (section === "products" && isDossier) return <DirectorySection key={section} id={section} title="Products" count={view.products.length} countLabel={view.products.length === 1 ? "product" : "products"}><ProductList rows={view.products} /></DirectorySection>;
    if (section === "branches" || section === "offices") return <DirectorySection key={section} id={section} title={SECTION_LABELS[section]}><BranchList rows={view[section]} /></DirectorySection>;
    if (section === "faqs") return <DirectorySection key={section} id={section} title="Frequently Asked Questions"><FaqAccordion rows={view.faqs} /></DirectorySection>;
    const rows = section === "class_approvals" ? view.classApprovals : view[section];
    return <DirectorySection key={section} id={section} title={SECTION_LABELS[section]} className={isDossier ? "md-section--credentials" : ""}><RecordGrid rows={rows} kind={section} /></DirectorySection>;
  };

  const tabLabel = (section) => section === "services" ? directory.serviceLabel : SECTION_LABELS[section];
  const handleTabKeyDown = (event, index) => {
    let nextIndex = null;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % visibleSections.length;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + visibleSections.length) % visibleSections.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = visibleSections.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    setTabState({ entityId, section: visibleSections[nextIndex] });
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <main className={`md-detail-page md-detail-page--${directory.type}`}>
      <Link className="md-back-link" to={directory.path}><ArrowLeft size={16} />Back to {directory.label}</Link>
      <DirectoryDetailHeader view={view} directory={directory} onEdit={() => navigate(`/directories/${directoryType}/${entityId}/edit`)} />
      {error && <div className="md-alert" role="alert">{error}</div>}

      {isShipyard ? (
        <ShipyardProfile view={view} />
      ) : (
        <>
          {visibleSections.length > 0 && (
            <div className="md-section-nav" role="tablist" aria-label="Company dossier sections">
              {visibleSections.map((section, index) => (
                <button
                  key={section}
                  ref={(element) => { tabRefs.current[index] = element; }}
                  id={`${section}-tab`}
                  type="button"
                  role="tab"
                  aria-selected={selectedSection === section}
                  aria-controls={`${section}-panel`}
                  tabIndex={selectedSection === section ? 0 : -1}
                  onClick={() => setTabState({ entityId, section })}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
                >
                  {tabLabel(section)}
                </button>
              ))}
            </div>
          )}

          <div
            id={`${selectedSection}-panel`}
            className="md-detail-layout"
            role="tabpanel"
            aria-labelledby={`${selectedSection}-tab`}
            tabIndex={0}
          >
            {selectedSection && renderSection(selectedSection)}
          </div>
        </>
      )}

      <section className="md-admin-actions" aria-label="Administrative actions">
        <strong>Directory review</strong>
        <div>
          {view.entity.data_source !== "manual_admin" && view.reviewStatus !== "approved" && <button type="button" disabled={acting} onClick={() => runAction(() => approveMaritimeDirectoryEntity(entityId))}>Approve</button>}
          {view.entity.data_source !== "manual_admin" && view.reviewStatus !== "rejected" && <button type="button" disabled={acting} onClick={reject}>Reject</button>}
          {view.isActive ? <button type="button" disabled={acting} onClick={deactivate}>Deactivate</button> : <button type="button" disabled={acting} onClick={() => runAction(() => activateMaritimeDirectoryEntity(entityId))}>Activate</button>}
        </div>
      </section>
    </main>
  );
}
