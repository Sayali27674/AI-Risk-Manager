from pathlib import Path

import joblib
import numpy as np

from app.services.feature_extractor import extract_features

MODEL_PATH = Path("models/isolation_forest.joblib")
MODEL_VERSION = "isolation-forest-v1"

_model = None


def load_model():
    global _model

    if _model is None:
        if not MODEL_PATH.exists():
            raise RuntimeError(
                f"Model file not found: {MODEL_PATH}. "
                "Run train_anomaly_model.py first."
            )

        _model = joblib.load(MODEL_PATH)

    return _model


def predict(features: dict) -> dict:
    model_bundle = load_model()
    model = model_bundle["model"]

    values = np.asarray([extract_features(features)], dtype=float)
    decision = float(model.decision_function(values)[0])
    prediction = int(model.predict(values)[0])

    low = float(model_bundle["score_low"])
    high = float(model_bundle["score_high"])

    # Lower Isolation Forest decision values indicate more anomalous behavior.
    anomaly_score = ((high - decision) / max(high - low, 1e-9)) * 100
    anomaly_score = float(np.clip(anomaly_score, 0, 100))

    return {
        "anomaly_score": round(anomaly_score, 2),
        "is_anomaly": prediction == -1,
        "model_version": MODEL_VERSION,
        "available": True,
    }