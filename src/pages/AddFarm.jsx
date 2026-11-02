
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/addFarm.css";

const emptyFarm = {
  name: "",
  location: "",
  area: "",
  crop: "",
  soilType: ""
};

function AddFarm() {
  const navigate = useNavigate();

  const [farmer, setFarmer] = useState(null);
  const [farms, setFarms] = useState([]);
  const [form, setForm] = useState(emptyFarm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const savedFarmer = localStorage.getItem("drisaFarmer");

    if (!savedFarmer) {
      navigate("/login");
      return;
    }

    try {
      const parsed = JSON.parse(savedFarmer);
      const savedFarms = localStorage.getItem(
        `drisaFarms_${parsed.id}`
      );

      const initialFarms = savedFarms
        ? JSON.parse(savedFarms)
        : parsed.lands || [];

      setFarmer(parsed);
      setFarms(initialFarms);
    } catch {
      navigate("/login");
    }
  }, [navigate]);

  function saveFarms(updatedFarms) {
    localStorage.setItem(
      `drisaFarms_${farmer.id}`,
      JSON.stringify(updatedFarms)
    );

    setFarms(updatedFarms);
    setMessage("Farm details saved successfully");
    setError("");
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value
    }));

    setMessage("");
    setError("");
  }

  function handleSubmit(event) {
    event.preventDefault();

    const name = form.name.trim();
    const location = form.location.trim();
    const area = Number(form.area);

    if (!name || !location || !form.crop || !form.soilType) {
      setError("Please complete all the farm details");
      return;
    }

    if (!Number.isFinite(area) || area <= 0) {
      setError("Enter a valid farm area greater than zero");
      return;
    }

    const duplicate = farms.some(
      (farm) =>
        farm.name.trim().toLowerCase() === name.toLowerCase() &&
        farm.id !== editingId
    );

    if (duplicate) {
      setError("A farm with this name already exists");
      return;
    }

    let updatedFarms;

    if (editingId) {
      updatedFarms = farms.map((farm) =>
        farm.id === editingId
          ? {
              ...farm,
              name,
              location,
              area,
              crop: form.crop,
              soilType: form.soilType
            }
          : farm
      );
    } else {
      const newFarm = {
        id: `LAND-${Date.now()}`,
        name,
        location,
        area,
        crop: form.crop,
        soilType: form.soilType
      };

      updatedFarms = [...farms, newFarm];
    }

    saveFarms(updatedFarms);
    setForm(emptyFarm);
    setEditingId(null);
  }

  function handleEdit(farm) {
    setForm({
      name: farm.name,
      location: farm.location,
      area: String(farm.area),
      crop: farm.crop,
      soilType: farm.soilType
    });

    setEditingId(farm.id);
    setMessage("");
    setError("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleDelete(farm) {
    const confirmed = window.confirm(
      `Delete "${farm.name}"? This cannot be undone.`
    );

    if (!confirmed) return;

    const updatedFarms = farms.filter(
      (item) => item.id !== farm.id
    );

    saveFarms(updatedFarms);

    if (editingId === farm.id) {
      setEditingId(null);
      setForm(emptyFarm);
    }

    if (localStorage.getItem("drisaSelectedFarm") === farm.id) {
      localStorage.removeItem("drisaSelectedFarm");
    }

    setMessage("Farm deleted successfully");
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyFarm);
    setMessage("");
    setError("");
  }

  if (!farmer) return null;

  return (
    <div className="add-farm-page">
      <header className="add-farm-header">
        <button
          className="add-farm-back"
          onClick={() => navigate("/farms")}
        >
          ← My Farms
        </button>

        <div className="add-farm-brand">
          <span className="add-farm-logo">🌿</span>
          <span>DRISA</span>
        </div>

        <button
          className="add-farm-dashboard-link"
          onClick={() => navigate("/dashboard")}
        >
          Dashboard
        </button>
      </header>

      <main className="add-farm-main">
        <section className="add-farm-hero">
          <div>
            <p className="add-farm-eyebrow">YOUR LAND, YOUR RECORDS</p>
            <h1>Manage your farms</h1>
            <p>
              Keep your farm details organised in one place
            </p>
          </div>
          <div className="add-farm-hero-icon" aria-hidden="true">
            🌾
          </div>
        </section>

        <section className="add-farm-form-card">
          <div className="add-farm-section-title">
            <div>
              <p className="add-farm-eyebrow">
                {editingId ? "UPDATE FARM" : "NEW FARM"}
              </p>
              <h2>{editingId ? "Edit farm details" : "Add a farm"}</h2>
            </div>
            <span className="add-farm-step-icon">＋</span>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="add-farm-form-grid">
              <div className="add-farm-field">
                <label htmlFor="farm-name">Farm name</label>
                <input
                  id="farm-name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Green Valley Farm"
                  maxLength={80}
                  required
                />
              </div>

              <div className="add-farm-field">
                <label htmlFor="farm-location">Farm location</label>
                <input
                  id="farm-location"
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="Village, district, state"
                  maxLength={150}
                  required
                />
              </div>

              <div className="add-farm-field">
                <label htmlFor="farm-area">Farm area in acres</label>
                <input
                  id="farm-area"
                  name="area"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.area}
                  onChange={handleChange}
                  placeholder="e.g. 2.5"
                  required
                />
              </div>

              <div className="add-farm-field">
                <label htmlFor="farm-crop">Main crop</label>
                <select
                  id="farm-crop"
                  name="crop"
                  value={form.crop}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select a crop</option>
                  <option value="Tomato">Tomato</option>
                  <option value="Ragi">Ragi</option>
                  <option value="Paddy">Paddy</option>
                  <option value="Maize">Maize</option>
                  <option value="Wheat">Wheat</option>
                  <option value="Rice">Rice</option>
                  <option value="Sugarcane">Sugarcane</option>
                  <option value="Cotton">Cotton</option>
                  <option value="Groundnut">Groundnut</option>
                  <option value="Millet">Millet</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="add-farm-field add-farm-full-width">
                <label htmlFor="farm-soil">Soil type</label>
                <select
                  id="farm-soil"
                  name="soilType"
                  value={form.soilType}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select soil type</option>
                  <option value="Red Soil">Red Soil</option>
                  <option value="Black Soil">Black Soil</option>
                  <option value="Loamy Soil">Loamy Soil</option>
                  <option value="Sandy Soil">Sandy Soil</option>
                  <option value="Clay Soil">Clay Soil</option>
                  <option value="Alluvial Soil">Alluvial Soil</option>
                  <option value="Other">Other / Unknown</option>
                </select>
              </div>
            </div>

            {error && (
              <p className="add-farm-message add-farm-error">
                {error}
              </p>
            )}

            {message && (
              <p className="add-farm-message add-farm-success">
                {message}
              </p>
            )}

            <div className="add-farm-form-actions">
              <button className="add-farm-submit" type="submit">
                {editingId ? "Save Changes" : "＋ Add Farm"}
              </button>

              {editingId && (
                <button
                  className="add-farm-cancel"
                  type="button"
                  onClick={cancelEdit}
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="add-farm-list-section">
          <div className="add-farm-list-heading">
            <div>
              <p className="add-farm-eyebrow">FARM COLLECTION</p>
              <h2>Your registered farms</h2>
            </div>

            <span className="add-farm-count">
              {farms.length} {farms.length === 1 ? "farm" : "farms"}
            </span>
          </div>

          {farms.length === 0 ? (
            <div className="add-farm-empty">
              <span>🌱</span>
              <h3>No farms added yet</h3>
              <p>Complete the form above to register your first farm</p>
            </div>
          ) : (
            <div className="add-farm-list">
              {farms.map((farm) => (
                <article className="add-farm-item" key={farm.id}>
                  <div className="add-farm-item-icon">🌿</div>

                  <div className="add-farm-item-info">
                    <h3>{farm.name}</h3>
                    <p>📍 {farm.location}</p>

                    <div className="add-farm-item-tags">
                      <span>🌱 {farm.crop}</span>
                      <span>📐 {farm.area} acres</span>
                      <span>🪴 {farm.soilType}</span>
                    </div>
                  </div>

                  <div className="add-farm-item-actions">
                    <button
                      className="add-farm-edit-button"
                      onClick={() => handleEdit(farm)}
                    >
                      Edit
                    </button>
                    <button
                      className="add-farm-delete-button"
                      onClick={() => handleDelete(farm)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <p className="add-farm-storage-note">
          Your changes are currently saved in this browser on this device.
          Cloud synchronisation will require a backend and database.
        </p>
      </main>
    </div>
  );
}

export default AddFarm;
