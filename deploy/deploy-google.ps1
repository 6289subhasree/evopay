<#
  EvoPay AI — deploy to Google Cloud (Cloud Run API + Firebase Hosting web app)

  Usage (PowerShell, from the repository root):
    .\deploy\deploy-google.ps1 -ProjectId your-project-id

  You will be asked for your Gemini API key (input is hidden). Press Enter to skip.
  Prerequisites and troubleshooting: DEPLOY_GOOGLE_CLOUD.md
#>
param(
  [Parameter(Mandatory = $true)][string]$ProjectId,
  [string]$Region = "asia-south1",
  [string]$Service = "evopay-api"
)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
function Step($text) { Write-Host "`n==> $text" -ForegroundColor Green }
function Check($what) { if ($LASTEXITCODE -ne 0) { throw "$what failed (exit code $LASTEXITCODE). See DEPLOY_GOOGLE_CLOUD.md > Troubleshooting." } }

Step "Using project $ProjectId ($Region)"
gcloud config set project $ProjectId | Out-Null; Check "Selecting the project"

Step "Enabling Google Cloud APIs (Cloud Run, Cloud Build, Artifact Registry, Secret Manager)"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com
Check "Enabling APIs (is billing linked to the project?)"

# --- Gemini key -> Secret Manager -------------------------------------------
$secure = Read-Host "Gemini API key (hidden; press Enter to skip)" -AsSecureString
$GeminiKey = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
$SecretFlag = @()
if ($GeminiKey) {
  Step "Storing the Gemini key in Secret Manager (gemini-api-key)"
  $tmp = New-TemporaryFile
  [IO.File]::WriteAllText($tmp, $GeminiKey)
  $exists = $true
  try { gcloud secrets describe gemini-api-key --format="value(name)" 2>$null | Out-Null; if ($LASTEXITCODE -ne 0) { $exists = $false } } catch { $exists = $false }
  if ($exists) { gcloud secrets versions add gemini-api-key --data-file=$tmp | Out-Null }
  else { gcloud secrets create gemini-api-key --replication-policy=automatic --data-file=$tmp | Out-Null }
  Remove-Item $tmp -Force
  $ProjectNumber = gcloud projects describe $ProjectId --format="value(projectNumber)"
  gcloud secrets add-iam-policy-binding gemini-api-key --member="serviceAccount:$ProjectNumber-compute@developer.gserviceaccount.com" --role="roles/secretmanager.secretAccessor" | Out-Null
  $SecretFlag = @("--set-secrets", "GEMINI_API_KEY=gemini-api-key:latest")
} else {
  Write-Host "Skipping Gemini: the app will use its built-in analyst." -ForegroundColor Yellow
}

# --- Backend -> Cloud Run -----------------------------------------------------
Step "Building and deploying the API to Cloud Run (first run takes ~5 minutes)"
$EnvVars = "EVOPAY_ENV=production,COOKIE_SAMESITE=lax,EVOPAY_SESSION_COOKIE=__session,EVOPAY_STARTER_WORKSPACE=true,EVOPAY_DATABASE_PATH=/tmp/evopay.db"
gcloud run deploy $Service --source "$Root\backend" --region $Region --allow-unauthenticated `
  --min-instances 0 --max-instances 1 --memory 1Gi --cpu 1 --timeout 60 `
  --set-env-vars $EnvVars @SecretFlag
Check "Cloud Run deploy"

# --- Frontend -> Firebase Hosting ----------------------------------------------
Step "Making sure Firebase is enabled on the project"
try { firebase projects:addfirebase $ProjectId 2>$null | Out-Null } catch { }
if ($LASTEXITCODE -ne 0) { Write-Host "(Firebase already enabled, continuing)" }

Step "Building the web app for Firebase"
Push-Location "$Root\frontend"
npm ci; Check "npm ci"
npm run build:firebase; Check "Building the web app"
Pop-Location

Step "Deploying to Firebase Hosting"
Push-Location $Root
firebase deploy --only hosting --project $ProjectId; Check "Firebase deploy"
Pop-Location

Write-Host "`nDone! EvoPay is live at:" -ForegroundColor Green
Write-Host "  https://$ProjectId.web.app"
Write-Host "  API health check: https://$ProjectId.web.app/api/health"
Write-Host "`nJudging day tip (no cold starts):"
Write-Host "  gcloud run services update $Service --region $Region --min-instances 1"
Write-Host "Afterwards, back to free idle:"
Write-Host "  gcloud run services update $Service --region $Region --min-instances 0"
