-- ============================================================
-- Migration 0003: Enterprise Authentication System
-- ============================================================

-- Extend users table with additional auth fields
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified  boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone           text,
  ADD COLUMN IF NOT EXISTS avatar_url      text,
  ADD COLUMN IF NOT EXISTS last_login_at   timestamptz,
  ADD COLUMN IF NOT EXISTS failed_attempts integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until    timestamptz;

-- Update role check to include standard_user and admin
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('city_admin', 'analyst', 'enforcement_officer', 'health_officer', 'standard_user'));

-- Sessions table for multi-device tracking
CREATE TABLE IF NOT EXISTS sessions (
  id             text          PRIMARY KEY,
  user_id        text          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token  text          NOT NULL UNIQUE,
  device_name    text          NOT NULL DEFAULT 'Unknown Device',
  user_agent     text,
  ip_address     text,
  remember_me    boolean       NOT NULL DEFAULT false,
  last_active_at timestamptz   NOT NULL DEFAULT now(),
  expires_at     timestamptz   NOT NULL,
  revoked_at     timestamptz,
  created_at     timestamptz   NOT NULL DEFAULT now()
);

-- OTP codes table (for email verification, passwordless login, 2FA)
CREATE TABLE IF NOT EXISTS otp_codes (
  id           bigserial     PRIMARY KEY,
  user_id      text          REFERENCES users(id) ON DELETE CASCADE,
  email        text          NOT NULL,
  code_hash    text          NOT NULL,
  purpose      text          NOT NULL CHECK (purpose IN ('verify_email', 'login_otp', 'two_factor')),
  attempts     integer       NOT NULL DEFAULT 0,
  max_attempts integer       NOT NULL DEFAULT 5,
  expires_at   timestamptz   NOT NULL,
  consumed_at  timestamptz,
  created_at   timestamptz   NOT NULL DEFAULT now()
);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_resets (
  id           bigserial     PRIMARY KEY,
  user_id      text          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   text          NOT NULL UNIQUE,
  expires_at   timestamptz   NOT NULL,
  consumed_at  timestamptz,
  created_at   timestamptz   NOT NULL DEFAULT now()
);

-- Email change requests (audit trail)
CREATE TABLE IF NOT EXISTS email_changes (
  id            bigserial     PRIMARY KEY,
  user_id       text          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  old_email     text          NOT NULL,
  new_email     text          NOT NULL,
  token_hash    text          NOT NULL UNIQUE,
  expires_at    timestamptz   NOT NULL,
  confirmed_at  timestamptz,
  created_at    timestamptz   NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user        ON sessions(user_id, revoked_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh      ON sessions(refresh_token) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_otp_email_purpose     ON otp_codes(email, purpose, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_otp_user              ON otp_codes(user_id, purpose) WHERE consumed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_password_resets_user  ON password_resets(user_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_changes_user    ON email_changes(user_id, created_at DESC);
