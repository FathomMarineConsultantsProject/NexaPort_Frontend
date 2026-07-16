import { Anchor, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../api/Auth";
import "./Auth.css";
import ResetPasswordModal from "../components/auth/ResetPasswordModal";


export default function Auth() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [loginForm, setLoginForm] = useState({ identifier: "", password: "" });

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!loginForm.identifier || !loginForm.password) return setError("Please fill in all fields");
    setLoading(true);
    try {
      const response = await loginUser(loginForm);
      localStorage.setItem("np_token", response.token);
      localStorage.setItem("np_user", JSON.stringify(response.user));
      const isRestrictedClient = Number(response.user?.role_id) === 3 && response.user?.verification_status !== "approved";
      navigate(isRestrictedClient ? "/client-verification-status" : "/dashboard", { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-logo">
        <div className="auth-logo-icon"><Anchor size={22} /></div>
        <div className="auth-logo-text">Nexa<span>Port</span></div>
      </div>
      <div className="auth-card">
        <div className="auth-tabs">
          <button className={`auth-tab ${tab === "login" ? "active" : ""}`} onClick={() => { setTab("login"); setError(""); }}>Sign In</button>
          <button className={`auth-tab ${tab === "register" ? "active" : ""}`} onClick={() => { setTab("register"); setError(""); }}>Register</button>
        </div>

        {tab === "login" ? (
          <>
            <div className="auth-card-head"><h1>Welcome back</h1><p>Sign in to your NexaPort account</p></div>
            {error && <div className="auth-error">{error}</div>}
            <form className="auth-form" onSubmit={handleLoginSubmit}>
              <div className="auth-field"><label>Email or Username</label><input className="auth-input" name="identifier" value={loginForm.identifier} onChange={(event) => setLoginForm({ ...loginForm, identifier: event.target.value })} autoComplete="username" /></div>
              <div className="auth-field"><label>Password</label><div style={{ position: "relative" }}><input className="auth-input" style={{ width: "100%", paddingRight: 44 }} type={showPassword ? "text" : "password"} value={loginForm.password} onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })} autoComplete="current-password" /><button type="button" aria-label="Toggle password visibility" onClick={() => setShowPassword((value) => !value)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", border: 0, background: "none", color: "#60708c" }}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>

              <div className="auth-forgot-row">
                <button
                  type="button"
                  className="auth-forgot-btn"
                  onClick={() => {
                    setError("");
                    setResetPasswordOpen(true);
                  }}
                >
                  Forgot password?
                </button>
              </div>
              <button className="auth-submit-btn" disabled={loading}>{loading ? "Signing in..." : "Sign In"}</button>
            </form>
            <div className="auth-divider">New to NexaPort? <button type="button" className="auth-link-button" onClick={() => setTab("register")}>Create an account</button></div>
          </>
        ) : (
          <>
            <div className="auth-card-head"><h1>Create a Client account</h1><p>Complete a structured company verification before accessing inspection services.</p></div>
            <Link to="/register-client" className="auth-submit-btn auth-registration-cta">Continue Client Registration</Link>
            <div className="auth-divider auth-consultant-link">Want to sign up as a consultant? <Link to="/register-consultant">Register as a Consultant</Link>.</div>
            <div className="auth-divider">Already registered? <button type="button" className="auth-link-button" onClick={() => setTab("login")}>Sign in</button></div>
          </>
        )}
        <div className="auth-footer-note">
          Verified Maritime Consultants. Anywhere. Anytime.
        </div>
      </div>

      <ResetPasswordModal
        open={resetPasswordOpen}
        defaultEmail={
          loginForm.identifier.includes("@")
            ? loginForm.identifier
            : ""
        }
        onClose={() => setResetPasswordOpen(false)}
        onPasswordChanged={() => {
          setResetPasswordOpen(false);
          setTab("login");
          setLoginForm((current) => ({
            ...current,
            password: "",
          }));
          setError("");
        }}
      />
    </div>
  );
}
