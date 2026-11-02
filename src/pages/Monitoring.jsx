
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { connectWokwiMqtt } from "../services/wokwiMqtt";
import "../styles/monitoring.css";

// Illustrative values for farms without an assigned device.
// These are NOT real sensor measurements.
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

  const between = (min, max, decimals = 0) => {
    const value = min + next() * (max - min);
    return Number(value.toFixed(decimals));
  };

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

function Monitoring() {
  const navigate = useNavigate();

  const [farmer, setFarmer] = useState(null);
  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState("");
  const [liveReading, setLiveReading] = useState(null);
  const [mqttStatus, setMqttStatus] = useState("disconnected");

  // Load the logged-in farmer and their farms.
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

      const storedFarms = localStorage.getItem(
        `drisaFarms_${parsedFarmer.id}`
      );

      let farmerFarms = parsedFarmer.lands || [];

      if (storedFarms !== null) {
        const parsedFarms = JSON.parse(storedFarms);
        farmerFarms = Array.isArray(parsedFarms) ? parsedFarms : [];
      }

      const savedFarmId = localStorage.getItem("drisaSelectedFarm");

      const initialFarm =
        farmerFarms.find(
          (farm) => String(farm.id) === String(savedFarmId)
        ) || farmerFarms[0];

      setFarmer(parsedFarmer);
      setFarms(farmerFarms);

      if (initialFarm) {
        const initialId = String(initialFarm.id);
        setSelectedFarmId(initialId);
        localStorage.setItem("drisaSelectedFarm", initialId);
      } else {
        setSelectedFarmId("");
      }
    } catch (error) {
      console.error("Could not load farmer data:", error);
      localStorage.removeItem("drisaFarmer");
      navigate("/login");
    }
  }, [navigate]);

  // Subscribe only when the selected farm has an assigned device.
  // Currently, only LAND001 is assigned to the Wokwi simulation.
  useEffect(() => {
    setLiveReading(null);

    if (selectedFarmId !== "LAND001") {
      setMqttStatus("no-device");
      return undefined;
    }

    const disconnect = connectWokwiMqtt(
      selectedFarmId,
      setMqttStatus,
      setLiveReading
    );

    return disconnect;
  }, [selectedFarmId]);

  if (!farmer) return null;

  const selectedFarm =
    farms.find(
      (farm) => String(farm.id) === String(selectedFarmId)
    ) || null;

  const hasLiveDevice =
    selectedFarmId === "LAND001" && selectedFarm !== null;

  // Live readings are used only for the assigned farm.
  // Other farms use clearly labelled illustrative readings.
  const readings = !selectedFarm
    ? null
    : hasLiveDevice
    ? liveReading
      ? {
          soilMoisture: Number(liveReading.soilMoisture),
          temperature: Number(liveReading.temperature),
          humidity: Number(liveReading.humidity),
          soilPH: Number(liveReading.soilPH),
          nitrogen: Number(liveReading.nitrogen),
          phosphorus: Number(liveReading.phosphorus),
          potassium: Number(liveReading.potassium),
          cropHealth: null,
        }
      : null
    : generateFarmReadings(selectedFarm);

  const alerts = [];

  if (readings) {
    if (readings.soilMoisture < 30) {
      alerts.push({
        id: "moisture",
        level: "warning",
        icon: "💧",
        title: "Low soil moisture",
        message:
          "Soil moisture is below the demo threshold. Check crop needs and soil conditions before irrigating.",
        action: "Review irrigation",
      });
    }

    if (readings.soilMoisture > 70) {
      alerts.push({
        id: "wet-soil",
        level: "warning",
        icon: "🌧️",
        title: "High soil moisture",
        message:
          "Check for waterlogging and drainage problems before adding more water.",
        action: "Inspect drainage",
      });
    }

    if (readings.temperature > 35) {
      alerts.push({
        id: "temperature",
        level: "warning",
        icon: "🌡️",
        title: "High temperature",
        message:
          "Check local weather conditions and inspect crops for heat stress.",
        action: "Inspect crop",
      });
    }

    if (readings.soilPH < 5.5 || readings.soilPH > 7.5) {
      alerts.push({
        id: "ph",
        level: "check",
        icon: "🧪",
        title: "Review soil pH",
        message:
          "Confirm soil pH with a reliable soil test before deciding on soil amendments.",
        action: "Plan soil testing",
      });
    }

    // NPK values from Wokwi are simulated 0–100 indicators,
    // not calibrated laboratory measurements in mg/kg.
    if (readings.nitrogen < 30) {
      alerts.push({
        id: "nitrogen",
        level: "check",
        icon: "🌿",
        title: "Check nitrogen indicator",
        message:
          "The simulated nitrogen indicator is low. Confirm nutrient needs using an appropriate soil test.",
        action: "Review nitrogen needs",
      });
    }

    if (readings.phosphorus < 12) {
      alerts.push({
        id: "phosphorus",
        level: "check",
        icon: "🌱",
        title: "Check phosphorus indicator",
        message:
          "Review soil-test results and crop requirements before deciding on nutrient management.",
        action: "Review phosphorus needs",
      });
    }

    if (readings.potassium < 30) {
      alerts.push({
        id: "potassium",
        level: "check",
        icon: "🪴",
        title: "Check potassium indicator",
        message:
          "The simulated potassium indicator is low. Confirm actual nutrient status before taking action.",
        action: "Review potassium needs",
      });
    }

    if (
      readings.cropHealth !== null &&
      readings.cropHealth < 70
    ) {
      alerts.push({
        id: "crop-health",
        level: "warning",
        icon: "🔎",
        title: "Inspect crop health",
        message:
          "Inspect plants for visible stress, pests or disease symptoms. Confirm the cause before treatment.",
        action: "Inspect crop",
      });
    }
  }

  const indicators = readings
    ? [
        {
          label: "Soil Moisture",
          value: readings.soilMoisture,
          unit: "%",
          icon: "💧",
          description: hasLiveDevice
            ? "Live simulated sensor input"
            : "Illustrative demo value",
          color: "moisture",
          status:
            readings.soilMoisture < 30
              ? "Low"
              : readings.soilMoisture > 70
              ? "High"
              : "Moderate",
        },
        {
          label: "Temperature",
          value: readings.temperature,
          unit: "°C",
          icon: "🌡️",
          description: hasLiveDevice
            ? "Live simulated DHT22 input"
            : "Illustrative demo value",
          color: "temperature",
          status: readings.temperature > 35 ? "High" : "Recorded",
        },
        {
          label: "Humidity",
          value: readings.humidity,
          unit: "%",
          icon: "☁️",
          description: hasLiveDevice
            ? "Live simulated DHT22 input"
            : "Illustrative demo value",
          color: "humidity",
          status: "Recorded",
        },
        {
          label: "Soil pH",
          value: readings.soilPH,
          unit: "pH",
          icon: "🧪",
          description: hasLiveDevice
            ? "Simulated pH input"
            : "Illustrative demo value",
          color: "ph",
          status:
            readings.soilPH < 5.5 || readings.soilPH > 7.5
              ? "Needs review"
              : "Recorded",
        },
        {
          label: "Nitrogen (N)",
          value: readings.nitrogen,
          unit: hasLiveDevice ? "/100" : "demo",
          icon: "🌿",
          description: "Simulated nutrient indicator; not lab-tested",
          color: "nitrogen",
          status: readings.nitrogen < 30 ? "Check indicator" : "Recorded",
        },
        {
          label: "Phosphorus (P)",
          value: readings.phosphorus,
          unit: hasLiveDevice ? "/100" : "demo",
          icon: "🌱",
          description: "Simulated nutrient indicator; not lab-tested",
          color: "phosphorus",
          status:
            readings.phosphorus < 12 ? "Check indicator" : "Recorded",
        },
        {
          label: "Potassium (K)",
          value: readings.potassium,
          unit: hasLiveDevice ? "/100" : "demo",
          icon: "🪴",
          description: "Simulated nutrient indicator; not lab-tested",
          color: "potassium",
          status:
            readings.potassium < 30 ? "Check indicator" : "Recorded",
        },
        ...(readings.cropHealth == null
          ? []
          : [
              {
                label: "Crop Health",
                value: readings.cropHealth,
                unit: "%",
                icon: "🌾",
                description: "Illustrative health score",
                color: "health",
                status:
                  readings.cropHealth < 70
                    ? "Inspect crop"
                    : "Demo estimate",
              },
            ]),
      ]
    : [];

  function handleFarmChange(event) {
    const farmId = event.target.value;

    setSelectedFarmId(farmId);
    setLiveReading(null);

    if (farmId) {
      localStorage.setItem("drisaSelectedFarm", farmId);
    } else {
      localStorage.removeItem("drisaSelectedFarm");
    }
  }

  function handleAlertAction(alert) {
    if (alert.id === "moisture" || alert.id === "wet-soil") {
      navigate("/weather");
      return;
    }

    if (alert.id === "crop-health" || alert.id === "temperature") {
      navigate("/disease-detection");
      return;
    }

    navigate("/recommendations");
  }

  return (
    <main className="monitoring-page">
      <header className="monitoring-header">
        <button
          className="monitoring-back"
          onClick={() => navigate("/dashboard")}
          aria-label="Back to dashboard"
        >
          ←
        </button>

        <div className="monitoring-brand">
          <img src="/src/assets/drisa-logo.png" alt="DRISA" />
          <div>
            <h1>Farm Monitoring</h1>
            <p>Understand your farm conditions</p>
          </div>
        </div>
      </header>

      <section className="monitoring-intro">
        <p className="monitoring-eyebrow">SMART FARM INSIGHTS</p>
        <h2>Know your land better</h2>
        <p>
          Review farm indicators, nutrient status and suggested actions.
        </p>
      </section>

      <section className="monitoring-farm-select">
        <label htmlFor="monitor-farm">Choose a farm</label>

        {farms.length > 0 ? (
          <>
            <select
              id="monitor-farm"
              value={selectedFarmId}
              onChange={handleFarmChange}
            >
              {farms.map((farm) => (
                <option key={farm.id} value={String(farm.id)}>
                  {farm.name} — {farm.location}
                </option>
              ))}
            </select>

            {selectedFarm && (
              <p>
                📍 {selectedFarm.location} · {selectedFarm.crop}
              </p>
            )}
          </>
        ) : (
          <div className="monitoring-empty-farms">
            <p>No farms registered yet.</p>
            <button onClick={() => navigate("/add-farm")}>
              + Add your first farm
            </button>
          </div>
        )}
      </section>

      {selectedFarm && (
        <section className="monitoring-notice">
          <span>
            {hasLiveDevice && liveReading ? "🟢" : "ℹ️"}
          </span>
          <div>
            <strong>
              {hasLiveDevice
                ? liveReading
                  ? "Live Wokwi sensor data"
                  : mqttStatus === "error"
                  ? "MQTT connection error"
                  : mqttStatus === "connecting"
                  ? "Connecting to Wokwi..."
                  : "Waiting for live sensor data"
                : "Illustrative demonstration data"}
            </strong>
            <p>
              {hasLiveDevice
                ? liveReading
                  ? `Simulated sensor readings for ${selectedFarm.name}. Last received: ${new Date(
                      liveReading.receivedAt
                    ).toLocaleTimeString()}.`
                  : "Keep Wokwi running and check that it publishes to the LAND001 MQTT topic."
                : "No device is assigned to this farm. These values are illustrative, not live sensor measurements."}
            </p>
          </div>
        </section>
      )}

      {selectedFarm && hasLiveDevice && !readings && (
        <section className="monitoring-notice">
          <span>⏳</span>
          <div>
            <strong>Waiting for the next sensor message</strong>
            <p>
              Wokwi publishes every 20 seconds. Keep the simulation running
              and confirm that the MQTT topic and farmId both use LAND001.
            </p>
          </div>
        </section>
      )}

      {selectedFarm && readings && (
        <>
          <section className="monitoring-section">
            <div className="monitoring-section-heading">
              <div>
                <p>FARM CONDITIONS</p>
                <h2>Monitoring Overview</h2>
              </div>
              <span className="monitoring-count">
                {indicators.length} indicators
              </span>
            </div>

            <div className="monitoring-grid">
              {indicators.map((item) => (
                <article
                  className={`monitoring-card ${item.color}`}
                  key={item.label}
                >
                  <div className="monitoring-card-top">
                    <span className="monitoring-icon">{item.icon}</span>
                    <span className="demo-dot" />
                  </div>

                  <p className="monitoring-label">{item.label}</p>

                  <div className="monitoring-value">
                    <strong>{item.value}</strong>
                    <span>{item.unit}</span>
                  </div>

                  <p className="monitoring-description">
                    {item.description}
                  </p>

                  <span className="monitoring-status">{item.status}</span>
                </article>
              ))}
            </div>

            <p className="monitoring-description">
              Wokwi readings are simulated inputs. NPK values use a 0–100
              demonstration scale, not calibrated laboratory units.
            </p>
          </section>

          <section className="monitoring-section">
            <div className="monitoring-section-heading">
              <div>
                <p>ALERT CENTRE</p>
                <h2>Farm Alerts</h2>
              </div>

              <span className="monitoring-count">
                {alerts.length} alerts
              </span>
            </div>

            {alerts.length > 0 ? (
              <div className="monitoring-grid">
                {alerts.map((alert) => (
                  <article
                    className={`monitoring-card ${
                      alert.level === "warning" ? "temperature" : "ph"
                    }`}
                    key={alert.id}
                  >
                    <div className="monitoring-card-top">
                      <span className="monitoring-icon">{alert.icon}</span>
                      <span className="monitoring-status">
                        {alert.level === "warning" ? "Warning" : "Check"}
                      </span>
                    </div>

                    <h3>{alert.title}</h3>

                    <p className="monitoring-description">
                      {alert.message}
                    </p>

                    <button
                      type="button"
                      className="monitoring-alert-action"
                      onClick={() => handleAlertAction(alert)}
                    >
                      {alert.action} →
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="monitoring-notice">
                <span>✅</span>
                <div>
                  <strong>No demo alerts triggered</strong>
                  <p>
                    No current values crossed the configured thresholds.
                    This is not a guarantee of actual farm health.
                  </p>
                </div>
              </div>
            )}
          </section>

          <section className="monitoring-advice">
            <div className="advice-heading">
              <span>🌱</span>
              <div>
                <p>FARM CARE</p>
                <h2>What to check next</h2>
              </div>
            </div>

            <div className="advice-item">
              <span>01</span>
              <div>
                <h3>Manage irrigation carefully</h3>
                <p>
                  Check root-zone moisture and local rainfall before deciding
                  how much to irrigate.
                </p>
              </div>
            </div>

            <div className="advice-item">
              <span>02</span>
              <div>
                <h3>Review NPK nutrient needs</h3>
                <p>
                  Use actual soil-test results, crop type and growth stage
                  before making nutrient-management decisions.
                </p>
              </div>
            </div>

            <div className="advice-item">
              <span>03</span>
              <div>
                <h3>Inspect pests and diseases</h3>
                <p>
                  Check {selectedFarm.crop} plants for visible symptoms.
                  Confirm the cause before applying treatments.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="monitoring-alert-action"
              onClick={() => navigate("/recommendations")}
            >
              View Smart Recommendations →
            </button>
          </section>
        </>
      )}

      <nav className="monitoring-bottom-nav">
        <button onClick={() => navigate("/dashboard")}>
          <span>⌂</span>
          <small>Home</small>
        </button>

        <button onClick={() => navigate("/farms")}>
          <span>🌾</span>
          <small>My Farms</small>
        </button>

        <button className="active">
          <span>📊</span>
          <small>Monitor</small>
        </button>

        <button onClick={() => navigate("/weather")}>
          <span>☀️</span>
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

export default Monitoring;
