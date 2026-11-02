
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { connectWokwiMqtt } from "../services/wokwiMqtt";
import "../styles/simulation.css";

export default function Simulation() {
  const navigate = useNavigate();

  const [farmer, setFarmer] = useState(null);
  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState("");
  const [status, setStatus] = useState("connecting");
  const [reading, setReading] = useState(null);

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

      let farmerFarms = parsedFarmer.lands || [];

      if (savedFarms !== null) {
        const parsedFarms = JSON.parse(savedFarms);
        farmerFarms = Array.isArray(parsedFarms) ? parsedFarms : [];
      }

      const storedSelectedId = localStorage.getItem("drisaSelectedFarm");
      const validSelectedFarm = farmerFarms.find(
        (farm) => String(farm.id) === String(storedSelectedId)
      );

      const initialFarmId = validSelectedFarm
        ? String(validSelectedFarm.id)
        : farmerFarms.length > 0
        ? String(farmerFarms[0].id)
        : "";

      setFarmer(parsedFarmer);
      setFarms(farmerFarms);
      setSelectedFarmId(initialFarmId);
    } catch (error) {
      console.error("Unable to load farmer farms:", error);
      navigate("/login");
    }
  }, [navigate]);

  const selectedFarm = useMemo(
    () => farms.find((farm) => String(farm.id) === selectedFarmId),
    [farms, selectedFarmId]
  );

  // Only LAND001 currently has the Wokwi device assigned.
  const deviceAssigned = selectedFarmId === "LAND001";

  useEffect(() => {
    setReading(null);

    if (!selectedFarmId) {
      setStatus("no-device");
      return undefined;
    }

    if (!deviceAssigned) {
      setStatus("no-device");
      return undefined;
    }

    const disconnect = connectWokwiMqtt(
      selectedFarmId,
      setStatus,
      setReading
    );

    return disconnect;
  }, [selectedFarmId, deviceAssigned]);

  function handleFarmChange(event) {
    const nextFarmId = event.target.value;

    setSelectedFarmId(nextFarmId);
    localStorage.setItem("drisaSelectedFarm", nextFarmId);
  }

  if (!farmer) return null;

  const metrics = reading
    ? [
        { label: "Temperature", value: `${reading.temperature} °C` },
        { label: "Humidity", value: `${reading.humidity} %` },
        { label: "Soil Moisture", value: `${reading.soilMoisture} %` },
        { label: "Soil pH", value: reading.soilPH },
        { label: "Nitrogen (N)", value: reading.nitrogen },
        { label: "Phosphorus (P)", value: reading.phosphorus },
        { label: "Potassium (K)", value: reading.potassium },
        { label: "Water Pump", value: reading.pumpOn ? "ON" : "OFF" },
      ]
    : [];

  return (
    <main className="simulation-page">
      <header className="simulation-header">
        <div>
          <p className="simulation-eyebrow">DRISA · DEVICE MONITORING</p>
          <h1>Live Simulation</h1>
          <p className="simulation-subtitle">
            Monitor simulated readings for your selected farm.
          </p>
        </div>

        <span
          className={`simulation-status ${
            status === "connected" ? "status-connected" : "status-offline"
          }`}
        >
          <span className="status-dot" />
          {status === "connected"
            ? "MQTT Connected"
            : status === "connecting"
            ? "Connecting..."
            : status === "error"
            ? "Connection Error"
            : status === "disconnected"
            ? "Disconnected"
            : "No device assigned"}
        </span>
      </header>

      <section className="simulation-farm-card">
        <div>
          <p className="simulation-card-label">Logged-in farmer</p>
          <strong>{farmer.name} · {farmer.id}</strong>
        </div>

        <div>
          <p className="simulation-card-label">Select farm</p>
          <select
            value={selectedFarmId}
            onChange={handleFarmChange}
            aria-label="Select farm to monitor"
          >
            {farms.length === 0 && (
              <option value="">No farms registered</option>
            )}
            {farms.map((farm) => (
              <option key={farm.id} value={String(farm.id)}>
                {farm.name} · {farm.id}
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="simulation-card-label">Device topic</p>
          <strong>
            {deviceAssigned
              ? `drisa/farms/${selectedFarmId}/telemetry`
              : "No device assigned"}
          </strong>
        </div>

        <div>
          <p className="simulation-card-label">Selected farm</p>
          <strong>{selectedFarm?.name || "No farm selected"}</strong>
        </div>

        <p className="simulation-note">
          {deviceAssigned
            ? "Wokwi demo device assigned. Readings are simulated."
            : "No device is assigned to this farm yet. No other farm's readings will be shown."}
        </p>
      </section>

      {!deviceAssigned ? (
        <section className="simulation-empty">
          <h2>No device connected to this farm</h2>
          <p>
            The current Wokwi simulation is assigned only to LAND001.
            Select that farm to view its readings.
          </p>
          <button
            type="button"
            onClick={() => navigate("/farms")}
          >
            View My Farms
          </button>
        </section>
      ) : !reading ? (
        <section className="simulation-empty">
          <h2>Waiting for sensor readings</h2>
          <p>
            Keep Wokwi running. New readings should appear after its next
            MQTT publication.
          </p>
          {status === "error" && (
            <p>
              Check the MQTT broker, topic, and Wokwi connection.
            </p>
          )}
        </section>
      ) : (
        <>
          <section className="simulation-metrics">
            {metrics.map((metric) => (
              <article className="simulation-metric" key={metric.label}>
                <p>{metric.label}</p>
                <h2>{metric.value}</h2>
              </article>
            ))}
          </section>

          <section className="simulation-last-reading">
            <span className="status-dot" />
            Latest message received successfully
            <p>
              Received at:{" "}
              {new Date(reading.receivedAt).toLocaleTimeString()}
            </p>
          </section>
        </>
      )}

      <p className="simulation-disclaimer">
        Prototype using simulated sensor inputs and a public MQTT broker.
        This frontend assignment is for demonstration, not secure
        production device authorization.
      </p>
    </main>
  );
}
