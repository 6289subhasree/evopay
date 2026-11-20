#!/usr/bin/env bash
# EvoPay AI — deploy to Google Cloud (Cloud Run API + Firebase Hosting web app)
#
# Usage (macOS / Linux / Cloud Shell, from the repository root):
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

step "Using project $PROJECT_ID ($REGION)"
gcloud config set project "$PROJECT_ID" >/dev/null

step "Enabling Google Cloud APIs (Cloud Run, Cloud Build, Artifact Registry, Secret Manager)"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com

read -r -s -p "Gemini API key (hidden; press Enter to skip): " GEMINI_KEY; echo
SECRET_FLAGS=()
if [[ -n "$GEMINI_KEY" ]]; then
  step "Storing the Gemini key in Secret Manager (gemini-api-key)"
  if gcloud secrets describe gemini-api-key >/dev/null 2>&1; then
    printf '%s' "$GEMINI_KEY" | gcloud secrets versions add gemini-api-key --data-file=- >/dev/null
  else
    printf '%s' "$GEMINI_KEY" | gcloud secrets create gemini-api-key --replication-policy=automatic --data-file=- >/dev/null
  fi
  PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
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
  --set-env-vars "EVOPAY_ENV=production,COOKIE_SAMESITE=lax,EVOPAY_SESSION_COOKIE=__session,EVOPAY_STARTER_WORKSPACE=true,EVOPAY_DATABASE_PATH=/tmp/evopay.db" \
  "${SECRET_FLAGS[@]}"

step "Making sure Firebase is enabled on the project"
firebase projects:addfirebase "$PROJECT_ID" 2>/dev/null || echo "(Firebase already enabled, continuing)"

step "Building the web app for Firebase"
(cd "$ROOT/frontend" && npm ci && npm run build:firebase)

step "Deploying to Firebase Hosting"
(cd "$ROOT" && firebase deploy --only hosting --project "$PROJECT_ID")

printf '\n\033[32mDone! EvoPay is live at:\033[0m\n  https://%s.web.app\n  API health check: https://%s.web.app/api/health\n' "$PROJECT_ID" "$PROJECT_ID"
echo
echo "Judging day tip (no cold starts):"
echo "  gcloud run services update $SERVICE --region $REGION --min-instances 1"
echo "Afterwards, back to free idle:"
echo "  gcloud run services update $SERVICE --region $REGION --min-instances 0"
