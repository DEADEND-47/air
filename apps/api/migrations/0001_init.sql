CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('city_admin', 'analyst', 'enforcement_officer', 'health_officer')),
  password_hash text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cities (
  id text PRIMARY KEY,
  name text NOT NULL,
  state text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  aqi integer NOT NULL CHECK (aqi >= 0),
  pm25 double precision NOT NULL CHECK (pm25 >= 0),
  pm10 double precision NOT NULL CHECK (pm10 >= 0),
  no2 double precision NOT NULL CHECK (no2 >= 0),
  trend text NOT NULL CHECK (trend IN ('up', 'down', 'flat')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sensor_readings (
  id text PRIMARY KEY,
  sensor_id text NOT NULL,
  city_id text NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  ward text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  aqi integer NOT NULL CHECK (aqi >= 0),
  pm25 double precision NOT NULL CHECK (pm25 >= 0),
  pm10 double precision NOT NULL CHECK (pm10 >= 0),
  no2 double precision NOT NULL CHECK (no2 >= 0),
  temperature double precision NOT NULL,
  humidity double precision NOT NULL CHECK (humidity BETWEEN 0 AND 100),
  observed_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS forecasts (
  id bigserial PRIMARY KEY,
  city_id text NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  ward text NOT NULL,
  horizon_hours integer NOT NULL CHECK (horizon_hours >= 0),
  predicted_aqi integer NOT NULL CHECK (predicted_aqi >= 0),
  lower_bound integer NOT NULL CHECK (lower_bound >= 0),
  upper_bound integer NOT NULL CHECK (upper_bound >= lower_bound),
  confidence double precision NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  predicted_at timestamptz NOT NULL,
  drivers jsonb NOT NULL DEFAULT '[]'::jsonb,
  UNIQUE (city_id, ward, horizon_hours, predicted_at)
);

CREATE TABLE IF NOT EXISTS attributions (
  id bigserial PRIMARY KEY,
  city_id text NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  ward text NOT NULL,
  generated_at timestamptz NOT NULL,
  confidence double precision NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  sources jsonb NOT NULL,
  explanation text NOT NULL
);

CREATE TABLE IF NOT EXISTS alerts (
  id text PRIMARY KEY,
  city_id text NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  ward text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  status text NOT NULL CHECK (status IN ('open', 'acknowledged', 'resolved')),
  source text NOT NULL,
  correlation_id text,
  assigned_to text REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS advisories (
  id text PRIMARY KEY,
  city_id text NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  ward text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  audience jsonb NOT NULL,
  channels jsonb NOT NULL,
  message text NOT NULL,
  status text NOT NULL CHECK (status IN ('draft', 'scheduled', 'published')),
  reach integer NOT NULL DEFAULT 0 CHECK (reach >= 0),
  created_at timestamptz NOT NULL,
  published_at timestamptz
);

CREATE TABLE IF NOT EXISTS enforcement_cases (
  id text PRIMARY KEY,
  city_id text NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  ward text NOT NULL,
  target text NOT NULL,
  category text NOT NULL,
  priority integer NOT NULL CHECK (priority BETWEEN 0 AND 100),
  evidence_score double precision NOT NULL CHECK (evidence_score BETWEEN 0 AND 1),
  estimated_impact double precision NOT NULL CHECK (estimated_impact >= 0),
  status text NOT NULL CHECK (status IN ('queued', 'dispatched', 'investigating', 'resolved')),
  assigned_unit text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
  id text PRIMARY KEY,
  actor_id text NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_readings_city_time ON sensor_readings(city_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_readings_sensor_time ON sensor_readings(sensor_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_forecasts_city_horizon ON forecasts(city_id, horizon_hours, predicted_at DESC);
CREATE INDEX IF NOT EXISTS idx_attributions_city_time ON attributions(city_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_operational ON alerts(city_id, status, severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_advisories_city_status ON advisories(city_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enforcement_priority ON enforcement_cases(city_id, status, priority DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_events(entity_type, entity_id, created_at DESC);
