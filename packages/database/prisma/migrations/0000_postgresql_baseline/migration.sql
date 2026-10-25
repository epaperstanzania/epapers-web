-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AccountRole" AS ENUM ('CONTRIBUTOR', 'LECTURER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED');

-- CreateEnum
CREATE TYPE "ProgramLevel" AS ENUM ('ORDINARY_DIPLOMA', 'BACHELOR');

-- CreateEnum
CREATE TYPE "Campus" AS ENUM ('MAIN', 'MWANZA', 'SONGWE');

-- CreateEnum
CREATE TYPE "PaperCategory" AS ENUM ('TEST', 'UE', 'SUPP');

-- CreateEnum
CREATE TYPE "PaperStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SPAM');

-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('PENDING', 'CLEAN', 'REJECTED');

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "code_normalized" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "icon" TEXT NOT NULL DEFAULT 'Building2',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by_user_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "department_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "code_normalized" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" "ProgramLevel" NOT NULL,
    "award_title" TEXT NOT NULL,
    "campus" "Campus" NOT NULL DEFAULT 'MAIN',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by_user_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "program_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "code_normalized" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_normalized" TEXT NOT NULL,
    "semester" SMALLINT NOT NULL,
    "level_year" SMALLINT,
    "credits" DECIMAL(5,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by_user_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "username" TEXT NOT NULL,
    "username_normalized" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_normalized" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "totp_secret" TEXT,
    "password_hash" TEXT NOT NULL,
    "role" "AccountRole" NOT NULL DEFAULT 'CONTRIBUTOR',
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "email_verified_at" TIMESTAMPTZ,
    "lecturer_verified_at" TIMESTAMPTZ,
    "home_department_id" UUID,
    "bio" VARCHAR(1000) NOT NULL DEFAULT '',
    "avatar_id" VARCHAR(32),
    "xp" INTEGER NOT NULL DEFAULT 0,
    "all_time_xp" INTEGER NOT NULL DEFAULT 0,
    "username_changed_at" TIMESTAMPTZ,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by_user_id" UUID,
    "joined_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "family_id" UUID NOT NULL,
    "rotated_at" TIMESTAMPTZ,
    "user_agent" TEXT,
    "ip_hash" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "revoked_at" TIMESTAMPTZ,
    "admin_email_verified_at" TIMESTAMPTZ,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_identities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_user_id" UUID NOT NULL,
    "avatar_url" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stored_files" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_user_id" UUID,
    "bucket_name" TEXT NOT NULL,
    "object_key" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "sha256_hex" CHAR(64),
    "scan_status" "ScanStatus" NOT NULL DEFAULT 'PENDING',
    "scanned_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "published_at" TIMESTAMPTZ,
    "page_count" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stored_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "papers" (
    "purge_started_at" TIMESTAMPTZ,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "module_id" UUID NOT NULL,
    "uploaded_by_user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "category" "PaperCategory" NOT NULL,
    "test_number" SMALLINT,
    "academic_year_start" SMALLINT NOT NULL,
    "semester" SMALLINT NOT NULL,
    "exam_period" TEXT NOT NULL DEFAULT '',
    "exam_file_id" UUID NOT NULL,
    "marking_scheme_file_id" UUID,
    "status" "PaperStatus" NOT NULL DEFAULT 'PENDING',
    "duplicate_warning" BOOLEAN NOT NULL DEFAULT false,
    "page_count" INTEGER,
    "rejection_reason" TEXT,
    "reviewed_by_user_id" UUID,
    "reviewed_at" TIMESTAMPTZ,
    "views_count" BIGINT NOT NULL DEFAULT 0,
    "downloads_count" BIGINT NOT NULL DEFAULT 0,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by_user_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "papers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "run_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "lease_token" UUID,
    "dedupe_key" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "username_registry" (
    "username_normalized" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "claimed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retired_at" TIMESTAMPTZ,

    CONSTRAINT "username_registry_pkey" PRIMARY KEY ("username_normalized")
);

-- CreateTable
CREATE TABLE "admin_auth_challenges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "session_id" UUID,
    "challenge_hash" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "credential_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "attempts" BIGINT NOT NULL DEFAULT 0,
    "consumed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_auth_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_challenges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "attempts" BIGINT NOT NULL DEFAULT 0,
    "consumed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_by_user_id" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_user_id" UUID,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" UUID,
    "reason" TEXT NOT NULL DEFAULT '',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "target_description" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xp_ledger" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "amount" BIGINT NOT NULL,
    "event_type" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL DEFAULT '',
    "paper_id" UUID,
    "note" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'applied',
    "reward_key" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xp_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paper_download_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "paper_id" UUID NOT NULL,
    "ip_hash" TEXT,
    "processed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paper_download_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paper_view_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "paper_id" UUID NOT NULL,
    "ip_hash" TEXT,
    "processed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paper_view_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "read_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "starts_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ends_at" TIMESTAMPTZ,
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by_user_id" UUID,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "requested_by_user_id" UUID,
    "program_id" UUID NOT NULL,
    "module_code" TEXT NOT NULL,
    "module_name" TEXT NOT NULL,
    "academic_year_start" SMALLINT NOT NULL,
    "description" TEXT NOT NULL,
    "semester" SMALLINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewed_by_user_id" UUID,
    "reviewed_at" TIMESTAMPTZ,
    "review_note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by_user_id" UUID,

    CONSTRAINT "module_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paper_reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "paper_id" UUID NOT NULL,
    "reviewer_user_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "corrected_title" TEXT,
    "corrected_module_code" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paper_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flagged_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "paper_id" UUID NOT NULL,
    "reported_by_user_id" UUID,
    "reason" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "resolved_by_user_id" UUID,
    "resolved_at" TIMESTAMPTZ,
    "resolution_note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flagged_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "takedown_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "paper_id" UUID NOT NULL,
    "requester_user_id" UUID,
    "requester_full_name" TEXT NOT NULL,
    "requester_email" TEXT NOT NULL,
    "affiliation" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "evidence" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewed_by_user_id" UUID,
    "reviewed_at" TIMESTAMPTZ,
    "review_note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "takedown_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievement_definitions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "xp_reward" INTEGER NOT NULL DEFAULT 0,
    "icon_name" TEXT NOT NULL DEFAULT 'Award',
    "max_progress" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "achievement_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_achievements" (
    "user_id" UUID NOT NULL,
    "achievement_id" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "unlocked_at" TIMESTAMPTZ,

    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("user_id","achievement_id")
);

-- CreateTable
CREATE TABLE "contact_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sender_user_id" UUID,
    "sender_name" TEXT NOT NULL,
    "sender_email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limit_counters" (
    "key" TEXT NOT NULL,
    "hits" BIGINT NOT NULL DEFAULT 1,
    "expires_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "rate_limit_counters_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "email_daily_counters" (
    "day" DATE NOT NULL,
    "sent" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "email_daily_counters_pkey" PRIMARY KEY ("day")
);

-- CreateTable
CREATE TABLE "lecturer_verifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "department_id" UUID NOT NULL,
    "evidence" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewed_by_user_id" UUID,
    "reviewed_at" TIMESTAMPTZ,
    "review_note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lecturer_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "programs_department_id_is_active_idx" ON "programs"("department_id", "is_active");

-- CreateIndex
CREATE INDEX "modules_program_id_semester_is_active_idx" ON "modules"("program_id", "semester", "is_active");

-- CreateIndex
CREATE INDEX "modules_code_normalized_idx" ON "modules"("code_normalized");

-- CreateIndex
CREATE INDEX "modules_name_normalized_idx" ON "modules"("name_normalized");

-- CreateIndex
CREATE UNIQUE INDEX "modules_id_program_id_key" ON "modules"("id", "program_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_normalized_key" ON "users"("username_normalized");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_normalized_key" ON "users"("email_normalized");

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");

-- CreateIndex
CREATE INDEX "users_home_department_id_idx" ON "users"("home_department_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_refresh_token_hash_key" ON "user_sessions"("refresh_token_hash");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_expires_at_idx" ON "user_sessions"("user_id", "expires_at");

-- CreateIndex
CREATE INDEX "user_sessions_family_id_idx" ON "user_sessions"("family_id");

-- CreateIndex
CREATE INDEX "oauth_identities_user_id_idx" ON "oauth_identities"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_identities_provider_provider_user_id_key" ON "oauth_identities"("provider", "provider_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_identities_user_id_provider_key" ON "oauth_identities"("user_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "stored_files_object_key_key" ON "stored_files"("object_key");

-- CreateIndex
CREATE INDEX "stored_files_sha256_hex_idx" ON "stored_files"("sha256_hex");

-- CreateIndex
CREATE UNIQUE INDEX "papers_exam_file_id_key" ON "papers"("exam_file_id");

-- CreateIndex
CREATE UNIQUE INDEX "papers_marking_scheme_file_id_key" ON "papers"("marking_scheme_file_id");

-- CreateIndex
CREATE INDEX "papers_module_id_category_test_number_academic_year_start_s_idx" ON "papers"("module_id", "category", "test_number", "academic_year_start", "semester", "status");

-- CreateIndex
CREATE INDEX "papers_status_created_at_idx" ON "papers"("status", "created_at");

-- CreateIndex
CREATE INDEX "papers_uploaded_by_user_id_created_at_idx" ON "papers"("uploaded_by_user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_dedupe_key_key" ON "jobs"("dedupe_key");

-- CreateIndex
CREATE INDEX "jobs_status_run_at_idx" ON "jobs"("status", "run_at");

-- CreateIndex
CREATE INDEX "username_registry_user_id_idx" ON "username_registry"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_auth_challenges_challenge_hash_key" ON "admin_auth_challenges"("challenge_hash");

-- CreateIndex
CREATE INDEX "admin_auth_challenges_user_id_kind_created_at_idx" ON "admin_auth_challenges"("user_id", "kind", "created_at" DESC);

-- CreateIndex
CREATE INDEX "admin_auth_challenges_expires_at_idx" ON "admin_auth_challenges"("expires_at");

-- CreateIndex
CREATE INDEX "auth_challenges_user_id_kind_created_at_idx" ON "auth_challenges"("user_id", "kind", "created_at" DESC);

-- CreateIndex
CREATE INDEX "auth_challenges_token_hash_idx" ON "auth_challenges"("token_hash");

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_idx" ON "audit_logs"("actor_user_id");

-- CreateIndex
CREATE INDEX "audit_logs_target_type_target_id_created_at_idx" ON "audit_logs"("target_type", "target_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "xp_ledger_reward_key_key" ON "xp_ledger"("reward_key");

-- CreateIndex
CREATE INDEX "xp_ledger_user_id_created_at_idx" ON "xp_ledger"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "xp_ledger_paper_id_idx" ON "xp_ledger"("paper_id");

-- CreateIndex
CREATE INDEX "paper_download_events_paper_id_created_at_idx" ON "paper_download_events"("paper_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "paper_view_events_paper_id_created_at_idx" ON "paper_view_events"("paper_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "module_requests_status_created_at_idx" ON "module_requests"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "module_requests_requested_by_user_id_idx" ON "module_requests"("requested_by_user_id");

-- CreateIndex
CREATE INDEX "module_requests_program_id_module_code_idx" ON "module_requests"("program_id", "module_code");

-- CreateIndex
CREATE INDEX "module_requests_reviewed_by_user_id_idx" ON "module_requests"("reviewed_by_user_id");

-- CreateIndex
CREATE INDEX "paper_reviews_paper_id_created_at_idx" ON "paper_reviews"("paper_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "paper_reviews_reviewer_user_id_idx" ON "paper_reviews"("reviewer_user_id");

-- CreateIndex
CREATE INDEX "flagged_reports_status_created_at_idx" ON "flagged_reports"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "flagged_reports_paper_id_idx" ON "flagged_reports"("paper_id");

-- CreateIndex
CREATE INDEX "flagged_reports_reported_by_user_id_idx" ON "flagged_reports"("reported_by_user_id");

-- CreateIndex
CREATE INDEX "flagged_reports_resolved_by_user_id_idx" ON "flagged_reports"("resolved_by_user_id");

-- CreateIndex
CREATE INDEX "takedown_requests_status_created_at_idx" ON "takedown_requests"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "takedown_requests_paper_id_idx" ON "takedown_requests"("paper_id");

-- CreateIndex
CREATE INDEX "takedown_requests_requester_user_id_idx" ON "takedown_requests"("requester_user_id");

-- CreateIndex
CREATE INDEX "takedown_requests_reviewed_by_user_id_idx" ON "takedown_requests"("reviewed_by_user_id");

-- CreateIndex
CREATE INDEX "user_achievements_achievement_id_idx" ON "user_achievements"("achievement_id");

-- CreateIndex
CREATE INDEX "contact_messages_sender_user_id_idx" ON "contact_messages"("sender_user_id");

-- CreateIndex
CREATE INDEX "rate_limit_counters_expires_at_idx" ON "rate_limit_counters"("expires_at");

-- CreateIndex
CREATE INDEX "lecturer_verifications_status_created_at_idx" ON "lecturer_verifications"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "lecturer_verifications_department_id_idx" ON "lecturer_verifications"("department_id");

-- CreateIndex
CREATE INDEX "lecturer_verifications_reviewed_by_user_id_idx" ON "lecturer_verifications"("reviewed_by_user_id");

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_deleted_by_user_id_fkey" FOREIGN KEY ("deleted_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_deleted_by_user_id_fkey" FOREIGN KEY ("deleted_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modules" ADD CONSTRAINT "modules_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modules" ADD CONSTRAINT "modules_deleted_by_user_id_fkey" FOREIGN KEY ("deleted_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_home_department_id_fkey" FOREIGN KEY ("home_department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_deleted_by_user_id_fkey" FOREIGN KEY ("deleted_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_identities" ADD CONSTRAINT "oauth_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stored_files" ADD CONSTRAINT "stored_files_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "papers" ADD CONSTRAINT "papers_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "papers" ADD CONSTRAINT "papers_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "papers" ADD CONSTRAINT "papers_exam_file_id_fkey" FOREIGN KEY ("exam_file_id") REFERENCES "stored_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "papers" ADD CONSTRAINT "papers_marking_scheme_file_id_fkey" FOREIGN KEY ("marking_scheme_file_id") REFERENCES "stored_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "papers" ADD CONSTRAINT "papers_deleted_by_user_id_fkey" FOREIGN KEY ("deleted_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "papers" ADD CONSTRAINT "papers_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "username_registry" ADD CONSTRAINT "username_registry_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_auth_challenges" ADD CONSTRAINT "admin_auth_challenges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_auth_challenges" ADD CONSTRAINT "admin_auth_challenges_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "user_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_challenges" ADD CONSTRAINT "auth_challenges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_ledger" ADD CONSTRAINT "xp_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_ledger" ADD CONSTRAINT "xp_ledger_paper_id_fkey" FOREIGN KEY ("paper_id") REFERENCES "papers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paper_download_events" ADD CONSTRAINT "paper_download_events_paper_id_fkey" FOREIGN KEY ("paper_id") REFERENCES "papers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paper_view_events" ADD CONSTRAINT "paper_view_events_paper_id_fkey" FOREIGN KEY ("paper_id") REFERENCES "papers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_deleted_by_user_id_fkey" FOREIGN KEY ("deleted_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_requests" ADD CONSTRAINT "module_requests_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_requests" ADD CONSTRAINT "module_requests_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_requests" ADD CONSTRAINT "module_requests_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_requests" ADD CONSTRAINT "module_requests_deleted_by_user_id_fkey" FOREIGN KEY ("deleted_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paper_reviews" ADD CONSTRAINT "paper_reviews_paper_id_fkey" FOREIGN KEY ("paper_id") REFERENCES "papers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paper_reviews" ADD CONSTRAINT "paper_reviews_reviewer_user_id_fkey" FOREIGN KEY ("reviewer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flagged_reports" ADD CONSTRAINT "flagged_reports_paper_id_fkey" FOREIGN KEY ("paper_id") REFERENCES "papers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flagged_reports" ADD CONSTRAINT "flagged_reports_reported_by_user_id_fkey" FOREIGN KEY ("reported_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flagged_reports" ADD CONSTRAINT "flagged_reports_resolved_by_user_id_fkey" FOREIGN KEY ("resolved_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "takedown_requests" ADD CONSTRAINT "takedown_requests_paper_id_fkey" FOREIGN KEY ("paper_id") REFERENCES "papers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "takedown_requests" ADD CONSTRAINT "takedown_requests_requester_user_id_fkey" FOREIGN KEY ("requester_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "takedown_requests" ADD CONSTRAINT "takedown_requests_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "achievement_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lecturer_verifications" ADD CONSTRAINT "lecturer_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lecturer_verifications" ADD CONSTRAINT "lecturer_verifications_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lecturer_verifications" ADD CONSTRAINT "lecturer_verifications_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Application invariants and access-path indexes that Prisma cannot express.
ALTER TABLE modules ADD CONSTRAINT modules_semester_check CHECK (semester IN (1, 2));
ALTER TABLE modules ADD CONSTRAINT modules_level_year_check CHECK (level_year IS NULL OR level_year BETWEEN 1 AND 8);
ALTER TABLE modules ADD CONSTRAINT modules_credits_check CHECK (credits IS NULL OR credits >= 0);
ALTER TABLE users ADD CONSTRAINT users_xp_check CHECK (xp >= 0);
ALTER TABLE users ADD CONSTRAINT users_all_time_xp_check CHECK (all_time_xp >= 0);
ALTER TABLE users ADD CONSTRAINT users_avatar_id_check CHECK (avatar_id IS NULL OR avatar_id ~ '^[a-z0-9_-]{1,32}$');
ALTER TABLE users ADD CONSTRAINT users_lengths_check CHECK (length(full_name) BETWEEN 2 AND 160 AND length(bio) <= 1000 AND length(username) BETWEEN 3 AND 30);
ALTER TABLE user_sessions ADD CONSTRAINT user_sessions_expiry_check CHECK (expires_at > created_at);
ALTER TABLE stored_files ADD CONSTRAINT stored_files_size_check CHECK (size_bytes > 0);
ALTER TABLE stored_files ADD CONSTRAINT stored_files_sha256_length_check CHECK (sha256_hex IS NULL OR length(sha256_hex) = 64);
ALTER TABLE stored_files ADD CONSTRAINT stored_files_page_count_check CHECK (page_count IS NULL OR page_count > 0);
ALTER TABLE papers ADD CONSTRAINT papers_title_check CHECK (length(trim(title)) BETWEEN 2 AND 240);
ALTER TABLE papers ADD CONSTRAINT papers_academic_year_check CHECK (academic_year_start BETWEEN 2000 AND 2200);
ALTER TABLE papers ADD CONSTRAINT papers_semester_check CHECK (semester IN (1, 2));
ALTER TABLE papers ADD CONSTRAINT papers_counts_check CHECK (views_count >= 0 AND downloads_count >= 0);
ALTER TABLE papers ADD CONSTRAINT papers_page_count_check CHECK (page_count IS NULL OR page_count > 0);
ALTER TABLE papers ADD CONSTRAINT papers_rejection_reason_check CHECK (status != 'REJECTED' OR rejection_reason IS NOT NULL);
ALTER TABLE papers ADD CONSTRAINT papers_test_number_check CHECK (test_number IS NULL OR (category = 'TEST' AND test_number IN (1, 2)));
ALTER TABLE username_registry ADD CONSTRAINT username_registry_retirement_check CHECK ((is_current AND retired_at IS NULL) OR (NOT is_current AND retired_at IS NOT NULL));
ALTER TABLE xp_ledger ADD CONSTRAINT xp_ledger_amount_check CHECK (amount > 0);
ALTER TABLE xp_ledger ADD CONSTRAINT xp_ledger_event_type_check CHECK (event_type IN ('APPROVED_PAPER','MARKING_SCHEME','SUPPLEMENTARY','MILESTONE','ADMIN_ADJUSTMENT'));
ALTER TABLE xp_ledger ADD CONSTRAINT xp_ledger_grant_reason_check CHECK (event_type != 'ADMIN_ADJUSTMENT' OR length(trim(reason)) > 0);
ALTER TABLE departments ADD CONSTRAINT departments_lengths_check CHECK (length(trim(code)) BETWEEN 2 AND 20 AND length(trim(name)) BETWEEN 2 AND 160);
ALTER TABLE programs ADD CONSTRAINT programs_lengths_check CHECK (length(trim(code)) BETWEEN 2 AND 30 AND length(trim(name)) BETWEEN 2 AND 200);
ALTER TABLE modules ADD CONSTRAINT modules_lengths_check CHECK (length(trim(code)) BETWEEN 2 AND 30 AND length(trim(name)) BETWEEN 2 AND 240);
ALTER TABLE module_requests ADD CONSTRAINT module_requests_year_check CHECK (academic_year_start BETWEEN 2000 AND 2200);
ALTER TABLE module_requests ADD CONSTRAINT module_requests_semester_check CHECK (semester IN (1, 2));
ALTER TABLE achievement_definitions ADD CONSTRAINT achievement_definitions_progress_check CHECK (max_progress > 0 AND xp_reward >= 0);
ALTER TABLE user_achievements ADD CONSTRAINT user_achievements_progress_check CHECK (progress >= 0);
ALTER TABLE auth_challenges ADD CONSTRAINT auth_challenges_kind_check CHECK (kind IN ('otp', 'reset'));
ALTER TABLE admin_auth_challenges ADD CONSTRAINT admin_auth_challenges_kind_check CHECK (kind IN ('login', 'reauth'));
ALTER TABLE announcements ADD CONSTRAINT announcements_type_check CHECK (type IN ('info', 'warning', 'alert', 'success'));
ALTER TABLE announcements ADD CONSTRAINT announcements_time_check CHECK (ends_at IS NULL OR ends_at > starts_at);
ALTER TABLE module_requests ADD CONSTRAINT module_requests_status_check CHECK (status IN ('pending', 'approved', 'rejected'));
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN ('xp', 'paper_approved', 'paper_rejected', 'announcement', 'system'));
ALTER TABLE paper_reviews ADD CONSTRAINT paper_reviews_action_check CHECK (action IN ('approved', 'rejected', 'marked_spam', 'edited'));
ALTER TABLE flagged_reports ADD CONSTRAINT flagged_reports_reason_check CHECK (reason IN ('blurry_scan', 'wrong_module', 'copyright', 'duplicate', 'offensive', 'incomplete'));
ALTER TABLE flagged_reports ADD CONSTRAINT flagged_reports_status_check CHECK (status IN ('pending', 'resolved', 'dismissed'));
ALTER TABLE takedown_requests ADD CONSTRAINT takedown_requests_status_check CHECK (status IN ('pending', 'approved_removed', 'rejected'));
ALTER TABLE achievement_definitions ADD CONSTRAINT achievement_definitions_category_check CHECK (category IN ('submission', 'quality', 'speed', 'milestone', 'schemes'));
ALTER TABLE contact_messages ADD CONSTRAINT contact_messages_status_check CHECK (status IN ('new', 'in_progress', 'closed'));
ALTER TABLE lecturer_verifications ADD CONSTRAINT lecturer_verifications_status_check CHECK (status IN ('pending', 'approved', 'rejected'));
ALTER TABLE xp_ledger ADD CONSTRAINT xp_ledger_status_check CHECK (status IN ('applied', 'pending_rescan'));

CREATE UNIQUE INDEX departments_code_live_key ON departments(code_normalized) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX programs_department_code_live_key ON programs(department_id, code_normalized) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX modules_program_code_live_key ON modules(program_id, code_normalized) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX programs_code_live_key ON programs(code_normalized) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX modules_code_live_key ON modules(code_normalized) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX username_registry_one_current_per_user_idx ON username_registry(user_id) WHERE is_current;
CREATE UNIQUE INDEX lecturer_pending_unique ON lecturer_verifications(user_id) WHERE status = 'pending';
CREATE INDEX modules_program_semester_active_idx ON modules(program_id, semester) WHERE is_active AND deleted_at IS NULL;
CREATE INDEX papers_public_recent_idx ON papers(created_at DESC) WHERE status = 'APPROVED' AND deleted_at IS NULL;
CREATE INDEX papers_public_popular_idx ON papers(downloads_count DESC) WHERE status = 'APPROVED' AND deleted_at IS NULL;
CREATE INDEX papers_moderation_queue_idx ON papers(status, created_at) WHERE status = 'PENDING' AND deleted_at IS NULL;
CREATE INDEX users_leaderboard_idx ON users(xp DESC, joined_at, id) WHERE role IN ('CONTRIBUTOR', 'LECTURER') AND status = 'ACTIVE' AND deleted_at IS NULL;
CREATE INDEX user_sessions_live_idx ON user_sessions(user_id, expires_at) WHERE revoked_at IS NULL;
CREATE INDEX notifications_unread_idx ON notifications(user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX downloads_unprocessed ON paper_download_events(created_at, id) WHERE processed_at IS NULL;
CREATE INDEX views_unprocessed ON paper_view_events(created_at, id) WHERE processed_at IS NULL;
CREATE INDEX files_abandoned ON stored_files(created_at) WHERE completed_at IS NULL;
CREATE INDEX papers_retention_idx ON papers(deleted_at, id) WHERE deleted_at IS NOT NULL;

INSERT INTO app_settings(key, value) VALUES
  ('usernameCooldownDays', '30'::jsonb), ('lockdown', 'false'::jsonb),
  ('retentionDays', '90'::jsonb), ('readOnly', 'false'::jsonb),
  ('bannerMessage', '""'::jsonb)
ON CONFLICT (key) DO NOTHING;
INSERT INTO achievement_definitions(id, title, description, category, max_progress) VALUES
  ('first-paper', 'First contribution', 'One approved paper', 'submission', 1),
  ('ten-papers', 'Archive builder', 'Ten approved papers', 'submission', 10),
  ('first-scheme', 'Study companion', 'One approved marking scheme', 'schemes', 1)
ON CONFLICT (id) DO NOTHING;
