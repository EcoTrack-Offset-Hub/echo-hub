-- Optional gross monthly emissions target in metric tonnes CO2e.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS monthly_emissions_limit numeric(24,11)
 CHECK (monthly_emissions_limit > 0);
