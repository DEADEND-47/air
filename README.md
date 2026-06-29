# AirIQ Simplified Local Stack

AirIQ is a smart-city air quality dashboard simplified for local React + Node development. It keeps the core operational workflows, removes heavyweight cloud infrastructure, and now includes V3 polish for public demos, city comparison, and profile management.

## What V3 Adds

- Public landing page at `/` with feature highlights and a one-click `Try Demo` flow
- Protected app dashboard moved to `/dashboard`
- Demo operator account at `demo@airiq.local / Password123!`
- Visible Demo Mode banner and backend read-only guard for demo writes
- Compare Cities page at `/compare` backed by `GET /api/v1/cities/compare`
- Profile page at `/profile` with account details, display-name update, and password change forms
- Profile API endpoints for `GET /api/v1/users/me`, `PATCH /api/v1/users/me`, and `PATCH /api/v1/users/me/password`
- Alert API filtering for status, severity, city, and search query parameters
- Alerts page URL filters, CSV export, and spreadsheet copy
- Historical page spreadsheet copy plus clearer CSV headers
- In-memory 60 second API cache for dashboard and cities responses with `X-Cache: HIT/MISS`
- React error boundary and small built-in toast notification system
- Lazy loading for heavier Compare and Historical screens
- Admin-only audit log page at `/admin/audit`
- Mobile table card layout for narrow screens

## What V2 Adds

- WebSocket realtime updates for dashboard readings and alert state changes
- AQI health band with dashboard "last updated" context
- City sparkline mini charts in the multi-city view
- Dark mode toggle persisted locally
- Historical Data page with CSV export
- Notification bell with unread alerts and mark-as-read actions
- Server-side pagination for alerts, enforcement, and historical tables
- React Hook Form + Zod validation on login, register, and password reset
- Student-friendly deployment guide in [DEPLOYMENT.md](/E:/air/DEPLOYMENT.md)

## Folder Structure

```text
apps/
  api/
    src/
      agents/              local deterministic forecast/attribution helpers
      db/                  Drizzle schema, SQLite connection, migrate, seed
      middleware/          Express error handling
      pipeline/            ETL import/update scripts
      routes/              auth and AirIQ REST routes
      services/            AuthService, AirIqService, email service
      app.js               Express app factory
      server.js            API entrypoint
  web/
    src/
      auth/                simple AuthContext with JWT localStorage
      components/          charts, map, shell, shared UI
      context/             active city context
      lib/                 fetch API client, types, AQI utilities
      pages/               login/register/reset and dashboard screens
      main.tsx             React entrypoint
```

## Dependencies

Backend `apps/api` uses Express, SQLite via `better-sqlite3`, Drizzle ORM, `jsonwebtoken`, `bcryptjs`, Zod, Nodemailer, Multer, `ws`, and node-cron.

Frontend `apps/web` uses React 18, Vite, React Router, TanStack Query, Tailwind CSS, Recharts, Leaflet/React Leaflet, lucide-react, React Hook Form, and Zod. The frontend talks to the API through `src/lib/api.ts`, stores JWTs in `localStorage`, and derives the WebSocket URL from `VITE_API_URL`.

## SQLite Schema

The Drizzle schema lives in `apps/api/src/db/schema.js` and covers:

- `users`
- `refresh_tokens`
- `cities`
- `readings`
- `historical_readings`
- `daily_stats`
- `forecasts`
- `attributions`
- `alerts`
- `advisories`
- `enforcement_cases`
- `uploads`
- `settings`

## Key Files

- `apps/api/src/app.js` creates the Express app, runs migration/seed, mounts routes, and optionally schedules ETL.
- `apps/api/src/server.js` starts the API and attaches the raw WebSocket server on `/ws`.
- `apps/api/src/services/auth-service.js` handles register, login, refresh, logout, and password reset.
- `apps/api/src/routes/airiq-routes.js` exposes cities, readings, forecasts, attribution, alerts, advisories, enforcement, uploads, settings, ETL, pagination, and alert read-state updates.
- `apps/web/src/auth/AuthContext.tsx` restores tokens and exposes login/register/reset/logout.
- `apps/web/src/lib/api.ts` is the fetch-based API client and WebSocket URL helper.

## Demo Features To Try

1. Open `/` and use `Try Demo` for a one-click read-only portfolio walkthrough
2. Sign in with `admin@airiq.local / Password123!` for full local admin access
3. Open `/dashboard` to see the AQI health band and live timestamp
4. Use the bell icon to view unread alerts
5. Open `Compare Cities` to benchmark 2 or 3 cities
6. Open `Historical Data` and export the current page to CSV
7. Check `Alert Center` and page through the feed with Previous/Next controls

## Run Locally

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

The root `npm run dev` command starts both apps side by side:

- API: `http://localhost:4000`
- Web: `http://localhost:5173`

On first seed, local historical ETL data is auto-generated so the Historical page has data immediately.

Demo login:

```text
admin@airiq.local / Password123!
demo@airiq.local / Password123!
```

## V3 API Endpoints

```text
GET /api/v1/cities/compare?ids=delhi,mumbai,bengaluru&days=7
Response: { data: [{ city, dominantPollutant, trend, lastReadingTime, readings: [{ observedAt, aqi, pm25, pm10, no2 }] }] }

GET /api/v1/users/me
Response: { data: { id, email, name, role, active, lastLoginAt, demoMode } }

PATCH /api/v1/users/me
Body: { firstName, lastName }
Response: { data: { id, email, name, role, active, lastLoginAt, demoMode } }

PATCH /api/v1/users/me/password
Body: { currentPassword, newPassword }
Response: { message }

GET /api/v1/alerts?status=active&severity=high&cityId=delhi&search=pm2.5&page=1&limit=20
Response: { data, total, page, limit, totalPages }

GET /api/v1/admin/audit?page=1&limit=50&days=7&action=login
Response: { data: [{ id, userEmail, action, entityType, entityId, ipAddress, createdAt }], total, page, limit, totalPages }

Cached endpoints:
GET /api/v1/dashboard/overview?cityId=delhi
GET /api/v1/cities
Header: X-Cache is HIT or MISS
```

## Environment Notes

Use the root [.env.example](/E:/air/.env.example) as the starting point for local setup.

- `VITE_API_URL` should normally stay `http://localhost:4000/api/v1`
- WebSocket connections reuse that API host automatically and connect to `/ws`
- Local secret files such as `.env`, `apps/api/.env`, and `apps/web/.env` are ignored by git
