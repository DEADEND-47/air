# AirIQ — Task List

## Task 1: Air Quality Data Pipeline
- [x] Audit existing schema and codebase
- [ ] Write migration `0002_historical_pipeline.sql`
- [ ] Create `apps/api/src/pipeline/` directory with ETL modules
  - [ ] `data-sources.ts` — adapter interfaces
  - [ ] `synthetic-generator.ts` — 16 cities × 730 days of realistic data
  - [ ] `validators.ts` — row validation
  - [ ] `feature-engineer.ts` — derived features
  - [ ] `etl-pipeline.ts` — orchestrator
  - [ ] `bulk-import.ts` — one-shot population script
  - [ ] `daily-update.ts` — scheduled incremental ingestion
- [ ] Add historical API routes to `app.ts`
- [ ] Update `AirIqRepository` port with historical methods
- [ ] Implement `PostgresAirIqRepository` historical methods
- [ ] Add `pipeline:import` npm script
- [ ] Tests: `etl-pipeline.test.ts`, `synthetic-generator.test.ts`

## Task 2: Enterprise Authentication System
- [x] Audit existing auth service and models
- [ ] Write migration `0003_auth_enterprise.sql`
- [ ] Extend domain `models.ts` with Session, OtpCode, PasswordReset
- [ ] Create `email-service.ts` (console stub)
- [ ] Create `enhanced-auth-service.ts`
  - [ ] register, verifyEmail
  - [ ] login (with rememberMe), loginWithOtp
  - [ ] refreshToken
  - [ ] sendPasswordReset, resetPassword
  - [ ] listSessions, revokeSession, revokeAllSessions
- [ ] Update `ports.ts` with new repository methods
- [ ] Update `postgres-repository.ts` with new methods
- [ ] Create `apps/api/src/routes/auth-routes.ts`
- [ ] Update `app.ts` to mount new auth routes
- [ ] Frontend: Update `AuthContext.tsx` with new methods
- [ ] Frontend: Update `LoginPage.tsx` (Remember Me, OTP, Forgot Password)
- [ ] Frontend: Create `RegisterPage.tsx`
- [ ] Frontend: Create `PasswordResetPage.tsx`
- [ ] Frontend: Create `SessionsPage.tsx`
- [ ] Frontend: Update `App.tsx` router with new routes
- [ ] Tests: `enhanced-auth-service.test.ts`

## Task 3: Integration & Verification
- [ ] Run DB migrations
- [ ] Run seed
- [ ] Run full test suite
- [ ] Verify historical API endpoint
- [ ] Verify registration → OTP → login flow (browser)
- [ ] Verify Remember Me / refresh token
- [ ] Verify password reset flow
- [ ] Verify session management
