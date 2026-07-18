import {
  Anchor,
  ArrowRight,
  Globe2,
  MapPin,
  Shield,
  Ship,
  Users,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPlatformStats } from "../api/publicStatsApi";
import "./Landing.css";

export default function Landing() {
  const navigate = useNavigate();

  const isLoggedIn = Boolean(
    localStorage.getItem("np_token")
  );

  const [platformStats, setPlatformStats] = useState({
    maritimeProfessionalsTotal: null,
    portsTotal: null,
    globalPresenceScore: null,
  });

  useEffect(() => {
    let active = true;

    const loadPlatformStats = async () => {
      try {
        const response = await getPlatformStats();

        if (!active || !response?.success) {
          return;
        }

        setPlatformStats({
          maritimeProfessionalsTotal:
            response.data?.maritime_professionals_total ?? 0,

          portsTotal:
            Number(response.data?.ports_total ?? 0) * 10,

          globalPresenceScore:
            response.data?.global_presence_score ?? 0,
        });
      } catch (error) {
        console.error(
          "Failed to load platform statistics:",
          error
        );

        if (!active) {
          return;
        }

        setPlatformStats({
          maritimeProfessionalsTotal: null,
          portsTotal: null,
          globalPresenceScore: null,
        });
      }
    };

    loadPlatformStats();

    return () => {
      active = false;
    };
  }, []);

  const formatStat = (value) => {
    if (
      value === null ||
      value === undefined ||
      Number.isNaN(Number(value))
    ) {
      return "—";
    }

    return Number(value).toLocaleString();
  };

  const handleRequestSurvey = () => {
    navigate(isLoggedIn ? "/requests" : "/login");
  };

  const handleBrowseExperts = () => {
    navigate(isLoggedIn ? "/experts" : "/login");
  };

  return (
    <div className="landing-page">
      <header className="landing-navbar">
        <div
          className="landing-nav-brand"
          onClick={() => navigate("/")}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" ||
              event.key === " "
            ) {
              navigate("/");
            }
          }}
        >
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
              <button
                className="landing-nav-signin"
                onClick={() => navigate("/login")}
              >
                Sign In
              </button>

              <button
                className="landing-nav-register"
                onClick={() =>
                  navigate("/register-client")
                }
              >
                Get Started
              </button>
            </>
          ) : (
            <button
              className="landing-nav-register"
              onClick={() => navigate("/dashboard")}
            >
              Dashboard
            </button>
          )}
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-content">
          <div className="landing-hero-inner">
            <div className="landing-pill">
              <Anchor size={14} />
              Maritime Services Marketplace
            </div>

            <h1 className="landing-hero-h1">
              Ship Surveys &amp; Audits.
              <br />

              <span className="landing-hero-accent">
                Booked Smarter.
              </span>
            </h1>

            <p className="landing-hero-sub">
              The global marketplace connecting ship
              owners, managers, and charterers with
              OCIMF-accredited surveyors, class-approved
              inspectors, and ISM auditors — anywhere,
              anytime.
            </p>

            <div className="landing-hero-btns">
              <button
                className="landing-btn-primary"
                onClick={handleRequestSurvey}
              >
                <Anchor size={17} />
                Request a Survey
              </button>

              <button
                className="landing-btn-secondary"
                onClick={handleBrowseExperts}
              >
                <Shield size={17} />
                Browse Consultants
              </button>
            </div>
          </div>

          <div className="landing-global-presence">
            <div className="landing-presence-top">
              <div className="landing-presence-icon">
                <Globe2 size={28} />
              </div>

              <div>
                <span className="landing-presence-eyebrow">
                  Worldwide Maritime Network
                </span>

                <h2>
                  Global Consultant Presence
                </h2>
              </div>
            </div>

            <div className="landing-presence-score">
              <span className="landing-presence-score-number">
                {formatStat(
                  platformStats.globalPresenceScore
                )}
              </span>

              <span className="landing-presence-score-plus">
                +
              </span>
            </div>

            <p className="landing-presence-description">
              Connecting maritime professionals and port
              coverage across key shipping regions
              worldwide.
            </p>

            <div className="landing-presence-breakdown">
              <div className="landing-presence-stat-card">
                <div className="landing-presence-stat-icon">
                  <Users size={19} />
                </div>

                <div>
                  <strong>
                    {formatStat(
                      platformStats.maritimeProfessionalsTotal
                    )}
                    +
                  </strong>

                  <span>
                    Maritime Professionals
                  </span>
                </div>
              </div>

              <div className="landing-presence-stat-card">
                <div className="landing-presence-stat-icon">
                  <MapPin size={19} />
                </div>

                <div>
                  <strong>
                    {formatStat(
                      platformStats.portsTotal
                    )}
                    +
                  </strong>

                  <span>
                    Global Port Reach
                  </span>
                </div>
              </div>
            </div>

            <div className="landing-presence-footer">
              <span className="landing-presence-live-dot" />

              Dynamic coverage updated from the NexaPort
              network
            </div>
          </div>
        </div>

        <div
          className="landing-hero-dots"
          aria-hidden="true"
        />
      </section>

      <section className="landing-features">
        <div className="landing-feature">
          <div className="landing-feature-icon">
            <Users size={22} />
          </div>

          <div>
            <h3>Maritime Professionals</h3>

            <strong className="landing-feature-stat">
              {formatStat(
                platformStats.maritimeProfessionalsTotal
              )}
            </strong>

            <p>
              NexaPort consultants, Flag-State inspectors,
              accredited inspectors and appointed
              surveyors available across our maritime
              network.
            </p>
          </div>
        </div>

        <div className="landing-feature">
          <div className="landing-feature-icon">
            <Zap size={22} />
          </div>

          <div>
            <h3>Fast Quotations</h3>

            <p>
              Receive competitive quotes within hours,
              not days
            </p>
          </div>
        </div>

        <div className="landing-feature">
          <div className="landing-feature-icon">
            <Ship size={22} />
          </div>

          <div>
            <h3>Fleet Management</h3>

            <p>
              Manage your entire fleet and track service
              history
            </p>
          </div>
        </div>

        <div className="landing-feature">
          <div className="landing-feature-icon">
            <ArrowRight size={22} />
          </div>

          <div>
            <h3>Global Coverage</h3>

            <strong className="landing-feature-stat">
              {formatStat(platformStats.portsTotal)}
            </strong>

            <p>
              Extended port reach across the NexaPort global
              maritime network.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}