# Public deployment

This project uses Vercel for the Next.js frontend, Render for the FastAPI API,
and a hosted PostgreSQL database such as Neon. The app is public and does not
require sign-in; anyone with the frontend URL can submit predictions.

## 1. Push the project to GitHub

Create an empty GitHub repository, then from this project directory run:

```powershell
git init
git add .
git commit -m "Prepare SaaS churn app for deployment"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

Replace the remote URL with your repository's URL. Do not commit `.env` files,
database files, passwords, or connection strings.

## 2. Create the database

Create a PostgreSQL database with a provider such as Neon. Copy its connection
string (including its SSL option, if provided). Treat this string as a secret.

## 3. Deploy the API on Render

In Render, create a Blueprint from the GitHub repository and select the
repository's `render.yaml`. Set the following values when prompted:

- `DATABASE_URL`: the PostgreSQL connection string from the database provider.
- `CORS_ORIGINS`: temporarily use `http://localhost:3000`; replace it with the
  Vercel domain after the frontend is deployed.

After deployment, check `https://YOUR-API.onrender.com/health`. It should return
`{"status":"ok"}`. Render's free web service may sleep when idle, so the first
request after a period of inactivity can take longer.

## 4. Deploy the frontend on Vercel

Import the same GitHub repository into Vercel and set the project **Root
Directory** to `frontend`. Add this environment variable:

- `NEXT_PUBLIC_API_URL`: `https://YOUR-API.onrender.com` (no trailing slash).

Deploy, then copy the Vercel domain into Render's `CORS_ORIGINS` value from
step 3 and redeploy the API. Add comma-separated origins if you also want
Vercel preview deployments to access the API. The browser only needs the
public API URL; never put the database connection string in a `NEXT_PUBLIC_`
variable.

## Local development

No environment variables are required for local development. The backend uses
`backend/saas_churn.db` by default, and the frontend uses `http://localhost:8000`
unless `NEXT_PUBLIC_API_URL` is set.
