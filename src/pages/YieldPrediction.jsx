
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { connectWokwiMqtt } from "../services/wokwiMqtt";
import "../styles/yieldPrediction.css";

const API_URL = "http://127.0.0.1:8000/predict-yield";
const DEVICE_FARM_ID = "LAND001";

function YieldPrediction() {
  const navigate = useNavigate();

  const [farmer, setFarmer] = useState(null);
  const [farms, setFarms] = useState([]);
  const [farmId, setFarmId] = useState("");
  const [crop, setCrop] = useState("");
  const [area, setArea] = useState("");
  const [season, setSeason] = useState("Kharif");
  const [soil, setSoil] = useState("Loamy");

  const [sensors, setSensors] = useState(null);
  const [mqttStatus, setMqttStatus] = useState("no-device");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Load farmer and registered lands.
  useEffect(() => {
    try {
      const savedFarmer = JSON.parse(
        localStorage.getItem("drisaFarmer") || "null"
      );

      setFarmer(savedFarmer);

      if (!savedFarmer) return;

      const savedFarms = JSON.parse(
        localStorage.getItem(`drisaFarms_${savedFarmer.id}`) || "[]"
      );

      const availableFarms =
        Array.isArray(savedFarms) && savedFarms.length
          ? savedFarms
          : Array.isArray(savedFarmer.lands)
            ? savedFarmer.lands
            : [];

      setFarms(availableFarms);

      const savedSelection = JSON.parse(
        localStorage.getItem("drisaSelectedFarm") || "null"
      );

      const selectedFarm =
        availableFarms.find(
          (farm) =>
            String(farm.id) === String(savedSelection?.id ?? savedSelection)
        ) || availableFarms[0];

      if (selectedFarm) {
        setFarmId(String(selectedFarm.id));
        setCrop(selectedFarm.crop || "");
        setArea(
          selectedFarm.area_acres ??
            selectedFarm.area ??
            ""
        );
        setSoil(selectedFarm.soil_type || selectedFarm.soilType || "Loamy");
      }
    } catch (err) {
      console.error("Unable to load farm details:", err);
      setError("Unable to load your farm details.");
    }
  }, []);

  // Connect to live sensors only when Land 1 is selected.
  useEffect(() => {
    setSensors(null);
    setResult(null);
    setError("");

    if (farmId !== DEVICE_FARM_ID) {
      setMqttStatus("no-device");
      return undefined;
    }

    const disconnect = connectWokwiMqtt(
      DEVICE_FARM_ID,
      (status) => setMqttStatus(status),
      (reading) => {
        // Accept readings only from Land 1.
        if (reading.farmId !== DEVICE_FARM_ID) return;
        setSensors(reading);
      }
    );

    return () => {
      disconnect();
    };
  }, [farmId]);

  // Update the form when the selected land changes.
  function handleFarmChange(event) {
    const selectedId = event.target.value;
    setFarmId(selectedId);
    setSensors(null);
    setResult(null);
    setError("");

    const selectedFarm = farms.find(
      (farm) => String(farm.id) === selectedId
    );

    if (selectedFarm) {
      setCrop(selectedFarm.crop || "");
      setArea(
        selectedFarm.area_acres ??
          selectedFarm.area ??
          ""
      );
      setSoil(
        selectedFarm.soil_type ||
          selectedFarm.soilType ||
          "Loamy"
      );
    }
  }

  async function handlePredict(event) {
    event.preventDefault();
    setError("");
    setResult(null);

    if (!farmId) {
      setError("Please select a land.");
      return;
    }

    if (!crop.trim()) {
      setError("Please enter the crop name.");
      return;
    }

    if (!area || Number(area) <= 0) {
      setError("Please enter a valid land area.");
      return;
    }

    if (!soil.trim()) {
      setError("Please enter the soil type.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        crop: crop.trim(),
        area_acres: Number(area),
        season,
        soil_type: soil.trim(),
      };

      // Add live sensor values only for Land 1.
      if (farmId === DEVICE_FARM_ID && sensors) {
        const liveValues = {
          N: sensors.nitrogen,
          P: sensors.phosphorus,
          K: sensors.potassium,
          soil_moisture_pct: sensors.soilMoisture,
          soil_ph: sensors.soilPH,
          temperature_c: sensors.temperature,
          humidity_pct: sensors.humidity,
        };

        Object.entries(liveValues).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            payload[key] = Number(value);
          }
        });
      }

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to predict crop yield."
        );
      }

      setResult(data);
    } catch (err) {
      setError(
        err.message ||
          "Unable to connect to the prediction server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const liveConnected =
    farmId === DEVICE_FARM_ID &&
    mqttStatus === "connected";

  return (
    <div className="yield-page">
      <header className="yield-header">
        <button
          type="button"
          className="yield-back-button"
          onClick={() => navigate("/dashboard")}
        >
          ← Back
        </button>

        <div className="yield-heading">
          <h1>Crop Yield Prediction</h1>
          <p>Estimate your farm's expected crop production.</p>
        </div>
      </header>

      <main className="yield-container">
        <section className="yield-card">
          <h2>Farm Details</h2>

          <form onSubmit={handlePredict}>
            <div className="yield-form-grid">
              <div className="yield-field">
                <label htmlFor="yield-farm">Select Land</label>
                <select
                  id="yield-farm"
                  value={farmId}
                  onChange={handleFarmChange}
                  required
                >
                  <option value="">Choose your land</option>

                  {farms.map((farm) => (
                    <option
                      key={farm.id}
                      value={String(farm.id)}
                    >
                      {farm.name || `Land ${farm.id}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="yield-field">
                <label htmlFor="yield-crop">Crop Name</label>
                <input
                  id="yield-crop"
                  type="text"
                  value={crop}
                  onChange={(event) => setCrop(event.target.value)}
                  placeholder="e.g. Jowar"
                  required
                />
              </div>

              <div className="yield-field">
                <label htmlFor="yield-area">Land Area (acres)</label>
                <input
                  id="yield-area"
                  type="number"
                  min="0.01"
                  step="any"
                  value={area}
                  onChange={(event) => setArea(event.target.value)}
                  placeholder="Enter area"
                  required
                />
              </div>

              <div className="yield-field">
                <label htmlFor="yield-season">Season</label>
                <select
                  id="yield-season"
                  value={season}
                  onChange={(event) => setSeason(event.target.value)}
                >
                  <option value="Kharif">Kharif</option>
                  <option value="Rabi">Rabi</option>
                  <option value="Zaid">Zaid</option>
                  <option value="Whole Year">Whole Year</option>
                </select>
              </div>

              <div className="yield-field">
                <label htmlFor="yield-soil">Soil Type</label>
                <select
                  id="yield-soil"
                  value={soil}
                  onChange={(event) => setSoil(event.target.value)}
                >
                  <option value="Loamy">Loamy</option>
                  <option value="Clay">Clay</option>
                  <option value="Sandy">Sandy</option>
                  <option value="Black">Black</option>
                  <option value="Red">Red</option>
                  <option value="Alluvial">Alluvial</option>
                  <option value="Laterite">Laterite</option>
                </select>
              </div>
            </div>

            {/* Sensor status */}
            <div className="yield-device-status">
              <div>
                <strong>
                  {farmId === DEVICE_FARM_ID
                    ? "Land 1 Sensors"
                    : "Sensor Connection"}
                </strong>

                <p>
                  {farmId !== DEVICE_FARM_ID
                    ? "Live sensors are not used for this land."
                    : mqttStatus === "connected"
                      ? "Connected to live sensor data."
                      : mqttStatus === "connecting"
                        ? "Connecting to sensors..."
                        : mqttStatus === "error"
                          ? "Sensor connection failed. You can still predict."
                          : "Live sensors are offline. You can still predict."}
                </p>
              </div>

              <span
                className={`yield-status-dot ${
                  liveConnected ? "is-connected" : ""
                }`}
              />
            </div>

            {/* Show readings only for Land 1. */}
            {farmId === DEVICE_FARM_ID && sensors && (
              <div className="yield-sensor-grid">
                <div className="yield-info-item">
                  <span>Temperature</span>
                  <strong>{sensors.temperature ?? "—"} °C</strong>
                </div>

                <div className="yield-info-item">
                  <span>Humidity</span>
                  <strong>{sensors.humidity ?? "—"}%</strong>
                </div>

                <div className="yield-info-item">
                  <span>Soil Moisture</span>
                  <strong>{sensors.soilMoisture ?? "—"}%</strong>
                </div>

                <div className="yield-info-item">
                  <span>Soil pH</span>
                  <strong>{sensors.soilPH ?? "—"}</strong>
                </div>
              </div>
            )}

            {error && (
              <p className="yield-error" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="yield-predict-button"
              disabled={loading}
            >
              {loading ? "Predicting..." : "Predict Crop Yield"}
            </button>
          </form>
        </section>

        {result && (
          <section className="yield-result-card" aria-live="polite">
            <h2>Prediction Result</h2>

            <div className="yield-result-grid">
              <div className="yield-result-item">
                <span>Crop</span>
                <strong>{crop}</strong>
              </div>

              <div className="yield-result-item">
                <span>Expected Yield</span>
                <strong>
                  {Number(
                    result.predicted_yield_t_ha
                  ).toFixed(2)}{" "}
                  tonnes/ha
                </strong>
              </div>

              <div className="yield-result-item">
                <span>Estimated Total Production</span>
                <strong>
                  {Number(
                    result.estimated_total_production_tonnes
                  ).toFixed(2)}{" "}
                  tonnes
                </strong>
              </div>
            </div>

            <p className="yield-result-note">
              This is an AI-based estimate. Actual production may
              vary depending on weather, crop management and field
              conditions.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

export default YieldPrediction;
