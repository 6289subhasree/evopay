# EvoPay AI API — container for Google Cloud Run
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8080

WORKDIR /app

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . .

# Run as an unprivileged user
RUN useradd --create-home --uid 10001 evopay && chown -R evopay /app
USER evopay

# Cloud Run sets $PORT. One worker: the demo uses SQLite in /tmp (see DEPLOY_GOOGLE_CLOUD.md).
CMD exec uvicorn main:app --host 0.0.0.0 --port ${PORT} --workers 1 --proxy-headers --forwarded-allow-ips="*"
