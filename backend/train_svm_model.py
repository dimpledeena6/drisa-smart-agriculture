
from pathlib import Path
import json
import time
import joblib
import pandas as pd
import matplotlib.pyplot as plt

from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.svm import SVC
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    ConfusionMatrixDisplay,
    precision_score,
    recall_score,
    f1_score,
)


# ==================================================
# DRISA - SVM CROP RECOMMENDATION MODEL
# ==================================================

PROJECT_ROOT = Path(__file__).resolve().parent.parent

DATASET_PATH = (
    PROJECT_ROOT / "datasets" / "Crop_Recommendation_57000.csv"
)

MODEL_DIR = Path(__file__).resolve().parent / "models"

MODEL_PATH = MODEL_DIR / "crop_recommendation_svm.joblib"
METRICS_PATH = MODEL_DIR / "svm_evaluation_metrics.json"
CONFUSION_MATRIX_PATH = MODEL_DIR / "svm_confusion_matrix.png"

NUMERIC_FEATURES = [
    "N",
    "P",
    "K",
    "Soil_Moisture_pct",
    "Soil_pH",
    "Temperature_C",
    "Humidity_pct",
]

CATEGORICAL_FEATURES = [
    "State",
    "Season",
    "Soil_Type",
    "Irrigation_Type",
    "Water_Availability",
]

FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES
TARGET = "Crop"

TEST_SIZE = 0.30
RANDOM_STATE = 42


def main():
    print("=" * 65)
    print("DRISA - SVM CROP RECOMMENDATION TRAINING AND EVALUATION")
    print("=" * 65)

    # --------------------------------------------------
    # 1. CHECK DATASET
    # --------------------------------------------------

    if not DATASET_PATH.exists():
        raise FileNotFoundError(
            f"Dataset not found: {DATASET_PATH}"
        )

    df = pd.read_csv(DATASET_PATH)

    required_columns = FEATURES + [TARGET]

    missing_columns = [
        column
        for column in required_columns
        if column not in df.columns
    ]

    if missing_columns:
        raise ValueError(
            f"Dataset is missing columns: {missing_columns}"
        )

    original_rows = len(df)

    df = df[required_columns].copy()

    # Convert numeric columns.
    for column in NUMERIC_FEATURES:
        df[column] = pd.to_numeric(
            df[column], errors="coerce"
        )

    # Clean categorical values.
    for column in CATEGORICAL_FEATURES + [TARGET]:
        df[column] = (
            df[column]
            .astype("string")
            .str.strip()
            .replace("", pd.NA)
        )

    # Remove rows without required input or target values.
    df = df.dropna(subset=required_columns).copy()

    if df.empty:
        raise ValueError(
            "No usable records remain after cleaning the dataset."
        )

    X = df[FEATURES]
    y = df[TARGET].astype(str)

    if y.nunique() < 2:
        raise ValueError(
            "At least two crop classes are required to train the SVM."
        )

    # Ensure stratified splitting is possible.
    class_counts = y.value_counts()

    if class_counts.min() < 2:
        raise ValueError(
            "Each crop class needs at least two records "
            "for stratified train-test splitting."
        )

    print(f"\nOriginal records: {original_rows}")
    print(f"Usable records: {len(df)}")
    print(f"Removed records: {original_rows - len(df)}")
    print(f"Number of features: {len(FEATURES)}")
    print(f"Number of crop classes: {y.nunique()}")

    print("\nCrop class distribution:")
    print(y.value_counts().sort_index().to_string())

    # --------------------------------------------------
    # 2. SPLIT DATASET
    # --------------------------------------------------

    print("\nSplitting dataset into 70% training and 30% testing...")

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=y,
    )

    print(f"Training records: {len(X_train)}")
    print(f"Testing records: {len(X_test)}")

    # --------------------------------------------------
    # 3. PREPROCESSING
    # --------------------------------------------------

    numeric_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
    ])

    categorical_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("encoder", OneHotEncoder(handle_unknown="ignore")),
    ])

    preprocessing = ColumnTransformer([
        (
            "numeric",
            numeric_pipeline,
            NUMERIC_FEATURES,
        ),
        (
            "categorical",
            categorical_pipeline,
            CATEGORICAL_FEATURES,
        ),
    ])

    # --------------------------------------------------
    # 4. BUILD SVM MODEL
    # --------------------------------------------------

    model = Pipeline([
        ("preprocessing", preprocessing),
        ("classifier", SVC(
            kernel="rbf",
            C=3.0,
            gamma="scale",
            class_weight="balanced",
            probability=True,
            random_state=RANDOM_STATE,
        )),
    ])

    # --------------------------------------------------
    # 5. TRAIN MODEL
    # --------------------------------------------------

    print("\nTraining SVM. This may take several minutes...")

    training_start = time.time()

    model.fit(X_train, y_train)

    training_seconds = time.time() - training_start

    print(f"Training time: {training_seconds:.2f} seconds")

    # --------------------------------------------------
    # 6. EVALUATE ON HELD-OUT TEST DATA
    # --------------------------------------------------

    print("\nEvaluating the trained model...")

    evaluation_start = time.time()

    predictions = model.predict(X_test)

    evaluation_seconds = time.time() - evaluation_start

    accuracy = accuracy_score(y_test, predictions)

    macro_precision = precision_score(
        y_test,
        predictions,
        average="macro",
        zero_division=0,
    )

    macro_recall = recall_score(
        y_test,
        predictions,
        average="macro",
        zero_division=0,
    )

    macro_f1 = f1_score(
        y_test,
        predictions,
        average="macro",
        zero_division=0,
    )

    weighted_precision = precision_score(
        y_test,
        predictions,
        average="weighted",
        zero_division=0,
    )

    weighted_recall = recall_score(
        y_test,
        predictions,
        average="weighted",
        zero_division=0,
    )

    weighted_f1 = f1_score(
        y_test,
        predictions,
        average="weighted",
        zero_division=0,
    )

    # --------------------------------------------------
    # 7. PRINT EVALUATION METRICS
    # --------------------------------------------------

    print("\n" + "=" * 65)
    print("SVM TEST RESULTS")
    print("=" * 65)

    print(f"Test accuracy:       {accuracy:.4f} ({accuracy * 100:.2f}%)")
    print(f"Macro precision:     {macro_precision:.4f}")
    print(f"Macro recall:        {macro_recall:.4f}")
    print(f"Macro F1-score:      {macro_f1:.4f}")
    print(f"Weighted precision:  {weighted_precision:.4f}")
    print(f"Weighted recall:     {weighted_recall:.4f}")
    print(f"Weighted F1-score:   {weighted_f1:.4f}")
    print(f"Evaluation time:     {evaluation_seconds:.2f} seconds")

    # Per-crop precision, recall, F1 and support.
    report = classification_report(
        y_test,
        predictions,
        labels=model.classes_,
        output_dict=True,
        zero_division=0,
    )

    print("\nClassification Report:")
    print(classification_report(
        y_test,
        predictions,
        labels=model.classes_,
        zero_division=0,
    ))

    # --------------------------------------------------
    # 8. CONFUSION MATRIX
    # --------------------------------------------------

    labels = model.classes_

    matrix = confusion_matrix(
        y_test,
        predictions,
        labels=labels,
    )

    print("\nConfusion Matrix:")
    print(matrix)

    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    fig, ax = plt.subplots(figsize=(12, 10))

    display = ConfusionMatrixDisplay(
        confusion_matrix=matrix,
        display_labels=labels,
    )

    display.plot(
        ax=ax,
        cmap="Greens",
        xticks_rotation=45,
        values_format="d",
        colorbar=False,
    )

    ax.set_title("DRISA SVM Crop Recommendation - Confusion Matrix")
    ax.set_xlabel("Predicted Crop")
    ax.set_ylabel("Actual Crop")

    fig.tight_layout()
    fig.savefig(
        CONFUSION_MATRIX_PATH,
        dpi=200,
        bbox_inches="tight",
    )
    plt.close(fig)

    print(f"\nConfusion matrix saved to:\n{CONFUSION_MATRIX_PATH}")

    # --------------------------------------------------
    # 9. SAVE METRICS TO JSON
    # --------------------------------------------------

    metrics = {
        "algorithm": "Support Vector Machine (RBF kernel)",
        "dataset": DATASET_PATH.name,
        "original_records": int(original_rows),
        "usable_records": int(len(df)),
        "removed_records": int(original_rows - len(df)),
        "number_of_features": int(len(FEATURES)),
        "number_of_classes": int(y.nunique()),
        "training_records": int(len(X_train)),
        "testing_records": int(len(X_test)),
        "test_size": TEST_SIZE,
        "random_state": RANDOM_STATE,
        "training_time_seconds": round(training_seconds, 3),
        "evaluation_time_seconds": round(evaluation_seconds, 3),
        "accuracy": float(accuracy),
        "accuracy_percent": round(float(accuracy * 100), 2),
        "macro_precision": float(macro_precision),
        "macro_recall": float(macro_recall),
        "macro_f1_score": float(macro_f1),
        "weighted_precision": float(weighted_precision),
        "weighted_recall": float(weighted_recall),
        "weighted_f1_score": float(weighted_f1),
        "classification_report": report,
        "confusion_matrix_labels": labels.tolist(),
        "confusion_matrix": matrix.tolist(),
    }

    with open(METRICS_PATH, "w", encoding="utf-8") as file:
        json.dump(metrics, file, indent=4)

    print(f"Evaluation metrics saved to:\n{METRICS_PATH}")

    # --------------------------------------------------
    # 10. SAVE TRAINED MODEL
    # --------------------------------------------------

    artifact = {
        "model": model,
        "algorithm": "Support Vector Machine (RBF kernel)",
        "features": FEATURES,
        "target": TARGET,
        "test_accuracy": float(accuracy),
        "macro_precision": float(macro_precision),
        "macro_recall": float(macro_recall),
        "macro_f1_score": float(macro_f1),
        "weighted_f1_score": float(weighted_f1),
        "random_state": RANDOM_STATE,
        "test_size": TEST_SIZE,
    }

    joblib.dump(artifact, MODEL_PATH)

    print(f"\nTrained SVM model saved to:\n{MODEL_PATH}")

    print("\n" + "=" * 65)
    print("TRAINING AND EVALUATION COMPLETED")
    print("=" * 65)

    print("\nGenerated files:")
    print("1. crop_recommendation_svm.joblib")
    print("2. svm_evaluation_metrics.json")
    print("3. svm_confusion_matrix.png")


if __name__ == "__main__":
    main()
