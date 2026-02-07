CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT NULL,
  unit_code TEXT NULL REFERENCES units(code) ON DELETE SET NULL,
  default_unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  vat_category TEXT NULL,
  vat_rate NUMERIC NOT NULL DEFAULT 0.15,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_business_name ON products(business_id, name);
CREATE INDEX IF NOT EXISTS idx_products_business_sku ON products(business_id, sku);

ALTER TABLE invoice_items
  ADD COLUMN IF NOT EXISTS product_id UUID NULL REFERENCES products(id) ON DELETE SET NULL;
