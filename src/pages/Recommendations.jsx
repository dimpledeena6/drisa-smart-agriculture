import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/recommendations.css";

// Deterministic demo readings for farms without live sensor data.
function generateFarmReadings(farm) {
  const farmKey = `${farm.id}-${farm.name}-${farm.crop}`;
  let seed = 0;

  for (let i = 0; i < farmKey.length; i++) {
    seed = (seed * 31 + farmKey.charCodeAt(i)) >>> 0;
  }

  function next() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  function between(min, max, decimals = 0) {
    return Number((min + next() * (max - min)).toFixed(decimals));
  }

  return {
    soilMoisture: between(12, 78),
    temperature: between(23, 39, 1),
    humidity: between(35, 88),
    soilPH: between(4.5, 8.2, 1),
    nitrogen: between(12, 85),
    phosphorus: between(5, 35),
    potassium: between(55, 240),
    cropHealth: between(55, 98),
  };
}

// Initial configurable thresholds for the prototype.
// Nutrient indicators use a demonstration scale, not laboratory units.
function getCropThresholds(crop) {
  const normalizedCrop = (crop || "").trim().toLowerCase();

  if (normalizedCrop === "ragi") {
    return {
      moistureMin: 30,
      moistureMax: 60,
      temperatureMin: 15,
      temperatureMax: 35,
      humidityMin: 30,
      humidityMax: 80,
      phMin: 5.5,
      phMax: 7.5,
      nitrogenMin: 30,
      phosphorusMin: 12,
      potassiumMin: 30,
      cropHealthMin: 50,
    };
  }

  return {
    moistureMin: 30,
    moistureMax: 70,
    temperatureMin: 15,
    temperatureMax: 35,
    humidityMin: 30,
    humidityMax: 85,
    phMin: 5.5,
    phMax: 7.5,
    nitrogenMin: 30,
    phosphorusMin: 12,
    potassiumMin: 100,
    cropHealthMin: 70,
  };
}

function Recommendations() {
  const navigate = useNavigate();

  const [farmer, setFarmer] = useState(null);
  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState("");
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    try {
      const savedFarmer = localStorage.getItem("drisaFarmer");

      if (!savedFarmer) {
        navigate("/login");
        return;
      }

      const parsedFarmer = JSON.parse(savedFarmer);

      if (!parsedFarmer?.id) {
        localStorage.removeItem("drisaFarmer");
        navigate("/login");
        return;
      }

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

      const savedFarmId = localStorage.getItem("drisaSelectedFarm");

      const initialFarm =
        farmerFarms.find(
          (farm) => String(farm.id) === String(savedFarmId)
        ) || farmerFarms[0];

      if (initialFarm) {
        setSelectedFarmId(String(initialFarm.id));
        localStorage.setItem(
          "drisaSelectedFarm",
          String(initialFarm.id)
        );
      } else {
        setSelectedFarmId("");
      }
    } catch (error) {
      console.error("Unable to load recommendations:", error);
      localStorage.removeItem("drisaFarmer");
      navigate("/login");
    }
  }, [navigate]);

  const selectedFarm =
    farms.find(
      (farm) => String(farm.id) === String(selectedFarmId)
    ) || null;

  if (!farmer) return null;

  const readings = selectedFarm
    ? generateFarmReadings(selectedFarm)
    : null;

  const thresholds = getCropThresholds(selectedFarm?.crop);
  const recommendations = [];

  if (readings && selectedFarm) {
    // Soil moisture and irrigation.
    if (readings.soilMoisture < thresholds.moistureMin) {
      recommendations.push({
        id: "water-low",
        category: "Water",
        priority: "Important",
        icon: "💧",
        title: "Check irrigation needs",
        description:
          `The demo soil moisture for ${selectedFarm.name} is ${readings.soilMoisture}%. Check root-zone moisture and irrigate if needed.`,
        action: "Review irrigation",
        route: "/weather",
      });
    } else if (readings.soilMoisture > thresholds.moistureMax) {
      recommendations.push({
        id: "water-high",
        category: "Water",
        priority: "Important",
        icon: "🌧️",
        title: "Check soil drainage",
        description:
          `The demo soil moisture is ${readings.soilMoisture}%, above the configured ${thresholds.moistureMax}% threshold. Check drainage and actual soil conditions.`,
        action: "Review conditions",
        route: "/weather",
      });
    } else {
      recommendations.push({
        id: "water-routine",
        category: "Water",
        priority: "Routine",
        icon: "💧",
        title: "Maintain irrigation checks",
        description:
          `The demo moisture reading is ${readings.soilMoisture}%. Check root-zone moisture and rainfall before watering.`,
        action: "View weather",
        route: "/weather",
      });
    }

    // Nitrogen indicator.
    if (readings.nitrogen < thresholds.nitrogenMin) {
      recommendations.push({
        id: "nitrogen",
        category: "Nutrients",
        priority: "Important",
        icon: "🌿",
        title: "Review nitrogen status",
        description:
          `The demo nitrogen indicator is ${readings.nitrogen}/100. Confirm nutrient status with a soil test before deciding whether fertilizer is needed.`,
        action: "Review soil health",
      });
    }

    // Phosphorus indicator.
    if (readings.phosphorus < thresholds.phosphorusMin) {
      recommendations.push({
        id: "phosphorus",
        category: "Nutrients",
        priority: "Important",
        icon: "🌱",
        title: "Review phosphorus status",
        description:
          `The demo phosphorus indicator is ${readings.phosphorus}/100. Check soil-test results and crop requirements before fertilizer application.`,
        action: "Plan a soil test",
      });
    }

    // Potassium indicator.
    if (readings.potassium < thresholds.potassiumMin) {
      recommendations.push({
        id: "potassium",
        category: "Nutrients",
        priority: "Important",
        icon: "🪴",
        title: "Review potassium status",
        description:
          `The demo potassium indicator is ${readings.potassium}/100. Confirm actual nutrient status before deciding on fertilizer.`,
        action: "Plan a soil test",
      });
    }

    // Soil pH.
    if (
      readings.soilPH < thresholds.phMin ||
      readings.soilPH > thresholds.phMax
    ) {
      recommendations.push({
        id: "soil-ph",
        category: "Soil",
        priority: "Important",
        icon: "🧪",
        title: "Check soil pH",
        description:
          `The demo soil pH is ${readings.soilPH}. Confirm the value with a soil test before choosing a soil amendment.`,
        action: "Review soil health",
      });
    }

    // Temperature.
    if (readings.temperature < thresholds.temperatureMin) {
      recommendations.push({
        id: "cold",
        category: "Weather",
        priority: "Important",
        icon: "🌡️",
        title: "Review low-temperature conditions",
        description:
          `The demo temperature is ${readings.temperature}°C. Check the local forecast and inspect the crop for cold stress.`,
        action: "View weather",
        route: "/weather",
      });
    } else if (readings.temperature > thresholds.temperatureMax) {
      recommendations.push({
        id: "heat",
        category: "Weather",
        priority: "Important",
        icon: "🌡️",
        title: "Inspect for heat stress",
        description:
          `The demo temperature is ${readings.temperature}°C. Check the local forecast and inspect plants for wilting or heat stress.`,
        action: "View weather",
        route: "/weather",
      });
    }

    // Humidity.
    if (readings.humidity < thresholds.humidityMin) {
      recommendations.push({
        id: "humidity-low",
        category: "Weather",
        priority: "Important",
        icon: "💨",
        title: "Review low humidity conditions",
        description:
          `The demo air humidity is ${readings.humidity}%. Check local weather and inspect plants for signs of moisture stress.`,
        action: "View weather",
        route: "/weather",
      });
    } else if (readings.humidity > thresholds.humidityMax) {
      recommendations.push({
        id: "humidity-high",
        category: "Weather",
        priority: "Important",
        icon: "💧",
        title: "Monitor humid conditions",
        description:
          `The demo air humidity is ${readings.humidity}%. Inspect plants for disease symptoms and check the local weather.`,
        action: "View weather",
        route: "/weather",
      });
    }

    // Crop health estimate.
    if (readings.cropHealth < thresholds.cropHealthMin) {
      recommendations.push({
        id: "crop-health",
        category: "Crop Care",
        priority: "Important",
        icon: "🔎",
        title: "Inspect crop health",
        description:
          `The demo crop-health score is ${readings.cropHealth}%. Inspect ${selectedFarm.crop || "your crop"} for symptoms and confirm the cause before treatment.`,
        action: "Open disease detection",
        route: "/disease-detection",
      });
    }

    // Routine recommendations.
    recommendations.push(
      {
        id: "crop-scouting",
        category: "Crop Care",
        priority: "Routine",
        icon: "🌱",
        title: "Inspect crop growth",
        description:
          `Inspect ${selectedFarm.crop || "your crop"} regularly for uneven growth, damaged leaves, pests or disease symptoms.`,
        action: "Inspect crop",
        route: "/disease-detection",
      },
      {
        id: "yield",
        category: "Planning",
        priority: "Routine",
        icon: "📊",
        title: "Review yield expectations",
        description:
          "Consider crop stage, farm records, weather and field observations when reviewing yield estimates.",
        action: "View yield prediction",
        route: "/yield-prediction",
      },
      {
        id: "pesticide-safety",
        category: "Crop Care",
        priority: "Routine",
        icon: "🛡️",
        title: "Use pesticides responsibly",
        description:
          "Identify the pest or disease before treatment and follow locally approved product labels and safety instructions.",
        action: "Check crop symptoms",
        route: "/disease-detection",
      }
    );
  }

  const filters = [
    "All",
    "Water",
    "Nutrients",
    "Soil",
    "Weather",
    "Crop Care",
    "Planning",
  ];

  const visibleRecommendations =
    filter === "All"
      ? recommendations
      : recommendations.filter(
          (item) => item.category === filter
        );

  const alertCount = recommendations.filter(
    (item) => item.priority === "Important"
  ).length;

  function handleFarmChange(event) {
    const farmId = event.target.value;

    setSelectedFarmId(farmId);
    setFilter("All");

    if (farmId) {
      localStorage.setItem("drisaSelectedFarm", farmId);
    } else {
      localStorage.removeItem("drisaSelectedFarm");
    }
  }

  function handleAction(item) {
    if (item.route) {
      navigate(item.route);
      return;
    }

    alert(
      `${item.title}\n\nThis is prototype guidance based on simulated values. Verify actual farm conditions before taking action.`
    );
  }

  return (
    <div className="recommendations-page">
      <header className="recommendations-header">
        <button
          className="recommendations-back"
          onClick={() => navigate("/dashboard")}
        >
          ← Back to dashboard
        </button>

        <div className="recommendations-brand">
          <div className="recommendations-brand-icon">🌿</div>
          <span>DRISA</span>
        </div>
      </header>

      <main className="recommendations-main">
        <section className="recommendations-hero">
          <div>
            <p className="recommendations-eyebrow">
              YOUR FARM CARE GUIDE
            </p>
            <h1>Smart Recommendations</h1>
            <p className="recommendations-intro">
              Farm-specific guidance for water, nutrients, soil and crop care.
            </p>
          </div>

          <div
            className="recommendations-hero-art"
            aria-hidden="true"
          >
            🌾
          </div>
        </section>

        <section className="recommendations-farm-panel">
          <div>
            <label htmlFor="recommendation-farm">
              Recommendations for
            </label>

            <select
              id="recommendation-farm"
              value={selectedFarmId}
              onChange={handleFarmChange}
              disabled={farms.length === 0}
            >
              {farms.length === 0 && (
                <option value="">No farms available</option>
              )}

              {farms.map((farm) => (
                <option key={farm.id} value={String(farm.id)}>
                  {farm.name}
                </option>
              ))}
            </select>

            {farms.length === 0 && (
              <small>Add a farm to see its recommendations.</small>
            )}
          </div>

          {selectedFarm && (
            <div className="recommendations-farm-details">
              <span>📍 {selectedFarm.location || "Location not set"}</span>
              <span>🌱 {selectedFarm.crop || "Crop not set"}</span>
              <span>📐 {selectedFarm.area ?? "—"} acres</span>
              <span>🪴 {selectedFarm.soilType || "Soil not set"}</span>
            </div>
          )}
        </section>

        {selectedFarm && readings && (
          <>
            <section className="recommendations-section-heading">
              <div>
                <p className="recommendations-eyebrow">FARM STATUS</p>
                <h2>Actions for this farm</h2>
                <p>
                  Configured thresholds for {selectedFarm.crop || "this crop"}.
                </p>
              </div>

              <span className="recommendations-count">
                {alertCount} alerts
              </span>
            </section>

            <aside className="recommendations-note">
              <span>ⓘ</span>
              <p>
                <strong>Prototype mode:</strong> These recommendations use
                simulated values generated for each farm. They are not live
                sensor readings, laboratory results or confirmed diagnoses.
                Nutrient indicators use a demonstration scale. Verify actual
                conditions before irrigation, fertilizer or pesticide decisions.
              </p>
            </aside>

            <div className="recommendations-filters">
              {filters.map((category) => (
                <button
                  key={category}
                  className={filter === category ? "active" : ""}
                  onClick={() => setFilter(category)}
                >
                  {category}
                </button>
              ))}
            </div>

            {visibleRecommendations.length > 0 ? (
              <section className="recommendations-grid">
                {visibleRecommendations.map((item) => (
                  <article
                    className="recommendation-card"
                    key={item.id}
                  >
                    <div className="recommendation-card-top">
                      <div className="recommendation-icon">
                        {item.icon}
                      </div>

                      <span
                        className={`recommendation-priority ${item.priority
                          .toLowerCase()
                          .replace(" ", "-")}`}
                      >
                        {item.priority}
                      </span>
                    </div>

                    <p className="recommendation-category">
                      {item.category}
                    </p>

                    <h3>{item.title}</h3>

                    <p className="recommendation-description">
                      {item.description}
                    </p>

                    <button
                      className="recommendation-action"
                      onClick={() => handleAction(item)}
                    >
                      {item.action} <span>→</span>
                    </button>
                  </article>
                ))}
              </section>
            ) : (
              <p>No suggestions match this category.</p>
            )}
          </>
        )}

        {!selectedFarm && (
          <section className="recommendations-note">
            <p>Add a farm to view its recommendations.</p>
          </section>
        )}
      </main>

      <nav className="recommendations-bottom-nav">
        <button onClick={() => navigate("/dashboard")}>
          ⌂ Home
        </button>
        <button onClick={() => navigate("/farms")}>
          ▦ My Farms
        </button>
        <button onClick={() => navigate("/monitoring")}>
          ⌁ Monitoring
        </button>
        <button
          className="recommendations-nav-active"
          onClick={() => navigate("/recommendations")}
        >
          ✦ Advice
        </button>
      </nav>
    </div>
  );
}

export default Recommendations;