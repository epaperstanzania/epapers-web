ALTER TABLE stored_files ADD COLUMN completed_at TIMESTAMPTZ;
ALTER TABLE stored_files ADD COLUMN published_at TIMESTAMPTZ;
ALTER TABLE stored_files ADD COLUMN page_count INT4 CHECK(page_count IS NULL OR page_count > 0);
ALTER TABLE jobs ADD COLUMN lease_token UUID;
ALTER TABLE jobs ADD COLUMN dedupe_key STRING;
CREATE UNIQUE INDEX jobs_dedupe_key_key ON jobs(dedupe_key);
ALTER TABLE xp_ledger ADD COLUMN reward_key STRING;
CREATE UNIQUE INDEX xp_ledger_reward_key_key ON xp_ledger(reward_key);
ALTER TABLE paper_download_events ADD COLUMN processed_at TIMESTAMPTZ;
ALTER TABLE paper_view_events ADD COLUMN processed_at TIMESTAMPTZ;
CREATE INDEX downloads_unprocessed ON paper_download_events(created_at,id) WHERE processed_at IS NULL;
CREATE INDEX views_unprocessed ON paper_view_events(created_at,id) WHERE processed_at IS NULL;
CREATE INDEX files_owner_created ON stored_files(owner_user_id,created_at);
CREATE INDEX files_abandoned ON stored_files(created_at) WHERE completed_at IS NULL;
INSERT INTO achievement_definitions(id,title,description,category,max_progress) VALUES
 ('first-paper','First contribution','One approved paper','submission',1),
 ('ten-papers','Archive builder','Ten approved papers','submission',10),
 ('first-scheme','Study companion','One approved marking scheme','schemes',1)
 ON CONFLICT(id) DO NOTHING;
