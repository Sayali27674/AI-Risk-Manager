from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class FraudFeatures(BaseModel):
    model_config = ConfigDict(extra="forbid")

    amount: float = Field(ge=0)
    transaction_frequency: float = Field(ge=0)
    average_user_amount: float = Field(ge=0)
    amount_deviation: float = Field(ge=0)
    transaction_hour: int = Field(ge=0, le=23)
    recent_transaction_count: float = Field(ge=0)
    transaction_type: str = Field(min_length=1, max_length=40)


class ShapFactor(BaseModel):
    feature: str
    value: float | int | str | bool | None
    shap_value: float
    impact_direction: Literal["increases fraud risk", "decreases fraud risk"]
    impact_level: Literal["HIGH", "MEDIUM", "LOW"]
    label: str = "Model Contribution"


class FraudExplanation(BaseModel):
    top_factors: list[ShapFactor]


class FraudPrediction(BaseModel):
    fraud_probability: float = Field(ge=0, le=1)
    is_fraud: bool
    model_version: str
    explanation: FraudExplanation | None = None
