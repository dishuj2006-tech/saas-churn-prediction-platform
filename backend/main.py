import os

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlalchemy.orm import Session
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from pydantic import BaseModel

from database import SessionLocal, init_db, ChurnPredictionLog

app = FastAPI(title="SaaS Churn Prediction API")

allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.on_event("startup")
def startup_event():
    init_db()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class CustomerData(BaseModel):
    tenure_months: int
    monthly_charges: float
    support_tickets: int
    contract_type: str
    payment_method: str

# Seed sample data & train Scikit-Learn model pipeline on startup
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
    (df["contract_type"] == "Monthly") * 0.4 +
    (df["support_tickets"] > 4) * 0.3 +
    (df["monthly_charges"] > 200) * 0.2 -
    (df["tenure_months"] / 100) * 0.3
)
df["churn"] = (churn_prob + np.random.uniform(0, 0.3, size=n_samples) > 0.4).astype(int)

X = df.drop(columns=["churn"])
y = df["churn"]

preprocessor = ColumnTransformer(
    transformers=[
        ("num", StandardScaler(), ["tenure_months", "monthly_charges", "support_tickets"]),
        ("cat", OneHotEncoder(handle_unknown="ignore"), ["contract_type", "payment_method"])
    ]
)
model_pipeline = Pipeline(steps=[
    ("preprocessor", preprocessor),
    ("classifier", RandomForestClassifier(random_state=42))
])
model_pipeline.fit(X, y)

@app.post("/api/predict-churn")
def predict_churn(customer: CustomerData, db: Session = Depends(get_db)):
    customer_dict = customer.dict()
    input_df = pd.DataFrame([customer_dict])
    prediction = int(model_pipeline.predict(input_df)[0])
    probability = float(model_pipeline.predict_proba(input_df)[0][1])
    prob_percent = round(probability * 100, 2)
    risk = "High Risk" if probability > 0.5 else "Low Risk"

    # Save to database
    db_log = ChurnPredictionLog(
        tenure_months=customer.tenure_months,
        monthly_charges=customer.monthly_charges,
        support_tickets=customer.support_tickets,
        contract_type=customer.contract_type,
        payment_method=customer.payment_method,
        churn_prediction=prediction,
        churn_probability=prob_percent,
        risk_level=risk
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)

    return {
        "id": db_log.id,
        "churn_prediction": prediction,
        "churn_probability": prob_percent,
        "risk_level": risk,
        "logged_at": db_log.created_at
    }

@app.get("/api/prediction-history")
def get_history(db: Session = Depends(get_db)):
    logs = db.query(ChurnPredictionLog).order_by(ChurnPredictionLog.created_at.desc()).limit(10).all()
    return logs

# Add this new analytics endpoint
@app.get("/api/analytics-summary")
def get_analytics_summary(db: Session = Depends(get_db)):
    total_predictions = db.query(ChurnPredictionLog).count()
    high_risk_count = db.query(ChurnPredictionLog).filter(ChurnPredictionLog.risk_level == "High Risk").count()
    low_risk_count = total_predictions - high_risk_count
    avg_charges = db.query(func.avg(ChurnPredictionLog.monthly_charges)).scalar() or 0.0

    return {
        "total_predictions": total_predictions,
        "high_risk_count": high_risk_count,
        "low_risk_count": low_risk_count,
        "average_monthly_charges": round(avg_charges, 2)
    }