-- ============================================================
-- DEVELOPMENT SEED — First-admin user provisioning
--
-- CHANGE CREDENTIALS BEFORE ANY NON-LOCAL DEPLOYMENT.
-- This file is committed for reproducibility/documentation only.
-- Never use these credentials in staging or production.
--
-- Default dev credentials:
--   Email:    admin@desafio.dev
--   Password: ChangeMe2024!
--
-- Dashboard fallback:
--   If you prefer not to run this seed, create the user manually via
--   the Supabase dashboard: Authentication > Users > Add user.
--   Make sure to check "Auto Confirm User" or confirm the email manually.
--
-- How to apply:
--   Option A (Supabase CLI): supabase db reset  (runs migrations + seed)
--   Option B (SQL editor):   paste into Supabase dashboard SQL editor and run.
--   Option C (psql):         psql $DATABASE_URL < supabase/seed.sql
-- ============================================================

-- Insert the first admin user directly into auth.users.
--
-- Notes:
--   - email_confirmed_at MUST be set; omitting it causes signInWithPassword to
--     return "Email not confirmed" even with correct credentials.
--   - encrypted_password uses Supabase's bcrypt hashing (crypt + gen_salt).
--   - role and aud must match Supabase Auth expectations.
--   - ON CONFLICT DO NOTHING makes the seed idempotent (safe to re-run).

INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  role,
  aud,
  raw_app_meta_data,
  raw_user_meta_data
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'admin@desafio.dev',
  crypt('ChangeMe2024!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  'authenticated',
  'authenticated',
  '{"provider":"email","providers":["email"]}',
  '{}'
)
ON CONFLICT DO NOTHING;
