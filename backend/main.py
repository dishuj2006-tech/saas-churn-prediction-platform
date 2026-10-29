import math
import os

import numpy as np
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS
from sqlalchemy import func
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from database import ChurnPredictionLog, SessionLocal, init_db

app = Flask(__name__)

allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
    ).split(",")
    if origin.strip()
]
CORS(app, origins=allowed_origins)

np.random.seed(42)
n_samples = 1000
data = {
    "tenure_months": np.random.randint(1, 72, size=n_samples),
    "monthly_charges": np.random.uniform(20, 300, size=n_samples),
    "support_tickets": np.random.randint(0, 10, size=n_samples),
    "contract_type": np.random.choice(["Monthly", "Annual", "Two-Year"], size=n_samples),
    "payment_method": np.random.choice(["Credit Card", "Bank Transfer", "PayPal"], size=n_samples),
}
df = pd.DataFrame(data)
churn_prob = (
    (df["contract_type"] == "Monthly") * 0.4
    + (df["support_tickets"] > 4) * 0.3
    + (df["monthly_charges"] > 200) * 0.2
    - (df["tenure_months"] / 100) * 0.3
)
df["churn"] = (
    churn_prob + np.random.uniform(0, 0.3, size=n_samples) > 0.4
).astype(int)

X = df.drop(columns=["churn"])
y = df["churn"]

preprocessor = ColumnTransformer(
    transformers=[
        ("num", StandardScaler(), ["tenure_months", "monthly_charges", "support_tickets"]),
        ("cat", OneHotEncoder(handle_unknown="ignore"), ["contract_type", "payment_method"]),
    ]
)
model_pipeline = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        ("classifier", RandomForestClassifier(random_state=42)),
    ]
)
model_pipeline.fit(X, y)

init_db()


@app.get("/health")
def health_check():
    return jsonify(status="ok")


@app.post("/api/predict-churn")
def predict_churn():
    customer = request.get_json(silent=True)
    if not isinstance(customer, dict):
        return jsonify(detail="Request body must be a JSON object."), 400

    try:
        tenure_months = int(customer["tenure_months"])
        monthly_charges = float(customer["monthly_charges"])
        support_tickets = int(customer["support_tickets"])
        contract_type = customer["contract_type"]
        payment_method = customer["payment_method"]
    except (KeyError, TypeError, ValueError):
        return jsonify(detail="Provide valid customer metrics for all required fields."), 400

    if not isinstance(contract_type, str) or not isinstance(payment_method, str):
        return jsonify(detail="Contract type and payment method must be strings."), 400
    if not math.isfinite(monthly_charges):
        return jsonify(detail="Monthly charges must be a finite number."), 400

    customer_data = {
        "tenure_months": tenure_months,
        "monthly_charges": monthly_charges,
        "support_tickets": support_tickets,
        "contract_type": contract_type,
        "payment_method": payment_method,
    }
    input_df = pd.DataFrame([customer_data])
    prediction = int(model_pipeline.predict(input_df)[0])
    probability = float(model_pipeline.predict_proba(input_df)[0][1])
    probability_percent = round(probability * 100, 2)
    risk = "High Risk" if probability > 0.5 else "Low Risk"

    with SessionLocal.begin() as db:
        db_log = ChurnPredictionLog(
            **customer_data,
            churn_prediction=prediction,
            churn_probability=probability_percent,
            risk_level=risk,
        )
        db.add(db_log)
        db.flush()
        db.refresh(db_log)
        return jsonify(
            id=db_log.id,
            churn_prediction=prediction,
            churn_probability=probability_percent,
            risk_level=risk,
            logged_at=db_log.created_at.isoformat(),
        )


@app.get("/api/prediction-history")
def get_history():
    db = SessionLocal()
    try:
        logs = (
            db.query(ChurnPredictionLog)
            .order_by(ChurnPredictionLog.created_at.desc())
            .limit(10)
            .all()
        )
        return jsonify(
            [
                {
                    "id": log.id,
                    "tenure_months": log.tenure_months,
                    "monthly_charges": log.monthly_charges,
                    "support_tickets": log.support_tickets,
                    "contract_type": log.contract_type,
                    "payment_method": log.payment_method,
                    "churn_prediction": log.churn_prediction,
                    "churn_probability": log.churn_probability,
                    "risk_level": log.risk_level,
                    "created_at": log.created_at.isoformat(),
                }
                for log in logs
            ]
        )
    finally:
        db.close()


@app.get("/api/analytics-summary")
def get_analytics_summary():
    db = SessionLocal()
    try:
        total_predictions = db.query(ChurnPredictionLog).count()
        high_risk_count = (
            db.query(ChurnPredictionLog)
            .filter(ChurnPredictionLog.risk_level == "High Risk")
            .count()
        )
        average_charges = (
            db.query(func.avg(ChurnPredictionLog.monthly_charges)).scalar() or 0.0
        )
        return jsonify(
            total_predictions=total_predictions,
            high_risk_count=high_risk_count,
            low_risk_count=total_predictions - high_risk_count,
            average_monthly_charges=round(average_charges, 2),
        )
    finally:
        db.close()


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.getenv("PORT", "8000")))
