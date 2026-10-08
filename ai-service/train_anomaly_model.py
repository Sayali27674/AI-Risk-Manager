from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from app.services.feature_extractor import FEATURE_NAMES

DATA_PATH = Path("data/transactions.csv")
MODEL_PATH = Path("models/isolation_forest.joblib")


def main():
    if not DATA_PATH.exists():
        raise FileNotFoundError(
            f"{DATA_PATH} not found. Export historical transaction features first."
        )

    data = pd.read_csv(DATA_PATH)

    missing = [name for name in FEATURE_NAMES if name not in data.columns]
    if missing:
        raise ValueError(f"Missing feature columns: {missing}")

    x = data[FEATURE_NAMES].apply(pd.to_numeric, errors="coerce")

    pipeline = Pipeline(
        [
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
            (
                "model",
                IsolationForest(
                    n_estimators=200,
                    contamination="auto",
                    random_state=42,
                    n_jobs=-1,
                ),
            ),
        ]
    )

    pipeline.fit(x)

    scores = pipeline.decision_function(x)
    bundle = {
        "model": pipeline,
        "score_low": float(scores.min()),
        "score_high": float(scores.max()),
        "feature_names": FEATURE_NAMES,
    }

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, MODEL_PATH)
    print(f"Saved model to {MODEL_PATH}")


if __name__ == "__main__":
    main()