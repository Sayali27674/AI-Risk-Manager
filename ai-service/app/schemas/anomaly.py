from pydantic import BaseModel, Field


class AnomalyFeatures(BaseModel):
    amount: float = Field(ge=0)
    average_user_amount: float = Field(ge=0)
    amount_deviation: float = Field(ge=0)
    transaction_frequency: float = Field(ge=0)
    hour: int = Field(ge=0, le=23)
    is_new_device: bool = False
    is_new_location: bool = False
    vendor_risk_score: float = Field(ge=0, le=30)
    recent_transaction_count: int = Field(ge=0)


class AnomalyPrediction(BaseModel):
    anomaly_score: float = Field(ge=0, le=100)
    is_anomaly: bool
    model_version: str
    available: bool = True