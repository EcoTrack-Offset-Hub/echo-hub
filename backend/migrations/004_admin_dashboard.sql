-- Additive dashboard metadata; unknown historical reporting periods remain NULL.
CREATE OR REPLACE FUNCTION eco_reporting_month(label text, entered timestamptz) RETURNS date
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE parts text[]; m integer;
BEGIN
 IF label ~ '^\d{4}-(0[1-9]|1[0-2])(-01)?$' THEN RETURN (left(label,7)||'-01')::date; END IF;
 IF label = 'Current Period' THEN RETURN date_trunc('month', entered AT TIME ZONE 'UTC')::date; END IF;
 parts := regexp_match(trim(label), '^([A-Za-z]+) ([0-9]{4})$');
 IF parts IS NOT NULL THEN
  m := array_position(ARRAY['january','february','march','april','may','june','july','august','september','october','november','december'], lower(parts[1]));
  IF m IS NOT NULL THEN RETURN make_date(parts[2]::int,m,1); END IF;
 END IF;
 RETURN NULL;
EXCEPTION WHEN others THEN RETURN NULL;
END $$;
ALTER TABLE emissions ADD COLUMN IF NOT EXISTS reporting_month date;
UPDATE emissions SET reporting_month = eco_reporting_month(reporting_period,created_at) WHERE reporting_month IS NULL AND eco_reporting_month(reporting_period,created_at) IS NOT NULL;
CREATE OR REPLACE FUNCTION eco_set_reporting_month() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.reporting_month := eco_reporting_month(NEW.reporting_period,NEW.created_at); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS eco_reporting_month_trigger ON emissions;
CREATE TRIGGER eco_reporting_month_trigger BEFORE INSERT OR UPDATE OF reporting_period ON emissions FOR EACH ROW EXECUTE FUNCTION eco_set_reporting_month();
CREATE INDEX IF NOT EXISTS emissions_company_reporting_idx ON emissions(company_id,reporting_month);
CREATE INDEX IF NOT EXISTS emissions_created_idx ON emissions(created_at);
ALTER TABLE offset_projects ADD COLUMN IF NOT EXISTS lifecycle_status text NOT NULL DEFAULT 'Unreviewed' CHECK (lifecycle_status IN ('Unreviewed','Active','Inactive'));
ALTER TABLE offset_projects ADD COLUMN IF NOT EXISTS low_inventory_threshold numeric(12,2) CHECK(low_inventory_threshold >= 0);
CREATE TABLE IF NOT EXISTS credit_retirements (
 id text PRIMARY KEY, transaction_id varchar(64) NOT NULL REFERENCES transactions(id),
 quantity numeric(12,2) NOT NULL CHECK(quantity>0), registry_reference text NOT NULL CHECK(length(trim(registry_reference))>0),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS retirement_reference_idx ON credit_retirements(transaction_id,registry_reference);
CREATE INDEX IF NOT EXISTS retirement_transaction_idx ON credit_retirements(transaction_id);
-- Purchases are immediate: there is no reservation workflow in this application.
CREATE TABLE IF NOT EXISTS emission_factor_versions (
 id bigserial PRIMARY KEY, category text NOT NULL, factor numeric(18,8) NOT NULL CHECK(factor>0),
 unit text NOT NULL, methodology text NOT NULL, standard text NOT NULL, default_scope text NOT NULL,
 active boolean NOT NULL DEFAULT true, review_due date, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS factor_active_category_idx ON emission_factor_versions(category) WHERE active;
ALTER TABLE emissions ADD COLUMN IF NOT EXISTS factor_version_id bigint REFERENCES emission_factor_versions(id);
CREATE TABLE IF NOT EXISTS audit_events (
 id bigserial PRIMARY KEY, entity_type text NOT NULL, entity_id text NOT NULL, company_id text,
 operation text NOT NULL, description text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_company_time_idx ON audit_events(company_id,created_at DESC);
CREATE OR REPLACE FUNCTION eco_audit_change() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE row_data jsonb; tenant text; label text;
BEGIN
 IF TG_OP='DELETE' THEN row_data:=to_jsonb(OLD); ELSE row_data:=to_jsonb(NEW); END IF;
 tenant:=row_data->>'company_id';
 IF TG_TABLE_NAME='companies' THEN tenant:=row_data->>'id'; END IF;
 IF TG_TABLE_NAME='users' THEN label:='User account'; ELSE label:=COALESCE(row_data->>'name',row_data->>'activity',row_data->>'category',row_data->>'transaction_id',row_data->>'id'); END IF;
 INSERT INTO audit_events(entity_type,entity_id,company_id,operation,description)
 VALUES(TG_TABLE_NAME,row_data->>'id',tenant,TG_OP,label||' ? '||lower(TG_OP));
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['companies','users','emissions','offset_projects','transactions','emission_factor_versions','credit_retirements'] LOOP
  EXECUTE format('DROP TRIGGER IF EXISTS eco_audit ON %I',t);
  EXECUTE format('CREATE TRIGGER eco_audit AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION eco_audit_change()',t);
 END LOOP;
END $$;

CREATE OR REPLACE FUNCTION eco_check_retirement() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE bought numeric; retired numeric;
BEGIN
 SELECT credits_tco2e INTO bought FROM transactions WHERE id=NEW.transaction_id AND status='Completed' FOR UPDATE;
 SELECT COALESCE(sum(quantity),0) INTO retired FROM credit_retirements WHERE transaction_id=NEW.transaction_id;
 IF bought IS NULL OR retired+NEW.quantity>bought THEN RAISE EXCEPTION 'Retirement exceeds completed purchase'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS eco_retirement_balance ON credit_retirements;
CREATE TRIGGER eco_retirement_balance BEFORE INSERT ON credit_retirements FOR EACH ROW EXECUTE FUNCTION eco_check_retirement();

CREATE OR REPLACE FUNCTION eco_immutable_retirement() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Retirement evidence is append-only'; END $$;
DROP TRIGGER IF EXISTS eco_retirement_immutable ON credit_retirements;
CREATE TRIGGER eco_retirement_immutable BEFORE UPDATE OR DELETE ON credit_retirements FOR EACH ROW EXECUTE FUNCTION eco_immutable_retirement();
