import { Anchor, ArrowRight, Shield, Ship, Users, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./Landing.css";

export default function Landing() {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem("np_token");

  const handleRequestSurvey = () => {
    navigate(isLoggedIn ? "/requests" : "/login");
  };

  const handleBrowseExperts = () => {
    navigate(isLoggedIn ? "/experts" : "/login");
  };

  return (
    <div className="landing-page">
      <header className="landing-navbar">
        <div className="landing-nav-brand" onClick={() => navigate("/")} role="button">
          <div className="landing-nav-logo">
            <Anchor size={20} />
          </div>
          <span className="landing-nav-text">
            Nexa<span>Port</span>
          </span>
        </div>

        <div className="landing-nav-actions">
          {!isLoggedIn ? (
            <>
              <button className="landing-nav-signin" onClick={() => navigate("/login")}>
                Sign In
              </button>
              <button className="landing-nav-register" onClick={() => navigate("/login")}>
                Get Started
              </button>
            </>
          ) : (
            <button className="landing-nav-register" onClick={() => navigate("/dashboard")}>
              Dashboard
            </button>
          )}
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-inner">
          <div className="landing-pill">
            <Anchor size={14} />
            Maritime Services Marketplace
          </div>

          <h1 className="landing-hero-h1">
            Ship Surveys &amp; Audits.<br />
            <span className="landing-hero-accent">Booked Smarter.</span>
          </h1>

          <p className="landing-hero-sub">
            The global marketplace connecting ship owners, managers, and
            charterers with OCIMF-accredited surveyors, class-approved
            inspectors, and ISM auditors — anywhere, anytime.
          </p>

          <div className="landing-hero-btns">
            <button className="landing-btn-primary" onClick={handleRequestSurvey}>
              <Anchor size={17} />
              Request a Survey
            </button>

            <button className="landing-btn-secondary" onClick={handleBrowseExperts}>
              <Shield size={17} />
              Browse Consultants
            </button>
          </div>
        </div>

        <div className="landing-hero-dots" aria-hidden="true" />
      </section>

      <section className="landing-features">
        <div className="landing-feature">
          <div className="landing-feature-icon">
            <Users size={22} />
          </div>
          <div>
            <h3>Verified Consultants</h3>
            <p>OCIMF-accredited surveyors and class-approved inspectors</p>
          </div>
        </div>

        <div className="landing-feature">
          <div className="landing-feature-icon">
            <Zap size={22} />
          </div>
          <div>
            <h3>Fast Quotations</h3>
            <p>Receive competitive quotes within hours, not days</p>
          </div>
        </div>

        <div className="landing-feature">
          <div className="landing-feature-icon">
            <Ship size={22} />
          </div>
          <div>
            <h3>Fleet Management</h3>
            <p>Manage your entire fleet and track service history</p>
          </div>
        </div>

        <div className="landing-feature">
          <div className="landing-feature-icon">
            <ArrowRight size={22} />
          </div>
          <div>
            <h3>Global Coverage</h3>
            <p>Consultants available at every major port worldwide</p>
          </div>
        </div>
      </section>
    </div>
  );
}