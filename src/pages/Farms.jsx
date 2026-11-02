
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/farms.css";

function Farms() {
  const navigate = useNavigate();
  const [farmer, setFarmer] = useState(null);
  const [lands, setLands] = useState([]);

  useEffect(() => {
    const savedFarmer = localStorage.getItem("drisaFarmer");

    if (!savedFarmer) {
      navigate("/login");
      return;
    }

    try {
      const parsedFarmer = JSON.parse(savedFarmer);

      const savedFarms = localStorage.getItem(
        `drisaFarms_${parsedFarmer.id}`
      );

      const currentLands = savedFarms
        ? JSON.parse(savedFarms)
        : parsedFarmer.lands || [];

      setFarmer(parsedFarmer);
      setLands(currentLands);
    } catch {
      navigate("/login");
    }
  }, [navigate]);

  if (!farmer) {
    return null;
  }

  const totalArea = lands.reduce(
    (total, land) => total + Number(land.area || 0),
    0
  );

  return (
    <main className="farms-page">
      <header className="farms-header">
        <button
          className="back-button"
          onClick={() => navigate("/dashboard")}
          aria-label="Go back"
        >
          ←
        </button>

        <button
          className="add-farm-page-button"
          onClick={() => navigate("/add-farm")}
        >
          + Add Farm
        </button>

        <div className="farms-header-title">
          <img src="/src/assets/drisa-logo.png" alt="DRISA" />
          <div>
            <h1>My Farms</h1>
            <p>Manage your agricultural lands</p>
          </div>
        </div>

        <div className="header-placeholder"></div>
      </header>

      <section className="farmer-summary">
        <div className="farmer-avatar">👨‍🌾</div>

        <div className="farmer-info">
          <p className="summary-label">FARMER</p>
          <h2>{farmer.name}</h2>
          <p>User ID: {farmer.id}</p>
        </div>
      </section>

      <section className="farm-statistics">
        <div className="stat-card">
          <div className="stat-icon">🌾</div>
          <div>
            <strong>{lands.length}</strong>
            <span>Total Farms</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📐</div>
          <div>
            <strong>{totalArea.toFixed(1)}</strong>
            <span>Total Acres</span>
          </div>
        </div>
      </section>

      <section className="farms-section">
        <div className="section-heading">
          <div>
            <h2>Your Agricultural Lands</h2>
            <p>Monitor and manage each farm individually</p>
          </div>

          <span className="farm-count">
            {lands.length} {lands.length === 1 ? "Farm" : "Farms"}
          </span>
        </div>

        <div className="farms-list">
          {lands.length === 0 ? (
            <p className="no-farms-message">
              No farms added yet. Select + Add Farm to register your first farm.
            </p>
          ) : (
            lands.map((land, index) => (
              <article className="farm-card" key={land.id}>
                <div className="farm-card-top">
                  <div className="farm-number">
                    {String(index + 1).padStart(2, "0")}
                  </div>

                  <div className="farm-title">
                    <h3>{land.name}</h3>
                    <p>📍 {land.location}</p>
                  </div>

                  <span className="healthy-badge">● Healthy</span>
                </div>

                <div className="farm-details">
                  <div className="farm-detail">
                    <span className="detail-icon">🌱</span>
                    <div>
                      <small>Crop</small>
                      <strong>{land.crop}</strong>
                    </div>
                  </div>

                  <div className="farm-detail">
                    <span className="detail-icon">📐</span>
                    <div>
                      <small>Area</small>
                      <strong>{land.area} Acres</strong>
                    </div>
                  </div>

                  <div className="farm-detail">
                    <span className="detail-icon">🪨</span>
                    <div>
                      <small>Soil Type</small>
                      <strong>{land.soilType}</strong>
                    </div>
                  </div>
                </div>

                <div className="farm-card-footer">
                  <span className="farm-id">{land.id}</span>

                  <button
                    className="view-farm-button"
                    onClick={() =>
                      alert(
                        `${land.name}\n\nCrop: ${land.crop}\nArea: ${land.area} Acres\nSoil: ${land.soilType}\nLocation: ${land.location}`
                      )
                    }
                  >
                    View Farm
                    <span>→</span>
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <nav className="farms-bottom-nav">
        <button onClick={() => navigate("/dashboard")}>
          <span>⌂</span>
          <small>Home</small>
        </button>

        <button className="active">
          <span>🌾</span>
          <small>My Farms</small>
        </button>

        <button onClick={() => navigate("/monitoring")}>
          <span>📊</span>
          <small>Monitor</small>
        </button>

        <button onClick={() => navigate("/weather")}>
          <span>☁️</span>
          <small>Weather</small>
        </button>

        <button onClick={() => navigate("/profile")}>
          <span>👤</span>
          <small>Profile</small>
        </button>
      </nav>
    </main>
  );
}

export default Farms;
