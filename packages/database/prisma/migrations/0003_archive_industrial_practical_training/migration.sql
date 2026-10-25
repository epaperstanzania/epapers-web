UPDATE modules
SET is_active = FALSE,
    deleted_at = now(),
    updated_at = now()
WHERE deleted_at IS NULL
  AND name_normalized ILIKE 'industrial practical training%';
