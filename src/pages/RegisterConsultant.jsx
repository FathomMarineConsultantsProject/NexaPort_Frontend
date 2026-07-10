import { Eye, EyeOff } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ACCREDITATIONS,
  COUNTRIES,
  COURSES_COMPLETED,
  NATIONALITIES,
  QUALIFICATIONS,
  SHORESIDE_EXPERIENCE,
  SURVEYING_EXPERIENCE,
  VESSEL_TYPES,
  VESSEL_TYPE_SURVEYING_EXPERIENCE,
  emptyExperience,
  initialConsultantRegistration,
} from "../helpers/consultantRegistrationConstants";
import PortSearchMultiSelect from "../components/experts/PortSearchMultiSelect";
import {
  presignConsultantUpload,
  registerConsultant,
} from "../api/consultantRegistrationApi";
import "./RegisterConsultant.css";

const steps = [
  {
    id: "personal",
    eyebrow: "01",
    title: "Personal details",
    fields: ["firstName", "lastName", "phoneNumber", "mobileNumber", "nationality", "employmentStatus", "companyName"],
  },
  {
    id: "account",
    eyebrow: "02",
    title: "Account & address",
    fields: [
      "email",
      "username",
      "password",
      "confirmPassword",
      "dobDD",
      "dobMM",
      "dobYYYY",
      "yearStarted",
      "heardAbout",
      "street1",
      "street2",
      "city",
      "postalCode",
      "country",
      "stateRegion",
    ],
  },
  {
    id: "background",
    eyebrow: "03",
    title: "Professional background",
    fields: ["discipline", "disciplineOther", "rank", "rankOther"],
  },
  {
    id: "qualifications",
    eyebrow: "04",
    title: "Qualifications",
    fields: ["qualifications", "qualificationsOther"],
    ownsError: (key) => key.startsWith("exp_"),
  },
  {
    id: "maritime",
    eyebrow: "05",
    title: "Maritime expertise",
    fields: [
      "ports",
      "vesselTypes",
      "vesselTypesOther",
      "shoresideExperience",
      "shoresideExperienceOther",
      "surveyingExperience",
      "surveyingExperienceOther",
      "vesselTypeSurveyingExperience",
      "vesselTypeSurveyingExperienceOther",
      "accreditations",
      "accreditationsOther",
      "coursesCompleted",
      "coursesCompletedOther",
    ],
  },
  {
    id: "references",
    eyebrow: "06",
    title: "Professional References",
    fields: ["references"],
    ownsError: (key) => key.startsWith("ref_"),
  },
  {
    id: "documents",
    eyebrow: "07",
    title: "Documents & review",
    fields: ["photoFile", "cvFile", "inspectionCost", "marketingConsent"],
  },
];

const requiredOtherFields = [
  ["discipline", "disciplineOther", "Please specify your discipline."],
  ["rank", "rankOther", "Please specify your rank."],
];

const blockedEmails = [
  "contact@fathommarineconsultants.com",
  "project@fathommarineconsultants.com",
  "nipun.chatrath@fathommarineconsultants.com",
];
const blockedPhones = ["+919136936173", "+447473819363", "+919892742642"];
const blockedCompanies = ["fathom marine consultants", "fathom marine"];

const hasOther = (items) => items.includes("Other") || items.includes("other");
const stepOwnsError = (step, key) => step.fields.includes(key) || step.ownsError?.(key);
const emptyReference = () => ({
  name: "",
  email: "",
  phoneNumber: "",
  position: "",
  companyName: "",
});
const normalizeReference = (ref) => ({
  name: String(ref?.name || "").trim(),
  email: String(ref?.email || "").trim(),
  phoneNumber: String(ref?.phoneNumber || "").trim(),
  position: String(ref?.position || "").trim(),
  companyName: String(ref?.companyName || "").trim(),
});
const hasReferenceValue = (ref) =>
  Object.values(normalizeReference(ref)).some((value) => value);
const normalizeReferences = (refs) =>
  refs.map(normalizeReference).filter(hasReferenceValue);

export default function RegisterConsultant() {
  const [formData, setFormData] = useState(initialConsultantRegistration);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  const showCompanyName = useMemo(
    () =>
      formData.employmentStatus === "employee" ||
      formData.employmentStatus === "owner",
    [formData.employmentStatus]
  );

  const currentStep = steps[activeStep];

  const setField = (name, value) => {
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "employmentStatus" && value === "self") next.companyName = "";
      return next;
    });
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy[name];
      return copy;
    });
  };

  const handleChange = (event) => setField(event.target.name, event.target.value);

  const updateMulti = (key, value, checked) => {
    setFormData((prev) => {
      const nextValues = checked
        ? [...prev[key], value]
        : prev[key].filter((item) => item !== value);
      const next = { ...prev, [key]: nextValues };

      if (key === "qualifications") {
        const experienceByQualification = { ...prev.experienceByQualification };
        if (checked) {
          experienceByQualification[value] =
            experienceByQualification[value] || emptyExperience();
        } else {
          delete experienceByQualification[value];
        }
        next.experienceByQualification = experienceByQualification;
      }

      return next;
    });
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy[key];
      delete copy[`exp_${value}`];
      return copy;
    });
  };

  const updateExperience = (qualification, field, value) => {
    let cleaned = value.replace(/\D/g, "").slice(0, 2);
    if (cleaned !== "") {
      const next = Number(cleaned);
      if (field === "months") cleaned = String(Math.min(Math.max(next, 0), 11));
      if (field === "days") cleaned = String(Math.min(Math.max(next, 0), 30));
      if (field === "years") cleaned = String(Math.min(Math.max(next, 0), 99));
    }

    setFormData((prev) => ({
      ...prev,
      experienceByQualification: {
        ...prev.experienceByQualification,
        [qualification]: {
          years: prev.experienceByQualification[qualification]?.years || "",
          months: prev.experienceByQualification[qualification]?.months || "",
          days: prev.experienceByQualification[qualification]?.days || "",
          [field]: cleaned,
        },
      },
    }));
  };

  const updateReference = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      references: prev.references.map((ref, i) =>
        i === index ? { ...ref, [field]: value } : ref
      ),
    }));
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy[`ref_${index}_${field}`];
      return copy;
    });
  };

  const addReference = () => {
    setFormData((prev) => ({
      ...prev,
      references: [...prev.references, emptyReference()],
    }));
  };

  const removeReference = (index) => {
    setFormData((prev) => ({
      ...prev,
      references: prev.references.filter((_, i) => i !== index),
    }));
    setErrors((prev) => {
      const next = {};
      Object.entries(prev).forEach(([key, value]) => {
        const match = key.match(/^ref_(\d+)_(.+)$/);
        if (!match) {
          next[key] = value;
          return;
        }
        const refIndex = Number(match[1]);
        const field = match[2];
        if (refIndex < index) next[key] = value;
        if (refIndex > index) next[`ref_${refIndex - 1}_${field}`] = value;
      });
      return next;
    });
  };

  const validate = () => {
    const nextErrors = {};
    const req = (key, message) => {
      const value = formData[key];
      if (typeof value === "string" && !value.trim()) nextErrors[key] = message;
    };
    const phoneRegex = /^[0-9+\-\s()]+$/;
    const nameRegex = /^[a-zA-Z\s'-]+$/;

    [
      ["firstName", "First name is required."],
      ["lastName", "Last name is required."],
      ["phoneNumber", "Phone number is required."],
      ["nationality", "Nationality is required."],
      ["employmentStatus", "Please select employment status."],
      ["email", "Email is required."],
      ["username", "Username is required."],
      ["password", "Password is required."],
      ["confirmPassword", "Confirm password is required."],
      ["dobDD", "DOB day is required."],
      ["dobMM", "DOB month is required."],
      ["dobYYYY", "DOB year is required."],
      ["heardAbout", "Please select how you heard about NexaPort."],
      ["street1", "Street address is required."],
      ["city", "City is required."],
      ["postalCode", "Postal code is required."],
      ["country", "Country is required."],
      ["stateRegion", "State/Region is required."],
      ["discipline", "Discipline is required."],
      ["rank", "Rank is required."],
      ["inspectionCost", "Inspection cost is required."],
    ].forEach(([key, message]) => req(key, message));

    if (formData.firstName.trim() && !nameRegex.test(formData.firstName.trim())) {
      nextErrors.firstName = "First name must contain letters only.";
    }
    if (formData.lastName.trim() && !nameRegex.test(formData.lastName.trim())) {
      nextErrors.lastName = "Last name must contain letters only.";
    }
    if (formData.phoneNumber.trim() && !phoneRegex.test(formData.phoneNumber.trim())) {
      nextErrors.phoneNumber = "Phone number is invalid.";
    }
    if (formData.mobileNumber.trim() && !phoneRegex.test(formData.mobileNumber.trim())) {
      nextErrors.mobileNumber = "Mobile number is invalid.";
    }
    if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
      nextErrors.email = "Enter a valid email.";
    }
    if (formData.password && formData.password.length < 6) {
      nextErrors.password = "Password must be at least 6 characters.";
    }
    if (
      formData.password &&
      formData.confirmPassword &&
      formData.password !== formData.confirmPassword
    ) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }
    if (showCompanyName && !formData.companyName.trim()) {
      nextErrors.companyName = "Company name is required.";
    }
    if (!formData.qualifications.length) {
      nextErrors.qualifications = "Select at least one qualification.";
    }
    if (!formData.vesselTypes.length) {
      nextErrors.vesselTypes = "Select at least one vessel type.";
    }
    if (!formData.photoFile) nextErrors.photoFile = "Profile photo is required.";
    if (!formData.cvFile) nextErrors.cvFile = "CV file is required.";

    requiredOtherFields.forEach(([selector, otherKey, message]) => {
      if (String(formData[selector]).toLowerCase() === "other" && !formData[otherKey].trim()) {
        nextErrors[otherKey] = message;
      }
    });
    [
      ["qualifications", "qualificationsOther", "Please specify your qualification."],
      ["vesselTypes", "vesselTypesOther", "Please specify the vessel type."],
      ["shoresideExperience", "shoresideExperienceOther", "Please specify shoreside experience."],
      ["surveyingExperience", "surveyingExperienceOther", "Please specify surveying experience."],
      [
        "vesselTypeSurveyingExperience",
        "vesselTypeSurveyingExperienceOther",
        "Please specify vessel types surveyed.",
      ],
      ["accreditations", "accreditationsOther", "Please specify accreditation."],
      ["coursesCompleted", "coursesCompletedOther", "Please specify course."],
    ].forEach(([itemsKey, otherKey, message]) => {
      if (hasOther(formData[itemsKey]) && !formData[otherKey].trim()) {
        nextErrors[otherKey] = message;
      }
    });

    formData.qualifications.forEach((qualification) => {
      const exp = formData.experienceByQualification[qualification];
      if (!exp || (!exp.years && !exp.months && !exp.days)) {
        nextErrors[`exp_${qualification}`] = "Enter experience for this qualification.";
      }
    });

    formData.references.forEach((ref, index) => {
      const normalizedRef = normalizeReference(ref);
      const hasAny = hasReferenceValue(normalizedRef);
      if (!hasAny) return;

      if (!normalizedRef.name) nextErrors[`ref_${index}_name`] = "Reference name is required.";
      if (!normalizedRef.email && !normalizedRef.phoneNumber) {
        nextErrors[`ref_${index}_email`] = "Add an email or phone number.";
        nextErrors[`ref_${index}_phoneNumber`] = "Add an email or phone number.";
      }
      if (normalizedRef.email && !/^\S+@\S+\.\S+$/.test(normalizedRef.email)) {
        nextErrors[`ref_${index}_email`] = "Reference email is invalid.";
      }

      if (blockedEmails.includes(normalizedRef.email.toLowerCase())) {
        nextErrors[`ref_${index}_email`] = "This email cannot be used as reference.";
      }
      if (blockedPhones.includes(normalizedRef.phoneNumber)) {
        nextErrors[`ref_${index}_phoneNumber`] =
          "This phone cannot be used as reference.";
      }
      if (blockedCompanies.includes(normalizedRef.companyName.toLowerCase())) {
        nextErrors[`ref_${index}_companyName`] =
          "This company cannot be used as reference.";
      }
    });

    const dd = Number(formData.dobDD);
    const mm = Number(formData.dobMM);
    const yy = Number(formData.dobYYYY);
    const thisYear = new Date().getFullYear();
    if (formData.dobDD && (dd < 1 || dd > 31)) nextErrors.dobDD = "Day must be 1-31.";
    if (formData.dobMM && (mm < 1 || mm > 12)) nextErrors.dobMM = "Month must be 1-12.";
    if (formData.dobYYYY && (String(formData.dobYYYY).length !== 4 || yy < 1900 || yy > thisYear)) {
      nextErrors.dobYYYY = "Enter a valid year.";
    }
    if (formData.yearStarted) {
      const started = Number(formData.yearStarted);
      if (String(formData.yearStarted).length !== 4 || started < 1900 || started > thisYear) {
        nextErrors.yearStarted = "Enter a valid year.";
      }
    }

    return nextErrors;
  };

  const validatePhoto = (file) => {
    if (!file) return "Profile photo is required.";
    if (!file.type.startsWith("image/")) return "Please upload an image.";
    if (file.size > 3 * 1024 * 1024) return "Photo must be 3MB or less.";
    return "";
  };

  const validateCv = (file) => {
    if (!file) return "CV file is required.";
    if (file.type !== "application/pdf") return "CV must be a PDF file.";
    if (file.size > 5 * 1024 * 1024) return "CV must be 5MB or less.";
    return "";
  };

  const setFile = (key, file, validator) => {
    const message = validator(file);
    if (message) {
      setField(key, null);
      setErrors((prev) => ({ ...prev, [key]: message }));
      return;
    }
    setFormData((prev) => ({ ...prev, [key]: file }));
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const uploadFile = async (kind, file) => {
    const presign = await presignConsultantUpload({
      kind,
      contentType: file.type,
      size: file.size,
    });
    const uploadRes = await fetch(presign.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!uploadRes.ok) throw new Error("File upload failed");
    return presign.key;
  };

  const buildPayload = (photoS3Key, cvS3Key) => {
    const payload = { ...formData };
    delete payload.confirmPassword;
    delete payload.photoFile;
    delete payload.cvFile;
    delete payload.ports;

    return {
      ...payload,
      username: formData.username.trim(),
      email: formData.email.trim(),
      references: normalizeReferences(formData.references),
      ports: formData.ports.map((port) => port.port_name),
      photoS3Key,
      cvS3Key,
    };
  };

  const firstErrorStep = (nextErrors) =>
    Math.max(0, steps.findIndex((step) => Object.keys(nextErrors).some((key) => stepOwnsError(step, key))));

  const validateCurrentStep = () => {
    const nextErrors = validate();
    const scopedErrors = Object.fromEntries(
      Object.entries(nextErrors).filter(([key]) => stepOwnsError(currentStep, key))
    );
    setErrors((prev) => ({ ...prev, ...scopedErrors }));
    return scopedErrors;
  };

  const goNext = () => {
    const scopedErrors = validateCurrentStep();
    if (Object.keys(scopedErrors).length) return;
    setActiveStep((step) => Math.min(step + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSuccess(false);
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setActiveStep(firstErrorStep(nextErrors));
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setLoading(true);
    try {
      const photoS3Key = await uploadFile("photo", formData.photoFile);
      const cvS3Key = await uploadFile("cv", formData.cvFile);
      await registerConsultant(buildPayload(photoS3Key, cvS3Key));
      setSuccess(true);
      setFormData(initialConsultantRegistration);
      setErrors({});
      setActiveStep(0);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setErrors({
        form:
          error.response?.data?.message ||
          error.message ||
          "Registration failed. Please try again.",
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setLoading(false);
    }
  };

  const renderTextField = (label, name, required = false, props = {}) => (
    <div className="consultant-field">
      <label>
        {label} {required && <span>*</span>}
      </label>
      <input
        name={name}
        value={formData[name] || ""}
        onChange={handleChange}
        className="consultant-input"
        {...props}
      />
      {errors[name] && <p className="consultant-error">{errors[name]}</p>}
    </div>
  );

  const renderTextarea = (label, name, required = false, props = {}) => (
    <div className="consultant-field">
      <label>
        {label} {required && <span>*</span>}
      </label>
      <textarea
        name={name}
        value={formData[name] || ""}
        onChange={handleChange}
        className="consultant-input consultant-textarea"
        {...props}
      />
      {errors[name] && <p className="consultant-error">{errors[name]}</p>}
    </div>
  );

  const renderSelect = (label, name, options, required = false) => (
    <div className="consultant-field">
      <label>
        {label} {required && <span>*</span>}
      </label>
      <select
        name={name}
        value={formData[name]}
        onChange={handleChange}
        className="consultant-input"
      >
        <option value="">Please Select</option>
        {options.map((option) => (
          <option key={option} value={option === "Please Select" ? "" : option}>
            {option}
          </option>
        ))}
      </select>
      {errors[name] && <p className="consultant-error">{errors[name]}</p>}
    </div>
  );

  const renderCheckboxGroup = (label, key, options, required = false) => (
    <div className="consultant-field consultant-wide">
      <label>
        {label} {required && <span>*</span>}
      </label>
      <div className="consultant-choice-grid">
        {options.map((option) => (
          <label className="consultant-choice" key={option}>
            <input
              type="checkbox"
              value={option}
              checked={formData[key].includes(option)}
              onChange={(event) => updateMulti(key, option, event.target.checked)}
            />
            {option}
          </label>
        ))}
      </div>
      {errors[key] && <p className="consultant-error">{errors[key]}</p>}
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep.id) {
      case "personal":
        return (
          <div className="consultant-grid">
            {renderTextField("First Name", "firstName", true)}
            {renderTextField("Last Name", "lastName", true)}
            {renderTextField("Phone Number", "phoneNumber", true, { placeholder: "+44 7700 900123" })}
            {renderTextField("Mobile phone number", "mobileNumber")}
            {renderSelect("Nationality", "nationality", NATIONALITIES, true)}
            <div className="consultant-field consultant-wide">
              <label>Do you work for a surveying company? <span>*</span></label>
              <div className="consultant-choice-row">
                {[
                  ["self", "No, I work for myself"],
                  ["employee", "Yes, I am an employee"],
                  ["owner", "Yes, I own the company"],
                ].map(([value, label]) => (
                  <label className="consultant-choice" key={value}>
                    <input
                      type="radio"
                      name="employmentStatus"
                      value={value}
                      checked={formData.employmentStatus === value}
                      onChange={handleChange}
                    />
                    {label}
                  </label>
                ))}
              </div>
              {errors.employmentStatus && <p className="consultant-error">{errors.employmentStatus}</p>}
            </div>
            {showCompanyName && renderTextField("Company name", "companyName", true)}
          </div>
        );
      case "account":
        return (
          <div className="consultant-grid">
            {renderTextField("Email", "email", true, { type: "email" })}
            {renderTextField("Username", "username", true, { autoComplete: "username" })}
            <div className="consultant-field">
              <label>Password <span>*</span></label>
              <div className="consultant-password-wrap">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="consultant-input"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="consultant-error">{errors.password}</p>}
            </div>
            {renderTextField("Confirm Password", "confirmPassword", true, {
              type: showPassword ? "text" : "password",
              autoComplete: "new-password",
            })}
            <div className="consultant-field">
              <label>DOB <span>*</span></label>
              <div className="consultant-date-row">
                <input name="dobDD" placeholder="DD" value={formData.dobDD} onChange={handleChange} />
                <input name="dobMM" placeholder="MM" value={formData.dobMM} onChange={handleChange} />
                <input name="dobYYYY" placeholder="YYYY" value={formData.dobYYYY} onChange={handleChange} />
              </div>
              {(errors.dobDD || errors.dobMM || errors.dobYYYY) && (
                <p className="consultant-error">{errors.dobDD || errors.dobMM || errors.dobYYYY}</p>
              )}
            </div>
            {renderTextField("Year you first started in commercial shipping", "yearStarted")}
            {renderSelect("How did you hear about NexaPort", "heardAbout", [
              "Google",
              "LinkedIn",
              "Recommended by the friend",
              "Recommended by the colleague",
              "Referral",
              "Maritime Website",
              "Industry Event",
              "Other",
            ], true)}
            {renderTextField("Street address 1", "street1", true)}
            {renderTextField("Street address 2", "street2")}
            {renderTextField("City", "city", true)}
            {renderTextField("Postal Code", "postalCode", true)}
            {renderSelect("Country", "country", COUNTRIES, true)}
            {renderTextField("State/Region", "stateRegion", true)}
          </div>
        );
      case "background":
        return (
          <div className="consultant-grid">
            {renderSelect("Discipline", "discipline", ["deck", "engine", "naval", "other"], true)}
            {formData.discipline === "other" ? renderTextarea("Other discipline", "disciplineOther", true) : null}
            {renderSelect("Rank", "rank", [
              "master_mariner",
              "tow_master",
              "chief_officer",
              "second_third_officer",
              "chief_engineer",
              "second_engineer",
              "third_fourth_engineer",
              "superintendent",
              "naval_architect",
              "yacht_master",
              "relevant_maritime_degree",
              "other",
            ], true)}
            {formData.rank === "other" ? renderTextarea("Other rank", "rankOther", true) : null}
          </div>
        );
      case "qualifications":
        return (
          <>
            {renderCheckboxGroup("Qualifications", "qualifications", QUALIFICATIONS, true)}
            {hasOther(formData.qualifications) && renderTextarea("Other qualification", "qualificationsOther", true)}
            {formData.qualifications.map((qualification) => {
              const exp = formData.experienceByQualification[qualification] || emptyExperience();
              return (
                <div className="consultant-experience" key={qualification}>
                  <strong>{qualification}</strong>
                  <div className="consultant-date-row">
                    <input placeholder="Years" value={exp.years} onChange={(event) => updateExperience(qualification, "years", event.target.value)} />
                    <input placeholder="Months" value={exp.months} onChange={(event) => updateExperience(qualification, "months", event.target.value)} />
                    <input placeholder="Days" value={exp.days} onChange={(event) => updateExperience(qualification, "days", event.target.value)} />
                  </div>
                  {errors[`exp_${qualification}`] && (
                    <p className="consultant-error">{errors[`exp_${qualification}`]}</p>
                  )}
                </div>
              );
            })}
          </>
        );
      case "maritime":
        return (
          <>
            <div className="consultant-field consultant-wide">
              <label>Ports Covered</label>
              <PortSearchMultiSelect
                value={formData.ports}
                onChange={(ports) => setField("ports", ports)}
                placeholder="Search existing ports..."
              />
              {errors.ports && <p className="consultant-error">{errors.ports}</p>}
            </div>
            {renderCheckboxGroup("Vessel Types", "vesselTypes", VESSEL_TYPES, true)}
            {hasOther(formData.vesselTypes) && renderTextarea("Other vessel type", "vesselTypesOther", true)}
            {renderCheckboxGroup("Shoreside Experience", "shoresideExperience", SHORESIDE_EXPERIENCE)}
            {hasOther(formData.shoresideExperience) && renderTextarea("Other shoreside experience", "shoresideExperienceOther", true)}
            {renderCheckboxGroup("Surveying Experience", "surveyingExperience", SURVEYING_EXPERIENCE)}
            {hasOther(formData.surveyingExperience) && renderTextarea("Other surveying experience", "surveyingExperienceOther", true)}
            {renderCheckboxGroup("Vessel Type Surveying Experience", "vesselTypeSurveyingExperience", VESSEL_TYPE_SURVEYING_EXPERIENCE)}
            {hasOther(formData.vesselTypeSurveyingExperience) && renderTextarea("Other vessel types surveyed", "vesselTypeSurveyingExperienceOther", true)}
            {renderCheckboxGroup("Accreditation", "accreditations", ACCREDITATIONS)}
            {hasOther(formData.accreditations) && renderTextarea("Other accreditation", "accreditationsOther", true)}
            {renderCheckboxGroup("Courses Completed", "coursesCompleted", COURSES_COMPLETED)}
            {hasOther(formData.coursesCompleted) && renderTextarea("Other course", "coursesCompletedOther", true)}
          </>
        );
      case "references":
        return (
          <>
            <div className="consultant-reference-intro">
              <span>Optional</span>
              <p>
                You can add professional references now or update them later from your consultant profile.
              </p>
            </div>
            <div className="consultant-step-tools">
              <button type="button" onClick={addReference} className="consultant-secondary">
                + Add reference
              </button>
            </div>
            {formData.references.map((ref, index) => (
              <section className="consultant-reference" key={index}>
                <div className="consultant-reference-head">
                  <div>
                    <h3>Reference {index + 1}</h3>
                  </div>
                  <button type="button" onClick={() => removeReference(index)} className="consultant-link-btn">
                    Remove
                  </button>
                </div>
                <div className="consultant-grid">
                  {["name", "email", "phoneNumber", "position", "companyName"].map((field) => (
                    <div className="consultant-field" key={field}>
                      <label>{field === "phoneNumber" ? "Phone number" : field === "companyName" ? "Company name" : field[0].toUpperCase() + field.slice(1)}</label>
                      <input
                        value={ref[field] || ""}
                        onChange={(event) => updateReference(index, field, event.target.value)}
                        className="consultant-input"
                        type={field === "email" ? "email" : "text"}
                      />
                      {errors[`ref_${index}_${field}`] && (
                        <p className="consultant-error">{errors[`ref_${index}_${field}`]}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </>
        );
      default:
        return (
          <div className="consultant-grid">
            <div className="consultant-field consultant-upload">
              <label>Profile Photo <span>*</span></label>
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setFile("photoFile", event.target.files?.[0] || null, validatePhoto)} />
              <small>{formData.photoFile ? formData.photoFile.name : "PNG, JPEG or WEBP. Maximum 3MB."}</small>
              {errors.photoFile && <p className="consultant-error">{errors.photoFile}</p>}
            </div>
            <div className="consultant-field consultant-upload">
              <label>Original CV File <span>*</span></label>
              <input type="file" accept="application/pdf,.pdf" onChange={(event) => setFile("cvFile", event.target.files?.[0] || null, validateCv)} />
              <small>{formData.cvFile ? formData.cvFile.name : "PDF only. Maximum 5MB."}</small>
              {errors.cvFile && <p className="consultant-error">{errors.cvFile}</p>}
            </div>
            {renderTextarea("Inspection Cost", "inspectionCost", true)}
            <label className="consultant-consent consultant-wide">
              <input type="checkbox" checked={formData.marketingConsent} onChange={(event) => setField("marketingConsent", event.target.checked)} />
              I agree to receive other communications from NexaPort.
            </label>
          </div>
        );
    }
  };

  if (success) {
    return (
      <main className="consultant-page">
        <section className="consultant-success">
          <h1>Registration completed successfully.</h1>
          <p>Your NexaPort consultant account has been created.</p>
          <Link to="/login" className="consultant-submit">
            Sign in to NexaPort
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="consultant-page">
      <section className="consultant-shell">
        <header className="consultant-header">
          <div>
            <span>Consultant registration</span>
            <h1>Join NexaPort as a Maritime Consultant</h1>
          </div>
          <p>Complete each section with your professional registration details.</p>
          {errors.form && <div className="consultant-alert">{errors.form}</div>}
        </header>

        <form onSubmit={handleSubmit} className="consultant-layout">
          <aside className="consultant-steps" aria-label="Registration progress">
            {steps.map((step, index) => (
              <button
                type="button"
                key={step.id}
                className={`consultant-step ${index === activeStep ? "active" : ""} ${index < activeStep ? "complete" : ""}`}
                onClick={() => setActiveStep(index)}
              >
                <span>{step.eyebrow}</span>
                {step.title}
              </button>
            ))}
          </aside>

          <section className="consultant-card">
            <div className="consultant-mobile-progress">
              Step {activeStep + 1} of {steps.length}
            </div>
            <div className="consultant-step-title">
              <span>{currentStep.eyebrow}</span>
              <h2>{currentStep.title}</h2>
            </div>
            {renderStepContent()}
            <div className="consultant-submit-row">
              <button
                className="consultant-secondary"
                type="button"
                disabled={activeStep === 0 || loading}
                onClick={() => setActiveStep((step) => Math.max(step - 1, 0))}
              >
                Previous
              </button>
              {activeStep < steps.length - 1 ? (
                <button className="consultant-submit" type="button" onClick={goNext}>
                  Continue
                </button>
              ) : (
                <button className="consultant-submit" type="submit" disabled={loading}>
                  {loading ? "Submitting..." : "Submit registration"}
                </button>
              )}
            </div>
          </section>
        </form>
      </section>
    </main>
  );
}
