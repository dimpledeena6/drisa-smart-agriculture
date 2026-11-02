
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/diseaseDetection.css";

const API_URL = "http://127.0.0.1:8000/predict-disease";

function normalizeCrop(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/[^a-z ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cropsMatch(selectedCrop, predictedCrop) {
  const selected = normalizeCrop(selectedCrop);
  const predicted = normalizeCrop(predictedCrop);

  if (!selected || !predicted) return true;

  const aliases = {
    "bell pepper": "pepper bell",
    "pepper": "pepper bell",
    "sweet pepper": "pepper bell",
  };

  return (
    (aliases[selected] || selected) ===
    (aliases[predicted] || predicted)
  );
}

function DiseaseDetection() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [farmer, setFarmer] = useState(null);
  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState("");
  const [crop, setCrop] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load farmer and farm information
  useEffect(() => {
    try {
      const savedFarmer = localStorage.getItem("drisaFarmer");

      if (!savedFarmer) {
        navigate("/login");
        return;
      }

      const parsed = JSON.parse(savedFarmer);

      if (!parsed?.id) {
        localStorage.removeItem("drisaFarmer");
        navigate("/login");
        return;
      }

      setFarmer(parsed);

      const storedFarms = localStorage.getItem(
        `drisaFarms_${parsed.id}`
      );

      let farmerFarms = parsed.lands || [];

      if (storedFarms !== null) {
        const parsedFarms = JSON.parse(storedFarms);

        farmerFarms = Array.isArray(parsedFarms)
          ? parsedFarms
          : [];
      }

      setFarms(farmerFarms);

      const savedFarmId = localStorage.getItem(
        "drisaSelectedFarm"
      );

      const initialFarm =
        farmerFarms.find(
          (farm) => String(farm.id) === String(savedFarmId)
        ) || farmerFarms[0];

      if (initialFarm) {
        setSelectedFarmId(String(initialFarm.id));
        setCrop(initialFarm.crop || "");

        localStorage.setItem(
          "drisaSelectedFarm",
          String(initialFarm.id)
        );
      } else {
        setSelectedFarmId("");
        setCrop("");
      }
    } catch (error) {
      console.error("Farmer loading error:", error);
      localStorage.removeItem("drisaFarmer");
      navigate("/login");
    }
  }, [navigate]);

  const selectedFarm =
    farms.find(
      (farm) => String(farm.id) === String(selectedFarmId)
    ) || null;

  // Clean up image preview URL
  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  // Farm selection
  const handleFarmChange = (event) => {
    const farmId = event.target.value;

    const farm = farms.find(
      (land) => String(land.id) === String(farmId)
    );

    setSelectedFarmId(farmId);
    setAnalysis(null);
    setError("");

    if (farm) {
      setCrop(farm.crop || "");

      localStorage.setItem(
        "drisaSelectedFarm",
        String(farm.id)
      );
    } else {
      setCrop("");
      localStorage.removeItem("drisaSelectedFarm");
    }
  };

  // Image upload
  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    setError("");
    setAnalysis(null);

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Please upload a JPG, PNG or WEBP image.");
      event.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Please choose an image smaller than 10 MB.");
      event.target.value = "";
      return;
    }

    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  // Remove selected image
  const handleRemoveImage = () => {
    setImage(null);
    setPreview("");
    setAnalysis(null);
    setError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // AI disease prediction
  const handleAnalyze = async (event) => {
    event.preventDefault();

    setError("");
    setAnalysis(null);

    if (!selectedFarm || !crop.trim() || !image) {
      setError(
        "Please select a farm, enter a crop name, and upload a leaf image."
      );
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("file", image);

      const response = await fetch(API_URL, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Disease prediction failed."
        );
      }

      setAnalysis(data);

    } catch (error) {
      console.error("Disease detection error:", error);

      setError(
        error.message ||
        "Unable to connect to the disease detection server."
      );

    } finally {
      setLoading(false);
    }
  };

  if (!farmer) return null;

  // Check confidence and crop consistency
  const cropMismatch =
    analysis &&
    !cropsMatch(crop, analysis.crop);

  const needsReview =
    analysis &&
    (analysis.needs_review || cropMismatch);

  return (
    <main className="disease-page">

      {/* Header */}
      <header className="disease-header">
        <button
          type="button"
          className="disease-back"
          onClick={() => navigate("/dashboard")}
          aria-label="Back to dashboard"
        >
          ←
        </button>

        <div className="disease-brand">
          <img src="/src/assets/drisa-logo.png" alt="DRISA" />

          <div>
            <h1>Disease Detection</h1>
            <p>AI-assisted crop health</p>
          </div>
        </div>
      </header>

      {/* Introduction */}
      <section className="disease-intro">
        <p className="disease-eyebrow">CROP HEALTH</p>

        <h2>A closer look at your crops</h2>

        <p>
          Upload a clear photo of a crop leaf to detect
          possible diseases using artificial intelligence.
        </p>
      </section>

      {/* Information notice */}
      <section className="disease-notice">
        <span>ℹ️</span>

        <p>
          <strong>AI Disease Detection Active</strong>
          <br />

          Upload a crop leaf image to identify possible
          diseases using our trained MobileNetV2 model.
        </p>
      </section>

      {/* Analysis form */}
      <form
        className="disease-form"
        onSubmit={handleAnalyze}
      >

        <div className="disease-form-heading">
          <span>🌿</span>

          <div>
            <h2>Analyze a Crop Leaf</h2>
            <p>Choose the farm and upload a leaf photo</p>
          </div>
        </div>

        {/* Farm selection */}
        <div className="disease-field">
          <label htmlFor="disease-farm">
            Select Farm
          </label>

          <select
            id="disease-farm"
            value={selectedFarmId}
            onChange={handleFarmChange}
            required
            disabled={farms.length === 0}
          >
            {farms.length === 0 && (
              <option value="">
                No farms available
              </option>
            )}

            {farms.map((land) => (
              <option
                key={land.id}
                value={String(land.id)}
              >
                {land.name}
              </option>
            ))}
          </select>

          {selectedFarm && (
            <small>
              📍 {selectedFarm.location} · {selectedFarm.crop}
            </small>
          )}

          {farms.length === 0 && (
            <small>
              Add a farm before starting disease detection.
            </small>
          )}
        </div>

        {/* Crop type */}
        <div className="disease-field">
          <label htmlFor="disease-crop">
            Crop Type
          </label>

          <input
            id="disease-crop"
            value={crop}
            onChange={(event) => {
              setCrop(event.target.value);
              setAnalysis(null);
            }}
            placeholder="Enter crop name"
            required
          />
        </div>

        {/* Image upload */}
        <div className="disease-field">
          <label htmlFor="disease-image">
            Crop Leaf Image
          </label>

          <input
            ref={fileInputRef}
            id="disease-image"
            className="disease-file-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            onChange={handleImageChange}
          />

          {!preview ? (
            <button
              type="button"
              className="disease-upload-area"
              onClick={() => fileInputRef.current?.click()}
            >
              <span className="disease-upload-icon">
                📷
              </span>

              <strong>
                Upload or capture a leaf photo
              </strong>

              <small>
                JPG, PNG or WEBP · Maximum 10 MB
              </small>

              <span className="disease-upload-action">
                Choose Image
              </span>
            </button>
          ) : (
            <div className="disease-image-preview">
              <img
                src={preview}
                alt="Selected crop leaf preview"
              />

              <div className="disease-image-info">
                <strong>Image selected</strong>

                <small>{image?.name}</small>

                <button
                  type="button"
                  onClick={handleRemoveImage}
                >
                  Remove image
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <p className="disease-error" role="alert">
            {error}
          </p>
        )}

        {/* Detect button */}
        <button
          type="submit"
          className="disease-submit"
          disabled={
            farms.length === 0 ||
            loading ||
            !image
          }
        >
          {loading
            ? "Analyzing Image..."
            : "Detect Disease"}

          {!loading && <span> →</span>}
        </button>

      </form>

      {/* AI prediction result */}
      {analysis && (
        <section
          className="disease-result"
          aria-live="polite"
        >

          <div className="disease-result-icon">
            🔬
          </div>

          <p className="disease-eyebrow">
            AI ANALYSIS RESULT
          </p>

          <h2>
            {needsReview
              ? "Prediction"
              : analysis.is_healthy
                ? "Healthy Crop"
                : "Disease Detected"}
          </h2>

          {/* Main prediction details */}
          <div className="disease-result-details">

            <span>Selected Farm</span>
            <strong>{selectedFarm?.name || "N/A"}</strong>

            <span>Selected Crop</span>
            <strong>{crop}</strong>

            <span>Predicted Crop</span>
            <strong>{analysis.crop}</strong>

            <span>Prediction</span>
            <strong>{analysis.disease}</strong>

            <span>Confidence</span>
            <strong>{analysis.confidence}%</strong>

            <span>Status</span>
            <strong>
              {needsReview
                ? "Needs Expert Review"
                : analysis.is_healthy
                  ? "Healthy"
                  : "Diseased"}
            </strong>

          </div>

          {/* Crop mismatch warning */}
          {cropMismatch && (
            <p className="disease-error" role="alert">
              The selected crop ({crop}) does not match
              the predicted crop ({analysis.crop}).
              Please verify that the correct leaf image
              was uploaded. The prediction may be unreliable.
            </p>
          )}

          {/* Low confidence warning */}
          {analysis.needs_review && (
            <p className="disease-error" role="alert">
              The model has low confidence in this
              prediction. Please upload a clearer image
              or consult an agricultural expert.
            </p>
          )}

          {/* Top predictions */}
          <h3>Top 3 Predictions</h3>

          {analysis.top_predictions?.map(
            (item, index) => (
              <div
                className="disease-result-details"
                key={`${item.crop}-${item.disease}-${index}`}
              >
                <span>
                  {index + 1}. {item.crop}
                </span>

                <strong>{item.disease}</strong>

                <span>Confidence</span>

                <strong>{item.confidence}%</strong>
              </div>
            )
          )}

          <p>
            This is an AI-based screening result, not
            a confirmed agricultural diagnosis.
          </p>

        </section>
      )}

      {/* Photo guidance */}
      <section className="disease-guidance">
        <h2>Tips for a clear leaf photo</h2>

        <div className="disease-tip">
          <span>☀️</span>

          <div>
            <strong>Use good lighting</strong>

            <p>
              Take the photo in natural light without
              harsh shadows.
            </p>
          </div>
        </div>

        <div className="disease-tip">
          <span>📸</span>

          <div>
            <strong>Focus on the leaf</strong>

            <p>
              Keep the leaf in focus and fill most
              of the image with it.
            </p>
          </div>
        </div>

        <div className="disease-tip">
          <span>🌱</span>

          <div>
            <strong>Include visible symptoms</strong>

            <p>
              Capture spots, discolouration or damaged
              areas clearly, if present.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom navigation */}
      <nav className="disease-bottom-nav">

        <button
          type="button"
          onClick={() => navigate("/dashboard")}
        >
          <span>⌂</span>
          <small>Home</small>
        </button>

        <button
          type="button"
          onClick={() => navigate("/farms")}
        >
          <span>🌾</span>
          <small>My Farms</small>
        </button>

        <button
          type="button"
          onClick={() => navigate("/monitoring")}
        >
          <span>📊</span>
          <small>Monitor</small>
        </button>

        <button
          type="button"
          onClick={() => navigate("/weather")}
        >
          <span>☀️</span>
          <small>Weather</small>
        </button>

        <button
          type="button"
          onClick={() => navigate("/profile")}
        >
          <span>👤</span>
          <small>Profile</small>
        </button>

      </nav>

    </main>
  );
}

export default DiseaseDetection;
