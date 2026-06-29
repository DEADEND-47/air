# AirIQ Simplified Implementation Plan

AirIQ is now designed as a beginner-friendly local full-stack app:

```text
Root workspace
  npm run dev
    apps/api  -> Express API on http://localhost:4000
    apps/web  -> Vite React app on http://localhost:5173
```

## Backend

`apps/api` uses:
- Express for REST routes.
- SQLite as a local `.db` file.
- Drizzle ORM for schema and queries.
- `jsonwebtoken` for access tokens.
- `bcryptjs` for password hashing.
- Zod for request validation.
- Nodemailer with console output by default.
- Multer for uploads.
- node-cron for the optional ETL schedule.
- Local deterministic agents only.

Important files:
- `src/server.js` starts the API.
- `src/app.js` creates the Express app, runs migration/seed, mounts routes, and optionally schedules ETL.
- `src/config.js` validates environment variables.
- `src/db/schema.js` defines the Drizzle tables.
- `src/db/migrate.js` creates the SQLite tables.
- `src/db/seed.js` loads demo data.
- `src/services/auth-service.js` handles register, login, refresh, logout, and password reset.
- `src/services/airiq-service.js` handles dashboard domain data.
- `src/routes/auth-routes.js` exposes auth routes.
- `src/routes/airiq-routes.js` exposes city, reading, forecast, alert, advisory, enforcement, upload, settings, and ETL routes.
- `src/agents/local-agents.js` contains deterministic rule-based forecast/attribution/advisory/enforcement helpers.

## Frontend

`apps/web` uses:
- React + Vite.
- React Router.
- TanStack Query.
- Recharts.
- Leaflet + React Leaflet.
- lucide-react.
- A small fetch API client with JWT stored in `localStorage`.

Important files:
- `src/auth/AuthContext.tsx` restores tokens, logs in, registers, resets password, and logs out.
- `src/lib/api.ts` is the fetch-based API client.
- `src/pages/LoginPage.tsx`, `RegisterPage.tsx`, and `PasswordResetPage.tsx` are the auth screens.
- `src/pages/Screens.tsx` contains the dashboard feature screens.
- `src/components/MapPanel.tsx` and `Charts.tsx` keep the map and chart views.

## SQLite Tables

The simplified schema covers:
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

## How To Run

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Demo login:

```text
admin@airiq.local / Password123!
```
