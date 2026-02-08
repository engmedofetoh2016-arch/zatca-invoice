-- 018_fix_units_ar.sql
UPDATE units SET name_ar = 'قطعة' WHERE code = 'EA';
UPDATE units SET name_ar = 'كيلوجرام' WHERE code = 'KG';
UPDATE units SET name_ar = 'لتر' WHERE code = 'LTR';
UPDATE units SET name_ar = 'ساعة' WHERE code = 'HUR';
UPDATE units SET name_ar = 'متر' WHERE code = 'MTR';
