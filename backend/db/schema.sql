-- backend/db/schema.sql
-- ---------------------------------------------------------------
-- PostgreSQL schema for Cviator Pro.
-- Idempotent: safe to run on every startup.
--
--   users    — one row per signed-up account
--   cv_data  — one row per user (1:1), holding the full resume JSON
-- ---------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid()

CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  full_name       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS users_email_idx ON users (LOWER(email));

CREATE TABLE IF NOT EXISTS cv_data (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  data        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger keeps cv_data.updated_at in sync on every UPDATE.
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cv_data_touch_updated_at ON cv_data;
CREATE TRIGGER cv_data_touch_updated_at
BEFORE UPDATE ON cv_data
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
