import {
  Briefcase,
  CheckCircle2,
  MapPin,
  MessageSquare,
  Shield,
  Star,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";

import { getExpertById, getExpertCvUrl, updateExpert } from "../api/expertApi";
import { createExpertReview, getExpertReviews } from "../api/reviewApi";
import ConsultantAvatar from "../components/experts/ConsultantAvatar";
import PortSearchMultiSelect from "../components/experts/PortSearchMultiSelect";
import { getStoredUser, isClient, isExpert, isSuperAdmin } from "../utils/auth";

import "./ExpertProfile.css";

const listToText = (list = []) =>
  list.map((item) => item.name || item.port_name || item.language_name || item).join(", ");

const textToList = (value = "") =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const arrayValue = (value) => (Array.isArray(value) ? value : []);
const isFilled = (value) => {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") return Object.keys(value).length > 0;
  return String(value ?? "").trim() !== "";
};
const formatExperience = (exp = {}) => {
  const parts = [
    exp.years ? `${exp.years} years` : "",
    exp.months ? `${exp.months} months` : "",
    exp.days ? `${exp.days} days` : "",
  ].filter(Boolean);
  return parts.join(" ") || "";
};
const toPortObjects = (ports = []) =>
  ports.map((port, index) => ({
    id: port.id || port.port_name || port.name || index,
    port_name: port.port_name || port.name || port,
  }));
const initialRegistrationEdit = {
  phone_number: "",
  mobile_number: "",
  nationality: "",
  employment_status: "",
  company_name: "",
  dob_dd: "",
  dob_mm: "",
  dob_yyyy: "",
  year_started: "",
  heard_about: "",
  street1: "",
  street2: "",
  city: "",
  postal_code: "",
  country: "",
  state_region: "",
  discipline: "",
  rank: "",
  discipline_other: "",
  rank_other: "",
  qualifications_other: "",
  vessel_types_other: "",
  shoreside_experience_other: "",
  surveying_experience_other: "",
  vessel_type_surveying_experience_other: "",
  accreditations_other: "",
  courses_completed_other: "",
  qualifications: [],
  experience_by_qualification: {},
  vessel_types: [],
  shoreside_experience: [],
  surveying_experience: [],
  vessel_type_surveying_experience: [],
  accreditations: [],
  courses_completed: [],
  refs: [],
  inspection_cost: "",
  marketing_consent: false,
};

export default function ExpertProfile() {
  const location = useLocation();
  const { id } = useParams();

  const [expert, setExpert] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [cvMessage, setCvMessage] = useState("");
  const [openingCv, setOpeningCv] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editTab, setEditTab] = useState("basic");

  const [editForm, setEditForm] = useState({
    full_name: "",
    biography: "",
    base_location: "",
    country: "",
    day_rate_usd: "",
    years_experience: "",
    availability: "available",
    is_premium: false,

    specialties: "",
    certifications: "",
    vessel_types: "",
    ports: [],
    languages: "",
    registration_details: null,
  });

  const [reviewForm, setReviewForm] = useState({
    job_name: location.state?.jobName || "",
    rating: 5,
    comment: "",
    reviewer_name: "",
  });

  const loadPage = useCallback(async () => {
    try {
      const [expertRes, reviewRes] = await Promise.all([
        getExpertById(id),
        getExpertReviews(id),
      ]);

      setExpert(expertRes.data);

      setEditForm({
        full_name: expertRes.data.full_name || "",
        biography: expertRes.data.biography || "",
        base_location: expertRes.data.base_location || "",
        country: expertRes.data.country || "",
        day_rate_usd: expertRes.data.day_rate_usd || "",
        years_experience: expertRes.data.years_experience || "",
        availability: expertRes.data.availability || "available",
        is_premium: Boolean(expertRes.data.is_premium),

        specialties: listToText(expertRes.data.specialties || []),
        certifications: listToText(expertRes.data.certifications || []),
        vessel_types: listToText(expertRes.data.vessel_types || []),
        ports: toPortObjects(expertRes.data.ports || []),
        languages: listToText(expertRes.data.languages || []),
        registration_details: expertRes.data.registration_details
          ? { ...initialRegistrationEdit, ...expertRes.data.registration_details }
          : null,
      });
      setReviews(reviewRes.data || []);
    } catch (error) {
      console.error("Failed loading consultant profile:", error);
      setExpert(null);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPage();
  }, [loadPage]);

  const submitProfileUpdate = async (e) => {
    e.preventDefault();

    try {
      setSavingProfile(true);
      await updateExpert(expert.id, {
        full_name: editForm.full_name,
        biography: editForm.biography,
        base_location: editForm.base_location,
        country: editForm.country,
        day_rate_usd: Number(editForm.day_rate_usd || 0),
        years_experience: Number(editForm.years_experience || 0),
        availability: editForm.availability,
        is_premium: editForm.is_premium,

        specialties: textToList(editForm.specialties),
        certifications: textToList(editForm.certifications),
        vessel_types: textToList(editForm.vessel_types),
        ports: editForm.ports.map((port) => port.port_name),
        languages: textToList(editForm.languages),
        registration_details: editForm.registration_details,
      });
      setIsEditing(false);
      await loadPage();
    } catch (error) {
      console.error("Failed updating consultant profile:", error);
      alert(error.response?.data?.message || "Failed to update consultant profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();

    try {
      await createExpertReview(id, reviewForm);

      setReviewForm({
        job_name: "",
        rating: 5,
        comment: "",
        reviewer_name: "",
      });

      setShowReviewForm(false);
      loadPage();
    } catch (error) {
      console.error("Failed submitting review:", error);
    }
  };

  if (!expert) {
    return <div className="expert-profile-page">Loading...</div>;
  }

  const currentUser = getStoredUser();

  const canEditProfile =
    isSuperAdmin() ||
    (isExpert() && Number(expert.user_id) === Number(currentUser?.id));

  const canWriteReview =
    isSuperAdmin() ||
    (isClient() && location.state?.canReview);
  // Keep reviews visible, but review submission should happen from accepted request flow later.

  const registrationDetails = expert.registration_details;

  const openCv = async () => {
    setCvMessage("");
    const popup = window.open("about:blank", "_blank");

    if (!popup) {
      setCvMessage("Allow pop-ups to view the CV.");
      return;
    }

    popup.opener = null;
    setOpeningCv(true);

    try {
      const response = await getExpertCvUrl(expert.id);
      popup.location.replace(response.url);
    } catch (error) {
      popup.close();
      setCvMessage(error.response?.data?.message || "Unable to open CV");
    } finally {
      setOpeningCv(false);
    }
  };

  const updateRegistrationField = (field, value) => {
    setEditForm((prev) => ({
      ...prev,
      registration_details: {
        ...initialRegistrationEdit,
        ...(prev.registration_details || {}),
        [field]: value,
      },
    }));
  };

  const updateRegistrationList = (field, value) => {
    updateRegistrationField(field, textToList(value));
  };

  const updateQualificationExperience = (qualification, field, value) => {
    setEditForm((prev) => {
      const details = {
        ...initialRegistrationEdit,
        ...(prev.registration_details || {}),
      };
      return {
        ...prev,
        registration_details: {
          ...details,
          experience_by_qualification: {
            ...(details.experience_by_qualification || {}),
            [qualification]: {
              ...(details.experience_by_qualification?.[qualification] || {}),
              [field]: value.replace(/\D/g, "").slice(0, 2),
            },
          },
        },
      };
    });
  };

  const updateReferenceEdit = (index, field, value) => {
    setEditForm((prev) => {
      const details = {
        ...initialRegistrationEdit,
        ...(prev.registration_details || {}),
      };
      const refs = arrayValue(details.refs);
      const nextRefs = refs.map((ref, refIndex) =>
        refIndex === index ? { ...ref, [field]: value } : ref
      );
      return {
        ...prev,
        registration_details: {
          ...details,
          refs: nextRefs,
        },
      };
    });
  };

  const addReferenceEdit = () => {
    setEditForm((prev) => {
      const details = {
        ...initialRegistrationEdit,
        ...(prev.registration_details || {}),
      };
      return {
        ...prev,
        registration_details: {
          ...details,
          refs: [
            ...arrayValue(details.refs),
            { name: "", email: "", phoneNumber: "", position: "", companyName: "" },
          ],
        },
      };
    });
  };

  const renderDetailRows = (rows) => {
    const visibleRows = rows.filter(([, value]) => isFilled(value));
    if (!visibleRows.length) return null;

    return (
      <div className="profile-detail-list">
        {visibleRows.map(([label, value]) => (
          <div className="profile-detail-row" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    );
  };

  const renderTags = (items) => {
    const values = arrayValue(items).filter(isFilled);
    if (!values.length) return null;
    return (
      <div className="tag-list">
        {values.map((item) => (
          <span key={item} className="soft-tag">
            {item}
          </span>
        ))}
      </div>
    );
  };

  const renderRegistrationSection = (title, children) =>
    children ? (
      <div className="profile-card">
        <h3>{title}</h3>
        {children}
      </div>
    ) : null;

  const registrationEdit = editForm.registration_details;

  return (
    <main className="expert-profile-page">
      <section className="expert-profile-hero">
        <div className="expert-profile-banner" />

        <div className="expert-profile-header">
          <ConsultantAvatar
            className="expert-profile-avatar"
            photoUrl={expert.photo_url}
            name={expert.full_name}
          />

          <div className="expert-profile-info">
            <h1>{expert.full_name}</h1>

            <div className="expert-profile-meta">
              <div className="rating-row">
                <Star size={18} fill="#14b8a6" color="#14b8a6" />

                <strong>{Number(expert.rating || 0).toFixed(1)}</strong>

                <span>({expert.review_count || 0} reviews)</span>
              </div>

              <div className="location-row">
                <MapPin size={16} />
                {expert.base_location}, {expert.country}
              </div>

              <div>{expert.years_experience || 0} yrs experience</div>
            </div>
          </div>

          <div className="expert-status-row">
            {expert.is_premium && (
              <span className="premium-badge">◎ Premium Consultant</span>
            )}

            <span className={`available-badge ${(expert.availability || "").toLowerCase()}`}>
              {expert.availability}
            </span>

            {isSuperAdmin() && expert.has_cv && (
              <button
                className="edit-profile-btn"
                type="button"
                onClick={openCv}
                disabled={openingCv}
              >
                {openingCv ? "Opening CV..." : "View CV"}
              </button>
            )}

            {canEditProfile && (
              <button
                className="edit-profile-btn"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? "Cancel Edit" : "Edit Profile"}
              </button>
            )}
          </div>
          {cvMessage && <p className="profile-action-message">{cvMessage}</p>}
        </div>
      </section>

      {isEditing && canEditProfile && (
        <form className="profile-edit-card" onSubmit={submitProfileUpdate}>
          <h3>Edit Consultant Profile</h3>

          <div className="profile-edit-tabs">
            <button
              type="button"
              className={editTab === "basic" ? "active" : ""}
              onClick={() => setEditTab("basic")}
            >
              Basic Info
            </button>

            {/* <button
              type="button"
              className={editTab === "pricing" ? "active" : ""}
              onClick={() => setEditTab("pricing")}
            >
              Pricing & Availability
            </button>

            <button
              type="button"
              className={editTab === "bio" ? "active" : ""}
              onClick={() => setEditTab("bio")}
            >
              Biography
            </button> */}

            <button
              type="button"
              className={editTab === "expertise" ? "active" : ""}
              onClick={() => setEditTab("expertise")}
            >
              Expertise
            </button>

            {registrationEdit && (
              <button
                type="button"
                className={editTab === "registration" ? "active" : ""}
                onClick={() => setEditTab("registration")}
              >
                Registration Details
              </button>
            )}

          </div>

          <div className="profile-edit-grid">
            <label>
              Full Name
              <input
                value={editForm.full_name}
                onChange={(e) =>
                  setEditForm({ ...editForm, full_name: e.target.value })
                }
              />
            </label>

            <label>
              Availability
              <select
                value={editForm.availability}
                onChange={(e) =>
                  setEditForm({ ...editForm, availability: e.target.value })
                }
              >
                <option value="available">Available</option>
                <option value="busy">Busy</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </label>

            <label>
              Base Location
              <input
                value={editForm.base_location}
                onChange={(e) =>
                  setEditForm({ ...editForm, base_location: e.target.value })
                }
              />
            </label>

            <label>
              Country
              <input
                value={editForm.country}
                onChange={(e) =>
                  setEditForm({ ...editForm, country: e.target.value })
                }
              />
            </label>

            <label>
              Day Rate USD
              <input
                type="number"
                value={editForm.day_rate_usd}
                onChange={(e) =>
                  setEditForm({ ...editForm, day_rate_usd: e.target.value })
                }
              />
            </label>

            <label>
              Years Experience
              <input
                type="number"
                value={editForm.years_experience}
                onChange={(e) =>
                  setEditForm({ ...editForm, years_experience: e.target.value })
                }
              />
            </label>
          </div>

          <label className="profile-edit-bio">
            Biography
            <textarea
              rows={4}
              value={editForm.biography}
              onChange={(e) =>
                setEditForm({ ...editForm, biography: e.target.value })
              }
            />
          </label>

          {editTab === "expertise" && (
            <div className="profile-edit-grid">
              <label>
                Specialties
                <input
                  value={editForm.specialties}
                  onChange={(e) =>
                    setEditForm({ ...editForm, specialties: e.target.value })
                  }
                  placeholder="Pre-PSC Inspection, ISM Audit"
                />
              </label>

              <label>
                Certifications
                <input
                  value={editForm.certifications}
                  onChange={(e) =>
                    setEditForm({ ...editForm, certifications: e.target.value })
                  }
                  placeholder="COC Master, SIRE Inspector"
                />
              </label>

              <label>
                Vessel Expertise
                <input
                  value={editForm.vessel_types}
                  onChange={(e) =>
                    setEditForm({ ...editForm, vessel_types: e.target.value })
                  }
                  placeholder="Tanker, Container"
                />
              </label>

              <label>
                Ports Covered
                <PortSearchMultiSelect
                  value={editForm.ports}
                  onChange={(ports) => setEditForm({ ...editForm, ports })}
                  placeholder="Port of Singapore, Jebel Ali Port"
                />
              </label>

              <label>
                Languages
                <input
                  value={editForm.languages}
                  onChange={(e) =>
                    setEditForm({ ...editForm, languages: e.target.value })
                  }
                  placeholder="English, Hindi"
                />
              </label>
            </div>
          )}

          {editTab === "registration" && registrationEdit && (
            <>
              <div className="profile-edit-grid">
                {[
                  ["Phone number", "phone_number"],
                  ["Mobile number", "mobile_number"],
                  ["Nationality", "nationality"],
                  ["Employment status", "employment_status"],
                  ["Company name", "company_name"],
                  ["DOB day", "dob_dd"],
                  ["DOB month", "dob_mm"],
                  ["DOB year", "dob_yyyy"],
                  ["Year started", "year_started"],
                  ["Heard about", "heard_about"],
                  ["Street address 1", "street1"],
                  ["Street address 2", "street2"],
                  ["City", "city"],
                  ["Postal code", "postal_code"],
                  ["Country", "country"],
                  ["State/Region", "state_region"],
                  ["Discipline", "discipline"],
                  ["Rank", "rank"],
                  ["Other discipline", "discipline_other"],
                  ["Other rank", "rank_other"],
                  ["Other qualification", "qualifications_other"],
                  ["Other vessel type", "vessel_types_other"],
                  ["Other shoreside experience", "shoreside_experience_other"],
                  ["Other surveying experience", "surveying_experience_other"],
                  ["Other vessel type surveying experience", "vessel_type_surveying_experience_other"],
                  ["Other accreditation", "accreditations_other"],
                  ["Other course", "courses_completed_other"],
                  ["Inspection cost", "inspection_cost"],
                ].map(([label, field]) => (
                  <label key={field}>
                    {label}
                    <input
                      value={registrationEdit[field] || ""}
                      onChange={(e) => updateRegistrationField(field, e.target.value)}
                    />
                  </label>
                ))}
              </div>

              <div className="profile-edit-grid registration-list-edit">
                {[
                  ["Qualifications", "qualifications"],
                  ["Vessel types", "vessel_types"],
                  ["Shoreside experience", "shoreside_experience"],
                  ["Surveying experience", "surveying_experience"],
                  ["Vessel type surveying experience", "vessel_type_surveying_experience"],
                  ["Accreditations", "accreditations"],
                  ["Courses completed", "courses_completed"],
                ].map(([label, field]) => (
                  <label key={field}>
                    {label}
                    <textarea
                      rows={3}
                      value={arrayValue(registrationEdit[field]).join(", ")}
                      onChange={(e) => updateRegistrationList(field, e.target.value)}
                    />
                  </label>
                ))}
              </div>

              <div className="profile-edit-subsection">
                <h4>Experience by qualification</h4>
                {arrayValue(registrationEdit.qualifications).map((qualification) => {
                  const exp = registrationEdit.experience_by_qualification?.[qualification] || {};
                  return (
                    <div className="profile-edit-experience" key={qualification}>
                      <strong>{qualification}</strong>
                      <input
                        placeholder="Years"
                        value={exp.years || ""}
                        onChange={(e) => updateQualificationExperience(qualification, "years", e.target.value)}
                      />
                      <input
                        placeholder="Months"
                        value={exp.months || ""}
                        onChange={(e) => updateQualificationExperience(qualification, "months", e.target.value)}
                      />
                      <input
                        placeholder="Days"
                        value={exp.days || ""}
                        onChange={(e) => updateQualificationExperience(qualification, "days", e.target.value)}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="profile-edit-subsection">
                <div className="profile-edit-subhead">
                  <h4>References</h4>
                  <button type="button" onClick={addReferenceEdit}>
                    Add reference
                  </button>
                </div>
                {arrayValue(registrationEdit.refs).map((ref, index) => (
                  <div className="profile-edit-reference" key={index}>
                    <strong>Reference {index + 1}</strong>
                    <div className="profile-edit-grid">
                      {[
                        ["Name", "name"],
                        ["Email", "email"],
                        ["Phone number", "phoneNumber"],
                        ["Position", "position"],
                        ["Company name", "companyName"],
                      ].map(([label, field]) => (
                        <label key={field}>
                          {label}
                          <input
                            value={ref[field] || ""}
                            onChange={(e) => updateReferenceEdit(index, field, e.target.value)}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <label className="profile-premium-check">
                <input
                  type="checkbox"
                  checked={Boolean(registrationEdit.marketing_consent)}
                  onChange={(e) => updateRegistrationField("marketing_consent", e.target.checked)}
                />
                Marketing consent
              </label>
            </>
          )}

          {isSuperAdmin() && (
            <label className="profile-premium-check">
              <input
                type="checkbox"
                checked={editForm.is_premium}
                onChange={(e) =>
                  setEditForm({ ...editForm, is_premium: e.target.checked })
                }
              />
              Premium Consultant
            </label>
          )}

          <div className="profile-edit-actions">
            <button type="submit" disabled={savingProfile}>
              {savingProfile ? "Saving..." : "Save Changes"}
            </button>

            <button type="button" onClick={() => setIsEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <section className="expert-profile-grid">
        <div className="left-column">
          <div className="profile-card">
            <h3>Professional Biography</h3>
            <p>{expert.biography || "No biography added yet."}</p>
          </div>

          <div className="profile-card">
            <h3>Specialties</h3>

            <div className="tag-list">
              {expert.specialties?.map((item) => (
                <span key={item.id || item.name} className="soft-tag">
                  {item.name || item}
                </span>
              ))}
            </div>
          </div>

          <div className="profile-card">
            <h3>Certifications & Accreditations</h3>

            <div className="cert-list">
              {expert.certifications?.map((item) => (
                <div key={item.id || item.name} className="cert-item">
                  <CheckCircle2 size={18} />
                  {item.name || item}
                </div>
              ))}
            </div>
          </div>

          {registrationDetails && (
            <>
              {renderRegistrationSection(
                "Professional Background",
                renderDetailRows([
                  ["Nationality", registrationDetails.nationality],
                  ["Employment status", registrationDetails.employment_status],
                  ["Company name", registrationDetails.company_name],
                  ["Discipline", registrationDetails.discipline],
                  ["Other discipline", registrationDetails.discipline_other],
                  ["Rank", registrationDetails.rank],
                  ["Other rank", registrationDetails.rank_other],
                  ["Year started", registrationDetails.year_started],
                ])
              )}

              {renderRegistrationSection(
                "Qualifications & Experience",
                <>
                  {renderTags(registrationDetails.qualifications)}
                  {isFilled(registrationDetails.qualifications_other) && (
                    <p className="profile-muted">Other: {registrationDetails.qualifications_other}</p>
                  )}
                  {isFilled(registrationDetails.experience_by_qualification) && (
                    <div className="profile-detail-list">
                      {Object.entries(registrationDetails.experience_by_qualification || {}).map(([qualification, exp]) => (
                        <div className="profile-detail-row" key={qualification}>
                          <span>{qualification}</span>
                          <strong>{formatExperience(exp)}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {renderRegistrationSection(
                "Maritime Experience",
                <>
                  {renderTags(registrationDetails.vessel_types)}
                  {isFilled(registrationDetails.vessel_types_other) && (
                    <p className="profile-muted">Other vessel type: {registrationDetails.vessel_types_other}</p>
                  )}
                  {renderTags(registrationDetails.shoreside_experience)}
                  {isFilled(registrationDetails.shoreside_experience_other) && (
                    <p className="profile-muted">Other shoreside experience: {registrationDetails.shoreside_experience_other}</p>
                  )}
                </>
              )}

              {renderRegistrationSection(
                "Surveying Expertise",
                <>
                  {renderTags(registrationDetails.surveying_experience)}
                  {isFilled(registrationDetails.surveying_experience_other) && (
                    <p className="profile-muted">Other surveying experience: {registrationDetails.surveying_experience_other}</p>
                  )}
                  {renderTags(registrationDetails.vessel_type_surveying_experience)}
                  {isFilled(registrationDetails.vessel_type_surveying_experience_other) && (
                    <p className="profile-muted">Other vessel types surveyed: {registrationDetails.vessel_type_surveying_experience_other}</p>
                  )}
                </>
              )}

              {renderRegistrationSection(
                "Accreditations & Courses",
                <>
                  {renderTags(registrationDetails.accreditations)}
                  {isFilled(registrationDetails.accreditations_other) && (
                    <p className="profile-muted">Other accreditation: {registrationDetails.accreditations_other}</p>
                  )}
                  {renderTags(registrationDetails.courses_completed)}
                  {isFilled(registrationDetails.courses_completed_other) && (
                    <p className="profile-muted">Other course: {registrationDetails.courses_completed_other}</p>
                  )}
                </>
              )}

              {renderRegistrationSection(
                "Registration Details",
                <>
                  {renderDetailRows([
                    ["Phone", registrationDetails.phone_number],
                    ["Mobile", registrationDetails.mobile_number],
                    ["Email", registrationDetails.email],
                    ["DOB", [registrationDetails.dob_dd, registrationDetails.dob_mm, registrationDetails.dob_yyyy].filter(Boolean).join("/")],
                    ["Heard about NexaPort", registrationDetails.heard_about],
                    ["Street address 1", registrationDetails.street1],
                    ["Street address 2", registrationDetails.street2],
                    ["City", registrationDetails.city],
                    ["Postal code", registrationDetails.postal_code],
                    ["Country", registrationDetails.country],
                    ["State/Region", registrationDetails.state_region],
                  ])}
                  {arrayValue(registrationDetails.refs).length > 0 && (
                    <div className="profile-reference-list">
                      {registrationDetails.refs.map((ref, index) => (
                        <div className="profile-reference-item" key={`${ref.email}-${index}`}>
                          <strong>Reference {index + 1}</strong>
                          <span>{[ref.name, ref.position, ref.companyName].filter(Boolean).join(" · ")}</span>
                          <span>{[ref.email, ref.phoneNumber].filter(Boolean).join(" · ")}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {(registrationDetails.photo_s3_key || registrationDetails.cv_s3_key) && (
                    <p className="profile-muted">
                      Registration photo/CV are stored with the profile. Direct document links are not available in this view.
                    </p>
                  )}
                </>
              )}

              {renderRegistrationSection(
                "Inspection Information",
                renderDetailRows([
                  ["Inspection cost", registrationDetails.inspection_cost],
                  ["Marketing consent", registrationDetails.marketing_consent ? "Yes" : "No"],
                ])
              )}
            </>
          )}

          <div className="reviews-header">
            <h2>Reviews ({reviews.length})</h2>

            {canWriteReview && (
              <button
                className="write-review-btn"
                onClick={() => setShowReviewForm(!showReviewForm)}
              >
                <MessageSquare size={16} />
                Write Review
              </button>
            )}
          </div>

          {showReviewForm && canWriteReview && (
            <form className="review-form" onSubmit={submitReview}>
              <div className="form-group">
                <label>Job Name</label>

                <input
                  value={reviewForm.job_name}
                  onChange={(e) =>
                    setReviewForm({
                      ...reviewForm,
                      job_name: e.target.value,
                    })
                  }
                  placeholder="Enter job name"
                  required
                />
              </div>

              <div className="form-group">
                <label>Rating</label>

                <div className="rating-buttons">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      type="button"
                      key={num}
                      className={
                        reviewForm.rating === num
                          ? "rating-btn active"
                          : "rating-btn"
                      }
                      onClick={() =>
                        setReviewForm({
                          ...reviewForm,
                          rating: num,
                        })
                      }
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Comment</label>

                <textarea
                  rows="4"
                  value={reviewForm.comment}
                  onChange={(e) =>
                    setReviewForm({
                      ...reviewForm,
                      comment: e.target.value,
                    })
                  }
                  placeholder="Describe your experience..."
                />
              </div>

              <div className="form-group">
                <label>Reviewer Name</label>

                <input
                  value={reviewForm.reviewer_name}
                  onChange={(e) =>
                    setReviewForm({
                      ...reviewForm,
                      reviewer_name: e.target.value,
                    })
                  }
                  placeholder="Company or reviewer name"
                />
              </div>

              <div className="review-form-actions">
                <button type="submit" className="submit-review-btn">
                  Submit Review
                </button>

                <button
                  type="button"
                  className="cancel-review-btn"
                  onClick={() => setShowReviewForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="reviews-list">
            {reviews.map((review) => (
              <div key={review.id} className="review-card">
                <div className="review-top">
                  <div>
                    <h4>{review.reviewer_name || "Anonymous"}</h4>
                    <p>{review.job_name}</p>
                  </div>

                  <div className="review-stars">{"★".repeat(review.rating)}</div>
                </div>

                <blockquote>“{review.comment}”</blockquote>

                <span className="review-date">
                  {new Date(review.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="right-column">
          <div className="profile-side-card">
            <h3>At a Glance</h3>

            <div className="side-row">
              <Briefcase size={18} />
              {expert.jobs_completed || 0} jobs completed
            </div>

            <div className="side-row">
              <Shield size={18} />${expert.day_rate_usd}/day
            </div>
          </div>

          <div className="profile-side-card">
            <h3>Vessel Expertise</h3>

            <div className="tag-list">
              {expert.vessel_types?.map((item) => (
                <span key={item.id || item.name} className="vessel-tag">
                  {item.name || item}
                </span>
              ))}
            </div>
          </div>

          <div className="profile-side-card">
            <h3>Ports Covered</h3>

            <div className="tag-list">
              {expert.ports?.map((item) => (
                <span key={item.id || item.port_name} className="soft-tag">
                  {item.port_name || item.name || item}
                </span>
              ))}
            </div>
          </div>

          <div className="profile-side-card">
            <h3>Languages</h3>

            <div className="tag-list">
              {expert.languages?.map((item) => (
                <span key={item.id || item.language_name} className="soft-tag">
                  {item.language_name || item.name || item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
