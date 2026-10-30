# SaaS Churn Prediction Platform

An interactive dashboard for predicting subscription churn risk, viewing
prediction history, and summarizing churn analytics.

## Run locally

Install the backend dependencies and start the Flask API:

```bash
cd backend
pip install -r requirement.txt
python main.py
```

In another terminal, start the Next.js frontend:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

The public demo does not save predictions. Create an account to save prediction
history privately to that account. For local use, the API generates a temporary
signing key if `APP_SECRET_KEY` is not set; set a persistent random key to keep
accounts signed in after restarting the API.

## Public deployment

The free deployment guide uses Vercel for the frontend and PythonAnywhere for
the API. See [DEPLOYMENT.md](./DEPLOYMENT.md) for setup instructions and
free-tier limitations.

The anonymous demo does not store input. Signed-in users can store prediction
metrics, and each account only sees its own records. The app does not collect
customer names or IDs. Free hosting is intended for a non-critical demo; do not
use it for sensitive, regulated, or business-critical customer data.

The churn model is trained on generated synthetic data, not a real business
dataset. Its scores are for demonstration and have not been validated for
customer decisions.
