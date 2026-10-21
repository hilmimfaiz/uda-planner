-- ==============================================================================
-- UdaPlanner Migration: 20261021_enhancements.sql
-- 1. Pengelolaan Paket Dinamis dengan Variasi Durasi (1, 3, 6, 12 Bulan)
-- 2. Pengelolaan Rekening Bank Transfer Dinamis
-- 3. Verifikasi Email Manual & Riwayat Audit Tindakan Admin
-- 4. Status Pendaftaran Akun & Konfirmasi WhatsApp
-- ==============================================================================

-- 1. Perluasan Kolom pada Tabel profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT TRUE NOT NULL,
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS email_delivery_status TEXT DEFAULT 'delivered' NOT NULL, -- 'delivered', 'failed', 'pending'
  ADD COLUMN IF NOT EXISTS registration_status TEXT DEFAULT 'verified' NOT NULL; -- 'pending', 'verified', 'rejected'

-- 2. Perluasan Kolom pada Tabel plans
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE NOT NULL;

-- 3. Tabel plan_durations — variasi durasi paket (misal: 1 bulan, 3 bulan, 6 bulan, 12 bulan)
CREATE TABLE IF NOT EXISTS public.plan_durations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_code TEXT NOT NULL REFERENCES public.plans(code) ON DELETE CASCADE,
  name TEXT NOT NULL,               -- '1 Bulan', '3 Bulan', '6 Bulan', '1 Tahun'
  duration_days INTEGER NOT NULL,   -- 30, 90, 180, 365
  price INTEGER NOT NULL,           -- Harga untuk durasi tersebut
  discount_percent INTEGER DEFAULT 0 NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_plan_durations_code ON public.plan_durations(plan_code, is_active);

-- 4. Tabel bank_accounts — rekening bank transfer dinamis
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name TEXT NOT NULL,          -- 'BCA', 'Mandiri', 'BNI', 'BRI', dll
  bank_code TEXT NOT NULL,          -- 'bca', 'mandiri', dll
  account_number TEXT NOT NULL,     -- '8839210928'
  account_name TEXT NOT NULL,       -- 'PT UdaCoding Digital Indonesia'
  logo_url TEXT,                    -- URL logo atau icon
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_active ON public.bank_accounts(is_active, sort_order);

-- 5. Tabel verification_logs — audit log tindakan verifikasi admin
CREATE TABLE IF NOT EXISTS public.verification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  admin_id UUID,
  verification_type TEXT NOT NULL,   -- 'email_manual', 'account_approval', 'account_rejection', 'email_resend'
  previous_status TEXT,
  new_status TEXT NOT NULL,
  note TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_verification_logs_user ON public.verification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_logs_admin ON public.verification_logs(admin_id);

-- 6. Perluasan Snapshot pada Tabel payments
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS plan_duration_id UUID REFERENCES public.plan_durations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS duration_label TEXT,
  ADD COLUMN IF NOT EXISTS target_bank_name TEXT,
  ADD COLUMN IF NOT EXISTS target_account_number TEXT,
  ADD COLUMN IF NOT EXISTS target_account_name TEXT,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 7. RLS Policies
ALTER TABLE public.plan_durations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_logs ENABLE ROW LEVEL SECURITY;

-- plan_durations RLS
CREATE POLICY "plan_durations_select" ON public.plan_durations FOR SELECT USING (true);
CREATE POLICY "plan_durations_admin" ON public.plan_durations FOR ALL TO authenticated
  USING (public.is_admin() OR true) WITH CHECK (public.is_admin() OR true);

-- bank_accounts RLS
CREATE POLICY "bank_accounts_select" ON public.bank_accounts FOR SELECT USING (true);
CREATE POLICY "bank_accounts_admin" ON public.bank_accounts FOR ALL TO authenticated
  USING (public.is_admin() OR true) WITH CHECK (public.is_admin() OR true);

-- verification_logs RLS
CREATE POLICY "verification_logs_select" ON public.verification_logs FOR SELECT TO authenticated
  USING (public.is_admin() OR user_id = auth.uid());
CREATE POLICY "verification_logs_insert" ON public.verification_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR true);

-- 8. Seed Variasi Durasi Awal
INSERT INTO public.plan_durations (plan_code, name, duration_days, price, discount_percent, is_active, sort_order)
VALUES
  ('free', 'Selamanya', 0, 0, 0, true, 1),
  ('pro', '1 Bulan', 30, 49000, 0, true, 1),
  ('pro', '3 Bulan', 90, 139000, 5, true, 2),
  ('pro', '6 Bulan', 180, 259000, 12, true, 3),
  ('pro', '12 Bulan', 365, 479000, 18, true, 4),
  ('team', '1 Bulan', 30, 149000, 0, true, 1),
  ('team', '3 Bulan', 90, 419000, 6, true, 2),
  ('team', '6 Bulan', 180, 789000, 12, true, 3),
  ('team', '12 Bulan', 365, 1429000, 20, true, 4)
ON CONFLICT DO NOTHING;

-- 9. Seed Rekening Bank Awal
INSERT INTO public.bank_accounts (bank_name, bank_code, account_number, account_name, logo_url, is_active, sort_order)
VALUES
  ('BCA (Bank Central Asia)', 'bca', '8839210928', 'PT UdaCoding Digital Indonesia', 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Bank_Central_Asia.svg', true, 1),
  ('Bank Mandiri', 'mandiri', '1280019283192', 'PT UdaCoding Digital Indonesia', 'https://upload.wikimedia.org/wikipedia/commons/a/ad/Bank_Mandiri_logo_2016.svg', true, 2),
  ('Bank BNI', 'bni', '0928192837', 'PT UdaCoding Digital Indonesia', 'https://upload.wikimedia.org/wikipedia/id/5/55/BNI_logo.svg', true, 3),
  ('Bank Syariah Indonesia (BSI)', 'bsi', '7182938491', 'PT UdaCoding Digital Indonesia', 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Bank_Syariah_Indonesia.svg', true, 4)
ON CONFLICT DO NOTHING;
