-- Preserve small activities; tonne values derive from the same saved kg result.
ALTER TABLE emissions ALTER COLUMN result_kg TYPE numeric(32,8);
ALTER TABLE emissions ALTER COLUMN result_tonnes TYPE numeric(35,11);
ALTER TABLE emissions ALTER COLUMN conversion_factor TYPE numeric(18,8);
ALTER TABLE emissions ADD COLUMN IF NOT EXISTS calculation_details jsonb;
ALTER TABLE emissions ADD COLUMN IF NOT EXISTS activity_amount numeric(24,8);
CREATE OR REPLACE FUNCTION eco_activity_amount() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF replace(NEW.raw_input,',','') ~ '^\d+(\.\d+)?$' THEN
   NEW.activity_amount := replace(NEW.raw_input,',','')::numeric;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS eco_activity_amount_trigger ON emissions;
CREATE TRIGGER eco_activity_amount_trigger BEFORE INSERT OR UPDATE OF raw_input ON emissions FOR EACH ROW EXECUTE FUNCTION eco_activity_amount();
-- Repair legacy MWh records from their saved original quantity and factor.
UPDATE emissions SET result_kg=replace(raw_input,',','')::numeric*1000*conversion_factor,
 emissions=(replace(raw_input,',','')::numeric*1000*conversion_factor)::text||' kg CO2e',
 formula=raw_input||' MWh * 1000 kWh/MWh * '||conversion_factor||' kg CO2e/kWh (unit conversion corrected)',
 status='Needs Review'
 WHERE input_unit='MWh' AND category='Purchased Electricity' AND calculation_details IS NULL
 AND replace(raw_input,',','') ~ '^\d+(\.\d+)?$' AND conversion_factor IS NOT NULL
 AND COALESCE(formula,'') NOT LIKE '%unit conversion corrected%';
UPDATE emissions SET result_tonnes=result_kg/1000 WHERE result_kg IS NOT NULL AND result_tonnes IS DISTINCT FROM result_kg/1000;
UPDATE emissions SET emissions=result_kg::text||' kg CO2e'
 WHERE formula LIKE '%unit conversion corrected%' AND emissions IS DISTINCT FROM result_kg::text||' kg CO2e';
UPDATE emissions SET raw_input=raw_input WHERE activity_amount IS NULL AND replace(raw_input,',','') ~ '^\d{1,16}(\.\d{1,8})?$';
ALTER TABLE emission_factor_versions ADD COLUMN IF NOT EXISTS source_reference text;
ALTER TABLE emission_factor_versions ADD COLUMN IF NOT EXISTS assumptions text;
ALTER TABLE offset_projects ADD COLUMN IF NOT EXISTS registry_url text;
ALTER TABLE offset_projects ADD COLUMN IF NOT EXISTS certification_evidence text;
ALTER TABLE offset_projects ADD COLUMN IF NOT EXISTS certification_reviewed_at timestamptz;
CREATE TABLE IF NOT EXISTS scenarios (
 id text PRIMARY KEY, company_id varchar(64) NOT NULL REFERENCES companies(id),
 name text NOT NULL, reporting_period text NOT NULL, changes jsonb NOT NULL,
 results jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS scenarios_company_idx ON scenarios(company_id,created_at DESC);
