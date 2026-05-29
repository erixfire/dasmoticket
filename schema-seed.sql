-- Run this AFTER schema.sql to seed the admin user with a proper hashed password.
-- Generate the hash using: npx tsx scripts/seed-admin.ts <your-password>
-- Then replace the placeholder below with the generated hash.

UPDATE users
SET password_hash = 'REPLACE_WITH_HASH_FROM_seed-admin_SCRIPT'
WHERE email = 'admin@iloilocity.gov.ph';
