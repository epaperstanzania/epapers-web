ALTER TABLE papers ADD COLUMN test_number SMALLINT;

UPDATE papers
SET test_number = CASE
  WHEN lower(title || ' ' || exam_period) ~ '(^|[^a-z0-9])test[[:space:]_-]*1([^0-9]|$)' THEN 1
  WHEN lower(title || ' ' || exam_period) ~ '(^|[^a-z0-9])test[[:space:]_-]*2([^0-9]|$)' THEN 2
  ELSE NULL
END
WHERE category = 'TEST';

ALTER TABLE papers
ADD CONSTRAINT papers_test_number_check
CHECK (test_number IS NULL OR (category = 'TEST' AND test_number IN (1, 2)));

DROP INDEX papers_module_id_category_academic_year_start_semester_status_idx;
CREATE INDEX papers_module_id_category_test_number_academic_year_start_semester_status_idx
ON papers (module_id, category, test_number, academic_year_start, semester, status);
