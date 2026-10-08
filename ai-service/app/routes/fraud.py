import logging

from fastapi import APIRouter, HTTPException

from app.schemas.fraud import FraudFeatures, FraudPrediction
from app.services.fraud_service import predict_fraud

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/fraud", tags=["fraud"])


@router.post("/predict", response_model=FraudPrediction)
def fraud_prediction(features: FraudFeatures):
    try:
        return predict_fraud(features.model_dump())
    except RuntimeError as error:
        logger.error("Fraud prediction unavailable: %s", error)
        raise HTTPException(status_code=503, detail="Fraud prediction unavailable") from error
    except Exception as error:
        logger.exception("Fraud prediction failed")
        raise HTTPException(status_code=500, detail="Fraud prediction failed") from error