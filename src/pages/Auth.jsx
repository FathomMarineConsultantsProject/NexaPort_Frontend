import { Anchor, Briefcase, Eye, EyeOff, Ship } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser, registerUser } from "../api/Auth";
import "./Auth.css";

export default function Auth() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("login"); // "login" | "register"
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Login state
  const [loginForm, setLoginForm] = useState({ identifier: "", password: "" });

  // Register state
  const [registerForm, setRegisterForm] = useState({
    full_name: "",
    email: "",
    username: "",
    password: "",
    phone: "",
    role_id: 3, // default = client
  });

  const handleLoginChange = (e) => {
    setLoginForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleRegisterChange = (e) => {
    setRegisterForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!loginForm.identifier || !loginForm.password) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const res = await loginUser(loginForm);
      if (res.success) {
        localStorage.setItem("np_token", res.token);
        localStorage.setItem("np_user", JSON.stringify(res.user));
        navigate("/dashboard");
      } else {
        setError(res.message || "Login failed");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const { full_name, email, username, password } = registerForm;
    if (!full_name || !email || !username || !password) {
      setError("Full name, email, username and password are required");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await registerUser({
        ...registerForm,
        role_id: Number(registerForm.role_id),
      });

      if (res.success) {
        localStorage.setItem("np_token", res.token);
        localStorage.setItem("np_user", JSON.stringify(res.user));
        navigate("/dashboard");
      } else {
        setError(res.message || "Registration failed");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (t) => {
    setTab(t);
    setError("");
  };

  return (
    <div className="auth-page">
      {/* Logo */}
      <div className="auth-logo">
        <div className="auth-logo-icon">
          <Anchor size={22} />
        </div>
        <div className="auth-logo-text">
          Nexa<span>Port</span>
        </div>
      </div>

      <div className="auth-card">
        {/* Tabs */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${tab === "login" ? "active" : ""}`}
            onClick={() => switchTab("login")}
          >
            Sign In
          </button>
          <button
            className={`auth-tab ${tab === "register" ? "active" : ""}`}
            onClick={() => switchTab("register")}
          >
            Register
          </button>
        </div>

        {/* Login Form */}
        {tab === "login" && (
          <>
            <div className="auth-card-head">
              <h1>Welcome back</h1>
              <p>Sign in to your NexaPort account</p>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <form className="auth-form" onSubmit={handleLoginSubmit}>
              <div className="auth-field">
                <label>Email or Username</label>
                <input
                  type="text"
                  name="identifier"
                  value={loginForm.identifier}
                  onChange={handleLoginChange}
                  placeholder="email@company.com or username"
                  className="auth-input"
                  autoComplete="username"
                />
              </div>

              <div className="auth-field">
                <label>Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={loginForm.password}
                    onChange={handleLoginChange}
                    placeholder="••••••••"
                    className="auth-input"
                    style={{ width: "100%", paddingRight: "44px" }}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: "14px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      color: "#7c8dab",
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="auth-submit-btn"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <div className="auth-divider">
              Don't have an account?{" "}
              <a onClick={() => switchTab("register")} style={{ cursor: "pointer" }}>
                Register here
              </a>
            </div>
          </>
        )}

        {/* Register Form */}
        {tab === "register" && (
          <>
            <div className="auth-card-head">
              <h1>Create account</h1>
              <p>Join the NexaPort maritime marketplace</p>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <form className="auth-form" onSubmit={handleRegisterSubmit}>
              {/* Role picker */}
              <div className="auth-field">
                <label>I am a</label>
                <div className="role-options">
                  <label className="role-option">
                    <input
                      type="radio"
                      name="role_id"
                      value={3}
                      checked={Number(registerForm.role_id) === 3}
                      onChange={handleRegisterChange}
                    />
                    <div className="role-card">
                      <div className="role-card-icon">
                        <Briefcase size={20} />
                      </div>
                      <div className="role-card-title">Client</div>
                      <div className="role-card-desc">
                        Post service requests & hire Consultants
                      </div>
                    </div>
                  </label>

                  <label className="role-option">
                    <input
                      type="radio"
                      name="role_id"
                      value={2}
                      checked={Number(registerForm.role_id) === 2}
                      onChange={handleRegisterChange}
                    />
                    <div className="role-card">
                      <div className="role-card-icon">
                        <Ship size={20} />
                      </div>
                      <div className="role-card-title">Consultant</div>
                      <div className="role-card-desc">
                        Offer maritime consultancy, surveys & inspections
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Name + Username */}
              <div className="auth-two-col">
                <div className="auth-field">
                  <label>Full Name</label>
                  <input
                    type="text"
                    name="full_name"
                    value={registerForm.full_name}
                    onChange={handleRegisterChange}
                    placeholder="Capt. Alexander Petrov"
                    className="auth-input"
                  />
                </div>
                <div className="auth-field">
                  <label>Username</label>
                  <input
                    type="text"
                    name="username"
                    value={registerForm.username}
                    onChange={handleRegisterChange}
                    placeholder="alex_petrov"
                    className="auth-input"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="auth-field">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={registerForm.email}
                  onChange={handleRegisterChange}
                  placeholder="you@company.com"
                  className="auth-input"
                  autoComplete="email"
                />
              </div>

              {/* Phone (optional) */}
              <div className="auth-field">
                <label>
                  Phone <span className="opt">(optional)</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={registerForm.phone}
                  onChange={handleRegisterChange}
                  placeholder="+1 234 567 890"
                  className="auth-input"
                />
              </div>

              {/* Password */}
              <div className="auth-field">
                <label>Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={registerForm.password}
                    onChange={handleRegisterChange}
                    placeholder="Min. 6 characters"
                    className="auth-input"
                    style={{ width: "100%", paddingRight: "44px" }}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: "14px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      color: "#7c8dab",
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="auth-submit-btn"
                disabled={loading}
              >
                {loading ? "Creating account..." : "Create Account"}
              </button>
            </form>

            <div className="auth-divider">
              Already have an account?{" "}
              <a onClick={() => switchTab("login")} style={{ cursor: "pointer" }}>
                Sign in
              </a>
            </div>
          </>
        )}

        <div className="auth-footer-note">
          Verified Maritime Consultants. Anywhere. Anytime.
        </div>
      </div>
    </div>
  );
}