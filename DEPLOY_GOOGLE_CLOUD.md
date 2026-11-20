# Deploy EvoPay AI on Google Cloud

**Frontend → Firebase Hosting · Backend → Cloud Run (Mumbai, `asia-south1`) · AI → Gemini via Secret Manager**

```
Browser ──► Firebase Hosting (your-project.web.app)
              ├── /           → React app (frontend/dist)
              └── /api/**     → Cloud Run service "evopay-api" (FastAPI + ML models)
                                   └── Gemini API (key from Secret Manager)
```

Everything is served from one domain, so login cookies work without third-party-cookie problems.

---

## 1. One-time setup (≈15 minutes)

1. **Create the project.** Go to <https://console.firebase.google.com> → *Add project*. This also creates the Google Cloud project. Note the **Project ID** (e.g. `evopay-ai-1234`).
2. **Turn on billing.** In the Firebase console, upgrade to the **Blaze** plan (or link a billing account in <https://console.cloud.google.com/billing>). Cloud Run requires it. Google AI Pro subscribers can activate monthly Cloud credits in the Google Developer Program portal and apply them to this billing account. Cloud Run scales to zero, so an idle demo costs little or nothing.
3. **Install the tools** (Windows):
   - Google Cloud CLI: <https://cloud.google.com/sdk/docs/install> (run the installer, keep the defaults)
   - Node.js 20 or newer: <https://nodejs.org>
   - Firebase CLI — in PowerShell: `npm install -g firebase-tools`
4. **Sign in** (each opens a browser window):
   ```powershell
   gcloud auth login
   firebase login
   ```

## 2. Deploy

From the repository folder:

**Windows (PowerShell)**
```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\deploy\deploy-google.ps1 -ProjectId YOUR_PROJECT_ID
```

**macOS / Linux / Cloud Shell**
```bash
./deploy/deploy-google.sh YOUR_PROJECT_ID
```

The script asks for your **Gemini API key** (typing is hidden; press Enter to skip), then:
1. enables Cloud Run, Cloud Build, Artifact Registry and Secret Manager,
2. stores the Gemini key in **Secret Manager** (never in code),
3. builds the backend container and deploys it to **Cloud Run**,
4. builds the web app and deploys it to **Firebase Hosting**.

The first run takes about 5–8 minutes. When it finishes:
- App: `https://YOUR_PROJECT_ID.web.app`
- Health check: `https://YOUR_PROJECT_ID.web.app/api/health` → `{"status":"ok","service":"evopay-ai"}`

To ship changes later, run the same script again.

## 3. Check it works

1. Open the app → **Open live demo** → **Create account**.
2. You land on a populated workspace (three attacks, everyday payments, open incidents) — every new account gets one.
3. Click **Ask EvoPay AI** → *Summarise our fraud posture*. A lime **Gemini · gemini-3.5-flash-lite** badge means Gemini is live.

## 4. Judging day

Cloud Run sleeps when idle, and the first request after a nap takes a few seconds. Keep one instance warm during judging:

```bash
gcloud run services update evopay-api --region asia-south1 --min-instances 1
```

Afterwards, return to free idle:

```bash
gcloud run services update evopay-api --region asia-south1 --min-instances 0
```

---

## How the deployment is configured

| Setting | Value | Why |
|---|---|---|
| `EVOPAY_SESSION_COOKIE` | `__session` | Firebase Hosting forwards only a cookie named `__session` to Cloud Run. |
| `COOKIE_SAMESITE` / `EVOPAY_ENV` | `lax` / `production` | Same-origin, `Secure` cookies. |
| CSRF | header checked against the session-bound token | Works even though Firebase strips the readable CSRF cookie in transit. |
| `EVOPAY_STARTER_WORKSPACE` | `true` | New accounts start with a realistic workspace instead of an empty dashboard. |
| `EVOPAY_DATABASE_PATH` | `/tmp/evopay.db` | SQLite on the container's local disk. |
| `--max-instances` | `1` | SQLite lives inside one container, so the demo runs as a single instance. |
| `GEMINI_API_KEY` | Secret Manager `gemini-api-key` | Injected at runtime; only signed-in users can call `/api/analyst`. |
| `Cache-Control` | `private, no-store` on `/api/*` | Firebase's CDN never caches anyone's data. |

### Demo-data note
The demo database lives inside the Cloud Run container, so it **resets when the container restarts** (after a redeploy or a long idle period). Accounts and records then need to be created again — which is convenient for judging, since every account starts clean with a starter workspace.

**For production:** point the backend at **Cloud SQL for PostgreSQL** and raise `--max-instances`. This is on the roadmap and is the next step after a pilot.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Billing account ... not found` / APIs won't enable | Link billing to the project (step 1.2). |
| `/api/health` returns 403 | Your organisation blocks public Cloud Run services. Use a personal Google account/project, or ask the admin to allow `allUsers` invoker on `evopay-api`. |
| Signing in loops back to the login page | The Cloud Run service must have `EVOPAY_SESSION_COOKIE=__session`. Re-run the deploy script. |
| Copilot shows "Gemini unavailable" | Re-run the script and paste the key, or check the key in Google AI Studio. Logs: `gcloud run services logs read evopay-api --region asia-south1`. |
| First load shows demo data instead of your workspace | The backend was waking up. Refresh once, or set `--min-instances 1` for the session. |
| `Cloud Run region is not supported` from Firebase | Keep the service in `asia-south1` (as configured) or another region Firebase Hosting supports. |
