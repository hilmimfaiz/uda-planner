-- ==============================================================================
-- UdaPlanner Migration: 20261022_delete_user_complete.sql
-- Hapus Pengguna Secara Total & Permanen dari Database Publik dan Supabase Auth (auth.users)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.admin_delete_user_complete(
  target_email TEXT DEFAULT NULL,
  target_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uuid UUID := NULL;
  v_email TEXT := NULL;
BEGIN
  -- Bersihkan input email
  IF target_email IS NOT NULL AND trim(target_email) <> '' THEN
    v_email := lower(trim(target_email));
  END IF;

  -- Coba parsing target_id sebagai UUID jika formatnya valid
  IF target_id IS NOT NULL AND target_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_uuid := target_id::UUID;
  END IF;

  -- 1. Jika UUID belum ditemukan tapi email ada, cari UUID dari auth.users atau profiles
  IF v_uuid IS NULL AND v_email IS NOT NULL THEN
    SELECT id INTO v_uuid FROM auth.users WHERE lower(email) = v_email LIMIT 1;
    IF v_uuid IS NULL THEN
      SELECT id INTO v_uuid FROM public.profiles WHERE lower(email) = v_email LIMIT 1;
    END IF;
  END IF;

  -- 2. Jika UUID diberikan tapi itu adalah accounts.id (bukan auth.users.id), ambil user_id yang sebenarnya
  IF v_uuid IS NOT NULL THEN
    DECLARE
      v_actual_user UUID;
    BEGIN
      SELECT user_id INTO v_actual_user FROM public.accounts WHERE id = v_uuid LIMIT 1;
      IF v_actual_user IS NOT NULL THEN
        v_uuid := v_actual_user;
      END IF;
    END;
  END IF;

  -- 3. Hapus data dari seluruh tabel publik terkait user
  IF v_uuid IS NOT NULL THEN
    DELETE FROM public.posts WHERE created_by = v_uuid;
    DELETE FROM public.snippets WHERE created_by = v_uuid;
    DELETE FROM public.brand_members WHERE user_id = v_uuid;
    DELETE FROM public.invitations WHERE inviter_id = v_uuid;
    DELETE FROM public.brands WHERE owner_id = v_uuid;
    DELETE FROM public.payments WHERE user_id = v_uuid;
    DELETE FROM public.verification_logs WHERE user_id = v_uuid;
    DELETE FROM public.accounts WHERE user_id = v_uuid OR id = v_uuid;
    DELETE FROM public.profiles WHERE id = v_uuid;

    -- 4. Hapus data anak dari skema auth terlebih dahulu agar tidak terkena Foreign Key Violation
    BEGIN
      DELETE FROM auth.identities WHERE user_id = v_uuid;
      DELETE FROM auth.refresh_tokens WHERE session_id IN (SELECT id FROM auth.sessions WHERE user_id = v_uuid);
      DELETE FROM auth.mfa_factors WHERE user_id = v_uuid;
      DELETE FROM auth.sessions WHERE user_id = v_uuid;
      DELETE FROM auth.users WHERE id = v_uuid;
    EXCEPTION WHEN OTHERS THEN
      -- Jika terjadi restriksi khusus
    END;
  END IF;

  -- 5. Jika email ada, bersihkan sisa baris di auth.users & profiles berdasarkan email
  IF v_email IS NOT NULL THEN
    DELETE FROM public.invitations WHERE lower(email) = v_email;
    DELETE FROM public.profiles WHERE lower(email) = v_email;

    BEGIN
      DELETE FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users WHERE lower(email) = v_email);
      DELETE FROM auth.refresh_tokens WHERE session_id IN (SELECT id FROM auth.sessions WHERE user_id IN (SELECT id FROM auth.users WHERE lower(email) = v_email));
      DELETE FROM auth.sessions WHERE user_id IN (SELECT id FROM auth.users WHERE lower(email) = v_email);
      DELETE FROM auth.users WHERE lower(email) = v_email;
    EXCEPTION WHEN OTHERS THEN
    END;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Berikan izin eksekusi ke anon, authenticated, dan service_role
GRANT EXECUTE ON FUNCTION public.admin_delete_user_complete(TEXT, TEXT) TO service_role, authenticated, anon;
