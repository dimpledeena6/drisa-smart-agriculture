
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/profile.css";

export default function Profile() {
  const navigate = useNavigate();
  const [farmer, setFarmer] = useState(null);
  const [farms, setFarms] = useState([]);

  useEffect(() => {
    const savedFarmer = localStorage.getItem("drisaFarmer");

    if (!savedFarmer) {
      navigate("/login");
      return;
    }

    try {
      const parsedFarmer = JSON.parse(savedFarmer);
      setFarmer(parsedFarmer);

      const storedFarms = localStorage.getItem(
        `drisaFarms_${parsedFarmer.id}`
      );

      let farmerFarms = parsedFarmer.lands || [];

      if (storedFarms !== null) {
        const parsedFarms = JSON.parse(storedFarms);
        farmerFarms = Array.isArray(parsedFarms) ? parsedFarms : [];
      }

      setFarms(farmerFarms);
    } catch (error) {
      console.error("Unable to load farmer profile:", error);
      navigate("/login");
    }
  }, [navigate]);

  if (!farmer) {
    return <div className="profile-loading">Loading profile...</div>;
  }

  const farmerName =
    farmer.name || farmer.farmerName || "Farmer";

  const farmerId =
    farmer.id || farmer.farmerId || "Not available";

  const initials = farmerName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <main className="profile-page">
      <header className="profile-header">
        <div>
          <p className="profile-eyebrow">YOUR ACCOUNT</p>
          <h1>Farmer Profile</h1>
          <p>View your account details and registered farms.</p>
        </div>

        <button
          className="profile-back-button"
          onClick={() => navigate("/dashboard")}
        >
          Back to Dashboard
        </button>
      </header>

      <section className="profile-card">
        <div className="profile-avatar">{initials || "F"}</div>

        <div className="profile-identity">
          <h2>{farmerName}</h2>
          <p>Farmer ID: {farmerId}</p>
          <span className="profile-status">Demo Account</span>
        </div>
      </section>

      <section className="profile-details">
        <h2>Account Information</h2>

        <div className="profile-detail-grid">
          <div className="profile-detail-item">
            <span>Farmer Name</span>
            <strong>{farmerName}</strong>
          </div>

          <div className="profile-detail-item">
            <span>Farmer ID</span>
            <strong>{farmerId}</strong>
          </div>

          <div className="profile-detail-item">
            <span>Registered Farms</span>
            <strong>{farms.length}</strong>
          </div>

          <div className="profile-detail-item">
            <span>Application</span>
            <strong>DRISA Smart Agriculture</strong>
          </div>
        </div>
      </section>

      <section className="profile-farms">
        <div className="profile-section-heading">
          <div>
            <h2>My Farms</h2>
            <p>Your registered agricultural land.</p>
          </div>

          <button
            className="profile-add-button"
            onClick={() => navigate("/add-farm")}
          >
            + Add Farm
          </button>
        </div>

        {farms.length === 0 ? (
          <div className="profile-empty">
            <h3>No farms registered yet</h3>
            <p>Add a farm to view its details here.</p>
            <button onClick={() => navigate("/add-farm")}>
              Register a Farm
            </button>
          </div>
        ) : (
          <div className="profile-farm-grid">
            {farms.map((farm, index) => (
              <article
                className="profile-farm-card"
                key={farm.id ?? `${farm.name}-${index}`}
              >
                <div className="profile-farm-icon">🌱</div>
                <h3>{farm.name || `Farm ${index + 1}`}</h3>
                <p>
                  Crop: {farm.crop || "Not specified"}
                </p>
                <p>
                  Area: {farm.area ?? farm.acres ?? "Not specified"}
                  {farm.area != null || farm.acres != null
                    ? " acres"
                    : ""}
                </p>
                <p>
                  Soil: {farm.soilType || farm.soil || "Not specified"}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <p className="profile-note">
        This profile displays information saved in this browser for
        the current demo account.
      </p>
    </main>
  );
}
