-- backend/db/schema.sql
-- Idempotent: safe to run on every startup via initDatabase().
--
--   users    — one row per signed-up account
--   cv_data  — one row per user (1:1), holding the full resume JSON
--
-- Roles:
--   'student'  — can build their own CV, cannot access admin
--   'faculty'  — can build their own CV (academic profile)
--   'admin'    — can view all users / download CVs, cannot build a CV

CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid()

CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  full_name       TEXT,
  is_admin        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at   TIMESTAMPTZ
);

-- Idempotently add columns that postdate the original schema.
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin    BOOLEAN     NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role        TEXT        NOT NULL DEFAULT 'student';
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name  TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name   TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reg_no      TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS faculty     TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS batch       TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS department  TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS designation TEXT;

-- Constrain role to known values (drop-and-add keeps it idempotent).
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD  CONSTRAINT users_role_check
  CHECK (role IN ('student', 'faculty', 'admin'));

CREATE INDEX IF NOT EXISTS users_email_idx   ON users (LOWER(email));
CREATE INDEX IF NOT EXISTS users_faculty_idx ON users (faculty);
CREATE INDEX IF NOT EXISTS users_batch_idx   ON users (batch);
CREATE INDEX IF NOT EXISTS users_role_idx    ON users (role);

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
