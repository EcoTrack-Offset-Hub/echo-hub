-- One-time data correction requested by the project owner. Run explicitly;
-- do not run on every startup because administrators may later disable factors.
-- The initial review date is the earliest factor creation date (Manila time).
-- This is a project baseline, not evidence of an actual technical review.
BEGIN;
SELECT pg_advisory_xact_lock(hashtext('eco-factor-initial-settings'));

UPDATE emission_factor_versions
SET review_due = (SELECT (min(created_at) AT TIME ZONE 'Asia/Manila')::date FROM emission_factor_versions)
WHERE review_due IS NULL;

-- Preserve existing active selections. Where none exists, enable only the
-- latest version so the one-active-version-per-category invariant is retained.
WITH candidates AS (
  SELECT DISTINCT ON (category) id,category
  FROM emission_factor_versions
  ORDER BY category,created_at DESC,id DESC
)
UPDATE emission_factor_versions f SET active=true
FROM candidates c
WHERE f.id=c.id AND NOT EXISTS (
  SELECT 1 FROM emission_factor_versions existing
  WHERE existing.category=c.category AND existing.active
);
COMMIT;
