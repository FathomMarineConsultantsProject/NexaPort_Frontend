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

import { getExpertById } from "../api/expertApi";
import { createExpertReview, getExpertReviews } from "../api/reviewApi";
import { isClient, isExpert, isSuperAdmin } from "../utils/auth";

import "./ExpertProfile.css";

export default function ExpertProfile() {
  const location = useLocation();
  const { id } = useParams();

  const [expert, setExpert] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [showReviewForm, setShowReviewForm] = useState(false);

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
      setReviews(reviewRes.data || []);
    } catch (error) {
      console.error("Failed loading expert profile:", error);
      setExpert(null);
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

            <span className="available-badge">{expert.availability}</span>
          </div>
        </div>
      </section>

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