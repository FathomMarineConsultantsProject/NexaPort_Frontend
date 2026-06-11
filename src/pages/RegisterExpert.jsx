import { Anchor, Award, Ship } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createExpert } from "../api/expertApi";
import { getSpecialties, getVesselTypes, getCertifications } from "../api/masterApi";
import MultiSelect from "../components/experts/MultiSelect";
import TagInput from "../components/experts/TagInput";
import "./RegisterExpert.css";

export default function RegisterExpert() {
    const navigate = useNavigate();

    // Form state
    const [formData, setFormData] = useState({
        full_name: "",
        biography: "",
        base_location: "",
        country: "",
        day_rate_usd: "",
        years_experience: "",
        availability: "Available — Ready for new assignments",
    });

    const [ports, setPorts] = useState([]);
    const [languages, setLanguages] = useState([]);
    const [selectedSpecialties, setSelectedSpecialties] = useState([]);
    const [selectedCertifications, setSelectedCertifications] = useState([]);
    const [selectedVesselTypes, setSelectedVesselTypes] = useState([]);

    // Master data
    const [specialties, setSpecialties] = useState([]);
    const [certifications, setCertifications] = useState([]);
    const [vesselTypes, setVesselTypes] = useState([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Load master data
    useEffect(() => {
        loadMasterData();
    }, []);

    const loadMasterData = async () => {
        try {
            const [specialtiesRes, certificationsRes, vesselTypesRes] = await Promise.all([
                getSpecialties(),
                getCertifications(),
                getVesselTypes(),
            ]);

            setSpecialties(specialtiesRes.data || []);
            setCertifications(certificationsRes.data || []);
            setVesselTypes(vesselTypesRes.data || []);
        } catch (err) {
            console.error("Failed to load master data:", err);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!formData.full_name.trim()) {
            setError("Full name is required");
            return;
        }

        if (selectedSpecialties.length === 0) {
            setError("Please select at least one specialty");
            return;
        }

        setLoading(true);

        try {
            // Map availability text to backend format
            let availabilityValue = "available";
            if (formData.availability.includes("Busy")) {
                availabilityValue = "busy";
            } else if (formData.availability.includes("Unavailable")) {
                availabilityValue = "unavailable";
            }

            const payload = {
                full_name: formData.full_name,
                biography: formData.biography || null,
                base_location: formData.base_location || null,
                country: formData.country || null,
                day_rate_usd: formData.day_rate_usd ? parseFloat(formData.day_rate_usd) : null,
                years_experience: formData.years_experience
                    ? parseInt(formData.years_experience)
                    : null,
                availability: availabilityValue,
                is_premium: false,

                specialty_ids: selectedSpecialties.map((item) => item.id),
                certification_ids: selectedCertifications.map((item) => item.id),
                vessel_type_ids: selectedVesselTypes.map((item) => item.id),

                ports,
                languages,
            };

            const response = await createExpert(payload);

            if (response.success) {
                // Redirect to expert directory or profile page
                navigate("/experts");
            } else {
                setError(response.message || "Failed to create expert profile");
            }
        } catch (err) {
            console.error("Registration error:", err);
            setError(err.response?.data?.message || "Failed to create expert profile");
        } finally {
            setLoading(false);
        }
    };

    const availabilityOptions = [
        "Available — Ready for new assignments",
        "Busy — Limited availability",
        "Unavailable — Not accepting requests",
    ];

    return (
        <main className="register-page">
            <section className="register-wrap">
                <div className="register-head">
                    <h1>Register as Maritime Consultant </h1>
                    <p>
                        Create your professional profile to receive service requests from ship owners,
                        managers, and charterers.
                    </p>
                </div>

                {error && (
                    <div style={{
                        padding: "16px",
                        background: "#fee2e2",
                        color: "#991b1b",
                        borderRadius: "8px",
                        marginBottom: "24px",
                        fontSize: "15px"
                    }}>
                        {error}
                    </div>
                )}

                <form className="register-form" onSubmit={handleSubmit}>
                    {/* Professional Details */}
                    <section className="form-card">
                        <div className="card-title">
                            <Anchor size={24} />
                            <div className="card-title-content">
                                <h2>Professional Details</h2>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Full Name / Professional Title</label>
                            <input
                                type="text"
                                name="full_name"
                                value={formData.full_name}
                                onChange={handleInputChange}
                                placeholder="Capt. Alexander Petrov"
                                className="form-input"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Professional Biography</label>
                            <textarea
                                name="biography"
                                value={formData.biography}
                                onChange={handleInputChange}
                                placeholder="Describe your maritime background, sea service, qualifications, areas of expertise, and notable achievements. Be specific about vessel types and port regions you specialise in."
                                className="form-textarea"
                            />
                        </div>

                        <div className="two-col-grid">
                            <div className="form-group">
                                <label>Base Location</label>
                                <input
                                    type="text"
                                    name="base_location"
                                    value={formData.base_location}
                                    onChange={handleInputChange}
                                    placeholder="Rotterdam, Netherlands"
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group">
                                <label>
                                    Country <span className="optional">(opt.)</span>
                                </label>
                                <input
                                    type="text"
                                    name="country"
                                    value={formData.country}
                                    onChange={handleInputChange}
                                    placeholder="Netherlands"
                                    className="form-input"
                                />
                            </div>
                        </div>

                        <div className="two-col-grid">
                            <div className="form-group">
                                <label>
                                    Day Rate (USD) <span className="optional">(opt.)</span>
                                </label>
                                <input
                                    type="number"
                                    name="day_rate_usd"
                                    value={formData.day_rate_usd}
                                    onChange={handleInputChange}
                                    placeholder="850"
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group">
                                <label>
                                    Years of Experience <span className="optional">(opt.)</span>
                                </label>
                                <input
                                    type="number"
                                    name="years_experience"
                                    value={formData.years_experience}
                                    onChange={handleInputChange}
                                    placeholder="15"
                                    className="form-input"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Current Availability</label>
                            <MultiSelect
                                options={availabilityOptions}
                                value={formData.availability}
                                onChange={(val) => setFormData({ ...formData, availability: val })}
                                placeholder="Select availability"
                            />
                        </div>
                    </section>

                    {/* Qualifications & Expertise */}
                    <section className="form-card">
                        <div className="card-title">
                            <Award size={24} />
                            <div className="card-title-content">
                                <h2>Qualifications & Expertise</h2>
                                <p>Help clients find the right expert for their vessel type and service need.</p>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>
                                Specialties <span className="required">*</span>
                            </label>
                            <MultiSelect
                                options={specialties}
                                value={selectedSpecialties}
                                onChange={setSelectedSpecialties}
                                placeholder="Select specialty..."
                                multiSelect
                                labelKey="name"
                            />
                        </div>

                        <div className="form-group">
                            <label>Certifications</label>
                            <MultiSelect
                                options={certifications}
                                value={selectedCertifications}
                                onChange={setSelectedCertifications}
                                placeholder="Select certification..."
                                multiSelect
                                labelKey="name"
                            />
                        </div>
                    </section>

                    {/* Coverage & Vessel Expertise */}
                    <section className="form-card">
                        <div className="card-title">
                            <Ship size={24} />
                            <div className="card-title-content">
                                <h2>Coverage & Vessel Expertise</h2>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Vessel Type Expertise</label>
                            <MultiSelect
                                options={vesselTypes}
                                value={selectedVesselTypes}
                                onChange={setSelectedVesselTypes}
                                placeholder="Select vessel type..."
                                multiSelect
                                labelKey="name"
                            />
                        </div>

                        <div className="form-group">
                            <label>Ports Covered</label>
                            <TagInput
                                tags={ports}
                                onChange={setPorts}
                                placeholder="e.g. Rotterdam, Singapore..."
                            />
                        </div>

                        <div className="form-group">
                            <label>Languages Spoken</label>
                            <TagInput
                                tags={languages}
                                onChange={setLanguages}
                                placeholder="e.g. English, Russian..."
                            />
                        </div>
                    </section>

                    <button type="submit" className="submit-btn" disabled={loading}>
                        {loading ? "Creating Profile..." : "Create Consultant Profile"}
                    </button>
                </form>
            </section>
        </main>
    );
}