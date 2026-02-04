CREATE TABLE IF NOT EXISTS zatca_settings (
  business_id UUID PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  environment TEXT NOT NULL DEFAULT 'sandbox',
  csid TEXT NULL,
  pcsid TEXT NULL,
  certificate_pem TEXT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
