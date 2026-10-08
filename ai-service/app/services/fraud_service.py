from functools import lru_cache
import logging
from pathlib import Path

import joblib
import numpy as np

try:
    import shap
except ImportError:
    shap = None

from app.services.fraud_features import prediction_features

MODEL_PATH = Path(__file__).resolve().parents[2] / "models" / "xgboost_fraud.joblib"
logger = logging.getLogger(__name__)


def impact_level(shap_value: float) -> str:
    magnitude = abs(shap_value)
    if magnitude >= 1:
        return "HIGH"
    if magnitude >= 0.25:
        return "MEDIUM"
    return "LOW"


def friendly_feature_name(feature_name: str) -> str:
    return (
        feature_name.replace("numeric__", "")
        .replace("categorical__", "")
        .replace("transaction_type_", "transaction_type=")
    )


@lru_cache(maxsize=1)
def load_bundle():
    if not MODEL_PATH.exists():
        raise RuntimeError("Fraud model is not trained or is unavailable.")
    return joblib.load(MODEL_PATH)


def predict_fraud(payload: dict) -> dict:
    bundle = load_bundle()
    row = prediction_features(payload)
    pipeline = bundle["pipeline"]
    probability = float(pipeline.predict_proba(row)[0, 1])

    return {
        "fraud_probability": probability,
        "is_fraud": probability >= float(bundle["threshold"]),
        "model_version": bundle["model_version"],
        "explanation": explain_prediction(bundle, row, payload),
    }


def explain_prediction(bundle: dict, row, payload: dict) -> dict | None:
    try:
        if shap is None:
            logger.error("SHAP is not installed; skipping fraud explanation")
            return None

        pipeline = bundle["pipeline"]
        preprocess = pipeline.named_steps["preprocess"]
        model = pipeline.named_steps["model"]

        transformed = preprocess.transform(row)
        if hasattr(transformed, "toarray"):
            transformed = transformed.toarray()

        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(transformed)
        if isinstance(shap_values, list):
            shap_values = shap_values[-1]

        values = np.asarray(shap_values)
        if values.ndim == 3:
            values = values[0, :, -1]
        else:
            values = values[0]

        feature_names = preprocess.get_feature_names_out()
        transformed_values = transformed[0]

        factors = []
        for name, value, shap_value in zip(feature_names, transformed_values, values):
            shap_value = float(shap_value)
            clean_name = friendly_feature_name(str(name))
            source_feature = clean_name.split("=")[0]
            actual_value = payload.get(source_feature, float(value))
            factors.append({
                "feature": clean_name,
                "value": actual_value,
                "shap_value": round(shap_value, 6),
                "impact_direction": (
                    "increases fraud risk"
                    if shap_value >= 0
                    else "decreases fraud risk"
                ),
                "impact_level": impact_level(shap_value),
                "label": "Model Contribution",
            })

        top_factors = sorted(
            factors,
            key=lambda factor: abs(factor["shap_value"]),
            reverse=True,
        )[:5]

        return {"top_factors": top_factors}
    except Exception:
        logger.exception("SHAP explanation failed")
        return None
