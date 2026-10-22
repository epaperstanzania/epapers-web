-- Bound hourly retention selection without scanning live papers.
CREATE INDEX papers_retention_idx ON papers(deleted_at, id) WHERE deleted_at IS NOT NULL;
