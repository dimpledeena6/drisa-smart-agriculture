
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../styles/login.css";

function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = (event) => {
    event.preventDefault();
    setError("");

    const cleanName = name.trim();
    const cleanPhone = phone.trim();

    if (cleanName.length < 2) {
      setError("Please enter your full name.");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      const savedFarmers = JSON.parse(
        localStorage.getItem("drisaRegisteredFarmers") || "[]"
      );

      if (!Array.isArray(savedFarmers)) {
        setError("Unable to read registered accounts. Please try again.");
        return;
      }

      const phoneExists = savedFarmers.some(
        (farmer) => farmer.phone === cleanPhone
      );

      if (phoneExists) {
        setError("This phone number is already registered. Please log in.");
        return;
      }

      const nextNumber =
        savedFarmers.reduce((max, farmer) => {
          const match = /^DRISA(\d+)$/.exec(farmer.id || "");
          return match ? Math.max(max, Number(match[1])) : max;
        }, 3) + 1;

      const newFarmer = {
        id: `DRISA${String(nextNumber).padStart(3, "0")}`,
        name: cleanName,
        phone: cleanPhone,
        password,
        lands: []
      };

      savedFarmers.push(newFarmer);

      localStorage.setItem(
        "drisaRegisteredFarmers",
        JSON.stringify(savedFarmers)
      );

      // Create this farmer's independent farm list.
      localStorage.setItem(
        `drisaFarms_${newFarmer.id}`,
        JSON.stringify([])
      );

      alert(
        `Registration successful!\nYour Farmer ID is ${newFarmer.id}\nPlease use this ID to log in.`
      );

      navigate("/login");
    } catch (error) {
      console.error("Registration failed:", error);
      setError("Registration could not be saved. Please try again.");
    }
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
          <h1>Create Your Account</h1>
          <p>Join DRISA • Smarter Farming</p>
        </div>

        <form onSubmit={handleRegister}>
          <div className="input-group">
            <label htmlFor="name">Full Name</label>
            <div className="input-wrapper">
              <span className="input-icon">👨‍🌾</span>
              <input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                maxLength={80}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="phone">Mobile Number</label>
            <div className="input-wrapper">
              <span className="input-icon">📱</span>
              <input
                id="phone"
                type="tel"
                placeholder="10-digit mobile number"
                value={phone}
                onChange={(event) =>
                  setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))
                }
                inputMode="numeric"
                autoComplete="tel"
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="registerPassword">Password</label>
            <div className="input-wrapper">
              <span className="input-icon">🔒</span>
              <input
                id="registerPassword"
                type={showPassword ? "text" : "password"}
                placeholder="At least 6 characters"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "◉" : "○"}
              </button>
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="input-wrapper">
              <span className="input-icon">🔒</span>
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
          </div>

          {error && <p className="login-error" role="alert">{error}</p>}

          <button type="submit" className="login-button">
            Register Account <span>→</span>
          </button>
        </form>

        <div className="login-heading" style={{ marginTop: "20px" }}>
          <p>
            Already registered? <Link to="/login">Login here</Link>
          </p>
        </div>

        <div className="login-footer">
          <span></span>
          <p>AI-POWERED SMART AGRICULTURE</p>
          <span></span>
        </div>
      </section>
    </main>
  );
}

export default Register;
