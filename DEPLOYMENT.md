# Free public deployment

This project can be deployed without a paid hosting plan using:

- **Vercel Hobby** for the Next.js frontend.
- **PythonAnywhere Beginner** for the Flask API and its SQLite database.

The anonymous demo does not store predictions. Users can register accounts to
save prediction metrics; history and analytics are filtered to the signed-in
account. The app does not collect customer names or IDs. Accounts do not have
email verification or password recovery. The churn model is trained on
synthetic data and is not validated for real customer decisions.

Free hosting has limits. PythonAnywhere's free account has restricted outbound
internet access and limited resources; Vercel Hobby is intended for personal
projects. Check the providers' current terms and limits before relying on this
setup for business-critical use. This setup has no managed database backups or
service-level guarantees. Do not use it for sensitive, regulated, or
business-critical customer data.

## 1. Deploy the API on PythonAnywhere

1. Create a free PythonAnywhere Beginner account and open a **Bash console**.
2. Clone this public repository and install the backend dependencies:

   ```bash
   git clone https://github.com/dishuj2006-tech/saas-churn-prediction-platform.git
   cd saas-churn-prediction-platform/backend
   mkvirtualenv --python=python3.13 churn-env
   pip install -r requirement.txt
   ```

   If Python 3.13 is not offered for your account, choose a Python version
   available in PythonAnywhere's **Web** tab and use that version with
   `mkvirtualenv`.

3. In the **Web** tab, add a web app. Select **Manual configuration** and the
   same Python version used for the virtual environment.
4. Set the web app's **Working directory** to:

   ```text
   /home/YOUR-USERNAME/saas-churn-prediction-platform/backend
   ```

   Replace `YOUR-USERNAME` with your PythonAnywhere username.
5. Set **Virtualenv** to:

   ```text
   /home/YOUR-USERNAME/.virtualenvs/churn-env
   ```

6. Open the WSGI configuration file linked in the Web tab. Replace its
   application setup with the following, filling in your username:

   ```python
   import os
   import sys

   os.environ["APP_SECRET_KEY"] = "PASTE_A_RANDOM_SECRET_HERE"
   os.environ["CORS_ORIGINS"] = "https://YOUR-PROJECT.vercel.app"

   project_path = "/home/YOUR-USERNAME/saas-churn-prediction-platform/backend"
   if project_path not in sys.path:
       sys.path.insert(0, project_path)

   from main import app as application
   ```

   Generate the secret in the Bash console with
   `python -c "import secrets; print(secrets.token_urlsafe(48))"` and paste the
   output into the WSGI file. Keep it private and unchanged between restarts.

7. Save the WSGI file and click **Reload** in the Web tab. The SQLite database
   is created in the backend directory and upgraded automatically. Existing
   prediction rows without an account are not shown to any user. Test:

   ```text
   https://YOUR-USERNAME.pythonanywhere.com/health
   ```

   It should return `{"status":"ok"}`.

## 2. Deploy the frontend on Vercel

1. Import `dishuj2006-tech/saas-churn-prediction-platform` into Vercel.
2. Set the project **Root Directory** to `frontend`.
3. Add this environment variable:

   ```text
   NEXT_PUBLIC_API_URL=https://YOUR-USERNAME.pythonanywhere.com
   ```

4. Deploy and copy the production URL Vercel assigns to the app.

## 3. Configure the Vercel origin on the API

In the PythonAnywhere **Web** tab, reopen the WSGI file and update the
`CORS_ORIGINS` value you added in step 6:

Replace the example URL with the exact Vercel production origin (no trailing
slash), save the file, and click **Reload**. If your Vercel production domain
changes, update this origin and reload the API.

Visitors can try predictions in demo mode without an account; those inputs are
not stored. Creating an account requires an email and a password of at least
12 characters. Sign-in tokens expire after 12 hours. There is no email
verification or password-reset flow, so users who forget a password cannot
recover that account. Users can delete their account and saved predictions
from the dashboard. Account registration, login, and prediction endpoints are
rate-limited in process memory; limits can reset on restarts and may vary across
workers.

## Updating the deployment

Push code changes to the GitHub `main` branch. Vercel redeploys the frontend
automatically. To update the PythonAnywhere API, run `git pull` in its Bash
console, then click **Reload** in the Web tab.

The deployment uses SQLite stored on PythonAnywhere, so account and prediction
records persist with that backend app. Avoid collecting customer names, IDs, or
other identifying information. Only submit metrics you are authorized to
process. Prediction scores are not validated for operational use. Do not rely
on the free tier for sensitive data, backups, or production availability.

## Local development

The backend defaults to `backend/saas_churn.db` and serves on
`http://127.0.0.1:8000` when run with `python main.py`. The frontend defaults
to that local API unless `NEXT_PUBLIC_API_URL` is set. Set a persistent
`APP_SECRET_KEY` in your local environment to keep accounts signed in across
API restarts.

## Provider information

- [PythonAnywhere free accounts and pricing](https://www.pythonanywhere.com/pricing/)
- [PythonAnywhere Flask deployment guide](https://help.pythonanywhere.com/pages/Flask/)
- [Vercel Hobby plan](https://vercel.com/docs/plans/hobby)
