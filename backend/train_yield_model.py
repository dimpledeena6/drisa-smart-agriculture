
import json
import time
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.ensemble import ExtraTreesRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


# --------------------------------------------------
# 1. PROJECT CONFIGURATION
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent

DATA_PATH = (
    BASE_DIR
    / "datasets"
    / "Crop_Recommendation_57000.csv"
)

MODEL_DIR = Path(__file__).resolve().parent / "models"

TARGET = "Actual_Yield_t_ha"

MODEL_PATH = MODEL_DIR / "yield_prediction_extra_trees.joblib"
METRICS_PATH = MODEL_DIR / "yield_evaluation_metrics.json"

MODEL_DIR.mkdir(parents=True, exist_ok=True)


# --------------------------------------------------
# 2. LOAD AND VALIDATE DATASET
# --------------------------------------------------

def load_dataset():
    print("\nLoading yield dataset...")

    if not DATA_PATH.exists():
        raise FileNotFoundError(
            f"Dataset not found: {DATA_PATH}\n"
            "Check the CSV path and filename."
        )

    df = pd.read_csv(DATA_PATH)

    print(f"Original dataset shape: {df.shape}")

    if TARGET not in df.columns:
        possible_targets = [
            col for col in df.columns
            if "yield" in col.lower()
        ]

        raise ValueError(
            f"Target column '{TARGET}' was not found.\n"
            f"Possible yield columns: {possible_targets}\n"
            f"Available columns: {df.columns.tolist()}"
        )

    # Convert target to numeric values.
    df[TARGET] = pd.to_numeric(
        df[TARGET],
        errors="coerce",
    )

    # Replace infinite values with missing values.
    df = df.replace([np.inf, -np.inf], np.nan)

    # Remove rows without valid yield values.
    df = df.dropna(subset=[TARGET])

    # Yield must be positive.
    df = df[df[TARGET] > 0].copy()

    if len(df) < 20:
        raise ValueError(
            "Too few valid yield records to train reliably."
        )

    print(f"Usable records: {len(df)}")

    return df


# --------------------------------------------------
# 3. PREPARE FEATURES AND TARGET
# --------------------------------------------------

def prepare_features(df):
    print("\nPreparing model features...")

    # Target leakage prevention:
    # Production is directly related to actual yield.
    # Do not provide production or the target itself as input.
    excluded_columns = [
        TARGET,
        "Production_tonnes",
    ]

    X = df.drop(
        columns=excluded_columns,
        errors="ignore",
    ).copy()

    y = df[TARGET].copy()

    # Remove columns containing no usable information.
    X = X.dropna(axis=1, how="all")

    # Exclude constant columns.
    constant_columns = [
        col for col in X.columns
        if X[col].nunique(dropna=True) <= 1
    ]

    if constant_columns:
        X = X.drop(columns=constant_columns)

    if X.shape[1] == 0:
        raise ValueError("No usable input features remain.")

    # Detect numeric and categorical columns.
    numeric_features = X.select_dtypes(
        include=["number"]
    ).columns.tolist()

    categorical_features = X.select_dtypes(
        exclude=["number"]
    ).columns.tolist()

    print("Input features:", X.columns.tolist())
    print("Numeric features:", numeric_features)
    print("Categorical features:", categorical_features)
    print("Target: Actual yield (tonnes/hectare)")

    return (
        X,
        y,
        numeric_features,
        categorical_features,
    )


# --------------------------------------------------
# 4. BUILD EXTRA TREES REGRESSION PIPELINE
# --------------------------------------------------

def build_model(numeric_features, categorical_features):
    transformers = []

    if numeric_features:
        numeric_pipeline = Pipeline([
            (
                "imputer",
                SimpleImputer(strategy="median"),
            ),
        ])

        transformers.append(
            ("numeric", numeric_pipeline, numeric_features)
        )

    if categorical_features:
        categorical_pipeline = Pipeline([
            (
                "imputer",
                SimpleImputer(strategy="most_frequent"),
            ),
            (
                "encoder",
                OneHotEncoder(handle_unknown="ignore"),
            ),
        ])

        transformers.append(
            (
                "categorical",
                categorical_pipeline,
                categorical_features,
            )
        )

    preprocessor = ColumnTransformer(
        transformers=transformers
    )

    # Extra Trees is different from the three algorithms
    # used in your base paper.
    model = Pipeline([
        ("preprocessor", preprocessor),
        (
            "regressor",
            ExtraTreesRegressor(
                n_estimators=200,
                random_state=42,
                n_jobs=-1,
                min_samples_leaf=2,
            ),
        ),
    ])

    return model


# --------------------------------------------------
# 5. TRAIN AND EVALUATE MODEL
# --------------------------------------------------

def train_and_evaluate(X, y, model):
    print("\nSplitting dataset...")

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.30,
        random_state=42,
    )

    print(f"Training records: {len(X_train)}")
    print(f"Testing records: {len(X_test)}")

    print("\nTraining Extra Trees Regressor...")

    start_time = time.time()

    model.fit(X_train, y_train)

    training_time = time.time() - start_time

    print(f"Training completed in {training_time:.2f} seconds")

    predictions = model.predict(X_test)

    mae = mean_absolute_error(y_test, predictions)

    rmse = float(
        np.sqrt(mean_squared_error(y_test, predictions))
    )

    r2 = r2_score(y_test, predictions)

    metrics = {
        "model": "ExtraTreesRegressor",
        "target": TARGET,
        "target_unit": "tonnes per hectare",
        "dataset_rows_used": int(len(X)),
        "training_rows": int(len(X_train)),
        "testing_rows": int(len(X_test)),
        "number_of_features": int(X.shape[1]),
        "features": X.columns.tolist(),
        "test_size": 0.30,
        "random_state": 42,
        "training_time_seconds": round(training_time, 2),
        "MAE": float(mae),
        "RMSE": float(rmse),
        "R2": float(r2),
    }

    print("\n========== MODEL EVALUATION ==========")
    print("Algorithm: Extra Trees Regressor")
    print(f"MAE:  {mae:.4f} tonnes/hectare")
    print(f"RMSE: {rmse:.4f} tonnes/hectare")
    print(f"R2:   {r2:.4f}")
    print("======================================")

    return model, metrics


# --------------------------------------------------
# 6. SAVE MODEL AND EVALUATION METRICS
# --------------------------------------------------

def save_outputs(model, X, metrics):
    print("\nSaving trained model...")

    artifact = {
        "model": model,
        "features": X.columns.tolist(),
        "target": TARGET,
        "target_unit": "tonnes per hectare",
        "algorithm": "ExtraTreesRegressor",
    }

    joblib.dump(artifact, MODEL_PATH)

    with open(
        METRICS_PATH,
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(metrics, file, indent=4)

    print(f"Model saved: {MODEL_PATH}")
    print(f"Metrics saved: {METRICS_PATH}")


# --------------------------------------------------
# 7. MAIN EXECUTION
# --------------------------------------------------

def main():
    df = load_dataset()

    (
        X,
        y,
        numeric_features,
        categorical_features,
    ) = prepare_features(df)

    model = build_model(
        numeric_features,
        categorical_features,
    )

    model, metrics = train_and_evaluate(
        X,
        y,
        model,
    )

    save_outputs(model, X, metrics)

    print("\nYield model training finished successfully.")


if __name__ == "__main__":
    main()
