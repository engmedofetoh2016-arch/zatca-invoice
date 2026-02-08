-- Units master data
CREATE TABLE IF NOT EXISTS units (
  code TEXT PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optional seed (safe to re-run)
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
