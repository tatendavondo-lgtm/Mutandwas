-- ==============================================================================
-- TINASHEY & SAMUKELISIWE WEDDING — COMPLETE DATABASE RESET SCRIPT
-- Completely wipes all test data, drops old tables, and starts 100% fresh
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/ydkqnpcuyshaidcuzdik/sql
-- ==============================================================================

-- 1. DROP EXISTING TABLES & CONSTRAINTS (Wipe completely)
DROP TABLE IF EXISTS public.activity_logs CASCADE;
DROP TABLE IF EXISTS public.guests CASCADE;
DROP TABLE IF EXISTS public.wedding_config CASCADE;

-- 2. CREATE FRESH GUESTS TABLE (0 Rows initially)
CREATE TABLE public.guests (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  invite_code TEXT NOT NULL UNIQUE,
  ticket_code TEXT NOT NULL UNIQUE, -- 4-digit pass code for rapid gate entry
  rsvp_status TEXT NOT NULL DEFAULT 'pending' CHECK (rsvp_status IN ('accepted', 'declined', 'pending')),
  party_size INT NOT NULL DEFAULT 1,
  confirmed_headcount INT NOT NULL DEFAULT 0,
  plus_one_name TEXT,
  dietary_requirements TEXT DEFAULT 'None',
  song_request TEXT,
  notes TEXT,
  is_vip BOOLEAN NOT NULL DEFAULT FALSE,
  check_in_status TEXT NOT NULL DEFAULT 'not_checked_in' CHECK (check_in_status IN ('checked_in', 'not_checked_in')),
  check_in_time TIMESTAMPTZ,
  checked_in_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup indexes for gate terminals and guest links
CREATE INDEX idx_guests_ticket_code ON public.guests(ticket_code);
CREATE INDEX idx_guests_invite_code ON public.guests(invite_code);
CREATE INDEX idx_guests_check_in_status ON public.guests(check_in_status);
CREATE INDEX idx_guests_rsvp_status ON public.guests(rsvp_status);

-- 3. CREATE FRESH ACTIVITY LOGS TABLE (0 Rows initially)
CREATE TABLE public.activity_logs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type TEXT NOT NULL,
  guest_name TEXT NOT NULL,
  details TEXT NOT NULL,
  severity TEXT DEFAULT 'info'
);

CREATE INDEX idx_activity_logs_timestamp ON public.activity_logs(timestamp DESC);

-- 4. CREATE WEDDING CONFIGURATION TABLE
CREATE TABLE public.wedding_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  couple_names TEXT NOT NULL DEFAULT 'Tinashey Mutandwa & Samukelisiwe Sibanda',
  wedding_date TIMESTAMPTZ NOT NULL DEFAULT '2026-12-21T00:00:00Z',
  venue_name TEXT NOT NULL DEFAULT 'Life Celebrations Center',
  venue_address TEXT NOT NULL DEFAULT '851 Goodhope Road, Harare',
  venue_capacity INT NOT NULL DEFAULT 300,
  gate_pin TEXT NOT NULL DEFAULT '4389',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wedding_config ENABLE ROW LEVEL SECURITY;

-- 6. CONFIGURE PERMISSIVE POLICIES (Read, Insert, Update, Delete)
CREATE POLICY "Allow public all guests" ON public.guests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all activity logs" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all wedding config" ON public.wedding_config FOR ALL USING (true) WITH CHECK (true);

-- 7. ENABLE REALTIME SYNC FOR GATE SCANNERS & ADMIN
DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.guests;
EXCEPTION WHEN duplicate_object THEN 
  NULL;
END $$;

DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
EXCEPTION WHEN duplicate_object THEN 
  NULL;
END $$;

-- 8. SEED ONLY THE OFFICIAL WEDDING CONFIGURATION
INSERT INTO public.wedding_config (
  id, couple_names, wedding_date, venue_name, venue_address, venue_capacity, gate_pin
) VALUES (
  'default',
  'Tinashey Mutandwa & Samukelisiwe Sibanda',
  '2026-12-21T00:00:00Z',
  'Life Celebrations Center',
  '851 Goodhope Road, Harare',
  300,
  '4389'
);

-- Complete! Guests and Activity Logs start with 0 rows (100% clean).
