import numpy as np
import pandas as pd

NUMERIC_FEATURES = [
    "amount",
    "transaction_frequency",
    "average_user_amount",
    "amount_deviation",
    "transaction_hour",
    "recent_transaction_count",
]
CATEGORICAL_FEATURES = ["transaction_type"]
FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES

PAYSIM_COLUMNS = ["step", "type", "amount", "nameOrig", "isFraud"]


def paysim_features(raw: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    """Build prediction-time features using PaySim transactions and prior history."""
    missing = set(PAYSIM_COLUMNS) - set(raw.columns)
    if missing:
        raise ValueError(f"PaySim CSV is missing columns: {sorted(missing)}")

    frame = raw[PAYSIM_COLUMNS].copy()
    frame["step"] = pd.to_numeric(frame["step"], errors="coerce")
    frame["amount"] = pd.to_numeric(frame["amount"], errors="coerce")
    frame["isFraud"] = pd.to_numeric(frame["isFraud"], errors="coerce")
    frame = frame.dropna(subset=PAYSIM_COLUMNS)
    frame = frame.sort_values("step", kind="stable").reset_index(drop=True)

    groups = frame.groupby("nameOrig", sort=False)
    prior_count = groups.cumcount().astype(float)
    prior_sum = groups["amount"].cumsum() - frame["amount"]
    prior_average = np.divide(
        prior_sum,
        prior_count,
        out=np.zeros(len(frame), dtype=float),
        where=prior_count > 0,
    )

    # Count earlier transactions from the same account in the preceding 24 steps.
    recent = np.zeros(len(frame), dtype=float)
    steps = frame["step"].to_numpy()
    for positions in frame.groupby("nameOrig", sort=False).indices.values():
        positions = np.asarray(positions)
        account_steps = steps[positions]
        first_in_window = np.searchsorted(
            account_steps, account_steps - 24, side="left"
        )
        recent[positions] = np.arange(len(positions)) - first_in_window

    amount = frame["amount"].to_numpy(dtype=float)
    features = pd.DataFrame({
        "amount": amount,
        "transaction_frequency": prior_count.to_numpy(),
        "average_user_amount": prior_average,
        "amount_deviation": (
            np.abs(amount - prior_average) / np.maximum(prior_average, 1.0)
        ),
        # PaySim's step represents an hourly simulation step.
        "transaction_hour": (frame["step"].to_numpy() % 24).astype(int),
        "recent_transaction_count": recent,
        "transaction_type": frame["type"].astype(str).to_numpy(),
    })

    labels = frame["isFraud"].astype(int)
    return features[FEATURES], labels


def prediction_features(payload: dict) -> pd.DataFrame:
    """Validate the API feature contract and return one model-ready row."""
    row = {name: payload[name] for name in FEATURES}
    return pd.DataFrame([row], columns=FEATURES)