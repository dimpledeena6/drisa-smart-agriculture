
from pathlib import Path

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import traceback
import io
from PIL import UnidentifiedImageError
from fastapi import UploadFile, File
from disease_model import predict_disease


# --------------------------------------------------
# Paths
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "models"

CROP_MODEL_PATH = MODEL_DIR / "crop_recommendation_svm.joblib"
YIELD_MODEL_PATH = MODEL_DIR / "yield_prediction_extra_trees.joblib"

# --------------------------------------------------
# FastAPI application
# --------------------------------------------------

app = FastAPI(
    title="DRISA Smart Agriculture API",
    description=(
        "Crop recommendation using SVM and "
        "crop yield prediction using Extra Trees Regressor."
    ),
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# --------------------------------------------------
# Request models
# --------------------------------------------------

class CropInput(BaseModel):
    N: float = Field(ge=0, le=300)
    P: float = Field(ge=0, le=200)
    K: float = Field(ge=0, le=250)

    Soil_Moisture_pct: float = Field(ge=0, le=100)
    Soil_pH: float = Field(ge=0, le=14)
    Temperature_C: float = Field(ge=-10, le=60)
    Humidity_pct: float = Field(ge=0, le=100)

    State: str = Field(min_length=1)
    Season: str = Field(min_length=1)
    Soil_Type: str = Field(min_length=1)
    Irrigation_Type: str = Field(min_length=1)
    Water_Availability: str = Field(min_length=1)


class YieldInput(BaseModel):
    crop: str = Field(min_length=1)
    area_acres: float = Field(gt=0, le=100000)
    season: str = Field(min_length=1)
    soil_type: str = Field(min_length=1)

    # Optional information. Missing fields are imputed by
    # the preprocessing pipeline saved with the trained model.
    state: str | None = None
    district: str | None = None
    location: str | None = None
    year: int | None = Field(default=None, ge=1900, le=2200)

    N: float | None = Field(default=None, ge=0, le=300)
    P: float | None = Field(default=None, ge=0, le=200)
    K: float | None = Field(default=None, ge=0, le=250)

    soil_moisture_pct: float | None = Field(
        default=None, ge=0, le=100
    )
    soil_ph: float | None = Field(default=None, ge=0, le=14)
    temperature_c: float | None = Field(
        default=None, ge=-10, le=60
    )
    humidity_pct: float | None = Field(
        default=None, ge=0, le=100
    )

    irrigation_type: str | None = None
    water_availability: str | None = None
    fertilizer_used_kg_ha: float | None = Field(
        default=None, ge=0
    )
    pesticide_used_kg_ha: float | None = Field(
        default=None, ge=0
    )
    previous_crop: str | None = None
    crop_duration_days: float | None = Field(
        default=None, gt=0
    )


# --------------------------------------------------
# Load saved models
# --------------------------------------------------

def load_saved_model(path: Path, model_name: str):
    if not path.exists():
        return None

    saved = joblib.load(path)

    if isinstance(saved, dict):
        loaded_model = saved.get("model")
    else:
        loaded_model = saved

    if loaded_model is None:
        raise RuntimeError(
            f"{model_name} artifact does not contain a model."
        )

    return saved


crop_artifact = load_saved_model(
    CROP_MODEL_PATH, "Crop recommendation"
)

yield_artifact = load_saved_model(
    YIELD_MODEL_PATH, "Yield prediction"
)

crop_model = (
    crop_artifact.get("model")
    if isinstance(crop_artifact, dict)
    else crop_artifact
)

yield_model = (
    yield_artifact.get("model")
    if isinstance(yield_artifact, dict)
    else yield_artifact
)

yield_features = (
    yield_artifact.get("features", [])
    if isinstance(yield_artifact, dict)
    else []
)


# --------------------------------------------------
# General endpoints
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "message": "DRISA Smart Agriculture API is running",
        "crop_recommendation_model_loaded": crop_model is not None,
        "yield_prediction_model_loaded": yield_model is not None,
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "crop_model_loaded": crop_model is not None,
        "yield_model_loaded": yield_model is not None,
    }


# --------------------------------------------------
# Crop recommendation: existing SVM endpoint
# --------------------------------------------------

@app.post("/predict")
def predict_crop(data: CropInput):
    if crop_model is None:
        raise HTTPException(
            status_code=503,
            detail="Crop recommendation model is not available.",
        )

    try:
        input_data = pd.DataFrame([data.model_dump()])
        prediction = crop_model.predict(input_data)[0]

        result = {
            "recommended_crop": str(prediction),
            "model": "Support Vector Machine (RBF kernel)",
            "note": (
                "Model output is not a guarantee of "
                "agronomic suitability."
            ),
        }

        if hasattr(crop_model, "predict_proba"):
            probabilities = crop_model.predict_proba(input_data)[0]
            best_index = int(probabilities.argmax())

            result["confidence_percent"] = round(
                float(probabilities[best_index]) * 100, 2
            )

        return result

    except Exception as exc:
        print(f"Crop prediction error: {exc}")

        raise HTTPException(
            status_code=500,
            detail="Crop prediction failed. Check the backend terminal.",
        ) from exc


# --------------------------------------------------
# Yield prediction: Extra Trees Regressor
# --------------------------------------------------

@app.post("/predict-yield")
def predict_yield(data: YieldInput):
    if yield_model is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "Yield model is not available. "
                "Run train_yield_model.py first."
            ),
        )

    if not yield_features:
        raise HTTPException(
            status_code=500,
            detail="Saved yield model has no feature metadata.",
        )

    try:
        # The model was trained using these dataset column names.
        # Start with all expected columns; unknown inputs are
        # represented as missing and handled by saved imputers.
        row = {feature: None for feature in yield_features}

        area_hectares = data.area_acres * 0.4046856422

        provided_values = {
            "State": data.state,
            "District": data.district,
            "Location": data.location,
            "Year": data.year,
            "Season": data.season,
            "Crop": data.crop,
            "Area_Cultivated_ha": area_hectares,
            "N": data.N,
            "P": data.P,
            "K": data.K,
            "Soil_Moisture_pct": data.soil_moisture_pct,
            "Soil_pH": data.soil_ph,
            "Soil_Type": data.soil_type,
            "Temperature_C": data.temperature_c,
            "Humidity_pct": data.humidity_pct,
            "Irrigation_Type": data.irrigation_type,
            "Water_Availability": data.water_availability,
            "Fertilizer_Used_kg_ha": data.fertilizer_used_kg_ha,
            "Pesticide_Used_kg_ha": data.pesticide_used_kg_ha,
            "Previous_Crop": data.previous_crop,
            "Crop_Duration_days": data.crop_duration_days,
        }

        # Only use columns that the saved model expects.
        for column, value in provided_values.items():
            if column in row and value is not None:
                row[column] = value

        input_data = pd.DataFrame(
            [row],
            columns=yield_features,
        )

        predicted_yield = float(yield_model.predict(input_data)[0])

        if not pd.notna(predicted_yield):
            raise ValueError("Model returned a non-finite prediction.")

        # Yield model predicts tonnes per hectare.
        # Multiply by hectares to estimate total production.
        total_production = predicted_yield * area_hectares

        return {
            "crop": data.crop,
            "model": "Extra Trees Regressor",
            "predicted_yield_t_ha": round(predicted_yield, 3),
            "area_acres": round(data.area_acres, 3),
            "area_hectares": round(area_hectares, 4),
            "estimated_total_production_tonnes": round(
                total_production, 3
            ),
            "unit": "tonnes per hectare",
            "note": (
                "This is a model estimate. Missing input fields are "
                "imputed by the training pipeline; results may be less "
                "reliable when important farm conditions are unavailable."
            ),
        }

    except Exception as exc:
        print(f"Yield prediction error: {exc}")

        raise HTTPException(
            status_code=500,
            detail=(
                "Yield prediction failed. Check the backend terminal "
                "for the underlying error."
            ),
        ) from exc


@app.post("/predict-disease")
async def predict_crop_disease(file: UploadFile = File(...)):

    allowed_types = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ]

    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Please upload a JPG, PNG or WEBP image."
        )

    image_bytes = await file.read()

    if not image_bytes:
        raise HTTPException(
            status_code=400,
            detail="Uploaded image is empty."
        )

    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="Image size must be below 10 MB."
        )

    try:
        result = predict_disease(io.BytesIO(image_bytes))
        return result

    except UnidentifiedImageError:
        raise HTTPException(
            status_code=400,
            detail="Invalid image file."
        )

    except Exception as error:
        print("Disease prediction error:")
        traceback.print_exc()

        raise HTTPException(
        status_code=500,
        detail=f"Disease prediction failed: {str(error)}"
        ) from error

    
