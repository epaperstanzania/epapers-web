CREATE TYPE "AccountRole" AS ENUM ('CONTRIBUTOR', 'LECTURER', 'ADMIN');
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED');
CREATE TYPE "ProgramLevel" AS ENUM ('ORDINARY_DIPLOMA', 'BACHELOR');
CREATE TYPE "Campus" AS ENUM ('MAIN', 'MWANZA', 'SONGWE');
CREATE TYPE "PaperCategory" AS ENUM ('TEST', 'UE', 'SUPP');
CREATE TYPE "PaperStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "ScanStatus" AS ENUM ('PENDING', 'CLEAN', 'REJECTED');

CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), code STRING NOT NULL,
  code_normalized STRING NOT NULL, name STRING NOT NULL, description STRING NOT NULL DEFAULT '',
  icon STRING NOT NULL DEFAULT 'Building2', is_active BOOL NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ, deleted_by_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
) WITH (schema_locked = false);
CREATE TABLE programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), department_id UUID NOT NULL,
  code STRING NOT NULL, code_normalized STRING NOT NULL, name STRING NOT NULL,
  level "ProgramLevel" NOT NULL, award_title STRING NOT NULL, campus "Campus" NOT NULL DEFAULT 'MAIN',
  is_active BOOL NOT NULL DEFAULT true, deleted_at TIMESTAMPTZ, deleted_by_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT programs_department_id_fkey FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT
) WITH (schema_locked = false);
CREATE TABLE modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), program_id UUID NOT NULL,
  code STRING NOT NULL, code_normalized STRING NOT NULL, name STRING NOT NULL, name_normalized STRING NOT NULL,
  semester INT2 NOT NULL, level_year INT2, credits DECIMAL(5,2), is_active BOOL NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ, deleted_by_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT modules_program_id_fkey FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE RESTRICT,
  CONSTRAINT modules_semester_check CHECK (semester IN (1, 2)),
  CONSTRAINT modules_level_year_check CHECK (level_year IS NULL OR level_year BETWEEN 1 AND 8),
  CONSTRAINT modules_credits_check CHECK (credits IS NULL OR credits >= 0)
) WITH (schema_locked = false);
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), username STRING NOT NULL, username_normalized STRING NOT NULL,
  email STRING NOT NULL, email_normalized STRING NOT NULL, full_name STRING NOT NULL, password_hash STRING NOT NULL,
  role "AccountRole" NOT NULL DEFAULT 'CONTRIBUTOR', status "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
  email_verified_at TIMESTAMPTZ, lecturer_verified_at TIMESTAMPTZ, home_department_id UUID,
  bio STRING NOT NULL DEFAULT '', avatar_id STRING, xp INT4 NOT NULL DEFAULT 0, all_time_xp INT4 NOT NULL DEFAULT 0,
  username_changed_at TIMESTAMPTZ, deleted_at TIMESTAMPTZ, deleted_by_user_id UUID,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT users_home_department_id_fkey FOREIGN KEY (home_department_id) REFERENCES departments(id) ON DELETE SET NULL,
  CONSTRAINT users_xp_check CHECK (xp >= 0), CONSTRAINT users_all_time_xp_check CHECK (all_time_xp >= 0),
  CONSTRAINT users_avatar_id_check CHECK (avatar_id IS NULL OR avatar_id ~ '^[a-z0-9_-]{1,32}$')
) WITH (schema_locked = false);
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL, refresh_token_hash STRING NOT NULL,
  user_agent STRING, ip_hash STRING, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL, revoked_at TIMESTAMPTZ,
  CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT user_sessions_expiry_check CHECK (expires_at > created_at)
) WITH (schema_locked = false);
CREATE TABLE stored_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), owner_user_id UUID, bucket_name STRING NOT NULL,
  object_key STRING NOT NULL, original_filename STRING NOT NULL, content_type STRING NOT NULL,
  size_bytes INT8 NOT NULL, sha256_hex STRING, scan_status "ScanStatus" NOT NULL DEFAULT 'PENDING',
  scanned_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT stored_files_size_check CHECK (size_bytes > 0),
  CONSTRAINT stored_files_sha256_length_check CHECK (sha256_hex IS NULL OR length(sha256_hex) = 64)
) WITH (schema_locked = false);
CREATE TABLE papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), module_id UUID NOT NULL, uploaded_by_user_id UUID NOT NULL,
  title STRING NOT NULL, category "PaperCategory" NOT NULL, academic_year_start INT2 NOT NULL,
  semester INT2 NOT NULL, exam_period STRING NOT NULL DEFAULT '', exam_file_id UUID NOT NULL,
  marking_scheme_file_id UUID, status "PaperStatus" NOT NULL DEFAULT 'PENDING', duplicate_warning BOOL NOT NULL DEFAULT false,
  page_count INT4, rejection_reason STRING, reviewed_by_user_id UUID, reviewed_at TIMESTAMPTZ,
  views_count INT8 NOT NULL DEFAULT 0, downloads_count INT8 NOT NULL DEFAULT 0, deleted_at TIMESTAMPTZ,
  deleted_by_user_id UUID, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT papers_module_id_fkey FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE RESTRICT,
  CONSTRAINT papers_uploaded_by_user_id_fkey FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT papers_exam_file_id_fkey FOREIGN KEY (exam_file_id) REFERENCES stored_files(id) ON DELETE RESTRICT,
  CONSTRAINT papers_marking_scheme_file_id_fkey FOREIGN KEY (marking_scheme_file_id) REFERENCES stored_files(id) ON DELETE RESTRICT,
  CONSTRAINT papers_title_check CHECK (length(trim(title)) BETWEEN 2 AND 240),
  CONSTRAINT papers_academic_year_check CHECK (academic_year_start BETWEEN 2000 AND 2200),
  CONSTRAINT papers_semester_check CHECK (semester IN (1, 2)),
  CONSTRAINT papers_counts_check CHECK (views_count >= 0 AND downloads_count >= 0),
  CONSTRAINT papers_page_count_check CHECK (page_count IS NULL OR page_count > 0),
  CONSTRAINT papers_rejection_reason_check CHECK (status != 'REJECTED' OR rejection_reason IS NOT NULL)
) WITH (schema_locked = false);
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), type STRING NOT NULL, payload JSONB NOT NULL,
  status STRING NOT NULL DEFAULT 'pending', run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  attempts INT4 NOT NULL DEFAULT 0, last_error STRING, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
) WITH (schema_locked = false);

CREATE UNIQUE INDEX users_username_normalized_key ON users(username_normalized);
CREATE UNIQUE INDEX users_email_normalized_key ON users(email_normalized);
CREATE UNIQUE INDEX user_sessions_refresh_token_hash_key ON user_sessions(refresh_token_hash);
CREATE UNIQUE INDEX stored_files_object_key_key ON stored_files(object_key);
CREATE UNIQUE INDEX papers_exam_file_id_key ON papers(exam_file_id);
CREATE UNIQUE INDEX papers_marking_scheme_file_id_key ON papers(marking_scheme_file_id);
CREATE INDEX programs_department_id_is_active_idx ON programs(department_id, is_active);
CREATE INDEX modules_program_id_semester_is_active_idx ON modules(program_id, semester, is_active);
CREATE INDEX modules_code_normalized_idx ON modules(code_normalized);
CREATE INDEX modules_name_normalized_idx ON modules(name_normalized);
CREATE INDEX users_role_status_idx ON users(role, status);
CREATE INDEX users_home_department_id_idx ON users(home_department_id);
CREATE INDEX user_sessions_user_id_expires_at_idx ON user_sessions(user_id, expires_at);
CREATE INDEX stored_files_sha256_hex_idx ON stored_files(sha256_hex);
CREATE INDEX papers_module_id_category_academic_year_start_semester_status_idx
  ON papers(module_id, category, academic_year_start, semester, status);
CREATE INDEX papers_status_created_at_idx ON papers(status, created_at);
CREATE INDEX papers_uploaded_by_user_id_created_at_idx ON papers(uploaded_by_user_id, created_at);
CREATE INDEX jobs_status_run_at_idx ON jobs(status, run_at);
