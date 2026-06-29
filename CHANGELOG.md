# Changelog

## V2

AirIQ V2 turns the simplified local stack into a more complete demo-ready product.

### Added

- Raw WebSocket realtime updates at `/ws` for new readings and alert changes
- Dashboard AQI health band and "last updated" timestamp
- City sparkline mini charts in the multi-city view
- Dark mode toggle persisted in `localStorage`
- Historical Data page with server-side pagination and CSV export
- Notification bell dropdown with unread alerts and mark-as-read flow
- `PATCH /api/v1/alerts/:id/read` endpoint
- React Hook Form plus Zod validation on login, register, and password reset
- `DEPLOYMENT.md` with Render and Vercel guidance for students

### Changed

- `GET /api/v1/alerts` now supports pagination and unread filtering
- `GET /api/v1/enforcement` now returns paginated results
- `GET /api/v1/historical` now returns paginated results
- Local seed now primes historical ETL data so the Historical page works on first run

### Why It Matters

- Realtime updates make the dashboard feel live instead of poll-driven
- Pagination keeps large tables usable
- Inline validation reduces auth-form friction
- Historical export makes the project easier to demo in coursework, reviews, and interviews

## V1

AirIQ V1 established the simplified local platform:

- Express API with SQLite and Drizzle
- React 18 + Vite frontend
- JWT auth with seeded demo users
- AQI dashboard, forecasts, attribution, advisories, alerts, and enforcement workflows
- Local ETL pipeline and synthetic demo data
