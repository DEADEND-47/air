-- ============================================================
-- Migration 0004: Database Improvements & Settings
-- ============================================================

-- Clean up any duplicates in historical_readings
DELETE FROM historical_readings a USING historical_readings b
WHERE a.id > b.id AND a.station_id = b.station_id AND a.observed_at = b.observed_at;

-- Add unique constraint to prevent duplicate historical readings
ALTER TABLE historical_readings DROP CONSTRAINT IF EXISTS uq_hist_station_observed;
ALTER TABLE historical_readings ADD CONSTRAINT uq_hist_station_observed UNIQUE (station_id, observed_at);

-- Clean up any duplicates in sensor_readings
DELETE FROM sensor_readings a USING sensor_readings b
WHERE a.id > b.id AND a.sensor_id = b.sensor_id AND a.observed_at = b.observed_at;

-- Add unique constraint to prevent duplicate sensor readings
ALTER TABLE sensor_readings DROP CONSTRAINT IF EXISTS uq_sensor_id_observed;
ALTER TABLE sensor_readings ADD CONSTRAINT uq_sensor_id_observed UNIQUE (sensor_id, observed_at);

-- Add indexes on foreign keys to optimize joins and cascade deletes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_otp_codes_user_id ON otp_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_email_changes_user_id ON email_changes(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_assigned_to ON alerts(assigned_to);
CREATE INDEX IF NOT EXISTS idx_forecasts_city_id ON forecasts(city_id);
CREATE INDEX IF NOT EXISTS idx_attributions_city_id ON attributions(city_id);
CREATE INDEX IF NOT EXISTS idx_advisories_city_id ON advisories(city_id);
CREATE INDEX IF NOT EXISTS idx_enforcement_cases_city_id ON enforcement_cases(city_id);

-- System settings table to persist notification rule configs
CREATE TABLE IF NOT EXISTS system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Pre-populate default system settings
INSERT INTO system_settings (key, value) VALUES
  ('notifications', '{"emailsEnabled": true, "aqiThreshold": 300}'::jsonb)
ON CONFLICT (key) DO NOTHING;
