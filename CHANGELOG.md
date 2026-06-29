# Changelog

## V3

AirIQ V3 focuses on portfolio polish and demo usability.

### Added

- Public landing page at `/` with AirIQ positioning, three feature highlights, and one-click demo entry
- Read-only demo account seeded as `demo@airiq.local / Password123!`
- Demo Mode banner inside the authenticated app
- Protected dashboard route at `/dashboard`
- City comparison page at `/compare` with multi-city AQI line chart and comparison table
- User profile page at `/profile` with read-only account details, display name form, and password change form
- `GET /api/v1/cities/compare?ids=...&days=...`
- `GET /api/v1/users/me`
- `PATCH /api/v1/users/me`
- `PATCH /api/v1/users/me/password`
- Alerts CSV export and copy-to-clipboard for spreadsheet workflows
- Historical copy-to-clipboard and clearer CSV column headers
- Built-in toast notifications
- React error boundary fallback
- 60 second in-memory cache for dashboard and city list responses with `X-Cache`
- Lazy-loaded Compare and Historical screens
- Admin-only audit log viewer at `/admin/audit`
- Mobile table rows collapse into cards on narrow screens

### Changed

- Demo account write attempts now return `403 DEMO_READ_ONLY`
- `GET /api/v1/alerts` accepts status, severity, city, search, page, and limit query parameters
- User records now track `last_login_at`

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
