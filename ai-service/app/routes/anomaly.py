from fastapi import APIRouter, HTTPException

from app.schemas.anomaly import AnomalyFeatures, AnomalyPrediction
from app.services.anomaly_service import predict

router = APIRouter(prefix="/api/anomaly", tags=["anomaly"])


@router.post("/predict", response_model=AnomalyPrediction)
def predict_anomaly(features: AnomalyFeatures):
    try:
        return predict(features.model_dump())
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error