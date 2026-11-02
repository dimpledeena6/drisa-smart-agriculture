
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/weather.css";

function getWeatherInfo(code) {
  if (code === 0) return { label: "Clear sky", icon: "☀️" };
  if ([1, 2].includes(code)) return { label: "Mostly clear", icon: "🌤️" };
  if (code === 3) return { label: "Overcast", icon: "☁️" };

  if ([45, 48].includes(code)) {
    return { label: "Foggy", icon: "🌫️" };
  }

  if ([51, 53, 55, 56, 57].includes(code)) {
    return { label: "Drizzle", icon: "🌦️" };
  }

  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return { label: "Rain", icon: "🌧️" };
  }

  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return { label: "Snow", icon: "❄️" };
  }

  if ([95, 96, 99].includes(code)) {
    return { label: "Thunderstorm", icon: "⛈️" };
  }

  return { label: "Weather conditions", icon: "🌤️" };
}

function Weather() {
  const navigate = useNavigate();

  const [farmer, setFarmer] = useState(null);
  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState("");
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load the logged-in farmer and the latest saved farm list.
  useEffect(() => {
    try {
      const savedFarmer = localStorage.getItem("drisaFarmer");

      if (!savedFarmer) {
        navigate("/login");
        return;
      }

      const parsedFarmer = JSON.parse(savedFarmer);

      const storedFarms = localStorage.getItem(
        `drisaFarms_${parsedFarmer.id}`
      );

      const farmerFarms = storedFarms
        ? JSON.parse(storedFarms)
        : parsedFarmer.lands || [];

      if (!Array.isArray(farmerFarms)) {
        throw new Error("Invalid farm records");
      }

      setFarmer(parsedFarmer);
      setFarms(farmerFarms);

      const savedSelectedFarm = localStorage.getItem("drisaSelectedFarm");

      const validSelectedFarm = farmerFarms.find(
        (farm) => farm.id === savedSelectedFarm
      );

      const initialFarm = validSelectedFarm || farmerFarms[0] || null;

      setSelectedFarmId(initialFarm?.id || "");
    } catch {
      localStorage.removeItem("drisaFarmer");
      navigate("/login");
    }
  }, [navigate]);

  const selectedFarm = farms.find(
    (farm) => farm.id === selectedFarmId
  ) || null;

  // Load weather whenever the selected farm changes.
  useEffect(() => {
    if (!selectedFarm) {
      setWeather(null);
      setForecast([]);
      setError("");
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function loadWeather() {
      setLoading(true);
      setError("");
      setWeather(null);
      setForecast([]);

      try {
        const placeName = selectedFarm.location
          .split(",")[0]
          .trim();

        if (!placeName) {
          throw new Error("Please add a location to this farm.");
        }

        const geoParams = new URLSearchParams({
          name: placeName,
          count: "10",
          language: "en",
          format: "json"
        });

        const geoResponse = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?${geoParams.toString()}`,
          { signal: controller.signal }
        );

        if (!geoResponse.ok) {
          throw new Error("Unable to find the farm location.");
        }

        const geoData = await geoResponse.json();
        const places = geoData.results || [];

        const place =
          places.find((item) => item.admin1 === "Karnataka") ||
          places[0];

        if (!place) {
          throw new Error(
            `Could not find "${placeName}". Please check the farm location in My Farms.`
          );
        }

        const params = new URLSearchParams({
          latitude: String(place.latitude),
          longitude: String(place.longitude),
          current:
            "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code",
          daily:
            "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
          timezone: "auto",
          forecast_days: "5"
        });

        const weatherResponse = await fetch(
          `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
          { signal: controller.signal }
        );

        if (!weatherResponse.ok) {
          throw new Error("Unable to retrieve weather data.");
        }

        const data = await weatherResponse.json();

        if (!data.current) {
          throw new Error("Weather data is currently unavailable.");
        }

        setWeather({
          ...data.current,
          locationName: place.name,
          region: place.admin1 || ""
        });

        const daily = data.daily;

        setForecast(
          (daily?.time || []).map((date, index) => ({
            date,
            code: daily.weather_code[index],
            max: daily.temperature_2m_max[index],
            min: daily.temperature_2m_min[index],
            rain: daily.precipitation_probability_max?.[index]
          }))
        );
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(
            err.message ||
              "Could not load weather. Please check your internet connection."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadWeather();

    return () => controller.abort();
  }, [selectedFarm]);

  function handleFarmChange(event) {
    const farmId = event.target.value;

    setSelectedFarmId(farmId);

    if (farmId) {
      localStorage.setItem("drisaSelectedFarm", farmId);
    } else {
      localStorage.removeItem("drisaSelectedFarm");
    }
  }

  function retryWeather() {
    // A new object triggers the weather effect again for the same farm.
    if (selectedFarm) {
      setSelectedFarmId("");
      setTimeout(() => setSelectedFarmId(selectedFarm.id), 0);
    }
  }

  if (!farmer) return null;

  if (farms.length === 0) {
    return (
      <main className="weather-page">
        <header className="weather-header">
          <button
            className="weather-back"
            onClick={() => navigate("/dashboard")}
          >
            ←
          </button>
          <div className="weather-brand">
            <img src="/src/assets/drisa-logo.png" alt="DRISA" />
            <div>
              <h1>Farm Weather</h1>
              <p>Weather insights for your land</p>
            </div>
          </div>
        </header>

        <section className="weather-intro">
          <h2>No farms registered yet</h2>
          <p>Add a farm to view weather for its location.</p>
          <button onClick={() => navigate("/add-farm")}>
            + Add Farm
          </button>
        </section>
      </main>
    );
  }

  const currentInfo = weather
    ? getWeatherInfo(weather.weather_code)
    : null;

  return (
    <main className="weather-page">
      <header className="weather-header">
        <button
          className="weather-back"
          onClick={() => navigate("/dashboard")}
          aria-label="Back to dashboard"
        >
          ←
        </button>

        <div className="weather-brand">
          <img src="/src/assets/drisa-logo.png" alt="DRISA" />
          <div>
            <h1>Farm Weather</h1>
            <p>Weather insights for your land</p>
          </div>
        </div>
      </header>

      <section className="weather-intro">
        <p className="weather-eyebrow">DRISA WEATHER</p>
        <h2>Weather for better farming</h2>
        <p>Plan your farm activities using local weather conditions.</p>
      </section>

      <section className="weather-farm-select">
        <label htmlFor="weather-farm">Select your farm</label>

        <select
          id="weather-farm"
          value={selectedFarmId}
          onChange={handleFarmChange}
        >
          {farms.map((land) => (
            <option key={land.id} value={land.id}>
              {land.name} — {land.location}
            </option>
          ))}
        </select>

        {selectedFarm && (
          <p>
            📍 {selectedFarm.location} · {selectedFarm.crop}
          </p>
        )}
      </section>

      <section className="weather-main-card">
        {loading && (
          <div className="weather-message" role="status">
            <span className="weather-loading-icon">🌤️</span>
            <p>Fetching local weather...</p>
          </div>
        )}

        {!loading && error && (
          <div className="weather-message weather-error" role="alert">
            <span>⚠️</span>
            <h3>Weather unavailable</h3>
            <p>{error}</p>
            <button className="weather-retry" onClick={retryWeather}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && weather && currentInfo && (
          <>
            <div className="weather-main-top">
              <div>
                <p className="weather-location-label">
                  CURRENT CONDITIONS
                </p>
                <h2>{weather.locationName}</h2>
                <p className="weather-condition">{currentInfo.label}</p>
              </div>
              <div className="weather-sun">{currentInfo.icon}</div>
            </div>

            <div className="weather-temperature">
              <span>{Math.round(weather.temperature_2m)}</span>
              <div>
                <strong>°C</strong>
                <p>Temperature</p>
              </div>
            </div>

            <div className="weather-metrics">
              <div>
                <span>💧</span>
                <small>Humidity</small>
                <strong>{weather.relative_humidity_2m}%</strong>
              </div>

              <div>
                <span>🌧️</span>
                <small>Precipitation</small>
                <strong>{weather.precipitation} mm</strong>
              </div>

              <div>
                <span>💨</span>
                <small>Wind speed</small>
                <strong>{weather.wind_speed_10m} km/h</strong>
              </div>
            </div>

            <p className="weather-data-note">
              Weather data from Open-Meteo ·{" "}
              {weather.time?.replace("T", " ")}
            </p>

            <p className="weather-data-note">
              Forecast location: {weather.locationName}
              {weather.region ? `, ${weather.region}` : ""}. This is
              location-based weather, not a measurement from farm sensors.
            </p>
          </>
        )}
      </section>

      <section className="weather-planning">
        <div className="weather-section-heading">
          <div>
            <p>UPCOMING CONDITIONS</p>
            <h2>5-Day Forecast</h2>
          </div>
          <span>📅</span>
        </div>

        {loading && (
          <p className="forecast-status">Loading forecast...</p>
        )}

        {!loading && !error && forecast.length > 0 && (
          <div className="forecast-list">
            {forecast.map((day) => {
              const info = getWeatherInfo(day.code);

              return (
                <article className="forecast-day" key={day.date}>
                  <div className="forecast-date">
                    <strong>
                      {new Date(`${day.date}T12:00:00`).toLocaleDateString(
                        "en-IN",
                        { weekday: "short" }
                      )}
                    </strong>
                    <small>
                      {new Date(`${day.date}T12:00:00`).toLocaleDateString(
                        "en-IN",
                        { day: "numeric", month: "short" }
                      )}
                    </small>
                  </div>

                  <span className="forecast-icon">{info.icon}</span>

                  <div className="forecast-condition">
                    <strong>{info.label}</strong>
                    {day.rain != null && (
                      <small>🌧️ {day.rain}% rain chance</small>
                    )}
                  </div>

                  <div className="forecast-temperatures">
                    <strong>{Math.round(day.max)}°</strong>
                    <span>{Math.round(day.min)}°</span>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="weather-tip">
          <span>💧</span>
          <div>
            <h3>Irrigation planning</h3>
            <p>
              Check soil moisture and upcoming rainfall before deciding
              whether to irrigate.
            </p>
          </div>
        </div>

        <div className="weather-tip">
          <span>🌿</span>
          <div>
            <h3>Crop care</h3>
            <p>
              Consider temperature, humidity and crop growth stage when
              planning field activities.
            </p>
          </div>
        </div>

        <div className="weather-tip">
          <span>🌧️</span>
          <div>
            <h3>Rain preparation</h3>
            <p>
              Check the forecast before spraying, fertilizing or scheduling
              field work.
            </p>
          </div>
        </div>
      </section>

      <nav className="weather-bottom-nav">
        <button onClick={() => navigate("/dashboard")}>
          <span>⌂</span>
          <small>Home</small>
        </button>

        <button onClick={() => navigate("/farms")}>
          <span>🌾</span>
          <small>My Farms</small>
        </button>

        <button onClick={() => navigate("/monitoring")}>
          <span>📊</span>
          <small>Monitor</small>
        </button>

        <button className="active">
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

export default Weather;
