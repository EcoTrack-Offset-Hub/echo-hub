-- Apply with PostgreSQL before starting the backend if the application role
-- cannot create tables itself. The server applies the same idempotent schema.
CREATE TABLE IF NOT EXISTS companies (id VARCHAR(64) PRIMARY KEY, name VARCHAR(255) NOT NULL UNIQUE, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);

CREATE TABLE IF NOT EXISTS users (id VARCHAR(64) PRIMARY KEY, email VARCHAR(320) NOT NULL UNIQUE, password_hash TEXT NOT NULL, role VARCHAR(32) NOT NULL CHECK (role IN ('ADMIN','COMPANY_USER')), company_id VARCHAR(64) REFERENCES companies(id), created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, CHECK ((role = 'ADMIN' AND company_id IS NULL) OR (role = 'COMPANY_USER' AND company_id IS NOT NULL)));

CREATE TABLE IF NOT EXISTS emissions (id VARCHAR(64) PRIMARY KEY, company_id VARCHAR(64) NOT NULL REFERENCES companies(id), date VARCHAR(64) NOT NULL, activity VARCHAR(255) NOT NULL, scope VARCHAR(32) NOT NULL, category VARCHAR(64) NOT NULL, quantity VARCHAR(64) NOT NULL, emissions VARCHAR(64) NOT NULL, status VARCHAR(32) NOT NULL, facility VARCHAR(255), conversion_factor NUMERIC(12,4), input_unit VARCHAR(32), raw_input VARCHAR(64), formula TEXT, result_kg NUMERIC(14,2), result_tonnes NUMERIC(14,3), methodology TEXT, reporting_period VARCHAR(64), created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);
