# AirIQ Simplification Task List

## Completed Migration Goals
- [x] Keep the monorepo shape with `apps/api` and `apps/web`.
- [x] Replace the backend with plain Express JavaScript.
- [x] Use SQLite through `better-sqlite3` and Drizzle ORM.
- [x] Replace Supabase/JWKS auth with local JWT + bcrypt auth.
- [x] Keep register, login, refresh token, logout, and password reset flows.
- [x] Simplify roles to `admin`, `analyst`, and `viewer`.
- [x] Keep domain features: cities, readings, forecasts, attributions, alerts, advisories, enforcement, uploads, settings, and ETL.
- [x] Remove Docker, Supabase config, OpenAPI YAML, Prometheus metrics, Redis usage, and external AI provider usage.
- [x] Use local deterministic agents for forecast, attribution, advisories, enforcement, and alert correlation.

## Local Verification
- [ ] Run `npm install`.
- [ ] Run `npm run db:migrate`.
- [ ] Run `npm run db:seed`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run test`.
- [ ] Run `npm run build`.

## Demo Login
- Email: `admin@airiq.local`
- Password: `Password123!`
