import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  resetPasswordWithOtp,
  sendPasswordResetOtp,
} from "../../api/passwordResetApi";
import "./ResetPasswordModal.css";

const initialForm = {
  email: "",
  otp: "",
  newPassword: "",
  confirmPassword: "",
};

export default function ResetPasswordModal({
  open,
  onClose,
  defaultEmail = "",
  onPasswordChanged,
}) {
  const [step, setStep] = useState("email");
  const [form, setForm] = useState(initialForm);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [resendingOtp, setResendingOtp] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (!open) return;

    setStep("email");
    setForm({
      ...initialForm,
      email: defaultEmail || "",
    });
    setError("");
    setMessage("");
    setSendingOtp(false);
    setChangingPassword(false);
    setResendingOtp(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setResendSeconds(0);
  }, [open, defaultEmail]);

  useEffect(() => {
    if (!open) return undefined;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  useEffect(() => {
    if (resendSeconds <= 0) return undefined;

    const timer = window.setInterval(() => {
      setResendSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  if (!open) return null;

  const normalizeEmail = (value) =>
    String(value || "").trim().toLowerCase();

  const validateEmail = (email) =>
    /^\S+@\S+\.\S+$/.test(email);

  const validatePassword = (password) =>
    typeof password === "string" &&
    password.length >= 8 &&
    /[A-Za-z]/.test(password) &&
    /\d/.test(password);

  const handleFieldChange = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    if (error) setError("");
    if (message) setMessage("");
  };

  const handleSendOtp = async (event) => {
    event.preventDefault();

    const email = normalizeEmail(form.email);

    if (!email) {
      setError("Email address is required.");
      return;
    }

    if (!validateEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }

    try {
      setSendingOtp(true);
      setError("");
      setMessage("");

      const response = await sendPasswordResetOtp(email);

      setForm((current) => ({
        ...current,
        email,
      }));

      setMessage(
        response.message ||
          "OTP sent successfully. Check your email."
      );
      setStep("reset");
      setResendSeconds(60);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to send OTP. Please try again."
      );
    } finally {
      setSendingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendSeconds > 0 || resendingOtp) return;

    try {
      setResendingOtp(true);
      setError("");
      setMessage("");

      const response = await sendPasswordResetOtp(
        normalizeEmail(form.email)
      );

      setMessage(
        response.message ||
          "A new OTP has been sent to your email."
      );
      setForm((current) => ({
        ...current,
        otp: "",
      }));
      setResendSeconds(60);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to resend OTP. Please try again."
      );
    } finally {
      setResendingOtp(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();

    const email = normalizeEmail(form.email);
    const otp = form.otp.trim();

    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit OTP sent to your email.");
      return;
    }

    if (!validatePassword(form.newPassword)) {
      setError(
        "Password must be at least 8 characters and include letters and numbers."
      );
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    try {
      setChangingPassword(true);
      setError("");
      setMessage("");

      const response = await resetPasswordWithOtp({
        email,
        otp,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      });

      setMessage(
        response.message || "Password changed successfully."
      );
      setStep("success");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to change password. Please try again."
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const finishPasswordReset = () => {
    if (onPasswordChanged) {
      onPasswordChanged();
      return;
    }

    onClose();
  };

  return (
    <div
      className="np-reset-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="np-reset-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="np-reset-modal-title"
      >
        <button
          type="button"
          className="np-reset-modal-close"
          onClick={onClose}
          aria-label="Close reset password modal"
        >
          <X size={19} />
        </button>

        {step === "email" && (
          <>
            <div className="np-reset-modal-icon">
              <KeyRound size={25} />
            </div>

            <div className="np-reset-modal-heading">
              <h2 id="np-reset-modal-title">
                Reset Password
              </h2>
              <p>
                Enter your registered email address and we will
                send you a verification OTP.
              </p>
            </div>

            <form
              className="np-reset-modal-form"
              onSubmit={handleSendOtp}
            >
              <label className="np-reset-field">
                <span>Email Address</span>

                <div className="np-reset-input-wrap">
                  <Mail size={17} />

                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      handleFieldChange(
                        "email",
                        event.target.value
                      )
                    }
                    placeholder="Enter your registered email"
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </label>

              {error && (
                <div className="np-reset-alert error">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="np-reset-primary-btn"
                disabled={sendingOtp}
              >
                {sendingOtp ? (
                  <>
                    <Loader2
                      className="np-reset-spinner"
                      size={17}
                    />
                    Sending OTP...
                  </>
                ) : (
                  <>
                    <Mail size={17} />
                    Send OTP
                  </>
                )}
              </button>
            </form>
          </>
        )}

        {step === "reset" && (
          <>
            <div className="np-reset-modal-icon">
              <LockKeyhole size={25} />
            </div>

            <div className="np-reset-modal-heading">
              <h2 id="np-reset-modal-title">
                Verify OTP
              </h2>
              <p>
                Enter the OTP sent to{" "}
                <strong>{form.email}</strong> and choose a new
                password.
              </p>
            </div>

            <form
              className="np-reset-modal-form"
              onSubmit={handleResetPassword}
            >
              <label className="np-reset-field">
                <span>Verification OTP</span>

                <div className="np-reset-input-wrap">
                  <KeyRound size={17} />

                  <input
                    className="np-reset-otp-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={form.otp}
                    onChange={(event) => {
                      const numericValue =
                        event.target.value.replace(/\D/g, "");

                      handleFieldChange(
                        "otp",
                        numericValue.slice(0, 6)
                      );
                    }}
                    placeholder="Enter 6-digit OTP"
                    autoComplete="one-time-code"
                    autoFocus
                  />
                </div>
              </label>

              <label className="np-reset-field">
                <span>New Password</span>

                <div className="np-reset-input-wrap">
                  <LockKeyhole size={17} />

                  <input
                    type={
                      showNewPassword ? "text" : "password"
                    }
                    value={form.newPassword}
                    onChange={(event) =>
                      handleFieldChange(
                        "newPassword",
                        event.target.value
                      )
                    }
                    placeholder="Enter new password"
                    autoComplete="new-password"
                  />

                  <button
                    type="button"
                    className="np-reset-password-toggle"
                    onClick={() =>
                      setShowNewPassword((current) => !current)
                    }
                    aria-label={
                      showNewPassword
                        ? "Hide new password"
                        : "Show new password"
                    }
                  >
                    {showNewPassword ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>
                </div>
              </label>

              <label className="np-reset-field">
                <span>Confirm Password</span>

                <div className="np-reset-input-wrap">
                  <LockKeyhole size={17} />

                  <input
                    type={
                      showConfirmPassword ? "text" : "password"
                    }
                    value={form.confirmPassword}
                    onChange={(event) =>
                      handleFieldChange(
                        "confirmPassword",
                        event.target.value
                      )
                    }
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                  />

                  <button
                    type="button"
                    className="np-reset-password-toggle"
                    onClick={() =>
                      setShowConfirmPassword(
                        (current) => !current
                      )
                    }
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirm password"
                        : "Show confirm password"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>
                </div>
              </label>

              <p className="np-reset-password-help">
                Use at least 8 characters with letters and
                numbers.
              </p>

              {message && (
                <div className="np-reset-alert success">
                  {message}
                </div>
              )}

              {error && (
                <div className="np-reset-alert error">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="np-reset-primary-btn"
                disabled={changingPassword}
              >
                {changingPassword ? (
                  <>
                    <Loader2
                      className="np-reset-spinner"
                      size={17}
                    />
                    Changing Password...
                  </>
                ) : (
                  <>
                    <LockKeyhole size={17} />
                    Change Password
                  </>
                )}
              </button>

              <div className="np-reset-secondary-actions">
                <button
                  type="button"
                  className="np-reset-link-btn"
                  onClick={() => {
                    setStep("email");
                    setError("");
                    setMessage("");
                  }}
                >
                  <ArrowLeft size={15} />
                  Change email
                </button>

                <button
                  type="button"
                  className="np-reset-link-btn"
                  onClick={handleResendOtp}
                  disabled={
                    resendSeconds > 0 || resendingOtp
                  }
                >
                  {resendingOtp
                    ? "Sending..."
                    : resendSeconds > 0
                    ? `Resend OTP in ${resendSeconds}s`
                    : "Resend OTP"}
                </button>
              </div>
            </form>
          </>
        )}

        {step === "success" && (
          <div className="np-reset-success-view">
            <div className="np-reset-modal-icon success">
              <CheckCircle2 size={28} />
            </div>

            <div className="np-reset-modal-heading">
              <h2 id="np-reset-modal-title">
                Password Changed
              </h2>
              <p>
                Your password has been changed successfully.
                Please sign in again using your new password.
              </p>
            </div>

            {message && (
              <div className="np-reset-alert success">
                {message}
              </div>
            )}

            <button
              type="button"
              className="np-reset-primary-btn"
              onClick={finishPasswordReset}
            >
              Sign In Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}