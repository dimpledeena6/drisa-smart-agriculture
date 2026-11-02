
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import farmers from "../data/farmers";
import "../styles/login.css";

function Login() {
  const navigate = useNavigate();

  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = (event) => {
    event.preventDefault();
    setError("");

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

    
    let passwordOverrides = {};

    try {
    passwordOverrides = JSON.parse(
    localStorage.getItem("drisaPasswordOverrides") || "{}"
    );
    } catch {
    passwordOverrides = {};
    }

    const farmer = allFarmers.find(
    (item) =>
    item.id.toLowerCase() === userId.trim().toLowerCase() &&
    (passwordOverrides[item.id] ?? item.password) === password
   );


    if (!farmer) {
      setError("Invalid User ID or password");
      return;
    }

    localStorage.setItem("drisaFarmer", JSON.stringify(farmer));
    navigate("/dashboard");
  };

  return (
    <main className="login-page">
      <div className="login-background-leaf leaf-one"></div>
      <div className="login-background-leaf leaf-two"></div>
      <div className="login-background-leaf leaf-three"></div>
      <div className="login-background-leaf leaf-four"></div>

      <section className="login-card">
        <div className="login-logo-wrapper">
          <img
            src="/src/assets/drisa-logo.png"
            alt="DRISA"
            className="login-logo"
          />
        </div>

        <div className="login-heading">
          <h1>Welcome to DRISA</h1>
          <p>
            Smart Farming <span>•</span> Better Decisions
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label htmlFor="userId">Farmer User ID</label>

            <div className="input-wrapper">
              <span className="input-icon" aria-hidden="true">
                👨‍🌾
              </span>

              <input
                id="userId"
                type="text"
                placeholder="Enter your User ID"
                value={userId}
                onChange={(event) => {
                  setUserId(event.target.value);
                  setError("");
                }}
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>

            <div className="input-wrapper password-input-wrapper">
              <span className="input-icon" aria-hidden="true">
                🔒
              </span>

              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError("");
                }}
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((previous) => !previous)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? (
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path d="M3 3l18 18" />
                    <path d="M10.6 5.2A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a14.8 14.8 0 0 1-4 4.7" />
                    <path d="M6.2 6.3C3.5 8.1 2 12 2 12s3.5 7 10 7a10 10 0 0 0 3-.5" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          <div className="login-options">
            <label className="remember-option">
              <input type="checkbox" />
              <span>Remember me</span>
            </label>

            
<button
  type="button"
  className="forgot-password"
  onClick={() => navigate("/forgot-password")}
>
  Forgot password?
</button>

          </div>

          <button type="submit" className="login-button">
            <span>Login to DRISA</span>
            <span className="login-arrow" aria-hidden="true">
              →
            </span>
          </button>
        </form>

        <div className="register-prompt">
          New to DRISA? <Link to="/register">Create an account</Link>
        </div>

        <div className="login-footer">
          <p>AI-POWERED SMART AGRICULTURE</p>
        </div>
      </section>
    </main>
  );
}

export default Login;
