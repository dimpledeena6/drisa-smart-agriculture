
from pathlib import Path

import pandas as pd

# Locate the dataset relative to this Python file.
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATASET_PATH = PROJECT_ROOT / "datasets" / "Crop_Recommendation_57000.csv"


def main():
    print("=" * 60)
    print("DRISA - CROP DATASET INSPECTION")
    print("=" * 60)

    if not DATASET_PATH.exists():
        print(f"\nDataset not found:\n{DATASET_PATH}")
        print("\nCheck the filename and datasets folder.")
        return

    try:
        df = pd.read_csv(DATASET_PATH)
    except Exception as error:
        print(f"Could not read CSV: {error}")
        return

    print(f"\nDataset path: {DATASET_PATH}")
    print(f"Rows: {df.shape[0]}")
    print(f"Columns: {df.shape[1]}")

    print("\nColumn names:")
    for column in df.columns:
        print(f"- {column}")

    print("\nFirst five rows:")
    print(df.head().to_string(index=False))

    print("\nData types:")
    print(df.dtypes.to_string())

    print("\nMissing values per column:")
    print(df.isnull().sum().to_string())

    print("\nDuplicate rows:", df.duplicated().sum())

    print("\nNumeric column summary:")
    print(df.describe().to_string())

    # Common target names in crop recommendation datasets.
    target_candidates = [
        "label",
        "crop",
        "recommended_crop",
        "crop_name",
    ]

    target_column = next(
        (
            column
            for column in df.columns
            if column.strip().lower() in target_candidates
        ),
        None,
    )

    if target_column:
        print(f"\nCrop classes in '{target_column}':")
        print(df[target_column].value_counts().to_string())
        print("\nNumber of crop classes:", df[target_column].nunique())
    else:
        print(
            "\nNo obvious crop-label column found. "
            "Review the column names before training."
        )

    print("\nInspection complete. No model has been trained yet.")


if __name__ == "__main__":
    main()
