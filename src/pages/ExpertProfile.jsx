import {
  Briefcase,
  CheckCircle2,
  MapPin,
  MessageSquare,
  Star,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";

import {
  createExpertMediaUploadUrl,
  getExpertById,
  getExpertCvUrl,
  updateExpert,
  updateConsultantAsAdmin,
} from "../api/expertApi";
import {
  createExpertReview,
  getExpertReviews,
  updateExpertReview,
} from "../api/reviewApi";
import ConsultantAvatar from "../components/experts/ConsultantAvatar";
import PortSearchMultiSelect from "../components/experts/PortSearchMultiSelect";
import { updateConsultantPhotoCache } from "../utils/consultantPhotoCache";
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
  const [reviewError, setReviewError] = useState("");
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [reviewEditForm, setReviewEditForm] = useState(null);
  const [reviewEditSaving, setReviewEditSaving] = useState(false);
  const [reviewEditError, setReviewEditError] = useState("");
  const [cvMessage, setCvMessage] = useState("");
  const [openingCv, setOpeningCv] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [cvFile, setCvFile] = useState(null);
  const [cvError, setCvError] = useState("");
  const [profileSaveMessage, setProfileSaveMessage] = useState("");
  const [profileSaveError, setProfileSaveError] = useState("");
  const photoInputRef = useRef(null);
  const cvInputRef = useRef(null);

  const [isEditing, setIsEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editTab, setEditTab] = useState("basic");

  const [editForm, setEditForm] = useState({
    full_name: "",
    biography: "",
    base_location: "",
    country: "",
    years_experience: "",
    availability: "available",
    is_premium: false,

    specialties: "",
    certifications: "",
    vessel_types: "",
    ports: [],
    languages: "",
    registration_details: null,
    user_email: "",
    user_phone: "",
    user_is_active: true,
    flag_services: [],
  });

  const [reviewForm, setReviewForm] = useState({
    job_name: location.state?.jobName || "",
    rating: 0,
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
        user_email: expertRes.data.user_email || "",
        user_phone: expertRes.data.user_phone || "",
        user_is_active: expertRes.data.user_is_active !== false,
        flag_services: expertRes.data.flag_services || [],
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

  useEffect(
    () => () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    },
    [photoPreviewUrl]
  );

  const discardSelectedPhoto = () => {
    setPhotoFile(null);
    setPhotoPreviewUrl("");
    setPhotoError("");
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const discardSelectedCv = () => {
    setCvFile(null);
    setCvError("");
    if (cvInputRef.current) cvInputRef.current.value = "";
  };

  const discardSelectedMedia = () => {
    discardSelectedPhoto();
    discardSelectedCv();
  };

  const cancelEditing = () => {
    if (savingProfile) return;
    discardSelectedMedia();
    setProfileSaveError("");
    setIsEditing(false);
  };

  const beginEditing = () => {
    setProfileSaveMessage("");
    setIsEditing(true);
  };

  const submitProfileUpdate = async (e) => {
    e.preventDefault();
    if (savingProfile) return;

    try {
      setSavingProfile(true);
      setProfileSaveMessage("");
      setProfileSaveError("");
      setPhotoError("");
      setCvError("");

      if (
        photoFile &&
        !["image/png", "image/jpeg", "image/webp"].includes(photoFile.type)
      ) {
        setPhotoError("Photo must be PNG, JPEG or WEBP.");
        throw new Error("Select a valid profile photo.");
      }
      if (photoFile && photoFile.size > 3 * 1024 * 1024) {
        setPhotoError("Photo must be 3MB or less.");
        throw new Error("Select a valid profile photo.");
      }
      if (photoFile && photoFile.size <= 0) {
        setPhotoError("Photo file is empty.");
        throw new Error("Select a valid profile photo.");
      }
      if (cvFile && cvFile.type !== "application/pdf") {
        setCvError("CV must be a PDF file.");
        throw new Error("Select a valid CV file.");
      }
      if (cvFile && cvFile.size > 5 * 1024 * 1024) {
        setCvError("CV must be 5MB or less.");
        throw new Error("Select a valid CV file.");
      }
      if (cvFile && cvFile.size <= 0) {
        setCvError("CV file is empty.");
        throw new Error("Select a valid CV file.");
      }

      let photoS3Key;
      let cvS3Key;

      if (photoFile) {
        const presign = await createExpertMediaUploadUrl(expert.id, {
          kind: "photo",
          contentType: photoFile.type,
          size: photoFile.size,
        });
        const uploadResponse = await fetch(presign.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": photoFile.type },
          body: photoFile,
        });

        if (!uploadResponse.ok) {
          throw new Error("Profile photo upload failed.");
        }

        photoS3Key = presign.key;
      }

      if (cvFile) {
        const presign = await createExpertMediaUploadUrl(expert.id, {
          kind: "cv",
          contentType: cvFile.type,
          size: cvFile.size,
        });
        const uploadResponse = await fetch(presign.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": cvFile.type },
          body: cvFile,
        });

        if (!uploadResponse.ok) {
          throw new Error("CV upload failed.");
        }

        cvS3Key = presign.key;
      }

      const profilePayload = {
        full_name: editForm.full_name,
        biography: editForm.biography,
        base_location: editForm.base_location,
        country: editForm.country,
        years_experience: Number(editForm.years_experience || 0),
        availability: editForm.availability,
        is_premium: editForm.is_premium,

        specialties: textToList(editForm.specialties),
        certifications: textToList(editForm.certifications),
        vessel_types: textToList(editForm.vessel_types),
        ports: editForm.ports.map((port) => port.port_name),
        languages: textToList(editForm.languages),
        registration_details: editForm.registration_details,
      };
      if (photoS3Key) profilePayload.photo_s3_key = photoS3Key;
      if (cvS3Key) profilePayload.cv_s3_key = cvS3Key;

      if (isSuperAdmin()) {
        await updateConsultantAsAdmin(expert.id, {
          user: {
            full_name: editForm.full_name,
            email: editForm.user_email,
            phone: editForm.user_phone,
            is_active: editForm.user_is_active,
          },
          flag_services: editForm.flag_services,
        });
      }
      const profileResponse = await updateExpert(expert.id, profilePayload);
      setExpert(profileResponse.data);
      if (
        photoS3Key &&
        isExpert() &&
        Number(expert.user_id) === Number(getStoredUser()?.id)
      ) {
        updateConsultantPhotoCache({
          userId: getStoredUser().id,
          expertId: expert.id,
          photoUrl: profileResponse.data.photo_url,
          photoExpiresAt: profileResponse.data.photo_expires_at,
        });
      }
      discardSelectedMedia();
      setIsEditing(false);
      setProfileSaveMessage("Profile changes saved.");
    } catch (error) {
      console.error("Failed updating consultant profile:", error);
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to update consultant profile";
      setProfileSaveError(message);
    } finally {
      setSavingProfile(false);
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    setReviewError("");

    if (
      !Number.isInteger(Number(reviewForm.rating)) ||
      Number(reviewForm.rating) < 1 ||
      Number(reviewForm.rating) > 5
    ) {
      setReviewError("Select a rating from 1 to 5.");
      return;
    }

    try {
      await createExpertReview(id, reviewForm);

      setReviewForm({
        job_name: "",
        rating: 0,
        comment: "",
        reviewer_name: "",
      });

      setShowReviewForm(false);
      loadPage();
    } catch (error) {
      console.error("Failed submitting review:", error);
      setReviewError(
        error.response?.data?.message || "Failed to submit review."
      );
    }
  };

  const cancelReview = () => {
    setShowReviewForm(false);
    setReviewError("");
    setReviewForm({
      job_name: location.state?.jobName || "",
      rating: 0,
      comment: "",
      reviewer_name: "",
    });
  };

  const startEditingReview = (review) => {
    setEditingReviewId(review.id);
    setReviewEditError("");
    setReviewEditForm({
      job_name: review.job_name || "",
      rating: Number(review.rating),
      comment: review.comment || "",
      reviewer_name: review.reviewer_name || "",
    });
  };

  const cancelEditingReview = () => {
    setEditingReviewId(null);
    setReviewEditForm(null);
    setReviewEditError("");
  };

  const saveEditedReview = async (reviewId) => {
    setReviewEditError("");
    const rating = Number(reviewEditForm?.rating);

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      setReviewEditError("Select a rating from 1 to 5.");
      return;
    }

    setReviewEditSaving(true);
    try {
      const response = await updateExpertReview(reviewId, {
        ...reviewEditForm,
        rating,
      });
      setReviews((current) =>
        current.map((review) =>
          review.id === reviewId ? response.data : review
        )
      );
      const expertResponse = await getExpertById(id);
      setExpert(expertResponse.data);
      cancelEditingReview();
    } catch (error) {
      console.error("Failed updating review:", error);
      setReviewEditError(
        error.response?.data?.message || "Failed to update review."
      );
    } finally {
      setReviewEditSaving(false);
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
    isSuperAdmin() || (isClient() && location.state?.canReview);
  // Keep reviews visible, but review submission should happen from accepted request flow later.

  const registrationDetails = expert.registration_details;
  const canChangeProfileMedia = canEditProfile && Boolean(registrationDetails);

  const selectProfilePhoto = (event) => {
    const file = event.target.files?.[0] || null;
    setPhotoError("");
    setProfileSaveError("");

    if (!file) {
      discardSelectedPhoto();
      return;
    }

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      discardSelectedPhoto();
      setPhotoError("Photo must be PNG, JPEG or WEBP.");
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      discardSelectedPhoto();
      setPhotoError("Photo must be 3MB or less.");
      return;
    }
    if (file.size <= 0) {
      discardSelectedPhoto();
      setPhotoError("Photo file is empty.");
      return;
    }

    setPhotoFile(file);
    setPhotoPreviewUrl(URL.createObjectURL(file));
  };

  const selectCv = (event) => {
    const file = event.target.files?.[0] || null;
    setCvError("");
    setProfileSaveError("");

    if (!file) {
      discardSelectedCv();
      return;
    }
    if (file.type !== "application/pdf") {
      discardSelectedCv();
      setCvError("CV must be a PDF file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      discardSelectedCv();
      setCvError("CV must be 5MB or less.");
      return;
    }
    if (file.size <= 0) {
      discardSelectedCv();
      setCvError("CV file is empty.");
      return;
    }

    setCvFile(file);
  };

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

  const updateFlagCoverage = (serviceIndex, coverageIndex, field, value) => {
    setEditForm((current) => ({
      ...current,
      flag_services: current.flag_services.map((service, index) => index !== serviceIndex ? service : {
        ...service,
        coverage: arrayValue(service.coverage).map((coverage, itemIndex) => itemIndex !== coverageIndex ? coverage : { ...coverage, [field]: value }),
      }),
    }));
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
  const hasSpecialties = arrayValue(expert.specialties).length > 0;
  const hasCertifications = arrayValue(expert.certifications).length > 0;
  const hasVesselExpertise = arrayValue(expert.vessel_types).length > 0;
  const hasPorts = arrayValue(expert.ports).length > 0;
  const hasLanguages = arrayValue(expert.languages).length > 0;
  const hasQualifications =
    isFilled(registrationDetails?.qualifications) ||
    isFilled(registrationDetails?.qualifications_other) ||
    Object.values(
      registrationDetails?.experience_by_qualification || {}
    ).some((experience) => isFilled(formatExperience(experience)));
  const hasMaritimeExperience =
    isFilled(registrationDetails?.vessel_types) ||
    isFilled(registrationDetails?.vessel_types_other) ||
    isFilled(registrationDetails?.shoreside_experience) ||
    isFilled(registrationDetails?.shoreside_experience_other);
  const hasSurveyingExpertise =
    isFilled(registrationDetails?.surveying_experience) ||
    isFilled(registrationDetails?.surveying_experience_other) ||
    isFilled(registrationDetails?.vessel_type_surveying_experience) ||
    isFilled(registrationDetails?.vessel_type_surveying_experience_other);
  const hasAccreditations =
    isFilled(registrationDetails?.accreditations) ||
    isFilled(registrationDetails?.accreditations_other) ||
    isFilled(registrationDetails?.courses_completed) ||
    isFilled(registrationDetails?.courses_completed_other);
  const hasFlagServices = arrayValue(expert.flag_services).some(
    (service) => isFilled(service.flag_name) && arrayValue(service.coverage).length > 0
  );
  const professionalBackground = registrationDetails
    ? renderDetailRows([
        ["Nationality", registrationDetails.nationality],
        ["Employment status", registrationDetails.employment_status],
        ["Company name", registrationDetails.company_name],
        ["Discipline", registrationDetails.discipline],
        ["Other discipline", registrationDetails.discipline_other],
        ["Rank", registrationDetails.rank],
        ["Other rank", registrationDetails.rank_other],
        ["Year started", registrationDetails.year_started],
      ])
    : null;

  return (
    <main className="expert-profile-page">
      <section className="expert-profile-identity">
        <div className="expert-profile-header">
          <ConsultantAvatar
            className="expert-profile-avatar"
            photoUrl={photoPreviewUrl || expert.photo_url}
            name={expert.full_name}
          />

          <div className="expert-profile-info">
            <h1>{expert.full_name}</h1>

            <div className="expert-profile-meta">
              <div className="rating-row">
                <Star size={18} fill="#f59e0b" color="#f59e0b" />

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
                type="button"
                onClick={isEditing ? cancelEditing : beginEditing}
                disabled={savingProfile}
              >
                {isEditing ? "Cancel Edit" : "Edit Profile"}
              </button>
            )}
          </div>
          {cvMessage && <p className="profile-action-message">{cvMessage}</p>}
        </div>
      </section>
      {profileSaveMessage && (
        <p className="profile-save-status success">{profileSaveMessage}</p>
      )}

      {isEditing && canEditProfile && (
        <form className="profile-edit-card" onSubmit={submitProfileUpdate}>
          <h3>Edit Consultant Profile</h3>

          {canChangeProfileMedia && (
            <section className="profile-media-edit">
              <div className="profile-media-edit-grid">
                <div className="profile-media-field">
                  <label htmlFor="expert-profile-photo">Change Profile Photo</label>
                  <input
                    ref={photoInputRef}
                    id="expert-profile-photo"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={selectProfilePhoto}
                    disabled={savingProfile}
                  />
                  <small>PNG, JPEG or WEBP. Maximum 3MB.</small>
                  {photoFile && (
                    <p className="profile-media-selection">
                      Selected: {photoFile.name}. Save Changes to upload.
                    </p>
                  )}
                  {photoError && (
                    <p className="profile-media-message error">{photoError}</p>
                  )}
                </div>

                <div className="profile-media-field">
                  <label htmlFor="expert-profile-cv">
                    Replace Curriculum Vitae (CV)
                  </label>
                  <input
                    ref={cvInputRef}
                    id="expert-profile-cv"
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={selectCv}
                    disabled={savingProfile}
                  />
                  <small>PDF only. Maximum 5MB.</small>
                  <p className="profile-media-status">
                    Current CV: {expert.has_cv ? "Available" : "Not uploaded"}
                  </p>
                  {cvFile && (
                    <p className="profile-media-selection">
                      Selected: {cvFile.name}. Save Changes to replace the current CV.
                    </p>
                  )}
                  {cvError && (
                    <p className="profile-media-message error">{cvError}</p>
                  )}
                </div>
              </div>
            </section>
          )}

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

            {isSuperAdmin() && <><label>Account Email<input type="email" value={editForm.user_email} onChange={(e) => setEditForm({...editForm,user_email:e.target.value})}/></label><label>Account Phone<input value={editForm.user_phone} onChange={(e) => setEditForm({...editForm,user_phone:e.target.value})}/></label><label className="profile-active-check"><input type="checkbox" checked={editForm.user_is_active} onChange={(e) => setEditForm({...editForm,user_is_active:e.target.checked})}/> Active account</label></>}

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

          {editTab === "registration" && isSuperAdmin() && arrayValue(editForm.flag_services).length > 0 && <div className="profile-flag-edit"><h4>Flag services and coverage</h4>{editForm.flag_services.map((service, serviceIndex) => <section key={service.flag_id}><strong>{service.flag_name}</strong>{arrayValue(service.coverage).map((coverage, coverageIndex) => <div className="profile-edit-grid" key={`${service.flag_id}-${coverageIndex}`}>{[["country","Country"],["region","Region"],["location","Location"],["coverage_note","Coverage note"]].map(([field,label]) => <label key={field}>{label}<input value={coverage[field] || ""} onChange={(event) => updateFlagCoverage(serviceIndex, coverageIndex, field, event.target.value)}/></label>)}</div>)}</section>)}</div>}

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

            <button
              type="button"
              onClick={cancelEditing}
              disabled={savingProfile}
            >
              Cancel
            </button>
          </div>
          {profileSaveError && (
            <p className="profile-save-status error">{profileSaveError}</p>
          )}
        </form>
      )}

      <section className="expert-profile-grid">
        <div className="left-column">
          <article className="profile-card">
            <h3>Professional Biography</h3>
            <p>{expert.biography || "No biography added yet."}</p>
          </article>

          {hasSpecialties && (
            <article className="profile-card">
              <h3>Specialties</h3>
              <div className="tag-list">
                {expert.specialties.map((item) => (
                  <span key={item.id || item.name} className="soft-tag">
                    {item.name || item}
                  </span>
                ))}
              </div>
            </article>
          )}

          {hasCertifications && (
            <article className="profile-card">
              <h3>Certifications & Accreditations</h3>
              <div className="cert-list">
                {expert.certifications.map((item) => (
                  <div key={item.id || item.name} className="cert-item">
                    <CheckCircle2 size={18} />
                    <span>{item.name || item}</span>
                  </div>
                ))}
              </div>
            </article>
          )}

          {renderRegistrationSection(
            "Professional Background",
            professionalBackground
          )}

          {registrationDetails &&
            hasQualifications &&
            renderRegistrationSection(
              "Qualifications & Experience",
              <>
                {renderTags(registrationDetails.qualifications)}
                {isFilled(registrationDetails.qualifications_other) && (
                  <p className="profile-muted">
                    Other: {registrationDetails.qualifications_other}
                  </p>
                )}
                <div className="profile-detail-list">
                  {Object.entries(
                    registrationDetails.experience_by_qualification || {}
                  )
                    .filter(([, experience]) =>
                      isFilled(formatExperience(experience))
                    )
                    .map(([qualification, experience]) => (
                      <div className="profile-detail-row" key={qualification}>
                        <span>{qualification}</span>
                        <strong>{formatExperience(experience)}</strong>
                      </div>
                    ))}
                </div>
              </>
            )}

          {registrationDetails &&
            hasMaritimeExperience &&
            renderRegistrationSection(
              "Maritime Experience",
              <>
                {renderTags(registrationDetails.vessel_types)}
                {isFilled(registrationDetails.vessel_types_other) && (
                  <p className="profile-muted">
                    Other vessel type: {registrationDetails.vessel_types_other}
                  </p>
                )}
                {renderTags(registrationDetails.shoreside_experience)}
                {isFilled(registrationDetails.shoreside_experience_other) && (
                  <p className="profile-muted">
                    Other shoreside experience:{" "}
                    {registrationDetails.shoreside_experience_other}
                  </p>
                )}
              </>
            )}

          {registrationDetails &&
            hasSurveyingExpertise &&
            renderRegistrationSection(
              "Surveying Expertise",
              <>
                {renderTags(registrationDetails.surveying_experience)}
                {isFilled(registrationDetails.surveying_experience_other) && (
                  <p className="profile-muted">
                    Other surveying experience:{" "}
                    {registrationDetails.surveying_experience_other}
                  </p>
                )}
                {renderTags(
                  registrationDetails.vessel_type_surveying_experience
                )}
                {isFilled(
                  registrationDetails.vessel_type_surveying_experience_other
                ) && (
                  <p className="profile-muted">
                    Other vessel types surveyed:{" "}
                    {
                      registrationDetails.vessel_type_surveying_experience_other
                    }
                  </p>
                )}
              </>
            )}

          {registrationDetails &&
            hasAccreditations &&
            renderRegistrationSection(
              "Accreditations & Courses",
              <>
                {renderTags(registrationDetails.accreditations)}
                {isFilled(registrationDetails.accreditations_other) && (
                  <p className="profile-muted">
                    Other accreditation:{" "}
                    {registrationDetails.accreditations_other}
                  </p>
                )}
                {renderTags(registrationDetails.courses_completed)}
                {isFilled(registrationDetails.courses_completed_other) && (
                  <p className="profile-muted">
                    Other course: {registrationDetails.courses_completed_other}
                  </p>
                )}
              </>
            )}

          {hasFlagServices &&
            renderRegistrationSection(
              "Flag Services",
              <div className="profile-flag-services">
                {expert.flag_services.map((service) => (
                  <section className="profile-flag-service" key={service.flag_id}>
                    <h4>{service.flag_name}</h4>
                    <div className="profile-detail-list">
                      {arrayValue(service.coverage).map((coverage, index) => {
                        const place = [
                          coverage.location,
                          coverage.region,
                          coverage.country,
                        ]
                          .filter(Boolean)
                          .join(", ");

                        return (
                          <div
                            className="profile-detail-row"
                            key={`${service.flag_id}-${index}`}
                          >
                            <span>{place}</span>
                            <strong>{coverage.coverage_note || "Coverage area"}</strong>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
        </div>

        <aside className="right-column">
          <section className="profile-side-card">
            <h3>At a Glance</h3>
            <div className="side-row">
              <Briefcase size={18} />
              <span>{expert.jobs_completed || 0} jobs completed</span>
            </div>
          </section>

          {registrationDetails && (
            <section className="profile-side-card inspection-card">
              <h3>Inspection Information</h3>
              {renderDetailRows([
                ["Inspection cost", registrationDetails.inspection_cost],
                [
                  "Marketing consent",
                  registrationDetails.marketing_consent ? "Yes" : "No",
                ],
              ])}
            </section>
          )}

          {hasVesselExpertise && (
            <section className="profile-side-card">
              <h3>Vessel Expertise</h3>
              <div className="tag-list">
                {expert.vessel_types.map((item) => (
                  <span key={item.id || item.name} className="vessel-tag">
                    {item.name || item}
                  </span>
                ))}
              </div>
            </section>
          )}

          {hasPorts && (
            <section className="profile-side-card">
              <h3>Ports Covered</h3>
              <div className="tag-list">
                {expert.ports.map((item) => (
                  <span key={item.id || item.port_name} className="soft-tag">
                    {item.port_name || item.name || item}
                  </span>
                ))}
              </div>
            </section>
          )}

          {hasLanguages && (
            <section className="profile-side-card">
              <h3>Languages</h3>
              <div className="tag-list">
                {expert.languages.map((item) => (
                  <span key={item.id || item.language_name} className="soft-tag">
                    {item.language_name || item.name || item}
                  </span>
                ))}
              </div>
            </section>
          )}
        </aside>
      </section>

      {registrationDetails && (
        <section className="profile-lower-grid">
          <article className="profile-card registration-card">
            <h3>Registration Details</h3>
            {renderDetailRows([
              ["Phone", registrationDetails.phone_number],
              ["Mobile", registrationDetails.mobile_number],
              ["Email", registrationDetails.email],
              [
                "DOB",
                [
                  registrationDetails.dob_dd,
                  registrationDetails.dob_mm,
                  registrationDetails.dob_yyyy,
                ]
                  .filter(Boolean)
                  .join("/"),
              ],
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
                {registrationDetails.refs.map((reference, index) => (
                  <section
                    className="profile-reference-item"
                    key={`${reference.email}-${index}`}
                  >
                    <h4>Reference {index + 1}</h4>
                    <dl>
                      {[
                        ["Name", reference.name],
                        ["Email", reference.email],
                        ["Phone", reference.phoneNumber],
                        ["Position", reference.position],
                        ["Company", reference.companyName],
                      ]
                        .filter(([, value]) => isFilled(value))
                        .map(([label, value]) => (
                          <div key={label}>
                            <dt>{label}</dt>
                            <dd>{value}</dd>
                          </div>
                        ))}
                    </dl>
                  </section>
                ))}
              </div>
            )}
          </article>

        </section>
      )}

      <section className="profile-card reviews-section">
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
            <h3>Write a Review</h3>
            <div className="form-group">
              <label>Job Name</label>
              <input
                value={reviewForm.job_name}
                onChange={(e) =>
                  setReviewForm({ ...reviewForm, job_name: e.target.value })
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
                    className={`rating-btn ${
                      num <= reviewForm.rating ? "active" : ""
                    }`}
                    aria-pressed={num <= reviewForm.rating}
                    aria-label={`Rate ${num} out of 5`}
                    onClick={() =>
                      setReviewForm({ ...reviewForm, rating: num })
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
                  setReviewForm({ ...reviewForm, comment: e.target.value })
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
            {reviewError && (
              <p className="review-form-error" role="alert">
                {reviewError}
              </p>
            )}
            <div className="review-form-actions">
              <button type="submit" className="submit-review-btn">
                Submit Review
              </button>
              <button
                type="button"
                className="cancel-review-btn"
                onClick={cancelReview}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {reviews.length ? (
          <div className="reviews-list">
            {reviews.map((review) => (
              <article key={review.id} className="review-card">
                {editingReviewId === review.id ? (
                  <div className="review-edit-form">
                    <div className="form-group">
                      <label>Job Name</label>
                      <input
                        value={reviewEditForm?.job_name || ""}
                        onChange={(event) =>
                          setReviewEditForm({
                            ...reviewEditForm,
                            job_name: event.target.value,
                          })
                        }
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
                            className={`rating-btn ${
                              num <= Number(reviewEditForm?.rating)
                                ? "active"
                                : ""
                            }`}
                            aria-pressed={
                              num <= Number(reviewEditForm?.rating)
                            }
                            aria-label={`Rate ${num} out of 5`}
                            onClick={() =>
                              setReviewEditForm({
                                ...reviewEditForm,
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
                        value={reviewEditForm?.comment || ""}
                        onChange={(event) =>
                          setReviewEditForm({
                            ...reviewEditForm,
                            comment: event.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>Reviewer Name</label>
                      <input
                        value={reviewEditForm?.reviewer_name || ""}
                        onChange={(event) =>
                          setReviewEditForm({
                            ...reviewEditForm,
                            reviewer_name: event.target.value,
                          })
                        }
                      />
                    </div>
                    {reviewEditError && (
                      <p className="review-form-error" role="alert">
                        {reviewEditError}
                      </p>
                    )}
                    <div className="review-form-actions">
                      <button
                        type="button"
                        className="submit-review-btn"
                        disabled={reviewEditSaving}
                        onClick={() => saveEditedReview(review.id)}
                      >
                        {reviewEditSaving ? "Saving..." : "Save Review"}
                      </button>
                      <button
                        type="button"
                        className="cancel-review-btn"
                        disabled={reviewEditSaving}
                        onClick={cancelEditingReview}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="review-top">
                      <div>
                        <h4>{review.reviewer_name || "Anonymous"}</h4>
                        {review.job_name && <p>{review.job_name}</p>}
                      </div>
                      <div className="review-header-actions">
                        <div
                          className="review-stars"
                          aria-label={`${review.rating} out of 5 stars`}
                        >
                          {"★".repeat(review.rating)}
                        </div>
                        {review.can_edit === true && (
                          <button
                            type="button"
                            className="edit-review-btn"
                            onClick={() => startEditingReview(review)}
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </div>
                    <blockquote>“{review.comment}”</blockquote>
                    <span className="review-date">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="reviews-empty">No reviews yet.</p>
        )}
      </section>
    </main>
  );
}
