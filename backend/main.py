import math
import os
import re
import secrets
from functools import wraps

import numpy as np
import pandas as pd
from flask import Flask, g, jsonify, request
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from sqlalchemy import func
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sqlalchemy.exc import IntegrityError
from werkzeug.security import check_password_hash, generate_password_hash

from database import ChurnPredictionLog, SessionLocal, User, init_db

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024

app_secret_key = os.getenv("APP_SECRET_KEY")
if not app_secret_key:
    if os.getenv("PYTHONANYWHERE_SITE") or os.getenv("RENDER"):
        raise RuntimeError("APP_SECRET_KEY must be configured for deployment.")
    app_secret_key = secrets.token_urlsafe(48)
    app.logger.warning(
        "APP_SECRET_KEY is unset; using a temporary local key. "
        "Set APP_SECRET_KEY to keep accounts valid across restarts."
    )
app.config["SECRET_KEY"] = app_secret_key

allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
    ).split(",")
    if origin.strip()
]
CORS(app, origins=allowed_origins)
limiter = Limiter(key_func=get_remote_address, app=app, default_limits=[])
auth_tokens = URLSafeTimedSerializer(app_secret_key, salt="saas-churn-auth-v1")
AUTH_TOKEN_MAX_AGE_SECONDS = 12 * 60 * 60
VALID_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
CONTRACT_TYPES = {"Monthly", "Annual", "Two-Year"}
PAYMENT_METHODS = {"Credit Card", "Bank Transfer", "PayPal"}

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


def get_customer_data():
    customer = request.get_json(silent=True)
    if not isinstance(customer, dict):
        return None, (jsonify(detail="Request body must be a JSON object."), 400)

    try:
        customer_data = {
            "tenure_months": int(customer["tenure_months"]),
            "monthly_charges": float(customer["monthly_charges"]),
            "support_tickets": int(customer["support_tickets"]),
            "contract_type": customer["contract_type"],
            "payment_method": customer["payment_method"],
        }
    except (KeyError, TypeError, ValueError):
        return None, (
            jsonify(detail="Provide valid customer metrics for all required fields."),
            400,
        )

    if (
        not isinstance(customer_data["contract_type"], str)
        or customer_data["contract_type"] not in CONTRACT_TYPES
        or not isinstance(customer_data["payment_method"], str)
        or customer_data["payment_method"] not in PAYMENT_METHODS
    ):
        return None, (
            jsonify(detail="Choose a supported contract type and payment method."),
            400,
        )
    if not math.isfinite(customer_data["monthly_charges"]):
        return None, (
            jsonify(detail="Monthly charges must be a finite number."),
            400,
        )
    if (
        customer_data["tenure_months"] < 0
        or customer_data["support_tickets"] < 0
        or customer_data["monthly_charges"] < 0
    ):
        return None, (
            jsonify(detail="Customer metrics cannot be negative."),
            400,
        )
    return customer_data, None


def calculate_prediction(customer_data):
    input_df = pd.DataFrame([customer_data])
    prediction = int(model_pipeline.predict(input_df)[0])
    probability = float(model_pipeline.predict_proba(input_df)[0][1])
    return {
        "churn_prediction": prediction,
        "churn_probability": round(probability * 100, 2),
        "risk_level": "High Risk" if probability > 0.5 else "Low Risk",
    }


def require_authentication(handler):
    @wraps(handler)
    def wrapped(*args, **kwargs):
        authorization = request.headers.get("Authorization", "")
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() != "bearer" or not token:
            return jsonify(detail="Sign in to access this account."), 401
        try:
            payload = auth_tokens.loads(token, max_age=AUTH_TOKEN_MAX_AGE_SECONDS)
            user_id = payload.get("user_id")
        except (BadSignature, SignatureExpired, AttributeError):
            return jsonify(detail="Your sign-in has expired. Please sign in again."), 401

        with SessionLocal() as db:
            user = db.query(User).filter(User.id == user_id).first()
            if user is None:
                return jsonify(detail="Your account is no longer available."), 401
            g.user_id = user.id
        return handler(*args, **kwargs)

    return wrapped


@app.post("/api/auth/register")
@limiter.limit("5 per minute")
def register():
    credentials = request.get_json(silent=True)
    if not isinstance(credentials, dict):
        return jsonify(detail="Request body must be a JSON object."), 400

    email = credentials.get("email")
    password = credentials.get("password")
    if not isinstance(email, str):
        return jsonify(detail="Enter a valid email address."), 400
    normalized_email = email.strip().lower()
    if len(normalized_email) > 254 or not VALID_EMAIL.fullmatch(normalized_email):
        return jsonify(detail="Enter a valid email address."), 400
    if not isinstance(password, str) or not 12 <= len(password) <= 128:
        return jsonify(detail="Password must be between 12 and 128 characters."), 400

    try:
        with SessionLocal.begin() as db:
            if db.query(User).filter(User.email == normalized_email).first():
                return jsonify(detail="An account with that email already exists."), 409
            user = User(
                email=normalized_email,
                password_hash=generate_password_hash(password),
            )
            db.add(user)
            db.flush()
            token = auth_tokens.dumps({"user_id": user.id})
    except IntegrityError:
        return jsonify(detail="An account with that email already exists."), 409

    return jsonify(token=token, email=normalized_email), 201


@app.post("/api/auth/login")
@limiter.limit("5 per minute")
def login():
    credentials = request.get_json(silent=True)
    if not isinstance(credentials, dict):
        return jsonify(detail="Request body must be a JSON object."), 400

    email = credentials.get("email")
    password = credentials.get("password")
    if not isinstance(email, str) or not isinstance(password, str):
        return jsonify(detail="Enter your email and password."), 400

    with SessionLocal() as db:
        user = db.query(User).filter(User.email == email.strip().lower()).first()
        if user is None or not check_password_hash(user.password_hash, password):
            return jsonify(detail="Email or password is incorrect."), 401
        token = auth_tokens.dumps({"user_id": user.id})

    return jsonify(token=token, email=email.strip().lower())


@app.delete("/api/account")
@require_authentication
def delete_account():
    with SessionLocal.begin() as db:
        db.query(ChurnPredictionLog).filter(
            ChurnPredictionLog.user_id == g.user_id
        ).delete(synchronize_session=False)
        db.query(User).filter(User.id == g.user_id).delete(synchronize_session=False)
    return jsonify(detail="Account and saved predictions deleted.")


@app.get("/health")
def health_check():
    return jsonify(status="ok")


@app.errorhandler(429)
def handle_rate_limit(error):
    return jsonify(detail="Too many account requests. Try again in a minute."), 429


@app.post("/api/predict-churn")
@limiter.limit("30 per minute")
@require_authentication
def predict_churn():
    customer_data, error = get_customer_data()
    if error:
        return error

    prediction = calculate_prediction(customer_data)

    with SessionLocal.begin() as db:
        db_log = ChurnPredictionLog(
            user_id=g.user_id,
            **customer_data,
            **prediction,
        )
        db.add(db_log)
        db.flush()
        db.refresh(db_log)
        return jsonify(
            id=db_log.id,
            **prediction,
            logged_at=db_log.created_at.isoformat(),
        )


@app.post("/api/demo/predict-churn")
@limiter.limit("30 per minute")
def predict_demo_churn():
    customer_data, error = get_customer_data()
    if error:
        return error
    return jsonify(calculate_prediction(customer_data))


@app.get("/api/prediction-history")
@require_authentication
def get_history():
    db = SessionLocal()
    try:
        logs = (
            db.query(ChurnPredictionLog)
            .filter(ChurnPredictionLog.user_id == g.user_id)
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
@require_authentication
def get_analytics_summary():
    db = SessionLocal()
    try:
        user_predictions = db.query(ChurnPredictionLog).filter(
            ChurnPredictionLog.user_id == g.user_id
        )
        total_predictions = user_predictions.count()
        high_risk_count = (
            user_predictions.filter(ChurnPredictionLog.risk_level == "High Risk")
            .count()
        )
        average_charges = (
            user_predictions.with_entities(
                func.avg(ChurnPredictionLog.monthly_charges)
            ).scalar()
            or 0.0
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
