CREATE TABLE "paper_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "module_id" UUID NOT NULL,
    "requested_by_user_id" UUID,
    "category" "PaperCategory" NOT NULL,
    "test_number" SMALLINT NOT NULL DEFAULT 0,
    "academic_year_start" SMALLINT NOT NULL,
    "wants_marking_scheme" BOOLEAN NOT NULL DEFAULT false,
    "description" VARCHAR(400) NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewed_by_user_id" UUID,
    "reviewed_at" TIMESTAMPTZ,
    "review_note" VARCHAR(400) NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "paper_requests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "paper_requests_test_number_check" CHECK (("category" = 'TEST' AND "test_number" IN (1, 2)) OR ("category" <> 'TEST' AND "test_number" = 0)),
    CONSTRAINT "paper_requests_status_check" CHECK ("status" IN ('pending', 'fulfilled', 'dismissed')),
    CONSTRAINT "paper_requests_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "paper_requests_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "paper_requests_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "paper_requests_user_topic_key" ON "paper_requests"("requested_by_user_id", "module_id", "category", "academic_year_start", "test_number", "wants_marking_scheme");
CREATE INDEX "paper_requests_status_recent_idx" ON "paper_requests"("status", "created_at" DESC);
CREATE INDEX "paper_requests_topic_status_idx" ON "paper_requests"("module_id", "category", "academic_year_start", "test_number", "status");
ALTER TABLE "paper_requests" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE "paper_requests" FROM anon, authenticated, PUBLIC;
