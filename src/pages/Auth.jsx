import { Anchor, Building2, Eye, EyeOff, Ship, UserRoundCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../api/Auth";
import "./Auth.css";
import ResetPasswordModal from "../components/auth/ResetPasswordModal";

const REMEMBERED_KEY = "np_remembered_identifier";

export default function Auth() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);

  const savedIdentifier = localStorage.getItem(REMEMBERED_KEY) || "";
  const [rememberMe, setRememberMe] = useState(savedIdentifier !== "");
  const [loginForm, setLoginForm] = useState({
    identifier: savedIdentifier,
    password: "",
  });

  useEffect(() => {
    if (!rememberMe) {
      localStorage.removeItem(REMEMBERED_KEY);
    }
  }, [rememberMe]);

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!loginForm.identifier || !loginForm.password) return setError("Please fill in all fields.");
    setLoading(true);
    try {
      const response = await loginUser(loginForm);
      localStorage.setItem("np_token", response.token);
      localStorage.setItem("np_user", JSON.stringify(response.user));

      if (rememberMe) {
        localStorage.setItem(REMEMBERED_KEY, loginForm.identifier);
      } else {
        localStorage.removeItem(REMEMBERED_KEY);
      }

      const isRestrictedClient =
        Number(response.user?.role_id) === 3 &&
        response.user?.verification_status !== "approved";

      navigate(
        isRestrictedClient
          ? "/client-verification-status"
          : "/dashboard",
        { replace: true },
      );
    } catch (requestError) {
      if (!requestError.response) {
        setError("Unable to connect to the server. Please try again.");
      } else if (requestError.response.status === 401) {
        setError(requestError.response.data?.message || "Invalid login credentials.");
      } else if (requestError.response.status === 503) {
        setError(requestError.response.data?.message || "Service temporarily unavailable.");
      } else {
        setError(requestError.response.data?.message || "Unable to sign in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-page-inner">
        {/* Branding */}
        <div className="auth-brand">
          <div className="auth-brand-mark"><Anchor size={20} strokeWidth={2.4} /></div>
          <span className="auth-brand-text">Nexa<span>Port</span></span>
        </div>

        {/* Card */}
        <div className={`auth-card ${tab === "register" ? "auth-card--register" : ""}`}>
          {/* Tab switcher */}
          <div className="auth-tabs" role="tablist" aria-label="Authentication">
            <button
              role="tab"
              aria-selected={tab === "login"}
              className={`auth-tab${tab === "login" ? " auth-tab--active" : ""}`}
              onClick={() => { setTab("login"); setError(""); }}
              type="button"
            >
              Sign In
            </button>
            <button
              role="tab"
              aria-selected={tab === "register"}
              className={`auth-tab${tab === "register" ? " auth-tab--active" : ""}`}
              onClick={() => { setTab("register"); setError(""); }}
              type="button"
            >
              Register
            </button>
          </div>

          {tab === "login" ? (
            <>
              <div className="auth-heading">
                <h1>Sign in</h1>
                <p>Access your NexaPort account</p>
              </div>

              {error && <div className="auth-error" role="alert">{error}</div>}

              <form className="auth-form" onSubmit={handleLoginSubmit} noValidate>
                <div className="auth-field">
                  <label htmlFor="auth-identifier">Email or username</label>
                  <input
                    id="auth-identifier"
                    className="auth-input"
                    type="text"
                    value={loginForm.identifier}
                    onChange={(e) => setLoginForm({ ...loginForm, identifier: e.target.value })}
                    autoComplete="username"
                    autoFocus
                    placeholder="you@company.com"
                  />
                </div>

                <div className="auth-field">
                  <label htmlFor="auth-password">Password</label>
                  <div className="auth-password-wrap">
                    <input
                      id="auth-password"
                      className="auth-input"
                      type={showPassword ? "text" : "password"}
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      className="auth-password-toggle"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword((v) => !v)}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                <div className="auth-options-row">
                  <label className="auth-remember">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span>Remember me</span>
                  </label>
                  <button
                    type="button"
                    className="auth-forgot-link"
                    onClick={() => { setError(""); setResetPasswordOpen(true); }}
                  >
                    Forgot password?
                  </button>
                </div>

                <button className="auth-submit" type="submit" disabled={loading}>
                  {loading ? "Signing in\u2026" : "Sign In"}
                </button>
              </form>

              <div className="auth-alt">
                New to NexaPort?{" "}
                <button type="button" className="auth-alt-link" onClick={() => setTab("register")}>
                  Create an account
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="auth-heading">
                <h1>Create an account</h1>
                <p>Select how you will use the maritime marketplace.</p>
              </div>

              <div className="auth-roles">
                <Link to="/register-client" className="auth-role-card">
                  <span className="auth-role-icon"><Ship size={19} /></span>
                  <div className="auth-role-info">
                    <strong>Client / Ship Owner</strong>
                    <span>Post service requests, review quotations and manage vessels.</span>
                  </div>
                  <span className="auth-role-action">Register &rarr;</span>
                </Link>

                <Link to="/register-consultant" className="auth-role-card">
                  <span className="auth-role-icon"><UserRoundCheck size={19} /></span>
                  <div className="auth-role-info">
                    <strong>Consultant / Surveyor</strong>
                    <span>Submit quotations, build inspection reports and templates.</span>
                  </div>
                  <span className="auth-role-action">Register &rarr;</span>
                </Link>

                <Link to="/register-maritime-company" className="auth-role-card">
                  <span className="auth-role-icon"><Building2 size={19} /></span>
                  <div className="auth-role-info">
                    <strong>Maritime Company</strong>
                    <span>Manage your directory profile and receive relevant enquiries.</span>
                  </div>
                  <span className="auth-role-action">Register &rarr;</span>
                </Link>
              </div>

              <div className="auth-alt">
                Already registered?{" "}
                <button type="button" className="auth-alt-link" onClick={() => setTab("login")}>
                  Sign in
                </button>
              </div>
            </>
          )}
        </div>

        <div className="auth-footer">
          Verified Maritime Consultants &middot; Anywhere &middot; Anytime
        </div>
      </div>

      <ResetPasswordModal
        open={resetPasswordOpen}
        defaultEmail={
          loginForm.identifier.includes("@") ? loginForm.identifier : ""
        }
        onClose={() => setResetPasswordOpen(false)}
        onPasswordChanged={() => {
          setResetPasswordOpen(false);
          setTab("login");
          setLoginForm((current) => ({ ...current, password: "" }));
          setError("");
        }}
      />
    </div>
  );
}
