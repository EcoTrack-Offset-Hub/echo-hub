-- Stable public tenant numbers, assigned once to existing and future companies.
-- Internal company IDs and their foreign keys remain unchanged.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS tenant_number bigint GENERATED ALWAYS AS IDENTITY;
CREATE UNIQUE INDEX IF NOT EXISTS companies_tenant_number_unique ON companies (tenant_number);
