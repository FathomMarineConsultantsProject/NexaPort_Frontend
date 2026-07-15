import { Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { deactivateConsultantAsAdmin, deleteConsultantAsAdmin, getConsultantDeletionImpact, getExperts } from "../api/expertApi";
import TypedConfirmationModal from "../components/common/TypedConfirmationModal";
import { getSpecialties } from "../api/masterApi";
import CustomSelect from "../components/experts/CustomSelect";
import ExpertCard from "../components/experts/ExpertCard";
import { isSuperAdmin, isExpert } from "../utils/auth";

import "./ExpertDirectory.css";

const availabilityOptions = [
  "All Availability",
  "Available Now",
  "Busy",
  "Unavailable",
];

export default function ExpertDirectory() {
  const navigate = useNavigate();
  const [experts, setExperts] = useState([]);
  const [specialties, setSpecialties] = useState(["All Specialties"]);
  const [search, setSearch] = useState("");
  const [availability, setAvailability] = useState("All Availability");
  const [specialty, setSpecialty] = useState("All Specialties");
  const [loading, setLoading] = useState(true);
  const [accountAction, setAccountAction] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  const loadPageData = useCallback(async () => {
    setLoading(true);

    try {
      const expertRes = await getExperts();

      // Admin backend should return all experts.
      // Expert backend should return only own expert profile.
      setExperts(expertRes.data || []);

      if (isSuperAdmin()) {
        const specialtyRes = await getSpecialties();
        const specialtyNames = (specialtyRes.data || []).map((item) => item.name);
        setSpecialties(["All Specialties", ...specialtyNames]);
      }
    } catch (error) {
      console.error("Failed to load expert directory:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadId = window.setTimeout(loadPageData, 0);
    return () => window.clearTimeout(loadId);
  }, [loadPageData]);

  const filteredExperts = useMemo(() => {
    return experts.filter((expert) => {
      const nameMatch = (expert.full_name || "")
        .toLowerCase()
        .includes(search.toLowerCase());

      const availabilityMatch =
        availability === "All Availability" ||
        (expert.availability || "").toLowerCase() ===
          availability.replace(" Now", "").toLowerCase();

      const specialtyMatch =
        specialty === "All Specialties" ||
        (expert.specialties || []).some(
          (s) =>
            (typeof s === "string" ? s : s.name).toLowerCase() ===
            specialty.toLowerCase()
        );

      return nameMatch && availabilityMatch && specialtyMatch;
    });
  }, [experts, search, availability, specialty]);

  const prepareDelete = async (expert) => {
    setActionError("");
    try {
      const response = await getConsultantDeletionImpact(expert.id);
      setAccountAction({ expert, dependencies: response.data, mode: response.data.has_immutable_history ? "deactivate" : "delete" });
    } catch (error) { setActionError(error.response?.data?.message || "Unable to inspect Consultant dependencies."); }
  };

  const completeAccountAction = async ({ confirmation, reason }) => {
    setActionBusy(true); setActionError("");
    try {
      if (accountAction.mode === "delete") await deleteConsultantAsAdmin(accountAction.expert.id, confirmation);
      else await deactivateConsultantAsAdmin(accountAction.expert.id, { confirmation, reason });
      setExperts((current) => current.filter((item) => item.id !== accountAction.expert.id));
      setAccountAction(null);
    } catch (error) { setActionError(error.response?.data?.message || "Consultant account action failed."); }
    finally { setActionBusy(false); }
  };

  return (
    <main className="expert-page">
      <section className="expert-header">
        <div>
          <h1>{isExpert() ? "My Consultant Profile" : "Consultant Directory"}</h1>
          <p>
            {isExpert()
              ? "View your maritime consultant profile."
              : "OCIMF-accredited surveyors, class-approved inspectors, and ISM auditors."}
          </p>
        </div>

        {isSuperAdmin() && (
          <Link to="/register-consultant" className="register-btn">
            Register as Consultant
          </Link>
        )}
      </section>

      {isSuperAdmin() && (
        <section className="expert-filters">
          <div className="search-box">
            <Search size={20} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search consultants by name..."
            />
          </div>

          <CustomSelect
            width="190px"
            value={availability}
            options={availabilityOptions}
            onChange={setAvailability}
          />

          <CustomSelect
            width="200px"
            value={specialty}
            options={specialties}
            onChange={setSpecialty}
          />
        </section>
      )}

      {loading ? (
        <div className="experts-empty">Loading consultants...</div>
      ) : filteredExperts.length === 0 ? (
        <div className="experts-empty">No consultant profile found.</div>
      ) : (
        <section className="expert-grid">
          {filteredExperts.map((expert) => (
            <article className="expert-admin-card" key={expert.id}><ExpertCard expert={expert} />{isSuperAdmin() && <div className="expert-admin-actions"><button type="button" onClick={() => navigate(`/experts/${expert.id}`)}>Edit</button><button type="button" className="danger" onClick={() => prepareDelete(expert)}>Delete</button></div>}</article>
          ))}
        </section>
      )}
      {actionError && !accountAction && <div className="experts-action-error">{actionError}</div>}
      {accountAction && <TypedConfirmationModal
        title={accountAction.mode === "delete" ? "Permanently delete Consultant?" : "Deactivate and anonymize Consultant?"}
        subject={accountAction.expert.full_name}
        company={accountAction.expert.company_name}
        warning={accountAction.mode === "delete" ? "This dependency-free login and Consultant profile will be permanently removed." : "Business history will be preserved, while login access and personal profile information are removed."}
        dependencies={accountAction.dependencies}
        confirmationText={accountAction.mode === "delete" ? "DELETE" : "DEACTIVATE"}
        confirmLabel={accountAction.mode === "delete" ? "Permanently Delete" : "Deactivate and Anonymize"}
        requireReason={accountAction.mode === "deactivate"}
        busy={actionBusy}
        error={actionError}
        onCancel={() => !actionBusy && setAccountAction(null)}
        onConfirm={completeAccountAction}
      />}
    </main>
  );
}
