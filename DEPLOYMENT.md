# AirIQ Deployment Guide

This guide deploys AirIQ without Docker. The backend goes to Render, and the frontend goes to Vercel.

## 1. Push The Project To GitHub

1. Create a new GitHub repository.
2. In this project folder, run:

```bash
git add .
git commit -m "Prepare AirIQ V2 deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

If `origin` already exists, run:

```bash
git remote set-url origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

## 2. Deploy The API On Render

1. Open Render and choose **New > Web Service**.
2. Connect your GitHub repository.
3. Use these settings:

```text
Name: airiq-api
Root Directory: apps/api
Runtime: Node
Branch: main
Build Command: npm install
Start Command: npm run start
Plan: Free
```

4. Add these environment variables:

```text
NODE_ENV=production
API_PORT=10000
WEB_ORIGIN=https://YOUR_VERCEL_APP.vercel.app
DATABASE_FILE=./data/airiq.db
JWT_SECRET=use-a-long-random-secret-here
ACCESS_TOKEN_MINUTES=60
REFRESH_TOKEN_DAYS=7
UPLOAD_DIR=./uploads
EMAIL_FROM=noreply@airiq.local
ENABLE_CRON=false
OPENAQ_API_KEY=
```

Render provides the port through `PORT` for many apps, but this project reads `API_PORT`. Set it to `10000` unless you change the backend config.

## 3. SQLite On Render

SQLite is just a file. That is perfect locally, but Render free web services use an ephemeral disk by default. That means the database file can disappear when the service restarts or redeploys.

For demos, this is acceptable because AirIQ seeds demo data at startup.

For anything you want to keep:

1. Add a Render persistent disk and mount it at `/var/data`.
2. Set:

```text
DATABASE_FILE=/var/data/airiq.db
UPLOAD_DIR=/var/data/uploads
```

Another free-friendly option is Turso, which is hosted SQLite. That requires a small database adapter change later, so the simplest first deployment is Render persistent disk.

## 4. Deploy The Web App On Vercel

1. Open Vercel and choose **Add New > Project**.
2. Import the same GitHub repository.
3. Use these settings:

```text
Framework Preset: Vite
Root Directory: apps/web
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

4. Add this environment variable:

```text
VITE_API_URL=https://YOUR_RENDER_API.onrender.com/api/v1
```

5. Deploy.

After Vercel gives you a URL, go back to Render and update `WEB_ORIGIN` to that exact Vercel URL.

## 5. WebSocket URL

The frontend derives the WebSocket URL from `VITE_API_URL`.

Example:

```text
VITE_API_URL=https://airiq-api.onrender.com/api/v1
WebSocket URL becomes wss://airiq-api.onrender.com/ws
```

No extra Vercel variable is needed.

## 6. Common Mistakes

**CORS error in browser**

Check that Render `WEB_ORIGIN` exactly matches the Vercel URL, including `https://`.

**Login works locally but not deployed**

Make sure `JWT_SECRET` is set on Render and is at least 16 characters.

**API wakes up slowly**

Render free services sleep when unused. The first request after sleeping can take a little while.

**Data disappears after deploy**

That is the Render ephemeral disk behavior. Add a persistent disk or move SQLite to Turso later.

**Frontend says API request failed**

Check `VITE_API_URL` on Vercel. It must end with `/api/v1`.

**WebSocket does not connect**

Make sure the Render API URL uses `https://`. The browser will use `wss://` automatically.

## 7. Local Commands

Before deploying, verify locally:

```bash
npm install
npm run db:migrate
npm run db:seed
npm run lint
npm run typecheck
npm run test
npm run build
npm run dev
```
