# Deploy EvoPay AI: Vercel + Google Cloud Run

**Web app → Vercel · API → Google Cloud Run (Mumbai, `asia-south1`) · Gemini key → Google Secret Manager**

```
Browser ──► evopay-dun.vercel.app (Vercel)
              ├── /           → React app
              └── /api/*      → forwarded by Vercel to Cloud Run "evopay-api"
                                   (FastAPI + ML models + Gemini via Secret Manager)
```

The browser only ever talks to the Vercel domain. Vercel forwards `/api/*` to Cloud Run, so login cookies are first-party and work in every browser (Chrome, Safari, Firefox).

---

## 1. One-time setup (≈15 minutes)

1. **Create a Google Cloud project** at <https://console.cloud.google.com/projectcreate>. Note the **Project ID** (e.g. `evopay-ai-1234`).
2. **Link billing** at <https://console.cloud.google.com/billing>. Cloud Run requires a billing account. If you have Google AI Pro, activate your monthly Cloud credits in the Google Developer Program portal and apply them to this billing account. Cloud Run scales to zero, so an idle demo costs little or nothing — set a **budget alert** (Billing → Budgets & alerts) for peace of mind.
3. **Install the tools** (Windows):
   - Google Cloud CLI: <https://cloud.google.com/sdk/docs/install> (run the installer, keep the defaults)
   - Node.js 20 or newer: <https://nodejs.org>
   - Git, with this repository cloned and the `main` branch checked out
4. **Sign in** (opens a browser window):
   ```powershell
   gcloud auth login
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

The script:
1. enables Cloud Run, Cloud Build, Artifact Registry and Secret Manager, and gives Cloud Build permission to build from source (`roles/run.builder`),
2. asks for your **Gemini API key** (typing is hidden; Enter skips) and stores it in **Secret Manager**,
3. builds the backend container and deploys it to **Cloud Run**,
4. writes the Cloud Run address into `vercel.json` (so Vercel forwards `/api/*`) and `frontend/.env.production`,
5. asks before committing and pushing those two files — Vercel then redeploys automatically.

The first run takes about 5–8 minutes. Re-run the same script any time you change the backend.

## 3. Check it works

1. `https://evopay-dun.vercel.app/api/health` → `{"status":"ok","service":"evopay-ai"}`
2. Open the app → **Open live demo** → **Create account**. You land on a populated workspace (three attacks, everyday payments, open incidents).
3. Click **Ask EvoPay AI** → *Summarise our fraud posture*. A lime **Gemini · gemini-3.5-flash-lite** badge means Gemini is live.

## 4. Judging day

Cloud Run sleeps when idle; the first request after a nap takes a few seconds. Keep one instance warm while judges are using it:

```bash
gcloud run services update evopay-api --region asia-south1 --min-instances 1
```

Afterwards, return to free idle:

```bash
gcloud run services update evopay-api --region asia-south1 --min-instances 0
```

---

## How it is configured

| Setting | Value | Why |
|---|---|---|
| `vercel.json` rewrite | `/api/:path*` → Cloud Run | One domain for the browser; cookies stay first-party. |
| `VITE_API_URL` | `/api` | The web app calls its own domain. |
| `VITE_API_TIMEOUT_MS` | `20000` | Gives Cloud Run time to wake from zero instances. |
| `EVOPAY_ENV` / `COOKIE_SAMESITE` | `production` / `lax` | `Secure`, same-site session cookies. |
| `EVOPAY_STARTER_WORKSPACE` | `true` | New accounts start with a realistic workspace instead of an empty dashboard. |
| `EVOPAY_DATABASE_PATH` | `/tmp/evopay.db` | SQLite on the container's local disk. |
| `--max-instances` | `1` | SQLite lives inside one container, so the demo runs as a single instance. |
| `GEMINI_API_KEY` | Secret Manager `gemini-api-key` | Injected at runtime; only signed-in users can call `/api/analyst`. |
| `Cache-Control` | `private, no-store` on `/api/*` | No CDN ever caches anyone's data. |

### Demo-data note
The demo database lives inside the Cloud Run container, so it **resets when the container restarts** (after a redeploy or a long idle period). Accounts then need to be created again — every new account starts with a fresh starter workspace.

**For production:** move to **Cloud SQL for PostgreSQL** and raise `--max-instances`.

### Before Cloud Run is connected
Until `vercel.json` contains the Cloud Run rewrite, the Vercel site keeps using its built-in demo data, exactly as it does today. Nothing breaks if you deploy later.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Billing account ... not found` / APIs won't enable | Link billing to the project (step 1.2). |
| `...compute@developer.gserviceaccount.com does not have storage.objects.get access` | New projects lack the build permission. Run `gcloud projects add-iam-policy-binding PROJECT_ID --member=serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com --role=roles/run.builder`, wait 2 minutes, re-run the script. (The script now does this automatically.) |
| Cloud Run health check returns 403 | Your organisation blocks public Cloud Run services. Use a personal Google account/project, or ask the admin to allow `allUsers` as invoker on `evopay-api`. |
| `/api/health` on Vercel shows the app page instead of JSON | Vercel hasn't redeployed with the new `vercel.json` yet, or the change wasn't pushed. Check the latest deployment in Vercel. |
| Copilot shows "Gemini unavailable" | Re-run the script and paste the key, or check it in Google AI Studio. Logs: `gcloud run services logs read evopay-api --region asia-south1`. |
| First load shows demo data instead of your workspace | The backend was waking up. Refresh once, or set `--min-instances 1` for the session. |
