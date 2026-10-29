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

## Public deployment

The free deployment guide uses Vercel for the frontend and PythonAnywhere for
the API. See [DEPLOYMENT.md](./DEPLOYMENT.md) for setup instructions and
free-tier limitations.

The public dashboard accepts predictions without sign-in and displays recent
prediction records. Do not enter sensitive customer information.
