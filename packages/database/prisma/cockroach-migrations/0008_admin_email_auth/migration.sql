CREATE TABLE admin_auth_challenges (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 kind STRING NOT NULL CHECK (kind IN ('login','reauth')), session_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE,
 challenge_hash STRING NOT NULL UNIQUE, code_hash STRING NOT NULL, credential_hash STRING NOT NULL,
 expires_at TIMESTAMPTZ NOT NULL, attempts INT NOT NULL DEFAULT 0, consumed_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
) WITH (schema_locked = false);
CREATE INDEX admin_auth_challenges_user_kind_idx ON admin_auth_challenges(user_id, kind, created_at DESC);
CREATE INDEX admin_auth_challenges_expiry_idx ON admin_auth_challenges(expires_at);
