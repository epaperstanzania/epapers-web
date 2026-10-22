CREATE TABLE lecturer_verifications (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id),
 department_id UUID NOT NULL REFERENCES departments(id), evidence STRING NOT NULL,
 status STRING NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 reviewed_by_user_id UUID REFERENCES users(id), reviewed_at TIMESTAMPTZ, review_note STRING,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
) WITH(schema_locked=false);
CREATE UNIQUE INDEX lecturer_pending_unique ON lecturer_verifications(user_id) WHERE status='pending';
CREATE INDEX lecturer_queue ON lecturer_verifications(status,created_at DESC);
CREATE INDEX lecturer_department ON lecturer_verifications(department_id);
CREATE INDEX lecturer_reviewer ON lecturer_verifications(reviewed_by_user_id);
INSERT INTO app_settings(key,value) VALUES ('readOnly', 'false'),('bannerMessage','""') ON CONFLICT(key) DO NOTHING;
ALTER TABLE papers ADD COLUMN purge_started_at TIMESTAMPTZ;
