import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { connectWokwiMqtt } from "../services/wokwiMqtt";
import "../styles/dashboard.css";

function getWeatherDescription(code) {
  if (code === 0) return "Clear sky";
  if ([1, 2].includes(code)) return "Mainly clear";
  if (code === 3) return "Overcast";
  if ([45, 48].includes(code)) return "Foggy";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([80, 81, 82].includes(code)) return "Rain showers";
  if ([95, 96, 99].includes(code)) return "Thunderstorms";
  return "Current conditions";
}

function getWeatherIcon(code) {
  if (code === 0) return "☀️";
  if ([1, 2].includes(code)) return "🌤️";
  if ([3, 45, 48].includes(code)) return "☁️";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return "🌧️";
  }
  if ([95, 96, 99].includes(code)) return "⛈️";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "🌨️";
  return "🌦️";
}

function Dashboard() {
  const navigate = useNavigate();

  const [farmer, setFarmer] = useState(null);
  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState("");

  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState("");

  // Live Wokwi/MQTT state
  const [liveReading, setLiveReading] = useState(null);
  const [mqttStatus, setMqttStatus] = useState("disconnected");

  // Load farmer and shared farm data.
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
        localStorage.setItem("drisaSelectedFarm", String(initialFarm.id));
      } else {
        setSelectedFarmId("");
      }
    } catch (error) {
      console.error("Unable to load dashboard:", error);
      localStorage.removeItem("drisaFarmer");
      navigate("/login");
    }
  }, [navigate]);

  const selectedFarm =
    farms.find(
      (farm) => String(farm.id) === String(selectedFarmId)
    ) || null;

  // Connect to Wokwi only for the farm assigned to LAND001.
  useEffect(() => {
    setLiveReading(null);

    if (!selectedFarm || String(selectedFarm.id) !== "LAND001") {
      setMqttStatus("no-device");
      return undefined;
    }

    const disconnect = connectWokwiMqtt(
        "LAND001",
        setMqttStatus,
        (reading) => {
        setLiveReading(reading);
        localStorage.setItem(
        "drisaLatestSensorReading",
        JSON.stringify(reading)
    );
  }
);

    return () => {
      disconnect();
    };
  }, [selectedFarmId, selectedFarm]);

  // Fetch location-based weather for the selected farm.
  useEffect(() => {
    if (!selectedFarm) {
      setWeather(null);
      setWeatherError("");
      setWeatherLoading(false);
      return undefined;
    }

    let cancelled = false;

    async function fetchWeather() {
      setWeatherLoading(true);
      setWeather(null);
      setWeatherError("");

      try {
        const location = (selectedFarm.location || "").trim();

        if (!location) {
          throw new Error("Please add a location to this farm.");
        }

        const searchLocation = location.includes(",")
          ? location.split(",")[0].trim()
          : location;

        const geoResponse = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
            searchLocation
          )}&count=10&language=en&format=json`
        );

        if (!geoResponse.ok) {
          throw new Error("Unable to find the farm location.");
        }

        const geoData = await geoResponse.json();
        const results = geoData.results || [];

        const place =
          results.find((result) =>
            result.admin1?.toLowerCase().includes("karnataka")
          ) ||
          results.find((result) =>
            result.country?.toLowerCase().includes("india")
          ) ||
          results[0];

        if (!place) {
          throw new Error(`No matching location found for "${location}".`);
        }

        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&timezone=auto`
        );

        if (!response.ok) {
          throw new Error("Unable to retrieve current weather.");
        }

        const data = await response.json();

        if (!data.current) {
          throw new Error("Current weather data is unavailable.");
        }

        if (!cancelled) {
          setWeather({
            location: place.name,
            temperature: data.current.temperature_2m,
            humidity: data.current.relative_humidity_2m,
            precipitation: data.current.precipitation,
            wind: data.current.wind_speed_10m,
            code: data.current.weather_code,
            time: data.current.time,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setWeatherError(
            error.message || "Weather is temporarily unavailable."
          );
        }
      } finally {
        if (!cancelled) {
          setWeatherLoading(false);
        }
      }
    }

    fetchWeather();

    return () => {
      cancelled = true;
    };
  }, [selectedFarm]);

  if (!farmer) return null;

  const hasLiveDevice =
    selectedFarm && String(selectedFarm.id) === "LAND001";

  const moisture = Number(liveReading?.soilMoisture);
  const temperature = Number(liveReading?.temperature);
  const humidity = Number(liveReading?.humidity);

  const validMoisture =
    liveReading?.soilMoisture !== undefined &&
    Number.isFinite(moisture);

  const validTemperature =
    liveReading?.temperature !== undefined &&
    Number.isFinite(temperature);

  const validHumidity =
    liveReading?.humidity !== undefined &&
    Number.isFinite(humidity);

  const pumpOn = liveReading?.pumpOn;

  function handleFarmNavigation() {
    navigate("/farms");
  }

  function getConnectionMessage() {
    if (!hasLiveDevice) {
      return "No Wokwi device is assigned to this farm.";
    }

    if (mqttStatus === "error") {
      return "MQTT connection error. Check the Wokwi simulation and connection.";
    }

    if (mqttStatus === "connecting") {
      return "Connecting to the Wokwi simulation...";
    }

    if (mqttStatus === "disconnected") {
      return "Disconnected from the Wokwi simulation.";
    }

    if (mqttStatus === "no-device") {
      return "No device assigned.";
    }

    if (mqttStatus === "connected" && !liveReading) {
      return "Connected. Waiting for the next sensor reading...";
    }

    return "Receiving live Wokwi sensor readings.";
  }

  return (
    <main className="dashboard-page">
      {/* Header */}
      <header className="dashboard-header">
        <div className="brand-section">
          <img
            src="/src/assets/drisa-logo.png"
            alt="DRISA"
            className="dashboard-logo"
          />

          <div>
            <h1>DRISA</h1>
            <p>Smart Agriculture</p>
          </div>
        </div>

        <button
          className="notification-button"
          aria-label="Notifications"
          onClick={() => navigate("/recommendations")}
        >
          🔔
        </button>
      </header>

      {/* Greeting */}
      <section className="welcome-section">
        <div>
          <p className="welcome-small">Namasthe 🙏</p>
          <h2>{farmer.name} 🌱</h2>
          <p className="welcome-description">
            Here's what's happening on your farm today
          </p>
        </div>
      </section>

      {/* Weather */}
      <section className="weather-card">
        <div className="weather-main">
          <div className="weather-icon">
            {weather ? getWeatherIcon(weather.code) : "🌦️"}
          </div>

          <div>
            <p className="weather-location">
              {weather?.location ||
                selectedFarm?.location ||
                "Farm location"}
            </p>

            <h3>
              {weatherLoading
                ? "Loading..."
                : weather
                ? `${Math.round(weather.temperature)}°C`
                : "--°C"}
            </h3>

            <p>
              {weather
                ? getWeatherDescription(weather.code)
                : weatherLoading
                ? "Fetching current weather"
                : "Weather unavailable"}
            </p>
          </div>
        </div>

        <div className="weather-details">
          <div>
            <span>Humidity</span>
            <strong>{weather ? `${weather.humidity}%` : "--"}</strong>
          </div>

          <div>
            <span>Precipitation</span>
            <strong>
              {weather ? `${weather.precipitation} mm` : "--"}
            </strong>
          </div>

          <div>
            <span>Wind</span>
            <strong>
              {weather ? `${weather.wind} km/h` : "--"}
            </strong>
          </div>
        </div>

        {weatherError && (
          <p className="weather-location" role="status">
            {weatherError}
          </p>
        )}

        {weather?.time && (
          <p className="weather-location">
            Updated for {weather.time.replace("T", " ")}
          </p>
        )}

        <button
          className="weather-button"
          onClick={() => navigate("/weather")}
        >
          View Weather Details →
        </button>
      </section>

      {/* Farm Overview */}
      <section className="section-block">
        <div className="section-heading">
          <div>
            <p>YOUR LAND</p>
            <h2>Farm Overview</h2>
          </div>

          <button onClick={handleFarmNavigation}>View All</button>
        </div>

        {selectedFarm ? (
          <button
            type="button"
            className="farm-card farm-overview-card"
            onClick={handleFarmNavigation}
          >
            <div className="farm-icon">🌾</div>

            <div className="farm-info">
              <h3>{selectedFarm.name}</h3>

              <p>
                {selectedFarm.area} Acres • {selectedFarm.location}
              </p>

              <div className="crop-status">
                <span></span>
                {selectedFarm.crop} •{" "}
                {hasLiveDevice ? "Wokwi monitoring" : "No device assigned"}
              </div>
            </div>

            <div className="farm-arrow">→</div>
          </button>
        ) : (
          <div className="farm-card">
            <div className="farm-info">
              <h3>No farms added yet</h3>
              <p>Add a farm to start using DRISA.</p>
              <button onClick={handleFarmNavigation}>
                Open My Farms →
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Farm Monitoring: live Wokwi data */}
      <section className="section-block">
        <div className="section-heading">
          <div>
            <p>LIVE SENSOR STATUS</p>
            <h2>Farm Monitoring</h2>
          </div>

          <button onClick={() => navigate("/monitoring")}>
            Details →
          </button>
        </div>

        <div className="farm-card">
          <div className="farm-icon">📡</div>

          <div className="farm-info">
            <h3>{selectedFarm?.name || "No farm selected"}</h3>
            <p>{getConnectionMessage()}</p>

            <div className="crop-status">
              <span></span>
              {mqttStatus === "connected" && liveReading
                ? "Live data received"
                : hasLiveDevice
                ? "Wokwi device assigned"
                : "Demo farm without a device"}
            </div>
          </div>
        </div>

        {hasLiveDevice && liveReading && (
          <>
            <div className="monitor-grid">
              <div className="monitor-card">
                <div className="monitor-icon soil">💧</div>
                <span>Soil Moisture</span>
                <strong>
                  {validMoisture ? `${moisture}%` : "--"}
                </strong>
                <small>
                  {validMoisture
                    ? moisture < 30
                      ? "Low — irrigation may be needed"
                      : moisture > 70
                      ? "High moisture"
                      : "Moisture in normal range"
                    : "Waiting for valid data"}
                </small>
              </div>

              <div className="monitor-card">
                <div className="monitor-icon temp">🌡️</div>
                <span>Temperature</span>
                <strong>
                  {validTemperature ? `${temperature}°C` : "--"}
                </strong>
                <small>Live Wokwi reading</small>
              </div>

              <div className="monitor-card">
                <div className="monitor-icon crop">💨</div>
                <span>Air Humidity</span>
                <strong>
                  {validHumidity ? `${humidity}%` : "--"}
                </strong>
                <small>Live Wokwi reading</small>
              </div>
            </div>

            <div className="farm-card">
              <div className="farm-icon">
                {pumpOn === true ? "🚿" : pumpOn === false ? "🌱" : "💧"}
              </div>

              <div className="farm-info">
                <h3>Irrigation Status</h3>
                <p>
                  {pumpOn === true
                    ? "Pump ON — soil moisture is below the simulation threshold."
                    : pumpOn === false
                    ? "Pump OFF — automatic irrigation is not currently triggered."
                    : "Pump status is not included in the latest reading."}
                </p>
              </div>
            </div>

            {liveReading.receivedAt && (
              <p className="weather-location">
                Last message received:{" "}
                {new Date(liveReading.receivedAt).toLocaleTimeString()}
              </p>
            )}
          </>
        )}

        {hasLiveDevice && !liveReading && (
          <div className="farm-card">
            <div className="farm-info">
              <h3>Waiting for sensor data</h3>
              <p>
                Start the Wokwi simulation and wait for the next MQTT
                telemetry message. Readings will appear here automatically.
              </p>
            </div>
          </div>
        )}

        {!hasLiveDevice && selectedFarm && (
          <div className="farm-card">
            <div className="farm-info">
              <h3>Live readings unavailable</h3>
              <p>
                This farm has no assigned Wokwi device. Its readings are
                not replaced with another farm's sensor values.
              </p>
              <button onClick={() => navigate("/monitoring")}>
                View Monitoring →
              </button>
            </div>
          </div>
        )}

        {!selectedFarm && (
          <p>Add a farm to start using the monitoring features.</p>
        )}
      </section>

      {/* AI Features */}
      <section className="section-block">
        <div className="section-heading">
          <div>
            <p>AI INSIGHTS</p>
            <h2>Smart Agriculture</h2>
          </div>
        </div>

        <div className="ai-grid">
          <button
            className="ai-card"
            onClick={() => navigate("/yield-prediction")}
          >
            <div className="ai-card-icon">📊</div>
            <div>
              <h3>Yield Prediction</h3>
              <p>Predict your expected crop yield</p>
            </div>
            <span>→</span>
          </button>

          <button
            className="ai-card"
            onClick={() => navigate("/disease-detection")}
          >
            <div className="ai-card-icon">🔬</div>
            <div>
              <h3>Disease Detection</h3>
              <p>Prepare crop images for AI analysis</p>
            </div>
            <span>→</span>
          </button>

          <button
            className="ai-card"
            onClick={() => navigate("/recommendations")}
          >
            <div className="ai-card-icon">💡</div>
            <div>
              <h3>Smart Recommendations</h3>
              <p>View farm-specific guidance</p>
            </div>
            <span>→</span>
          </button>

          
<button
  className="ai-card"
  onClick={() => navigate("/crop-recommendation")}
>
  <div className="ai-card-icon">🌱</div>
  <div>
    <h3>Crop Recommendation</h3>
    <p>Find a suitable crop using the trained SVM model</p>
  </div>
  <span>→</span>
</button>

        </div>
      </section>

      {/* Bottom Navigation */}
      <nav className="bottom-navigation">
        <button
          className="active"
          onClick={() => navigate("/dashboard")}
        >
          <span>⌂</span>
          <small>Home</small>
        </button>

        <button onClick={() => navigate("/farms")}>
          <span>🌾</span>
          <small>Farms</small>
        </button>

        <button onClick={() => navigate("/monitoring")}>
          <span>📡</span>
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

export default Dashboard;