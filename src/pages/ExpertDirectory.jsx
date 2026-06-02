import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { getExperts } from "../api/expertApi";
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
  const [experts, setExperts] = useState([]);
  const [specialties, setSpecialties] = useState(["All Specialties"]);
  const [search, setSearch] = useState("");
  const [availability, setAvailability] = useState("All Availability");
  const [specialty, setSpecialty] = useState("All Specialties");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPageData();
  }, []);

  const loadPageData = async () => {
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
  };

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

  return (
    <main className="expert-page">
      <section className="expert-header">
        <div>
          <h1>{isExpert() ? "My Expert Profile" : "Expert Directory"}</h1>
          <p>
            {isExpert()
              ? "View your maritime expert profile."
              : "OCIMF-accredited surveyors, class-approved inspectors, and ISM auditors."}
          </p>
        </div>

        {isSuperAdmin() && (
          <Link to="/experts/register" className="register-btn">
            Register as Expert
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
              placeholder="Search experts by name..."
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
        <div className="experts-empty">Loading experts...</div>
      ) : filteredExperts.length === 0 ? (
        <div className="experts-empty">No expert profile found.</div>
      ) : (
        <section className="expert-grid">
          {filteredExperts.map((expert) => (
            <ExpertCard key={expert.id} expert={expert} />
          ))}
        </section>
      )}
    </main>
  );
}