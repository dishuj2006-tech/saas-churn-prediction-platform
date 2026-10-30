import os
import unittest

os.environ["DATABASE_URL"] = "sqlite://"
os.environ["APP_SECRET_KEY"] = "test-only-signing-key"

from database import ChurnPredictionLog, SessionLocal, User
from main import app
from werkzeug.security import check_password_hash


class AccountPrivacyTests(unittest.TestCase):
    def setUp(self):
        app.config["TESTING"] = True
        self.client = app.test_client()
        with SessionLocal.begin() as db:
            db.query(ChurnPredictionLog).delete()
            db.query(User).delete()

    def register(self, email):
        response = self.client.post(
            "/api/auth/register",
            json={"email": email, "password": "valid-test-password"},
        )
        self.assertEqual(response.status_code, 201)
        return response.get_json()["token"]

    def account_headers(self, token):
        return {"Authorization": f"Bearer {token}"}

    def test_demo_predictions_are_not_saved_and_history_requires_auth(self):
        response = self.client.post(
            "/api/demo/predict-churn",
            json={
                "tenure_months": 12,
                "monthly_charges": 85,
                "support_tickets": 2,
                "contract_type": "Monthly",
                "payment_method": "Credit Card",
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("id", response.get_json())
        self.assertEqual(
            self.client.get("/api/prediction-history").status_code, 401
        )
        self.assertEqual(self.client.get("/api/analytics-summary").status_code, 401)
        with SessionLocal() as db:
            self.assertEqual(db.query(ChurnPredictionLog).count(), 0)

    def test_history_and_analytics_are_isolated_by_account(self):
        first_token = self.register("first@example.com")
        second_token = self.register("second@example.com")
        prediction = self.client.post(
            "/api/predict-churn",
            headers=self.account_headers(first_token),
            json={
                "tenure_months": 12,
                "monthly_charges": 85,
                "support_tickets": 2,
                "contract_type": "Monthly",
                "payment_method": "Credit Card",
            },
        )
        self.assertEqual(prediction.status_code, 200)

        first_history = self.client.get(
            "/api/prediction-history", headers=self.account_headers(first_token)
        )
        second_history = self.client.get(
            "/api/prediction-history", headers=self.account_headers(second_token)
        )
        self.assertEqual(len(first_history.get_json()), 1)
        self.assertEqual(second_history.get_json(), [])

        first_analytics = self.client.get(
            "/api/analytics-summary", headers=self.account_headers(first_token)
        )
        second_analytics = self.client.get(
            "/api/analytics-summary", headers=self.account_headers(second_token)
        )
        self.assertEqual(first_analytics.get_json()["total_predictions"], 1)
        self.assertEqual(second_analytics.get_json()["total_predictions"], 0)

    def test_registration_hashes_password_and_rejects_short_password(self):
        invalid = self.client.post(
            "/api/auth/register",
            json={"email": "short@example.com", "password": "short"},
            environ_overrides={"REMOTE_ADDR": "192.0.2.10"},
        )
        self.assertEqual(invalid.status_code, 400)

        response = self.client.post(
            "/api/auth/register",
            json={"email": "hashed@example.com", "password": "valid-test-password"},
            environ_overrides={"REMOTE_ADDR": "192.0.2.11"},
        )
        self.assertEqual(response.status_code, 201)
        with SessionLocal() as db:
            user = db.query(User).filter_by(email="hashed@example.com").one()
            self.assertNotEqual(user.password_hash, "valid-test-password")
            self.assertTrue(check_password_hash(user.password_hash, "valid-test-password"))

    def test_account_deletion_removes_only_that_accounts_records(self):
        first_token = self.register("delete@example.com")
        second_token = self.register("keep@example.com")
        response = self.client.post(
            "/api/predict-churn",
            headers=self.account_headers(first_token),
            json={
                "tenure_months": 12,
                "monthly_charges": 85,
                "support_tickets": 2,
                "contract_type": "Monthly",
                "payment_method": "Credit Card",
            },
        )
        self.assertEqual(response.status_code, 200)
        other_prediction = self.client.post(
            "/api/predict-churn",
            headers=self.account_headers(second_token),
            json={
                "tenure_months": 24,
                "monthly_charges": 100,
                "support_tickets": 1,
                "contract_type": "Annual",
                "payment_method": "PayPal",
            },
        )
        self.assertEqual(other_prediction.status_code, 200)

        deleted = self.client.delete(
            "/api/account", headers=self.account_headers(first_token)
        )
        self.assertEqual(deleted.status_code, 200)
        self.assertEqual(
            len(
                self.client.get(
                    "/api/prediction-history",
                    headers=self.account_headers(second_token),
                ).get_json()
            ),
            1,
        )
        with SessionLocal() as db:
            self.assertEqual(db.query(User).filter_by(email="delete@example.com").count(), 0)
            self.assertEqual(db.query(ChurnPredictionLog).count(), 1)


if __name__ == "__main__":
    unittest.main()
