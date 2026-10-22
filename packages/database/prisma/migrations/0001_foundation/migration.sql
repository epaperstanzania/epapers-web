-- CockroachDB-compatible constraints that Prisma cannot express.
CREATE UNIQUE INDEX IF NOT EXISTS departments_code_live_key
  ON departments (code_normalized) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS programs_department_code_live_key
  ON programs (department_id, code_normalized) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS modules_program_code_live_key
  ON modules (program_id, code_normalized) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS modules_program_semester_active_idx
  ON modules (program_id, semester) WHERE is_active AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS papers_public_recent_idx
  ON papers (created_at DESC) WHERE status = 'APPROVED' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS papers_public_popular_idx
  ON papers (downloads_count DESC) WHERE status = 'APPROVED' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS papers_moderation_queue_idx
  ON papers (status, created_at) WHERE status = 'PENDING' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS users_leaderboard_idx
  ON users (xp DESC, joined_at, id)
  WHERE role IN ('CONTRIBUTOR', 'LECTURER') AND status = 'ACTIVE' AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS username_registry (
  username_normalized STRING PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  is_current BOOL NOT NULL DEFAULT true,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  retired_at TIMESTAMPTZ,
  CONSTRAINT username_registry_retirement_check CHECK
    ((is_current AND retired_at IS NULL) OR (NOT is_current AND retired_at IS NOT NULL))
) WITH (schema_locked = false);
CREATE UNIQUE INDEX IF NOT EXISTS username_registry_one_current_per_user_idx
  ON username_registry (user_id) WHERE is_current;

CREATE TABLE IF NOT EXISTS xp_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  amount INT NOT NULL CHECK (amount > 0),
  event_type STRING NOT NULL,
  reason STRING NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
) WITH (schema_locked = false);
CREATE INDEX IF NOT EXISTS xp_ledger_user_created_idx ON xp_ledger (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS paper_download_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  ip_hash STRING,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
) WITH (schema_locked = false);
CREATE INDEX IF NOT EXISTS paper_download_events_paper_time_idx
  ON paper_download_events (paper_id, created_at DESC);
CREATE TABLE IF NOT EXISTS paper_view_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  ip_hash STRING,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
) WITH (schema_locked = false);
CREATE INDEX IF NOT EXISTS paper_view_events_paper_time_idx
  ON paper_view_events (paper_id, created_at DESC);
