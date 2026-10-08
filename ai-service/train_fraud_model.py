from pathlib import Path

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from xgboost import XGBClassifier

from app.services.fraud_features import (
    CATEGORICAL_FEATURES,
    FEATURES,
    NUMERIC_FEATURES,
    paysim_features,
)

DATA_PATH = Path("data/transactions.csv")
MODEL_PATH = Path("models/xgboost_fraud.joblib")
MODEL_VERSION = "xgboost-v1"


def select_threshold(y_true, probabilities):
    best_threshold, best_f1 = 0.5, -1.0
    for threshold in [i / 100 for i in range(5, 96, 5)]:
        score = f1_score(y_true, probabilities >= threshold, zero_division=0)
        if score > best_f1:
            best_threshold, best_f1 = threshold, score
    return best_threshold


def main():
    if not DATA_PATH.exists():
        raise FileNotFoundError(
            f"{DATA_PATH} not found. Download the PaySim CSV and place it there."
        )

    raw = pd.read_csv(DATA_PATH)
    x, y = paysim_features(raw)

    if y.nunique() != 2:
        raise ValueError("Training data must contain both legitimate and fraud labels.")

    # Reserve test data before threshold selection; it is not used for model fitting.
    x_dev, x_test, y_dev, y_test = train_test_split(
        x, y, test_size=0.2, random_state=42, stratify=y
    )
    x_train, x_valid, y_train, y_valid = train_test_split(
        x_dev, y_dev, test_size=0.2, random_state=42, stratify=y_dev
    )

    fraud_count = int(y_train.sum())
    legitimate_count = len(y_train) - fraud_count
    if fraud_count == 0:
        raise ValueError("Training partition contains no fraud examples.")

    preprocess = ColumnTransformer([
        ("numeric", SimpleImputer(strategy="median"), NUMERIC_FEATURES),
        (
            "categorical",
            Pipeline([
                ("imputer", SimpleImputer(strategy="most_frequent")),
                ("onehot", OneHotEncoder(handle_unknown="ignore")),
            ]),
            CATEGORICAL_FEATURES,
        ),
    ])

    pipeline = Pipeline([
        ("preprocess", preprocess),
        ("model", XGBClassifier(
            n_estimators=400,
            max_depth=6,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            scale_pos_weight=legitimate_count / fraud_count,
            objective="binary:logistic",
            eval_metric="aucpr",
            tree_method="hist",
            random_state=42,
            n_jobs=-1,
        )),
    ])

    pipeline.fit(x_train, y_train)
    validation_probabilities = pipeline.predict_proba(x_valid)[:, 1]
    threshold = select_threshold(y_valid, validation_probabilities)

    test_probabilities = pipeline.predict_proba(x_test)[:, 1]
    test_predictions = test_probabilities >= threshold

    metrics = {
        "threshold": threshold,
        "accuracy": accuracy_score(y_test, test_predictions),
        "precision": precision_score(y_test, test_predictions, zero_division=0),
        "recall": recall_score(y_test, test_predictions, zero_division=0),
        "f1": f1_score(y_test, test_predictions, zero_division=0),
        "roc_auc": roc_auc_score(y_test, test_probabilities),
        "pr_auc": average_precision_score(y_test, test_probabilities),
        "confusion_matrix": confusion_matrix(y_test, test_predictions).tolist(),
    }
    print(pd.Series(metrics).to_string())

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({
        "pipeline": pipeline,
        "threshold": threshold,
        "model_version": MODEL_VERSION,
        "features": FEATURES,
        "metrics": metrics,
    }, MODEL_PATH)
    print(f"Saved fraud model to {MODEL_PATH}")


if __name__ == "__main__":
    main()