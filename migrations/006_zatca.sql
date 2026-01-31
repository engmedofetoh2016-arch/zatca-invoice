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
