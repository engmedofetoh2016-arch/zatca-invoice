ALTER TABLE invoice_items
  ADD COLUMN IF NOT EXISTS vat_category TEXT NULL;
