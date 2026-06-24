-- ============================================================
-- Migration 0002: Historical Air Quality Data Pipeline
-- ============================================================

-- Historical readings archive (2-year rolling window, all 16 cities)
CREATE TABLE IF NOT EXISTS historical_readings (
  id             bigserial     PRIMARY KEY,
  city_id        text          NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  station_id     text          NOT NULL,
  station_name   text          NOT NULL,
  ward           text          NOT NULL DEFAULT 'Citywide',
  latitude       double precision NOT NULL,
  longitude      double precision NOT NULL,
  -- Pollutants
  aqi            integer       NOT NULL CHECK (aqi >= 0),
  pm25           double precision NOT NULL CHECK (pm25 >= 0),
  pm10           double precision NOT NULL CHECK (pm10 >= 0),
  no2            double precision NOT NULL CHECK (no2 >= 0),
  so2            double precision,
  co             double precision,
  o3             double precision,
  -- Weather
  temperature    double precision,
  humidity       double precision CHECK (humidity IS NULL OR humidity BETWEEN 0 AND 100),
  wind_speed     double precision CHECK (wind_speed IS NULL OR wind_speed >= 0),
  wind_direction integer        CHECK (wind_direction IS NULL OR wind_direction BETWEEN 0 AND 360),
  rainfall_mm    double precision CHECK (rainfall_mm IS NULL OR rainfall_mm >= 0),
  -- Context
  source         text          NOT NULL DEFAULT 'synthetic',   -- 'cpcb' | 'openaq' | 'imd' | 'synthetic'
  quality_flag   text          NOT NULL DEFAULT 'good' CHECK (quality_flag IN ('good', 'suspect', 'missing')),
  observed_at    timestamptz   NOT NULL,
  ingested_at    timestamptz   NOT NULL DEFAULT now()
);

-- Environmental context indicators (daily, city-level)
CREATE TABLE IF NOT EXISTS environmental_indicators (
  id                   bigserial     PRIMARY KEY,
  city_id              text          NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  traffic_density      double precision CHECK (traffic_density IS NULL OR traffic_density BETWEEN 0 AND 1),
  construction_index   double precision CHECK (construction_index IS NULL OR construction_index BETWEEN 0 AND 1),
  industrial_emissions double precision CHECK (industrial_emissions IS NULL OR industrial_emissions >= 0),
  crop_burning_index   double precision CHECK (crop_burning_index IS NULL OR crop_burning_index BETWEEN 0 AND 1),
  vehicle_count        integer,
  recorded_date        date          NOT NULL,
  source               text          NOT NULL DEFAULT 'synthetic',
  ingested_at          timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (city_id, recorded_date)
);

-- Aggregated daily statistics (pre-computed for performance)
CREATE TABLE IF NOT EXISTS daily_city_stats (
  id          bigserial PRIMARY KEY,
  city_id     text      NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  stat_date   date      NOT NULL,
  aqi_avg     double precision,
  aqi_max     integer,
  aqi_min     integer,
  pm25_avg    double precision,
  pm10_avg    double precision,
  no2_avg     double precision,
  so2_avg     double precision,
  co_avg      double precision,
  o3_avg      double precision,
  aqi_category text     CHECK (aqi_category IN ('Good','Satisfactory','Moderate','Poor','Very Poor','Severe')),
  reading_count integer NOT NULL DEFAULT 0,
  computed_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (city_id, stat_date)
);

-- ETL job audit log
CREATE TABLE IF NOT EXISTS ingestion_runs (
  id            bigserial     PRIMARY KEY,
  run_type      text          NOT NULL CHECK (run_type IN ('bulk', 'daily', 'manual')),
  status        text          NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  cities_processed  integer   NOT NULL DEFAULT 0,
  rows_inserted integer       NOT NULL DEFAULT 0,
  rows_skipped  integer       NOT NULL DEFAULT 0,
  error_message text,
  started_at    timestamptz   NOT NULL DEFAULT now(),
  finished_at   timestamptz
);

-- ML model training metadata
CREATE TABLE IF NOT EXISTS ml_training_runs (
  id              bigserial     PRIMARY KEY,
  model_name      text          NOT NULL,
  version         text          NOT NULL,
  city_id         text          REFERENCES cities(id) ON DELETE SET NULL,
  training_from   date          NOT NULL,
  training_to     date          NOT NULL,
  mae             double precision,
  rmse            double precision,
  accuracy        double precision,
  feature_set     jsonb         NOT NULL DEFAULT '[]'::jsonb,
  hyperparams     jsonb         NOT NULL DEFAULT '{}'::jsonb,
  artifact_path   text,
  status          text          NOT NULL CHECK (status IN ('training', 'completed', 'failed')),
  triggered_by    text          NOT NULL DEFAULT 'scheduler',
  started_at      timestamptz   NOT NULL DEFAULT now(),
  finished_at     timestamptz
);

-- Indexes optimized for time-series and city-based analytics
CREATE INDEX IF NOT EXISTS idx_hist_city_time     ON historical_readings(city_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_hist_observed_at   ON historical_readings(observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_hist_station       ON historical_readings(station_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_hist_aqi           ON historical_readings(city_id, aqi, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_env_city_date      ON environmental_indicators(city_id, recorded_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_city_date    ON daily_city_stats(city_id, stat_date DESC);
CREATE INDEX IF NOT EXISTS idx_ingestion_status   ON ingestion_runs(status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_ml_model_city      ON ml_training_runs(model_name, city_id, started_at DESC);
