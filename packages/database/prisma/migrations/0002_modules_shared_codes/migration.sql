-- A module code can appear in more than one program or campus.
DROP INDEX IF EXISTS modules_code_live_key;
CREATE INDEX IF NOT EXISTS modules_code_live_lookup_idx
  ON modules (code_normalized) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS modules_program_curriculum_idx
  ON modules (program_id, level_year, semester, code_normalized, id)
  WHERE is_active AND deleted_at IS NULL;
