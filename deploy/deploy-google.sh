#!/usr/bin/env bash
# EvoPay AI — deploy the API to Google Cloud Run and connect the Vercel web app.
#
# Usage (macOS / Linux / Cloud Shell, from the repository root, on the main branch):
#   ./deploy/deploy-google.sh your-project-id
#
# You will be asked for your Gemini API key (input is hidden). Press Enter to skip.
# Prerequisites and troubleshooting: DEPLOY_GOOGLE_CLOUD.md
set -euo pipefail

PROJECT_ID="${1:?Usage: ./deploy/deploy-google.sh <project-id>}"
REGION="${REGION:-asia-south1}"
SERVICE="${SERVICE:-evopay-api}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
step() { printf '\n\033[32m==> %s\033[0m\n' "$1"; }

step "Using Google Cloud project $PROJECT_ID ($REGION)"
gcloud config set project "$PROJECT_ID" >/dev/null

step "Enabling Cloud Run, Cloud Build, Artifact Registry and Secret Manager"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
step "Allowing Cloud Build to build from source (roles/run.builder)"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/run.builder" --condition=None >/dev/null

read -r -s -p "Gemini API key (hidden; press Enter to skip): " GEMINI_KEY; echo
SECRET_FLAGS=()
if [[ -n "$GEMINI_KEY" ]]; then
  step "Storing the Gemini key in Secret Manager (gemini-api-key)"
  if gcloud secrets describe gemini-api-key >/dev/null 2>&1; then
    printf '%s' "$GEMINI_KEY" | gcloud secrets versions add gemini-api-key --data-file=- >/dev/null
  else
    printf '%s' "$GEMINI_KEY" | gcloud secrets create gemini-api-key --replication-policy=automatic --data-file=- >/dev/null
  fi
  gcloud secrets add-iam-policy-binding gemini-api-key \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor" >/dev/null
  SECRET_FLAGS=(--set-secrets "GEMINI_API_KEY=gemini-api-key:latest")
else
  echo "Skipping Gemini: the app will use its built-in analyst."
fi
unset GEMINI_KEY

step "Building and deploying the API to Cloud Run (first run takes ~5 minutes)"
gcloud run deploy "$SERVICE" --source "$ROOT/backend" --region "$REGION" --allow-unauthenticated \
  --min-instances 0 --max-instances 1 --memory 1Gi --cpu 1 --timeout 60 \
  --set-env-vars "EVOPAY_ENV=production,COOKIE_SAMESITE=lax,EVOPAY_STARTER_WORKSPACE=true,EVOPAY_DATABASE_PATH=/tmp/evopay.db" \
  ${SECRET_FLAGS[@]+"${SECRET_FLAGS[@]}"}

URL="$(gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)')"
echo "API is live at $URL"

step "Connecting the Vercel web app to the API"
node "$ROOT/deploy/connect-vercel.mjs" "$URL"

read -r -p "Commit and push vercel.json + frontend/.env.production so Vercel redeploys? (y/n) " ANSWER
if [[ "$ANSWER" =~ ^([yY]|yes)$ ]]; then
  (cd "$ROOT" && git add vercel.json frontend/.env.production && git commit -m "chore: connect Vercel web app to Cloud Run API" && git push)
  echo "Pushed. Vercel will redeploy in about a minute."
else
  echo "Not pushed. Commit vercel.json and frontend/.env.production yourself when ready."
fi

printf '\n\033[32mDone!\033[0m\n'
echo "  API health (direct):     $URL/api/health"
echo "  API health (via Vercel): https://evopay-dun.vercel.app/api/health  (after Vercel redeploys)"
echo
echo "Judging day tip (no cold starts):"
echo "  gcloud run services update $SERVICE --region $REGION --min-instances 1"
echo "Afterwards, back to free idle:"
echo "  gcloud run services update $SERVICE --region $REGION --min-instances 0"
