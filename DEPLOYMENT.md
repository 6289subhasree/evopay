# EvoPay AI — Deployment Guide

This guide covers deploying the **EvoPay AI** frontend to **Vercel** and connecting it to the backend service.

---

## 🚀 1. Deploying Frontend on Vercel

The repository is configured to build and deploy cleanly on Vercel with zero extra friction.

### Option A: Import Directly from Root (Recommended)

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New..." > "Project"**.
2. Select your GitHub repository: `oindreela04/evopay`.
3. In the project setup screen:
   - **Framework Preset**: Vite (detected automatically).
   - **Root Directory**: `./` (leave default).
   - **Build Command**: `cd frontend && npm install && npm run build` (or `npm run build` using root `package.json`).
   - **Output Directory**: `frontend/dist`.
4. In **Environment Variables**, add:
   - `VITE_API_URL`: Your deployed backend API URL (e.g. `https://evopay-backend.onrender.com/api`).
     *(For testing locally, defaults to `http://127.0.0.1:8000/api`)*.
5. Click **Deploy**.

### Option B: Deploying with Root Directory set to `frontend`

If you prefer pointing Vercel specifically to the `frontend` subfolder:
1. In Vercel Project Settings, set **Root Directory** to `frontend`.
2. Framework Preset will auto-detect **Vite**.
3. The included `frontend/vercel.json` will automatically configure SPA client-side route rewrites so direct navigation to `/dashboard`, `/simulation`, etc. works without 404 errors.
4. Add the `VITE_API_URL` environment variable.
5. Click **Deploy**.

---

## ⚙️ 2. Deploying Backend

The backend is built with **FastAPI**, **SQLite**, and **scikit-learn**. Because it maintains persistent data and machine learning models, deploying it on a persistent container or web service platform (e.g. **Render**, **Railway**, or **Fly.io**) is recommended.

### Example: Deploying on Render (Web Service)

1. Create a new **Web Service** on [Render](https://render.com).
2. Connect your repository (`oindreela04/evopay`).
3. Set the following settings:
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt && python init_db.py`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Set **Environment Variables**:
   ```env
   EVOPAY_ENV=production
   COOKIE_SECURE=true
   COOKIE_SAMESITE=none
   CORS_ORIGINS=https://your-frontend-project.vercel.app
   EVOPAY_SEED_DEMO_DATA=true
   ```
5. Deploy the service and copy the provided URL (e.g., `https://evopay-backend.onrender.com`).
6. Update `VITE_API_URL` in your Vercel project environment variables to:
   ```
   https://evopay-backend.onrender.com/api
   ```

---

## 🛠️ Summary of Fixes Applied to the Repository

1. **Vercel Root Deployment Support**: Added `vercel.json` and root `package.json` with monorepo build scripts so Vercel can build directly from the repository root without configuration errors.
2. **SPA Client Routing**: Added `rewrites` rules in both root `vercel.json` and `frontend/vercel.json` to prevent `404: NOT_FOUND` on page refreshes and direct links.
3. **Starlette/FastAPI Compatibility**: Fixed `Router.__init__() got an unexpected keyword argument 'on_startup'` and deprecated `@app.on_event("startup")` by switching to FastAPI's modern `lifespan` context manager with compatibility shims.
4. **CORS & Preview Deployments**: Updated CORS middleware in `backend/main.py` with `allow_origin_regex=r"^https?://.*\.vercel\.app$"` so that all Vercel production and preview deployments can communicate with the backend.
5. **Cross-Origin Authentication Cookies**: Configured `COOKIE_SECURE` and `COOKIE_SAMESITE` in `backend/auth.py` so sessions work across different domains (Vercel frontend + Render backend).
6. **Module Import Paths**: Added dynamic path resolution in `backend/main.py` so the backend can be imported and run from both the repository root (`uvicorn backend.main:app`) and the backend directory (`uvicorn main:app`).
7. **Database Seeding**: Updated `backend/init_db.py` to ensure demo data is properly seeded on initialization.
8. **Dependency Specifications**: Pinned `fastapi>=0.115.0` and added `httpx>=0.27.0` in `backend/requirements.txt` to eliminate testing and runtime conflicts.
