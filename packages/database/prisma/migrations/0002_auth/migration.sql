ALTER TABLE users ADD COLUMN totp_secret STRING;
ALTER TABLE user_sessions ADD COLUMN family_id UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE user_sessions ADD COLUMN rotated_at TIMESTAMPTZ;
CREATE INDEX user_sessions_family_idx ON user_sessions(family_id);
CREATE INDEX user_sessions_live_idx ON user_sessions(user_id, expires_at) WHERE revoked_at IS NULL;
CREATE TABLE auth_challenges (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id),
 kind STRING NOT NULL CHECK (kind IN ('otp','reset')), token_hash STRING NOT NULL,
 expires_at TIMESTAMPTZ NOT NULL, attempts INT NOT NULL DEFAULT 0, consumed_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
) WITH (schema_locked = false);
CREATE INDEX auth_challenges_user_kind_idx ON auth_challenges(user_id, kind, created_at DESC);
CREATE INDEX auth_challenges_hash_idx ON auth_challenges(token_hash);
CREATE TABLE app_settings (key STRING PRIMARY KEY, value JSONB NOT NULL) WITH (schema_locked = false);
INSERT INTO app_settings VALUES ('usernameCooldownDays','30'), ('lockdown','false'), ('retentionDays','90');
CREATE TABLE audit_logs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), actor_user_id UUID REFERENCES users(id), action STRING NOT NULL, target_type STRING NOT NULL, target_id UUID, reason STRING NOT NULL DEFAULT '', metadata JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT now()) WITH (schema_locked = false);
CREATE INDEX audit_time_sharded_idx ON audit_logs(created_at) USING HASH WITH BUCKET_COUNT = 8;
CREATE INDEX audit_target_idx ON audit_logs(target_type,target_id,created_at DESC);
CREATE INDEX downloads_time_sharded_idx ON paper_download_events(created_at) USING HASH WITH BUCKET_COUNT = 8;
CREATE INDEX views_time_sharded_idx ON paper_view_events(created_at) USING HASH WITH BUCKET_COUNT = 8;
CREATE INDEX papers_filters_idx ON papers(module_id,category,academic_year_start,semester) WHERE status='APPROVED' AND deleted_at IS NULL;
CREATE UNIQUE INDEX modules_id_program_key ON modules(id,program_id);
CREATE TABLE rate_limit_counters (key STRING PRIMARY KEY, hits INT NOT NULL DEFAULT 1, expires_at TIMESTAMPTZ NOT NULL) WITH (schema_locked = false);
CREATE INDEX rate_limit_expiry_idx ON rate_limit_counters(expires_at);
CREATE TABLE email_daily_counters (day DATE PRIMARY KEY, sent INT NOT NULL DEFAULT 0) WITH (schema_locked = false);
