/*
# Add admin login credentials to settings

1. Modified Tables
- `settings`: added `admin_username` (text) and `admin_password` (text) columns
- Default credentials set: username "Yousifamini", password "Yousif350"

2. Security
- No policy changes needed; settings table already has anon CRUD policy.
*/

ALTER TABLE settings ADD COLUMN IF NOT EXISTS admin_username text DEFAULT 'Yousifamini';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS admin_password text DEFAULT 'Yousif350';

-- Set credentials on existing settings row if not already set
UPDATE settings
SET admin_username = 'Yousifamini', admin_password = 'Yousif350'
WHERE admin_username IS NULL OR admin_password IS NULL;
