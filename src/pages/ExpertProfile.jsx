import {
  Briefcase,
  CheckCircle2,
  Globe,
  MapPin,
  MessageSquare,
  Shield,
  Star,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";

import { getExpertById, updateExpert } from "../api/expertApi";
import { createExpertReview, getExpertReviews } from "../api/reviewApi";
import { getStoredUser, isClient, isExpert, isSuperAdmin } from "../utils/auth";

import "./ExpertProfile.css";

const listToText = (list = []) =>
  list.map((item) => item.name || item.port_name || item.language_name || item).join(", ");

const textToList = (value = "") =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export default function ExpertProfile() {
  const location = useLocation();
  const { id } = useParams();

  const [expert, setExpert] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [showReviewForm, setShowReviewForm] = useState(false);

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
    ports: "",
    languages: "",
  });

  const [reviewForm, setReviewForm] = useState({
    job_name: location.state?.jobName || "",
    rating: 5,
    comment: "",
    reviewer_name: "",
  });

  useEffect(() => {
    loadPage();
  }, [id]);

  const loadPage = async () => {
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
        ports: listToText(expertRes.data.ports || []),
        languages: listToText(expertRes.data.languages || []),
      });
      setReviews(reviewRes.data || []);
    } catch (error) {
      console.error("Failed loading consultant profile:", error);
      setExpert(null);
    }
  };

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
        ports: textToList(editForm.ports),
        languages: textToList(editForm.languages),
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

  const initials = expert.full_name?.charAt(0)?.toUpperCase() || "E";

  const currentUser = getStoredUser();

  const canEditProfile =
    isSuperAdmin() ||
    (isExpert() && Number(expert.user_id) === Number(currentUser?.id));

  const canWriteReview =
    isSuperAdmin() ||
    (isClient() && location.state?.canReview);
  // Keep reviews visible, but review submission should happen from accepted request flow later.

  return (
    <main className="expert-profile-page">
      <section className="expert-profile-hero">
        <div className="expert-profile-banner" />

        <div className="expert-profile-header">
          <div className="expert-profile-avatar">{initials}</div>

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

            {canEditProfile && (
              <button
                className="edit-profile-btn"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? "Cancel Edit" : "Edit Profile"}
              </button>
            )}
          </div>
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
                <input
                  value={editForm.ports}
                  onChange={(e) =>
                    setEditForm({ ...editForm, ports: e.target.value })
                  }
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