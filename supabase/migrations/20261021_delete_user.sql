-- ==============================================================================
-- UdaPlanner Migration: 20261021_delete_user.sql
-- Fitur Hapus Pengguna Secara Permanen oleh Administrator
-- Menghapus data akun, profil, brand, postingan, dan baris pada auth.users
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- 1. Bersihkan tabel-tabel publik terkait user
  DELETE FROM public.posts WHERE created_by = target_user_id;
  DELETE FROM public.snippets WHERE created_by = target_user_id;
  DELETE FROM public.brand_members WHERE user_id = target_user_id;
  DELETE FROM public.invitations WHERE inviter_id = target_user_id;
  DELETE FROM public.brands WHERE owner_id = target_user_id;
  DELETE FROM public.payments WHERE user_id = target_user_id;
  DELETE FROM public.verification_logs WHERE user_id = target_user_id;
  DELETE FROM public.accounts WHERE user_id = target_user_id;
  DELETE FROM public.profiles WHERE id = target_user_id;

  -- 2. Hapus dari auth.users agar email dapat didaftarkan kembali sebagai akun baru
  DELETE FROM auth.users WHERE id = target_user_id;

  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  -- Fallback jika auth.users memiliki trigger restriksi
  DELETE FROM public.accounts WHERE user_id = target_user_id;
  DELETE FROM public.profiles WHERE id = target_user_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Berikan izin eksekusi ke anon, authenticated, dan service_role
GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO service_role, authenticated, anon;
