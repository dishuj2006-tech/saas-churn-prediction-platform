from sqlalchemy import create_engine, Column, Integer, Float, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import datetime

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./saas_churn.db")
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace(
        "postgres://", "postgresql+psycopg://", 1
    )
elif SQLALCHEMY_DATABASE_URL.startswith("postgresql://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace(
        "postgresql://", "postgresql+psycopg://", 1
    )

connect_args = {"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class ChurnPredictionLog(Base):
    __tablename__ = "churn_logs"

    id = Column(Integer, primary_key=True, index=True)
    tenure_months = Column(Integer)
    monthly_charges = Column(Float)
    support_tickets = Column(Integer)
    contract_type = Column(String)
    payment_method = Column(String)
    churn_prediction = Column(Integer)
    churn_probability = Column(Float)
    risk_level = Column(String)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

def init_db():
    Base.metadata.create_all(bind=engine)