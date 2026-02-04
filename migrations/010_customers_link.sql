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
