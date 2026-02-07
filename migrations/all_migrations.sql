-- Combined migrations (000_init.sql -> 011_zatca_settings.sql)

-- 000_init.sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  vat_number TEXT NULL,
  cr_number TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  issue_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  customer_name TEXT NULL,
  customer_vat TEXT NULL,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  vat_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  qty NUMERIC(12,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- 001_add_invoice_status.sql
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'issued';

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 002_add_invoice_notes.sql
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS invoice_type TEXT NOT NULL DEFAULT 'invoice';

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS original_invoice_id UUID NULL;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS note_reason TEXT NULL;

-- 003_add_item_vat.sql
ALTER TABLE invoice_items
  ADD COLUMN IF NOT EXISTS vat_rate NUMERIC NOT NULL DEFAULT 0.15;

ALTER TABLE invoice_items
  ADD COLUMN IF NOT EXISTS vat_amount NUMERIC NOT NULL DEFAULT 0;

ALTER TABLE invoice_items
  ADD COLUMN IF NOT EXISTS vat_exempt_reason TEXT NULL;

-- 004_security_sessions.sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS failed_login_attempts INT NOT NULL DEFAULT 0;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ NULL;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_updated_at TIMESTAMPTZ NULL;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ NULL;

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  jti TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_jti ON user_sessions(user_id, jti);

-- 005_multitenant.sql
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  vat_number TEXT NULL,
  cr_number TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS business_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, user_id)
);

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS company_id UUID NULL REFERENCES companies(id) ON DELETE SET NULL;

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS branch_id UUID NULL REFERENCES branches(id) ON DELETE SET NULL;

-- 006_zatca.sql
CREATE TABLE IF NOT EXISTS zatca_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- CSID/PCSID
  public_key TEXT NOT NULL,
  encrypted_private_key TEXT NOT NULL,
  private_key_iv TEXT NOT NULL,
  private_key_tag TEXT NOT NULL,
  certificate_pem TEXT NULL,
  csid TEXT NULL,
  pcsid TEXT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  expires_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS zatca_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL, -- report/clear
  status TEXT NOT NULL DEFAULT 'queued',
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT NULL,
  next_run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_zatca_jobs_status_next ON zatca_jobs(status, next_run_at);

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS uuid TEXT NULL;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS icv INT NULL;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS invoice_hash TEXT NULL;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS xml_payload TEXT NULL;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS payment_link TEXT NULL;

-- 007_audit_integrations.sql
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NULL REFERENCES businesses(id) ON DELETE SET NULL,
  user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NULL,
  entity_id UUID NULL,
  metadata JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- webhook/payment/api
  name TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 008_api_tokens.sql
CREATE TABLE IF NOT EXISTS api_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_api_tokens_business ON api_tokens(business_id);

-- 009_customers.sql
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  vat_number TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, name, vat_number)
);

CREATE INDEX IF NOT EXISTS idx_customers_business_name ON customers(business_id, name);

-- 010_customers_link.sql
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS customer_id UUID NULL REFERENCES customers(id) ON DELETE SET NULL;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS name_normalized TEXT
  GENERATED ALWAYS AS (lower(regexp_replace(trim(name), '\s+', ' ', 'g'))) STORED;

CREATE UNIQUE INDEX IF NOT EXISTS ux_customers_business_name_vat
  ON customers(business_id, name_normalized, vat_number);

CREATE UNIQUE INDEX IF NOT EXISTS ux_customers_business_vat
  ON customers(business_id, vat_number)
  WHERE vat_number IS NOT NULL;

-- 011_zatca_settings.sql
CREATE TABLE IF NOT EXISTS zatca_settings (
  business_id UUID PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  environment TEXT NOT NULL DEFAULT 'sandbox',
  csid TEXT NULL,
  pcsid TEXT NULL,
  certificate_pem TEXT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 012_zatca_phase2.sql
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS reported_at TIMESTAMPTZ NULL;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS cleared_at TIMESTAMPTZ NULL;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS zatca_status TEXT NULL;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS zatca_last_response TEXT NULL;

ALTER TABLE zatca_jobs
  ADD COLUMN IF NOT EXISTS response_status INTEGER NULL;

ALTER TABLE zatca_jobs
  ADD COLUMN IF NOT EXISTS response_body TEXT NULL;

ALTER TABLE zatca_jobs
  ADD COLUMN IF NOT EXISTS response_at TIMESTAMPTZ NULL;

-- 013_units.sql
CREATE TABLE IF NOT EXISTS units (
  code TEXT PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO units (code, name_en, name_ar) VALUES
  ('EA', 'Each', 'قطعة'),
  ('KG', 'Kilogram', 'كيلوجرام'),
  ('LTR', 'Liter', 'لتر'),
  ('HUR', 'Hour', 'ساعة'),
  ('MTR', 'Meter', 'متر')
ON CONFLICT (code) DO NOTHING;

ALTER TABLE invoice_items
  ADD COLUMN IF NOT EXISTS unit_code TEXT NULL,
  ADD CONSTRAINT invoice_items_unit_code_fkey
    FOREIGN KEY (unit_code) REFERENCES units(code)
    ON UPDATE NO ACTION ON DELETE SET NULL;

-- 014_vat_category.sql
ALTER TABLE invoice_items
  ADD COLUMN IF NOT EXISTS vat_category TEXT NULL;
