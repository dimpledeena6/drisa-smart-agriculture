
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/cropRecommendation.css";
import { connectWokwiMqtt } from "../services/wokwiMqtt";

const initialForm = {
  N: 50,
  P: 40,
  K: 40,
  Soil_Moisture_pct: 45,
  Soil_pH: 6.5,
  Temperature_C: 27,
  Humidity_pct: 65,
  State: "Karnataka",
  Season: "Kharif",
  Soil_Type: "Red Loamy",
  Irrigation_Type: "Drip",
  Water_Availability: "Medium",
};

function CropRecommendation() {
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Live sensor states
  const [liveReading, setLiveReading] = useState(null);
  const [mqttStatus, setMqttStatus] = useState("connecting");
  const [sensorMessage, setSensorMessage] = useState("");


  useEffect(() => {
  const savedReading = localStorage.getItem(
    "drisaLatestSensorReading"
  );

  if (savedReading) {
    try {
      setLiveReading(JSON.parse(savedReading));
      setMqttStatus("connected");
    } catch {
      localStorage.removeItem("drisaLatestSensorReading");
    }
  }
  }, []);


  // Connect to the Wokwi sensor feed for LAND001.
  useEffect(() => {
    const disconnect = connectWokwiMqtt(
      "LAND001",
      setMqttStatus,
      (reading) => {
        setLiveReading(reading);
      }
    );

    return () => disconnect();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setResult(null);
    setError("");
  }

  // Copy the latest sensor values into the form.
  function useLiveReadings() {
    if (!liveReading) {
      setSensorMessage("Waiting for sensor readings.");
      return;
    }

    const sensorValues = {
      N: liveReading.nitrogen,
      P: liveReading.phosphorus,
      K: liveReading.potassium,
      Soil_Moisture_pct: liveReading.soilMoisture,
      Soil_pH: liveReading.soilPH,
      Temperature_C: liveReading.temperature,
      Humidity_pct: liveReading.humidity,
    };

    const invalidValues = Object.entries(sensorValues).filter(
      ([, value]) =>
        value === undefined ||
        value === null ||
        value === "" ||
        !Number.isFinite(Number(value))
    );

    if (invalidValues.length > 0) {
      setSensorMessage(
        "Some sensor values are missing: " +
          invalidValues.map(([key]) => key).join(", ")
      );
      return;
    }

    setForm((previous) => ({
      ...previous,
      ...Object.fromEntries(
        Object.entries(sensorValues).map(([key, value]) => [
          key,
          Number(value),
        ])
      ),
    }));

    setResult(null);
    setError("");
    setSensorMessage("Latest sensor readings loaded into the form.");
  }

  
async function handleSubmit(event) {
  event.preventDefault();

  // Validate all numeric inputs before calling the SVM API.
  const rules = [
    ["N", "Nitrogen", 0, 200],
    ["P", "Phosphorus", 0, 200],
    ["K", "Potassium", 0, 200],
    ["Soil_Moisture_pct", "Soil moisture", 0, 100],
    ["Soil_pH", "Soil pH", 0, 14],
    ["Temperature_C", "Temperature", -10, 60],
    ["Humidity_pct", "Humidity", 0, 100],
  ];

  for (const [key, label, min, max] of rules) {
    const rawValue = form[key];

    if (
      rawValue === "" ||
      rawValue === null ||
      rawValue === undefined ||
      !Number.isFinite(Number(rawValue))
    ) {
      setError(`${label} must contain a valid number.`);
      return;
    }

    const value = Number(rawValue);

    if (value < min || value > max) {
      setError(
        `${label} must be between ${min} and ${max}.`
      );
      return;
    }
  }

  setLoading(true);
  setError("");
  setResult(null);

  // Keep your existing try/catch/finally code below this line.


    try {
      const payload = {
        ...form,
        N: Number(form.N),
        P: Number(form.P),
        K: Number(form.K),
        Soil_Moisture_pct: Number(form.Soil_Moisture_pct),
        Soil_pH: Number(form.Soil_pH),
        Temperature_C: Number(form.Temperature_C),
        Humidity_pct: Number(form.Humidity_pct),
      };

      const response = await fetch("http://127.0.0.1:8000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail
            ? JSON.stringify(data.detail)
            : "The prediction request failed."
        );
      }

      setResult(data);
    } catch (err) {
      setError(
        err.message ||
          "Cannot connect to the prediction API. Check that the backend is running."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="crop-rec-page">
      <header className="crop-rec-header">
        <button
          type="button"
          className="crop-rec-back"
          onClick={() => navigate("/dashboard")}
        >
          ← Back
        </button>

        <div>
          <p className="crop-rec-eyebrow">DRISA · AI AGRICULTURE</p>
          <h1>Crop Recommendation</h1>
          <p>
            Find a crop suited to the growing conditions you enter.
          </p>
        </div>
      </header>

      <section className="crop-rec-notice">
        <strong>Machine learning model: SVM</strong>
        <p>
          Live sensor readings can fill in the environmental fields.
          Select the remaining farming conditions manually. Results depend
          on the training dataset and are not a guarantee of crop performance.
        </p>
      </section>

      {/* Live sensor panel */}
      <section className="sensor-panel">
        <h2>Live Sensor Readings</h2>

        <p>
          MQTT status: <strong>{mqttStatus}</strong>
        </p>

        {liveReading ? (
          <div className="sensor-readings">
            <p>Temperature: {liveReading.temperature} °C</p>
            <p>Humidity: {liveReading.humidity}%</p>
            <p>Soil moisture: {liveReading.soilMoisture}%</p>
            <p>Soil pH: {liveReading.soilPH}</p>
            <p>Nitrogen: {liveReading.nitrogen}</p>
            <p>Phosphorus: {liveReading.phosphorus}</p>
            <p>Potassium: {liveReading.potassium}</p>
          </div>
        ) : (
          <p>Waiting for readings from the Wokwi ESP32...</p>
        )}

        <button
          type="button"
          onClick={useLiveReadings}
          disabled={!liveReading}
        >
          Use Latest Live Readings
        </button>

        {sensorMessage && <p>{sensorMessage}</p>}
      </section>

      <form className="crop-rec-form" onSubmit={handleSubmit}>
        <h2>Soil and Environmental Conditions</h2>

        <div className="crop-rec-grid">
          {[
            ["N", "Nitrogen (N)", 0, 200, 1],
            ["P", "Phosphorus (P)", 0, 200, 1],
            ["K", "Potassium (K)", 0, 200, 1],
            ["Soil_Moisture_pct", "Soil Moisture (%)", 0, 100, 0.1],
            ["Soil_pH", "Soil pH", 0, 14, 0.1],
            ["Temperature_C", "Temperature (°C)", -10, 60, 0.1],
            ["Humidity_pct", "Humidity (%)", 0, 100, 0.1],
          ].map(([name, label, min, max, step]) => (
            <label className="crop-rec-field" key={name}>
              <span>{label}</span>
              <input
                type="number"
                name={name}
                min={min}
                max={max}
                step={step}
                value={form[name]}
                onChange={handleChange}
                required
              />
            </label>
          ))}

          <label className="crop-rec-field">
            <span>State</span>
            <select name="State" value={form.State} onChange={handleChange} required>
              {[
                "Andhra Pradesh", "Bihar", "Gujarat", "Karnataka",
                "Kerala", "Madhya Pradesh", "Maharashtra", "Odisha",
                "Punjab", "Rajasthan", "Tamil Nadu", "Telangana",
                "Uttar Pradesh", "West Bengal",
              ].map((state) => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </label>

          <label className="crop-rec-field">
            <span>Season</span>
            <select name="Season" value={form.Season} onChange={handleChange} required>
              <option value="Kharif">Kharif</option>
              <option value="Rabi">Rabi</option>
              <option value="Zaid">Zaid</option>
            </select>
          </label>

          <label className="crop-rec-field">
            <span>Soil Type</span>
            <select name="Soil_Type" value={form.Soil_Type} onChange={handleChange} required>
              {[
                "Alluvial", "Black Soil", "Clay Loamy",
                "Loamy", "Red Loamy", "Red Sandy",
              ].map((soil) => (
                <option key={soil} value={soil}>{soil}</option>
              ))}
            </select>
          </label>

          <label className="crop-rec-field">
            <span>Irrigation Type</span>
            <select name="Irrigation_Type" value={form.Irrigation_Type} onChange={handleChange} required>
              <option value="Drip">Drip</option>
              <option value="Flood">Flood</option>
              <option value="Sprinkler">Sprinkler</option>
              <option value="Rainfed">Rainfed</option>
            </select>
          </label>

          <label className="crop-rec-field">
            <span>Water Availability</span>
            <select name="Water_Availability" value={form.Water_Availability} onChange={handleChange} required>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </label>
        </div>

        {error && <p className="crop-rec-error">{error}</p>}

        <button className="crop-rec-submit" type="submit" disabled={loading}>
          {loading ? "Predicting..." : "Recommend Crop"}
        </button>
      </form>

      {result && (
        <section className="crop-rec-result" aria-live="polite">
          <p className="crop-rec-eyebrow">SVM PREDICTION RESULT</p>
          <h2>Recommended Crop</h2>
          <p className="crop-rec-crop">
            {result.recommended_crop || "Prediction received"}
          </p>

          {result.confidence_percent != null && (
            <p>
              Model confidence:{" "}
              {Number(result.confidence_percent).toFixed(2)}%
            </p>
          )}

          <p>{result.note || "Prediction returned by the trained model."}</p>
        </section>
      )}

      <button
        type="button"
        className="crop-rec-secondary"
        onClick={() => navigate("/recommendations")}
      >
        Open Smart Recommendations →
      </button>
    </main>
  );
}

export default CropRecommendation;
