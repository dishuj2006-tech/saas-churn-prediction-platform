# Free public deployment

This project can be deployed without a paid hosting plan using:

- **Vercel Hobby** for the Next.js frontend.
- **PythonAnywhere Beginner** for the Flask API and its SQLite database.

The app and its GitHub repository are public. Anyone can submit predictions,
and the dashboard shows the latest prediction records. Do not enter real or
sensitive customer information.

Free hosting has limits. PythonAnywhere's free account has restricted outbound
internet access and limited resources; Vercel Hobby is intended for personal
projects. Check the providers' current terms and limits before relying on this
setup for business-critical use.

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
   import sys

   project_path = "/home/YOUR-USERNAME/saas-churn-prediction-platform/backend"
   if project_path not in sys.path:
       sys.path.insert(0, project_path)

   from main import app as application
   ```

7. Save the WSGI file and click **Reload** in the Web tab. The SQLite database
   is created in the backend directory. Test:

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

## 3. Allow the Vercel site to call the API

In the PythonAnywhere **Web** tab, reopen the WSGI file and add this before
`from main import app as application`:

```python
import os

os.environ["CORS_ORIGINS"] = "https://YOUR-PROJECT.vercel.app"
```

Replace the example URL with the exact Vercel production origin (no trailing
slash), save the file, and click **Reload**. If your Vercel production domain
changes, update this origin and reload the API.

## Updating the deployment

Push code changes to the GitHub `main` branch. Vercel redeploys the frontend
automatically. To update the PythonAnywhere API, run `git pull` in its Bash
console, then click **Reload** in the Web tab.

The deployment uses SQLite stored on PythonAnywhere, so prediction history
persists with that backend app. Keep the database private and avoid collecting
sensitive customer data: the prediction-history endpoint is public.

## Local development

The backend defaults to `backend/saas_churn.db` and serves on
`http://127.0.0.1:8000` when run with `python main.py`. The frontend defaults
to that local API unless `NEXT_PUBLIC_API_URL` is set.

## Provider information

- [PythonAnywhere free accounts and pricing](https://www.pythonanywhere.com/pricing/)
- [PythonAnywhere Flask deployment guide](https://help.pythonanywhere.com/pages/Flask/)
- [Vercel Hobby plan](https://vercel.com/docs/plans/hobby)
