import datetime
import os
from pathlib import Path

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    create_engine,
    inspect,
    text,
)
from sqlalchemy.engine import URL
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")
if SQLALCHEMY_DATABASE_URL is None:
    SQLALCHEMY_DATABASE_URL = URL.create(
        "sqlite", database=str(Path(__file__).resolve().with_name("saas_churn.db"))
    )
elif SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace(
        "postgres://", "postgresql+psycopg://", 1
    )
elif SQLALCHEMY_DATABASE_URL.startswith("postgresql://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace(
        "postgresql://", "postgresql+psycopg://", 1
    )

connect_args = (
    {"check_same_thread": False}
    if str(SQLALCHEMY_DATABASE_URL).startswith("sqlite")
    else {}
)
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


class ChurnPredictionLog(Base):
    __tablename__ = "churn_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    tenure_months = Column(Integer)
    monthly_charges = Column(Float)
    support_tickets = Column(Integer)
    contract_type = Column(String)
    payment_method = Column(String)
    churn_prediction = Column(Integer)
    churn_probability = Column(Float)
    risk_level = Column(String)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(254), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)


def init_db():
    Base.metadata.create_all(bind=engine)
    columns = {column["name"] for column in inspect(engine).get_columns("churn_logs")}
    with engine.begin() as connection:
        if "user_id" not in columns:
            connection.execute(
                text(
                    "ALTER TABLE churn_logs "
                    "ADD COLUMN user_id INTEGER REFERENCES users(id)"
                )
            )
        connection.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_churn_logs_user_id "
                "ON churn_logs (user_id)"
            )
        )
