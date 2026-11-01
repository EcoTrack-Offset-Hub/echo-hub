CREATE TABLE IF NOT EXISTS emission_reviews (
 id text PRIMARY KEY, record_id text NOT NULL, company_id text NOT NULL,
 reviewer_id text NOT NULL, decision text NOT NULL CHECK(decision IN ('Approved','Rejected','Comment')),
 comment text NOT NULL, snapshot jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS emission_reviews_record_idx ON emission_reviews(record_id,created_at DESC);
ALTER TABLE emissions ADD COLUMN IF NOT EXISTS revision bigint NOT NULL DEFAULT 0;
CREATE OR REPLACE FUNCTION eco_emission_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.revision := OLD.revision+1; RETURN NEW; END $$;
DROP TRIGGER IF EXISTS emission_revision_trigger ON emissions;
CREATE TRIGGER emission_revision_trigger BEFORE UPDATE ON emissions FOR EACH ROW EXECUTE FUNCTION eco_emission_revision();
CREATE TABLE IF NOT EXISTS inventory_adjustments (
 id text PRIMARY KEY, project_id varchar(64) NOT NULL REFERENCES offset_projects(id),
 quantity numeric(12,2) NOT NULL CHECK(quantity>0), reference text NOT NULL,
 admin_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(project_id,reference)
);
CREATE TABLE IF NOT EXISTS notification_receipts (
 user_id text NOT NULL, notification_key text NOT NULL, read_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,notification_key)
);
CREATE OR REPLACE FUNCTION eco_immutable_admin_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Administrative evidence is append-only'; END $$;
DROP TRIGGER IF EXISTS emission_reviews_immutable ON emission_reviews;
CREATE TRIGGER emission_reviews_immutable BEFORE UPDATE OR DELETE ON emission_reviews FOR EACH ROW EXECUTE FUNCTION eco_immutable_admin_evidence();
DROP TRIGGER IF EXISTS inventory_adjustments_immutable ON inventory_adjustments;
CREATE TRIGGER inventory_adjustments_immutable BEFORE UPDATE OR DELETE ON inventory_adjustments FOR EACH ROW EXECUTE FUNCTION eco_immutable_admin_evidence();

DROP TRIGGER IF EXISTS eco_audit ON emission_reviews;
CREATE TRIGGER eco_audit AFTER INSERT ON emission_reviews FOR EACH ROW EXECUTE FUNCTION eco_audit_change();
DROP TRIGGER IF EXISTS eco_audit ON inventory_adjustments;
CREATE TRIGGER eco_audit AFTER INSERT ON inventory_adjustments FOR EACH ROW EXECUTE FUNCTION eco_audit_change();
