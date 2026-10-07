-- Migration 002: Offset Marketplace Projects and Transactions tables
CREATE TABLE IF NOT EXISTS offset_projects (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  country VARCHAR(255) NOT NULL,
  type VARCHAR(64) NOT NULL,
  standard VARCHAR(64) NOT NULL,
  description TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  price_per_tonne NUMERIC(10,2) NOT NULL CHECK (price_per_tonne > 0),
  available_tco2e NUMERIC(12,2) NOT NULL CHECK (available_tco2e >= 0),
  badge VARCHAR(64) NOT NULL DEFAULT 'Verified',
  image_url TEXT,
  vintage VARCHAR(32) DEFAULT '2024',
  registry_ref VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(64) PRIMARY KEY,
  transaction_id VARCHAR(64) NOT NULL UNIQUE,
  company_id VARCHAR(64) NOT NULL REFERENCES companies(id),
  project_id VARCHAR(64) NOT NULL REFERENCES offset_projects(id),
  credits_tco2e NUMERIC(12,2) NOT NULL CHECK (credits_tco2e > 0),
  price_per_tonne NUMERIC(10,2) NOT NULL,
  subtotal NUMERIC(14,2) NOT NULL,
  service_fee NUMERIC(14,2) NOT NULL,
  total_amount NUMERIC(14,2) NOT NULL,
  certificate_id VARCHAR(64) NOT NULL UNIQUE,
  status VARCHAR(32) NOT NULL DEFAULT 'Completed',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
