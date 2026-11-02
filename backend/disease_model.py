
from pathlib import Path

import numpy as np
import tensorflow as tf
from PIL import Image


MODEL_PATH = (
    Path(__file__).parent
    / "models"
    / "model_4_mobilenet_finetuned.keras"
)

CLASS_NAMES = [
    "Apple___Apple_scab",
    "Apple___Black_rot",
    "Apple___Cedar_apple_rust",
    "Apple___Healthy",
    "Blueberry___Healthy",
    "Cherry___Powdery_mildew",
    "Cherry___Healthy",
    "Corn___Cercospora_leaf_spot_Gray_leaf_spot",
    "Corn___Common_rust",
    "Corn___Northern_Leaf_Blight",
    "Corn___Healthy",
    "Grape___Black_rot",
    "Grape___Esca_(Black_Measles)",
    "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)",
    "Grape___Healthy",
    "Orange___Haunglongbing_(Citrus_greening)",
    "Peach___Bacterial_spot",
    "Peach___Healthy",
    "Pepper,_bell___Bacterial_spot",
    "Pepper,_bell___Healthy",
    "Potato___Early_blight",
    "Potato___Late_blight",
    "Potato___Healthy",
    "Raspberry___Healthy",
    "Soybean___Healthy",
    "Squash___Powdery_mildew",
    "Strawberry___Leaf_scorch",
    "Strawberry___Healthy",
    "Tomato___Bacterial_spot",
    "Tomato___Early_blight",
    "Tomato___Late_blight",
    "Tomato___Leaf_Mold",
    "Tomato___Septoria_leaf_spot",
    "Tomato___Spider_mites_Two-spotted_spider_mite",
    "Tomato___Target_Spot",
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus",
    "Tomato___Tomato_mosaic_virus",
    "Tomato___Healthy",
]

_model = None


def get_disease_model():
    global _model

    if _model is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Disease model not found: {MODEL_PATH}"
            )

        _model = tf.keras.models.load_model(MODEL_PATH)

        if _model.output_shape[-1] != len(CLASS_NAMES):
            raise ValueError(
                "Model output count does not match disease labels."
            )

    return _model


def predict_disease(image_file):
    model = get_disease_model()

    image = Image.open(image_file).convert("RGB")
    image = image.resize((224, 224))

    image_array = np.asarray(image, dtype=np.float32)
    image_array = np.expand_dims(image_array, axis=0)

    predictions = model.predict(image_array, verbose=0)[0]

    predicted_index = int(np.argmax(predictions))
    confidence = float(predictions[predicted_index])

    class_name = CLASS_NAMES[predicted_index]

    crop_name, disease_name = class_name.split("___", 1)

    is_healthy = "healthy" in disease_name.lower()

    top_indices = np.argsort(predictions)[-3:][::-1]

    top_predictions = []

    for index in top_indices:
        label = CLASS_NAMES[int(index)]
        crop, disease = label.split("___", 1)

        top_predictions.append({
            "crop": crop,
            "disease": disease.replace("_", " "),
            "confidence": round(float(predictions[index]) * 100, 2)
        })

    return {
        "crop": crop_name,
        "disease": disease_name.replace("_", " "),
        "class_name": class_name,
        "confidence": round(confidence * 100, 2),
        "is_healthy": is_healthy,
        "needs_review": confidence < 0.60,
        "top_predictions": top_predictions
    }
