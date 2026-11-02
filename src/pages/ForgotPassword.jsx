
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import farmers from "../data/farmers";
import "../styles/login.css";
import "../styles/forgotPassword.css";

function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep] = useState("details");
  const [userId, setUserId] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [matchedFarmer, setMatchedFarmer] = useState(null);

  const handleFindAccount = (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const normalizedPhone = phone.replace(/\D/g, "");

    if (!/^[6-9]\d{9}$/.test(normalizedPhone)) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }

    let registeredFarmers = [];

    try {
      registeredFarmers = JSON.parse(
        localStorage.getItem("drisaRegisteredFarmers") || "[]"
      );
    } catch {
      setError("Unable to read registered accounts. Please try again.");
      return;
    }

    const allFarmers = [
      ...farmers,
      ...(Array.isArray(registeredFarmers) ? registeredFarmers : []),
    ];

    const account = allFarmers.find(
      (farmer) =>
        farmer.id?.toLowerCase() === userId.trim().toLowerCase()
    );

    if (!account) {
      setError("Account not found. Check your Farmer User ID.");
      return;
    }

    const savedPhone = String(
      account.phone || account.mobile || account.mobileNumber || ""
    ).replace(/\D/g, "");

    if (!savedPhone) {
      setError(
        "No mobile number is registered for this account. Please contact the DRISA administrator to update your account details."
      );
      return;
    }

    if (savedPhone !== normalizedPhone) {
      setError("The mobile number does not match this account.");
      return;
    }

    setMatchedFarmer(account);
    setStep("otp");
    setSuccess(
      "Demo mode: no SMS was sent. Use the testing OTP shown below."
    );
  };

  const handleVerifyOtp = (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (otp.trim() !== "123456") {
      setError("Incorrect demo OTP. Please enter 123456.");
      return;
    }

    setStep("reset");
  };

  const handleResetPassword = (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword.length < 6) {
      setError("Your new password must contain at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    if (!matchedFarmer) {
      setError("Please verify your account again.");
      setStep("details");
      return;
    }

    try {
      const overrides = JSON.parse(
        localStorage.getItem("drisaPasswordOverrides") || "{}"
      );

      overrides[matchedFarmer.id] = newPassword;

      localStorage.setItem(
        "drisaPasswordOverrides",
        JSON.stringify(overrides)
      );

      const registeredFarmers = JSON.parse(
        localStorage.getItem("drisaRegisteredFarmers") || "[]"
      );

      if (!Array.isArray(registeredFarmers)) {
        throw new Error("Invalid registered farmer data.");
      }

      const updatedFarmers = registeredFarmers.map((farmer) =>
        farmer.id === matchedFarmer.id
          ? { ...farmer, password: newPassword }
          : farmer
      );

      localStorage.setItem(
        "drisaRegisteredFarmers",
        JSON.stringify(updatedFarmers)
      );

      setStep("done");
      setSuccess("Your password has been reset successfully.");
    } catch {
      setError("Unable to save your new password. Please try again.");
    }
  };

  return (
    <main className="login-page">
      <div className="login-background-leaf leaf-one"></div>
      <div className="login-background-leaf leaf-two"></div>
      <div className="login-background-leaf leaf-three"></div>
      <div className="login-background-leaf leaf-four"></div>

      <section className="login-card recovery-card">
        <div className="login-logo-wrapper">
          <img
            src="/src/assets/drisa-logo.png"
            alt="DRISA"
            className="login-logo"
          />
        </div>

        <div className="login-heading">
          <h1>
            {step === "done" ? "Password Reset" : "Forgot Password?"}
          </h1>
          <p>Recover your DRISA farmer account</p>
        </div>

        <div className="demo-otp-notice">
          <strong>DEMO MODE — NO SMS IS SENT</strong>
          <p>
            This prototype uses a testing OTP. It does not verify ownership
            of a real phone number.
          </p>
        </div>

        {step === "details" && (
          <form onSubmit={handleFindAccount}>
            <div className="input-group">
              <label htmlFor="recoveryUserId">Farmer User ID</label>
              <div className="input-wrapper">
                <span className="input-icon" aria-hidden="true">
                  👨‍🌾
                </span>
                <input
                  id="recoveryUserId"
                  type="text"
                  placeholder="Enter your Farmer User ID"
                  value={userId}
                  onChange={(event) => setUserId(event.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="recoveryPhone">Registered mobile number</label>
              <div className="input-wrapper">
                <span className="input-icon" aria-hidden="true">
                  📱
                </span>
                <input
                  id="recoveryPhone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="Enter your 10-digit mobile number"
                  value={phone}
                  onChange={(event) =>
                    setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                  autoComplete="tel"
                  maxLength={10}
                  required
                />
              </div>
            </div>

            <button type="submit" className="login-button">
              Verify Account <span aria-hidden="true">→</span>
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleVerifyOtp}>
            <p className="recovery-description">
              Account matched for <strong>{matchedFarmer?.id}</strong>.
              Enter the demo testing code to continue.
            </p>

            <div className="demo-code">
              <span>DEMO OTP</span>
              <strong>123456</strong>
            </div>

            <div className="input-group">
              <label htmlFor="recoveryOtp">Enter OTP</label>
              <div className="input-wrapper">
                <span className="input-icon" aria-hidden="true">
                  🔐
                </span>
                <input
                  id="recoveryOtp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="Enter 6-digit demo OTP"
                  value={otp}
                  onChange={(event) =>
                    setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  maxLength={6}
                  required
                />
              </div>
            </div>

            <button type="submit" className="login-button">
              Verify OTP <span aria-hidden="true">→</span>
            </button>

            <button
              type="button"
              className="recovery-secondary-button"
              onClick={() => {
                setStep("details");
                setOtp("");
                setError("");
                setSuccess("");
              }}
            >
              Change account details
            </button>
          </form>
        )}

        {step === "reset" && (
          <form onSubmit={handleResetPassword}>
            <p className="recovery-description">
              Create a new password for <strong>{matchedFarmer?.id}</strong>.
            </p>

            <div className="input-group">
              <label htmlFor="newPassword">New password</label>
              <div className="input-wrapper">
                <span className="input-icon" aria-hidden="true">
                  🔒
                </span>
                <input
                  id="newPassword"
                  type="password"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="confirmPassword">Confirm new password</label>
              <div className="input-wrapper">
                <span className="input-icon" aria-hidden="true">
                  🔒
                </span>
                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter your new password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </div>
            </div>

            <button type="submit" className="login-button">
              Reset Password <span aria-hidden="true">→</span>
            </button>
          </form>
        )}

        {step === "done" && (
          <div className="recovery-complete">
            <div className="recovery-success-icon" aria-hidden="true">
              ✓
            </div>
            <p>Your new password has been saved for this browser.</p>
            <button
              type="button"
              className="login-button"
              onClick={() => navigate("/login")}
            >
              Return to Login <span aria-hidden="true">→</span>
            </button>
          </div>
        )}

        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}

        {success && step !== "done" && (
          <p className="recovery-success-message" role="status">
            {success}
          </p>
        )}

        {step !== "done" && (
          <div className="register-prompt">
            Remember your password? <Link to="/login">Back to login</Link>
          </div>
        )}

        <div className="login-footer">
          <p>AI-POWERED SMART AGRICULTURE</p>
        </div>
      </section>
    </main>
  );
}

export default ForgotPassword;
