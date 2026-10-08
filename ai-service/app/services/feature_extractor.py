from typing import Any

FEATURE_NAMES = [
    "amount",
    "average_user_amount",
    "amount_deviation",
    "transaction_frequency",
    "hour",
    "is_new_device",
    "is_new_location",
    "vendor_risk_score",
    "recent_transaction_count",
]


def extract_features(data: dict[str, Any]) -> list[float]:
    amount = float(data.get("amount", 0))
    average = float(data.get("average_user_amount", 0))

    return [
        amount,
        average,
        float(data.get("amount_deviation", abs(amount - average))),
        float(data.get("transaction_frequency", 0)),
        float(data.get("hour", 0)),
        float(bool(data.get("is_new_device", False))),
        float(bool(data.get("is_new_location", False))),
        float(data.get("vendor_risk_score", 0)),
        float(data.get("recent_transaction_count", 0)),
    ]