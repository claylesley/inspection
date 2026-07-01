-- ============================================================
-- THE GROVES INSPECTION APP — SUPABASE SCHEMA
-- Run this in Supabase → SQL Editor
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Organizations (one per client / property company) ────────
CREATE TABLE organizations (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── User profiles (extends Supabase auth.users) ──────────────
CREATE TABLE profiles (
  id         UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  org_id     UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  role       TEXT NOT NULL DEFAULT 'inspector' CHECK (role IN ('admin','inspector')),
  full_name  TEXT,
  email      TEXT NOT NULL,
  active     BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Pricing config (one row per org, admin-editable) ─────────
CREATE TABLE pricing_config (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  org_id       UUID REFERENCES organizations(id) ON DELETE CASCADE UNIQUE NOT NULL,
  shared_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  bed_items    JSONB NOT NULL DEFAULT '[]'::jsonb,
  mults        JSONB NOT NULL DEFAULT '{"r02":0,"r3":0.5,"r4":0.75,"r510":1.0}'::jsonb,
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_by   UUID REFERENCES profiles(id)
);

-- ── Inspections ───────────────────────────────────────────────
CREATE TABLE inspections (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  inspector_id    UUID REFERENCES profiles(id) NOT NULL,
  house_num       TEXT,
  room_num        TEXT,
  tenant_name     TEXT,
  inspection_date DATE DEFAULT CURRENT_DATE,
  num_beds        INTEGER DEFAULT 1,
  shared_data     JSONB DEFAULT '{}'::jsonb,
  beds_data       JSONB DEFAULT '[]'::jsonb,
  extra_shared    TEXT,
  std_checks      JSONB DEFAULT '{}'::jsonb,
  shared_total    DECIMAL(10,2) DEFAULT 0,
  bed_totals      JSONB DEFAULT '[]'::jsonb,
  grand_total     DECIMAL(10,2) DEFAULT 0,
  status          TEXT DEFAULT 'draft' CHECK (status IN ('draft','submitted')),
  recipient_email TEXT,
  email_sent      BOOLEAN DEFAULT FALSE,
  submitted_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Auto-update timestamps ────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_ts    BEFORE UPDATE ON profiles    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER inspections_ts BEFORE UPDATE ON inspections FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Security helper functions ─────────────────────────────────
CREATE OR REPLACE FUNCTION my_org_id() RETURNS UUID
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT org_id FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION my_role() RETURNS TEXT
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE organizations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_config  ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections     ENABLE ROW LEVEL SECURITY;

-- Organizations: members see their own org only
CREATE POLICY "org: read own"
  ON organizations FOR SELECT USING (id = my_org_id());

-- Profiles: see all in same org; admins can add/update; users update self
CREATE POLICY "profiles: read org"
  ON profiles FOR SELECT USING (org_id = my_org_id());
CREATE POLICY "profiles: update self"
  ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles: admin all"
  ON profiles FOR ALL USING (org_id = my_org_id() AND my_role() = 'admin');

-- Pricing: everyone reads; only admins write
CREATE POLICY "pricing: read"
  ON pricing_config FOR SELECT USING (org_id = my_org_id());
CREATE POLICY "pricing: admin write"
  ON pricing_config FOR ALL USING (org_id = my_org_id() AND my_role() = 'admin');

-- Inspections: inspectors see own; admins see all in org
CREATE POLICY "inspections: scoped"
  ON inspections FOR ALL USING (
    org_id = my_org_id()
    AND (my_role() = 'admin' OR inspector_id = auth.uid())
  );

-- ── First-time setup (run once, fill in your values) ─────────
-- Step 1: Create your org
-- INSERT INTO organizations (id, name) VALUES
--   ('ORG_UUID_HERE', 'The Groves');

-- Step 2: Sign up via the app, then promote yourself to admin:
-- INSERT INTO profiles (id, org_id, role, email, full_name)
--   VALUES ('AUTH_USER_UUID', 'ORG_UUID_HERE', 'admin', 'you@email.com', 'Your Name');

-- Step 3: Seed default pricing for your org
-- INSERT INTO pricing_config (org_id, shared_items, bed_items)
--   SELECT 'ORG_UUID_HERE', shared_items, bed_items
--   FROM (VALUES (
--     '[{"id":"blinds","label":"Blinds","group":"Windows","dirty":5,"replace":50}]'::jsonb,
--     '[{"id":"carpet","label":"Carpet","dirty":10,"replace":500}]'::jsonb
--   )) AS t(shared_items, bed_items);
