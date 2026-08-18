/*
# Add Printer Settings Columns

1. Modified Tables
- `settings` table gets 4 new columns for thermal printer configuration:
  - `printer_width` (text, default '80mm') - thermal paper width: '58mm' or '80mm'
  - `receipt_mode` (text, default 'detailed') - receipt style: 'short' or 'detailed'
  - `auto_print` (boolean, default false) - auto open print dialog after sale
  - `qr_enabled` (boolean, default true) - show QR code on receipts

2. Security
- No RLS changes needed - existing policies on settings table remain unchanged.
- All columns have safe defaults so existing rows work without modification.
*/

ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS printer_width text DEFAULT '80mm',
  ADD COLUMN IF NOT EXISTS receipt_mode text DEFAULT 'detailed',
  ADD COLUMN IF NOT EXISTS auto_print boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS qr_enabled boolean DEFAULT true;
