<#
  EvoPay AI — deploy the API to Google Cloud Run and connect the Vercel web app.

  Usage (PowerShell, from the repository root, on the main branch):
    Set-ExecutionPolicy -Scope Process Bypass
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

Step "Using Google Cloud project $ProjectId ($Region)"
gcloud config set project $ProjectId | Out-Null; Check "Selecting the project"

Step "Enabling Cloud Run, Cloud Build, Artifact Registry and Secret Manager"
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
  $saved = $LASTEXITCODE
  Remove-Item $tmp -Force
  $GeminiKey = $null
  if ($saved -ne 0) { throw "Saving the Gemini key failed." }
  $ProjectNumber = gcloud projects describe $ProjectId --format="value(projectNumber)"
  gcloud secrets add-iam-policy-binding gemini-api-key --member="serviceAccount:$ProjectNumber-compute@developer.gserviceaccount.com" --role="roles/secretmanager.secretAccessor" | Out-Null
  Check "Granting Cloud Run access to the Gemini key"
  $SecretFlag = @("--set-secrets", "GEMINI_API_KEY=gemini-api-key:latest")
} else {
  Write-Host "Skipping Gemini: the app will use its built-in analyst." -ForegroundColor Yellow
}

# --- Backend -> Cloud Run -----------------------------------------------------
Step "Building and deploying the API to Cloud Run (first run takes ~5 minutes)"
$EnvVars = "EVOPAY_ENV=production,COOKIE_SAMESITE=lax,EVOPAY_STARTER_WORKSPACE=true,EVOPAY_DATABASE_PATH=/tmp/evopay.db"
gcloud run deploy $Service --source "$Root\backend" --region $Region --allow-unauthenticated `
  --min-instances 0 --max-instances 1 --memory 1Gi --cpu 1 --timeout 60 `
  --set-env-vars $EnvVars @SecretFlag
Check "Cloud Run deploy"

$Url = (gcloud run services describe $Service --region $Region --format="value(status.url)").Trim()
Check "Reading the Cloud Run URL"
Write-Host "API is live at $Url"

# --- Connect Vercel -------------------------------------------------------------
Step "Connecting the Vercel web app to the API"
node "$Root\deploy\connect-vercel.mjs" $Url; Check "Updating vercel.json"

$answer = Read-Host "Commit and push vercel.json + frontend/.env.production so Vercel redeploys? (y/n)"
if ($answer -match '^(y|yes)$') {
  Push-Location $Root
  git add vercel.json frontend/.env.production; Check "git add"
  git commit -m "chore: connect Vercel web app to Cloud Run API"; Check "git commit"
  git push; Check "git push"
  Pop-Location
  Write-Host "Pushed. Vercel will redeploy in about a minute." -ForegroundColor Green
} else {
  Write-Host "Not pushed. Commit vercel.json and frontend/.env.production yourself when ready." -ForegroundColor Yellow
}

Write-Host "`nDone!" -ForegroundColor Green
Write-Host "  API health (direct):     $Url/api/health"
Write-Host "  API health (via Vercel): https://evopay-dun.vercel.app/api/health  (after Vercel redeploys)"
Write-Host "`nJudging day tip (no cold starts):"
Write-Host "  gcloud run services update $Service --region $Region --min-instances 1"
Write-Host "Afterwards, back to free idle:"
Write-Host "  gcloud run services update $Service --region $Region --min-instances 0"
