# AirIQ — Implementation Plan

## Task 1: Air Quality Data Pipeline
## Task 2: Enterprise Authentication System

---

## Current Codebase Audit

### Authentication Findings
| Finding | Detail | Gap |
| :--- | :--- | :--- |
| Fixed credentials | Only 2 seeded users (`admin@airiq.city`, `enforcement@airiq.city`) | No registration flow |
| No OTP system | Zero OTP table, generation or email logic | Full gap |
| No refresh tokens | `8h` JWT access token only — no persistence | No "Remember Me" |
| No sessions table | No per-device tracking | Full gap |
| No password reset | Zero reset-token or email delivery | Full gap |
| No email verification | New accounts cannot verify ownership | Full gap |
| Fixed role set | 4 hard-coded roles, not extensible | Needs `admin`/`analyst`/`standard_user` added |

### Database Findings
| Finding | Gap |
| :--- | :--- |
| `sensor_readings` has: AQI, PM2.5, PM10, NO₂, temp, humidity | Missing: SO₂, CO, O₃, wind speed/dir, rainfall, traffic density, construction index |
| `cities` table has no historical archive | No time-series city-level pollution records |
| No `historical_readings` table | Cannot support analytics, ML retraining |
| No ETL pipeline or ingestion scripts | Full gap |
| No geospatial indexing (PostGIS) | Geospatial queries not possible |

---

## Open Questions

> [!IMPORTANT]
> **Q1 — Email delivery**: Implementing OTP and password reset requires outbound SMTP or a transactional email provider. What provider should be used?
> Options: `nodemailer` + SMTP, Resend, Postmark, AWS SES, or **mock/log-to-console for dev**. Plan assumes **log-to-console in dev** with a stub `email-service.ts` that can be swapped.

> [!IMPORTANT]
> **Q2 — Redis availability**: Refresh tokens and OTP codes require a fast store. The current `.env.example` has `REDIS_URL`. Plan uses Redis for token/OTP caching. If Redis is unavailable locally, a PostgreSQL fallback table is also created.

> [!IMPORTANT]
> **Q3 — Real AQI data sources**: No live CPCB/OpenAQ API key is configured. Plan generates a **synthetic historical dataset** for all 16 cities (2 years × daily readings) using statistically realistic distributions, plus documents the recommended public APIs. Real ingestion scripts are also created but require API keys.

> [!IMPORTANT]
> **Q4 — PostgreSQL extension PostGIS**: Geospatial queries need `CREATE EXTENSION postgis`. If this extension is unavailable in your Postgres instance, the migration uses a fallback `point` column instead. Plan provides both variants.

---

## Proposed Changes

---

### TASK 1 — Air Quality Data Pipeline

#### New Migration: `0002_historical_pipeline.sql` [NEW]
Adds:
- `historical_readings` — time-series archive (2-year rolling window, all 16 cities)
- `weather_readings` — temperature, humidity, wind speed/dir, rainfall
- `environmental_indicators` — traffic density, construction index, industrial emissions, land use
- `ingestion_runs` — ETL job audit log
- `ml_training_runs` — model retraining metadata
- Indexes optimized for time-series range queries and city-based partitioning

#### New File: `apps/api/src/pipeline/` [NEW DIRECTORY]
- `etl-pipeline.ts` — orchestrates collect → validate → clean → normalize → store → feature-engineer
- `data-sources.ts` — adapter interfaces for OpenAQ, CPCB, IMD, and synthetic generator
- `synthetic-generator.ts` — realistic multi-city historical data for 16 cities × 730 days
- `feature-engineer.ts` — computes derived features (rolling averages, AQI categories, pollution ratios)
- `validators.ts` — validates incoming row format and range bounds
- `bulk-import.ts` — one-shot script to populate the historical database
- `daily-update.ts` — scheduled daily incremental ingestion
- `retrain-trigger.ts` — weekly model retraining workflow

#### New API Routes (added to `app.ts`)
- `GET /api/v1/historical?cityId&from&to&granularity` — query historical archive
- `GET /api/v1/pipeline/status` — last ETL run status
- `POST /api/v1/pipeline/run` — manually trigger ingestion (admin only)

#### Dataset Documentation [NEW ARTIFACT]
- `docs/data-pipeline.md` — data dictionary, ER diagram (Mermaid), dataset availability report

---

### TASK 2 — Enterprise Authentication System

#### Domain Models (extend `models.ts`)
Add:
- `Session` — per-device session with refresh token
- `OtpCode` — time-limited OTP with purpose (verify-email | login | password-reset)
- `PasswordReset` — reset token with expiry
- `Device` — device fingerprint (user agent, IP)
- New roles: `admin`, `analyst`, `standard_user` added alongside existing roles

#### New Migration: `0003_auth_enterprise.sql` [NEW]
New tables:
- `sessions` — refresh tokens, device_id, expires_at, revoked_at
- `devices` — user_agent, ip, fingerprint, last_seen
- `otp_codes` — code, purpose, expires_at, consumed_at
- `password_resets` — token (hashed), expires_at, consumed_at
- Add columns to `users`: `email_verified`, `phone`, `avatar_url`, `last_login_at`, `failed_attempts`, `locked_until`

#### New Service: `apps/api/src/application/enhanced-auth-service.ts` [NEW]
Methods:
- `register(name, email, password)` → creates unverified user + sends OTP
- `verifyEmail(email, otp)` → marks email verified
- `login(email, password, rememberMe)` → returns access token + optional refresh token
- `loginWithOtp(email, otp)` → passwordless OTP login
- `refreshToken(refreshToken)` → issues new access token
- `sendPasswordReset(email)` → generates and delivers reset link
- `resetPassword(token, newPassword)` → validates and applies new password
- `revokeSession(sessionId)` → invalidates specific session
- `listSessions(userId)` → active devices
- `revokeAllSessions(userId)` → sign out everywhere

#### New Service: `apps/api/src/application/email-service.ts` [NEW]
- `sendOtp(email, otp, purpose)` — stub logs to console in dev, sends via SMTP in prod
- `sendPasswordReset(email, resetUrl)` — same pattern

#### New API Routes (new file `apps/api/src/routes/auth-routes.ts`)
| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| POST | `/api/v1/auth/register` | None | Register new user |
| POST | `/api/v1/auth/verify-email` | None | Submit OTP to verify email |
| POST | `/api/v1/auth/login` | None | Email + password login (replaces existing) |
| POST | `/api/v1/auth/otp-login` | None | Email + OTP login |
| POST | `/api/v1/auth/refresh` | None | Exchange refresh token for new access token |
| POST | `/api/v1/auth/logout` | Bearer | Revoke current session |
| POST | `/api/v1/auth/send-reset` | None | Request password reset email |
| POST | `/api/v1/auth/reset-password` | None | Apply new password with reset token |
| GET | `/api/v1/auth/sessions` | Bearer | List active sessions |
| DELETE | `/api/v1/auth/sessions/:id` | Bearer | Revoke a session |

#### Updated Repository Port (`ports.ts`)
Add methods:
- `createUser`, `updateUser`, `findUserById`
- `createSession`, `findSession`, `revokeSession`, `listSessionsByUser`
- `createOtp`, `consumeOtp`
- `createPasswordReset`, `consumePasswordReset`
- `findDevice`, `upsertDevice`

#### Frontend: New Pages
- `apps/web/src/pages/RegisterPage.tsx` [NEW] — name, email, password form + OTP verification step
- `apps/web/src/pages/PasswordResetPage.tsx` [NEW] — request reset + set new password
- `apps/web/src/pages/SessionsPage.tsx` [NEW] — active sessions management

#### Frontend: Extended Login
- `apps/web/src/pages/LoginPage.tsx` [MODIFY] — add "Remember Me" checkbox, "Login with OTP" link, "Forgot Password" link
- `apps/web/src/auth/AuthContext.tsx` [MODIFY] — add register, verifyEmail, refreshToken, resetPassword methods

#### Frontend: Router
- `apps/web/src/App.tsx` [MODIFY] — add `/register`, `/reset-password`, `/sessions` routes

---

## Verification Plan

### Automated Tests
```bash
npm run test           # Unit + integration (API)
npm run test -w web    # Component tests
npm run typecheck      # TypeScript strict check
npm run lint           # ESLint zero-warnings
```

New test files:
- `apps/api/src/application/enhanced-auth-service.test.ts`
- `apps/api/src/pipeline/etl-pipeline.test.ts`
- `apps/api/src/pipeline/synthetic-generator.test.ts`

### Manual Verification
1. Register a new user → receive OTP in console → verify → login
2. Login with "Remember Me" → refresh token stored in `localStorage` → auto-renews after 8h
3. Revoke a session from the Sessions page → re-authentication required
4. Request password reset → follow link → set new password → login
5. Query `/api/v1/historical?cityId=delhi&from=2024-01-01&to=2024-12-31` → returns 365 records
6. Run `npm run pipeline:import` → populates `historical_readings` for all 16 cities
