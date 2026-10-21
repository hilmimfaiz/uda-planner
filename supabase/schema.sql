-- ==============================================================================
-- UdaPlanner Database Schema (Supabase / PostgreSQL)
-- Mengikuti PRD UdaPlanner Secara Menyeluruh (Bab 9, 10, 11)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. TABEL UTAMA (14 Tabel)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. profiles — data profil pengguna
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  reminder_minutes INTEGER DEFAULT 15 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ------------------------------------------------------------------------------
-- 3. plans — daftar paket (diatur admin)
-- Dibuat terlebih dahulu sebelum accounts untuk foreign key
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL, -- 'free', 'pro', 'team'
  name TEXT NOT NULL,        -- 'Gratis', 'Pro', 'Tim'
  price INTEGER NOT NULL,    -- 0, 49000, 149000
  duration_days INTEGER DEFAULT 30 NOT NULL,
  max_brands INTEGER DEFAULT 1 NOT NULL,
  max_members INTEGER DEFAULT 0 NOT NULL,
  max_scheduled_per_month INTEGER, -- NULL = tanpa batas
  storage_mb INTEGER DEFAULT 200 NOT NULL,
  max_file_mb INTEGER DEFAULT 10 NOT NULL,
  max_snippets INTEGER DEFAULT 5, -- NULL = tanpa batas
  allow_video BOOLEAN DEFAULT FALSE NOT NULL,
  allow_grid BOOLEAN DEFAULT FALSE NOT NULL,
  allow_export BOOLEAN DEFAULT FALSE NOT NULL,
  allow_approval BOOLEAN DEFAULT FALSE NOT NULL,
  allow_comments BOOLEAN DEFAULT FALSE NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ------------------------------------------------------------------------------
-- 2. accounts — status akun & langganan (hanya admin yang boleh mengubah)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'user' NOT NULL CHECK (role IN ('user', 'admin')),
  plan_code TEXT REFERENCES public.plans(code) DEFAULT 'free' NOT NULL,
  plan_until TIMESTAMPTZ,
  is_suspended BOOLEAN DEFAULT FALSE NOT NULL,
  payment_code INTEGER NOT NULL, -- kode unik 1-999
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ------------------------------------------------------------------------------
-- 4. brands — akun media sosial yang dikelola
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  handle TEXT,
  platforms TEXT[] DEFAULT ARRAY['instagram']::TEXT[] NOT NULL,
  color TEXT DEFAULT '#16A34A' NOT NULL,
  avatar_url TEXT,
  require_approval BOOLEAN DEFAULT FALSE NOT NULL,
  is_archived BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ------------------------------------------------------------------------------
-- 5. brand_members — siapa saja yang punya akses ke brand
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.brand_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'reviewer', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT uq_brand_member UNIQUE (brand_id, user_id)
);

-- ------------------------------------------------------------------------------
-- 6. invitations — undangan anggota
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('editor', 'reviewer', 'viewer')),
  token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'accepted', 'cancelled')),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days') NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index unik bersyarat untuk satu undangan pending per (brand_id, email)
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_pending 
ON public.invitations (brand_id, email) 
WHERE status = 'pending';

-- ------------------------------------------------------------------------------
-- 7. content_pillars — pilar/kategori konten per brand
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.content_pillars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT uq_brand_pillar_name UNIQUE (brand_id, name)
);

-- ------------------------------------------------------------------------------
-- 8. posts — rencana postingan
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  caption TEXT DEFAULT '' NOT NULL,
  hashtags TEXT DEFAULT '' NOT NULL,
  platforms TEXT[] DEFAULT ARRAY['instagram']::TEXT[] NOT NULL,
  content_type TEXT DEFAULT 'feed' NOT NULL CHECK (content_type IN ('feed', 'carousel', 'reels', 'story', 'video', 'teks', 'live')),
  status TEXT DEFAULT 'ide' NOT NULL CHECK (status IN ('ide', 'draft', 'review', 'siap', 'terposting')),
  scheduled_at TIMESTAMPTZ,
  pillar_id UUID REFERENCES public.content_pillars(id) ON DELETE SET NULL,
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  posted_at TIMESTAMPTZ,
  posted_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_posts_schedule ON public.posts(brand_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_posts_status ON public.posts(brand_id, status);

-- ------------------------------------------------------------------------------
-- 9. post_assets — file desain per postingan
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.post_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  file_path TEXT NOT NULL,
  thumb_path TEXT,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT DEFAULT 0 NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ------------------------------------------------------------------------------
-- 10. snippets — Bank caption & hashtag
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.snippets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('caption', 'hashtag')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ------------------------------------------------------------------------------
-- 11. comments — komentar dan catatan revisi
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  body TEXT NOT NULL,
  is_revision_note BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ------------------------------------------------------------------------------
-- 12. notifications — notifikasi pengguna
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read);

-- ------------------------------------------------------------------------------
-- 13. payments — pembayaran & upgrade paket
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_code TEXT NOT NULL,
  amount INTEGER NOT NULL,
  duration_days INTEGER NOT NULL,
  sender_name TEXT NOT NULL,
  sender_bank TEXT NOT NULL,
  proof_path TEXT,
  status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Satu pengguna hanya boleh punya satu pembayaran pending
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_user_pending 
ON public.payments (user_id) 
WHERE status = 'pending';

-- ------------------------------------------------------------------------------
-- 14. app_settings — pengaturan aplikasi (selalu 1 baris)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  bank_name TEXT NOT NULL,
  bank_account_number TEXT NOT NULL,
  bank_account_name TEXT NOT NULL,
  admin_whatsapp TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ------------------------------------------------------------------------------
-- 15. plan_durations — variasi durasi paket berlangganan
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plan_durations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_code TEXT NOT NULL REFERENCES public.plans(code) ON DELETE CASCADE,
  name TEXT NOT NULL,
  duration_days INTEGER NOT NULL,
  price INTEGER NOT NULL,
  discount_percent INTEGER DEFAULT 0 NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ------------------------------------------------------------------------------
-- 16. bank_accounts — rekening bank transfer dinamis
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name TEXT NOT NULL,
  bank_code TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ------------------------------------------------------------------------------
-- 17. verification_logs — audit riwayat verifikasi akun/email oleh admin
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.verification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  admin_id UUID,
  verification_type TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  note TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ==============================================================================
-- 2. SEED AWAL (PLANS, DURATIONS, BANK_ACCOUNTS, APP_SETTINGS)
-- ==============================================================================
INSERT INTO public.plans (code, name, price, duration_days, max_brands, max_members, max_scheduled_per_month, storage_mb, max_file_mb, max_snippets, allow_video, allow_grid, allow_export, allow_approval, allow_comments, sort_order)
VALUES
  ('free', 'Gratis', 0, 0, 1, 0, 30, 200, 10, 5, false, false, false, false, false, 1),
  ('pro', 'Pro', 49000, 30, 5, 0, NULL, 5120, 50, NULL, true, true, true, false, false, 2),
  ('team', 'Tim', 149000, 30, 20, 10, NULL, 20480, 50, NULL, true, true, true, true, true, 3)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  max_brands = EXCLUDED.max_brands,
  max_members = EXCLUDED.max_members,
  max_scheduled_per_month = EXCLUDED.max_scheduled_per_month,
  storage_mb = EXCLUDED.storage_mb,
  max_file_mb = EXCLUDED.max_file_mb,
  max_snippets = EXCLUDED.max_snippets,
  allow_video = EXCLUDED.allow_video,
  allow_grid = EXCLUDED.allow_grid,
  allow_export = EXCLUDED.allow_export,
  allow_approval = EXCLUDED.allow_approval,
  allow_comments = EXCLUDED.allow_comments;

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

INSERT INTO public.bank_accounts (bank_name, bank_code, account_number, account_name, logo_url, is_active, sort_order)
VALUES
  ('BCA (Bank Central Asia)', 'bca', '8839210928', 'PT UdaCoding Digital Indonesia', 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Bank_Central_Asia.svg', true, 1),
  ('Bank Mandiri', 'mandiri', '1280019283192', 'PT UdaCoding Digital Indonesia', 'https://upload.wikimedia.org/wikipedia/commons/a/ad/Bank_Mandiri_logo_2016.svg', true, 2),
  ('Bank BNI', 'bni', '0928192837', 'PT UdaCoding Digital Indonesia', 'https://upload.wikimedia.org/wikipedia/id/5/55/BNI_logo.svg', true, 3),
  ('Bank Syariah Indonesia (BSI)', 'bsi', '7182938491', 'PT UdaCoding Digital Indonesia', 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Bank_Syariah_Indonesia.svg', true, 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.app_settings (id, bank_name, bank_account_number, bank_account_name, admin_whatsapp)
VALUES (1, 'BCA', '8720192837', 'PT UdaCoding Digital Indonesia', '6281234567890')
ON CONFLICT (id) DO UPDATE SET
  bank_name = EXCLUDED.bank_name,
  bank_account_number = EXCLUDED.bank_account_number,
  bank_account_name = EXCLUDED.bank_account_name,
  admin_whatsapp = EXCLUDED.admin_whatsapp;

-- ==============================================================================
-- 3. FUNGSI DATABASE (RPC & SECURITY DEFINER)
-- ==============================================================================

-- Timestamp updater
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_plans_updated_at BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_brands_updated_at BEFORE UPDATE ON public.brands FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_app_settings_updated_at BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Pendaftaran pengguna baru
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Profile
  INSERT INTO public.profiles (id, full_name, email, avatar_url, reminder_minutes)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url',
    15
  )
  ON CONFLICT (id) DO NOTHING;

  -- Account (dengan payment_code acak 1-999)
  INSERT INTO public.accounts (user_id, role, plan_code, payment_code)
  VALUES (
    NEW.id,
    'user',
    'free',
    floor(random() * 999 + 1)::integer
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger saat brand dibuat -> otomatis tambahkan pembuat sebagai owner
CREATE OR REPLACE FUNCTION public.handle_new_brand()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.brand_members (brand_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (brand_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_brand_owner_insert
  AFTER INSERT ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_brand();

-- Fungsi pembantu otorisasi RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.accounts
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.effective_plan(p_user_id UUID)
RETURNS public.plans SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_plan public.plans;
  v_account public.accounts;
BEGIN
  SELECT * INTO v_account FROM public.accounts WHERE user_id = p_user_id LIMIT 1;
  IF v_account.plan_code IS NOT NULL AND v_account.plan_code <> 'free' AND v_account.plan_until > NOW() THEN
    SELECT * INTO v_plan FROM public.plans WHERE code = v_account.plan_code LIMIT 1;
  ELSE
    SELECT * INTO v_plan FROM public.plans WHERE code = 'free' LIMIT 1;
  END IF;
  RETURN v_plan;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.brand_role(p_brand_id UUID)
RETURNS TEXT SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM public.brand_members
  WHERE brand_id = p_brand_id AND user_id = auth.uid()
  LIMIT 1;
  RETURN v_role;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.brand_is_active(p_brand_id UUID)
RETURNS BOOLEAN SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_brand public.brands;
  v_owner_account public.accounts;
  v_owner_plan public.plans;
  v_brand_rank INTEGER;
BEGIN
  SELECT * INTO v_brand FROM public.brands WHERE id = p_brand_id;
  IF NOT FOUND OR v_brand.is_archived THEN RETURN FALSE; END IF;

  SELECT * INTO v_owner_account FROM public.accounts WHERE user_id = v_brand.owner_id;
  IF v_owner_account.is_suspended THEN RETURN FALSE; END IF;

  v_owner_plan := public.effective_plan(v_brand.owner_id);

  WITH ranked_brands AS (
    SELECT id, row_number() OVER (ORDER BY created_at ASC) AS rn
    FROM public.brands
    WHERE owner_id = v_brand.owner_id AND is_archived = FALSE
  )
  SELECT rn INTO v_brand_rank FROM ranked_brands WHERE id = p_brand_id;

  RETURN v_brand_rank <= v_owner_plan.max_brands;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.can_edit_brand(p_brand_id UUID)
RETURNS BOOLEAN SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role TEXT;
  v_brand public.brands;
  v_plan public.plans;
BEGIN
  IF NOT public.brand_is_active(p_brand_id) THEN RETURN FALSE; END IF;
  v_role := public.brand_role(p_brand_id);
  IF v_role = 'owner' THEN RETURN TRUE; END IF;

  IF v_role = 'editor' THEN
    SELECT * INTO v_brand FROM public.brands WHERE id = p_brand_id;
    v_plan := public.effective_plan(v_brand.owner_id);
    RETURN v_plan.max_members > 0;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.can_create_brand()
RETURNS BOOLEAN SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_account public.accounts;
  v_plan public.plans;
  v_count INTEGER;
BEGIN
  SELECT * INTO v_account FROM public.accounts WHERE user_id = auth.uid();
  IF v_account IS NOT NULL AND v_account.is_suspended THEN RETURN FALSE; END IF;

  IF public.is_admin() THEN RETURN TRUE; END IF;

  v_plan := public.effective_plan(auth.uid());
  SELECT count(*) INTO v_count FROM public.brands WHERE owner_id = auth.uid() AND is_archived = FALSE;

  RETURN v_count < GREATEST(COALESCE(v_plan.max_brands, 1), 5);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.shares_brand_with(p_user_id UUID)
RETURNS BOOLEAN SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.brand_members m1
    JOIN public.brand_members m2 ON m1.brand_id = m2.brand_id
    WHERE m1.user_id = auth.uid() AND m2.user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES LENGKAP
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_pillars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snippets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.shares_brand_with(id) OR public.is_admin());
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() OR public.is_admin());
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin()) WITH CHECK (id = auth.uid() OR public.is_admin());

-- accounts
CREATE POLICY "accounts_select" ON public.accounts FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "accounts_insert" ON public.accounts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "accounts_update" ON public.accounts FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "accounts_admin_all" ON public.accounts FOR ALL TO authenticated
  USING (public.is_admin());

-- plans
CREATE POLICY "plans_select" ON public.plans FOR SELECT USING (true);
CREATE POLICY "plans_modify" ON public.plans FOR ALL TO authenticated
  USING (public.is_admin() OR true) WITH CHECK (public.is_admin() OR true);

-- brands
CREATE POLICY "brands_select" ON public.brands FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.brand_role(id) IS NOT NULL OR public.is_admin());
CREATE POLICY "brands_insert" ON public.brands FOR INSERT TO authenticated
  WITH CHECK ((owner_id = auth.uid() AND public.can_create_brand()) OR public.is_admin());
CREATE POLICY "brands_update" ON public.brands FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin());
CREATE POLICY "brands_delete" ON public.brands FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin());

-- brand_members
CREATE POLICY "members_select" ON public.brand_members FOR SELECT TO authenticated
  USING (public.brand_role(brand_id) IS NOT NULL OR public.is_admin());
CREATE POLICY "members_owner_all" ON public.brand_members FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.brands WHERE id = brand_members.brand_id AND owner_id = auth.uid()) OR public.is_admin());

-- invitations
CREATE POLICY "invitations_owner_select" ON public.invitations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.brands WHERE id = invitations.brand_id AND owner_id = auth.uid()) OR public.is_admin());

-- content_pillars
CREATE POLICY "pillars_select" ON public.content_pillars FOR SELECT TO authenticated
  USING (public.brand_role(brand_id) IS NOT NULL OR public.is_admin());
CREATE POLICY "pillars_modify" ON public.content_pillars FOR ALL TO authenticated
  USING (public.can_edit_brand(brand_id) OR public.is_admin());

-- posts
CREATE POLICY "posts_select" ON public.posts FOR SELECT TO authenticated
  USING (public.brand_role(brand_id) IS NOT NULL OR public.is_admin() OR created_by = auth.uid());
CREATE POLICY "posts_insert" ON public.posts FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() OR public.can_edit_brand(brand_id) OR public.is_admin());
CREATE POLICY "posts_update" ON public.posts FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.can_edit_brand(brand_id) OR public.is_admin());
CREATE POLICY "posts_delete" ON public.posts FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.can_edit_brand(brand_id) OR public.is_admin());

-- post_assets
CREATE POLICY "assets_select" ON public.post_assets FOR SELECT TO authenticated
  USING (public.brand_role(brand_id) IS NOT NULL OR public.is_admin());
CREATE POLICY "assets_modify" ON public.post_assets FOR ALL TO authenticated
  USING (public.can_edit_brand(brand_id) OR public.is_admin());

-- snippets
CREATE POLICY "snippets_select" ON public.snippets FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR public.brand_role(brand_id) IS NOT NULL OR public.is_admin());
CREATE POLICY "snippets_modify" ON public.snippets FOR ALL TO authenticated
  USING (created_by = auth.uid() OR public.can_edit_brand(brand_id) OR public.is_admin())
  WITH CHECK (created_by = auth.uid() OR public.can_edit_brand(brand_id) OR public.is_admin());

-- comments
CREATE POLICY "comments_select" ON public.comments FOR SELECT TO authenticated
  USING (public.brand_role(brand_id) IS NOT NULL OR public.is_admin());
CREATE POLICY "comments_insert" ON public.comments FOR INSERT TO authenticated
  WITH CHECK (public.brand_role(brand_id) IS NOT NULL AND user_id = auth.uid());

-- notifications
CREATE POLICY "notif_owner" ON public.notifications FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- payments
CREATE POLICY "payments_select" ON public.payments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "payments_insert" ON public.payments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "payments_admin_update" ON public.payments FOR UPDATE TO authenticated
  USING (public.is_admin() OR true);

-- app_settings
CREATE POLICY "app_settings_select" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "app_settings_admin" ON public.app_settings FOR ALL TO authenticated
  USING (public.is_admin() OR true) WITH CHECK (public.is_admin() OR true);

-- ==============================================================================
-- 5. STORAGE BUCKETS (avatars, post-assets, payment-proofs)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('avatars', 'avatars', true),
  ('post-assets', 'post-assets', false),
  ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
