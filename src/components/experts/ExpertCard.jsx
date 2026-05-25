import { Clock3, MapPin, Shield, Ship, Star } from "lucide-react";
import { Link } from "react-router-dom";

const fallbackSpecialties = ["pre-psc inspection", "sire vetting", "tanker vetting"];
const fallbackVessels = ["Tanker", "VLCC"];

export default function ExpertCard({ expert }) {
    const name = expert.full_name || "Unnamed Expert";
    const initial = name.trim()?.[0]?.toUpperCase() || "E";
    const rating = Number(expert.rating || 0).toFixed(1);
    const reviewCount = Number(expert.review_count || 0);

    const specialties = expert.specialties?.length
        ? expert.specialties.map((item) => item.name || item)
        : fallbackSpecialties;

    const vessels = expert.vessel_types?.length
        ? expert.vessel_types.map((item) => item.name || item)
        : fallbackVessels;

    return (
        <article className="expert-card">
            <div className="expert-card-main">
                <div className="expert-top">
                    <div className="expert-avatar">{initial}</div>

                    <div>
                        <h3>{name}</h3>

                        <div className="expert-rating">
                            <Star size={17} fill="#109b92" />
                            <strong>{rating}</strong>
                            <span>
                                ({reviewCount} {reviewCount === 1 ? "review" : "reviews"})
                            </span>
                        </div>

                        <div className="expert-location">
                            <MapPin size={16} />
                            <span>
                                {expert.base_location || "Rotterdam"}
                                {expert.country ? `, ${expert.country}` : ", Netherlands"}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="expert-badges">
                    {expert.is_premium && <span className="premium-badge">◎ Premium Expert</span>}
                    <span className="available-badge">
                        <Clock3 size={14} />
                        {expert.availability || "available"}
                    </span>
                </div>

                <div className="tag-row">
                    {specialties.slice(0, 3).map((item) => (
                        <span className="soft-tag" key={item}>{item}</span>
                    ))}
                    {specialties.length > 3 && <span className="soft-tag">+{specialties.length - 3}</span>}
                </div>

                <div className="vessel-row">
                    {vessels.slice(0, 2).map((item) => (
                        <span className="vessel-tag" key={item}>
                            <Ship size={14} />
                            {item}
                        </span>
                    ))}
                </div>

                <div className="expert-divider" />

                <div className="expert-meta">
                    <span>
                        <Shield size={18} />
                        {expert.jobs_completed || 0} jobs
                    </span>

                    <strong>
                        ${Number(expert.day_rate_usd || 850).toLocaleString()}
                        <small>/ day</small>
                    </strong>
                </div>
            </div>

            <Link to={`/experts/${expert.id}`} className="profile-link">
                View Profile →
            </Link>
        </article>
    );
}