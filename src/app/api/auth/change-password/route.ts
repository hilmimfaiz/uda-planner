import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();
    const userId = (body.userId || '').trim();
    const currentPassword = body.currentPassword || '';
    const newPassword = body.newPassword || '';
    const confirmPassword = body.confirmPassword || '';

    if (!email && !userId) {
      return NextResponse.json(
        { success: false, error: 'Identitas akun tidak ditemukan. Silakan muat ulang halaman.' },
        { status: 400 }
      );
    }

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Kata sandi baru minimal harus 6 karakter.' },
        { status: 400 }
      );
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'Konfirmasi kata sandi baru tidak cocok dengan kata sandi baru.' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Layanan database tidak tersedia. Silakan coba beberapa saat lagi.' },
        { status: 500 }
      );
    }

    // 1. Dapatkan user target dari Supabase Auth
    let targetUser: any = null;
    if (userId) {
      const { data: uData } = await admin.auth.admin.getUserById(userId);
      if (uData?.user) {
        targetUser = uData.user;
      }
    }

    if (!targetUser && email) {
      const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 1000 });
      if (usersData?.users && usersData.users.length > 0) {
        targetUser = usersData.users.find((u: any) => u.email?.toLowerCase() === email);
      }
    }

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'Pengguna tidak ditemukan dalam sistem.' },
        { status: 404 }
      );
    }

    const targetEmail = targetUser.email?.toLowerCase() || email;
    const providers: string[] =
      targetUser.app_metadata?.providers ||
      (targetUser.app_metadata?.provider ? [targetUser.app_metadata.provider] : []);
    const isGoogleOnly = providers.includes('google') && !providers.includes('email');

    // 2. Jika akun login email biasa, validasi kata sandi saat ini
    if (!isGoogleOnly) {
      if (!currentPassword) {
        return NextResponse.json(
          { success: false, error: 'Silakan masukkan kata sandi Anda saat ini.' },
          { status: 400 }
        );
      }

      const serverClient = createServerClient();
      if (serverClient) {
        try {
          const { error: testErr } = await serverClient.auth.signInWithPassword({
            email: targetEmail,
            password: currentPassword,
          });
          if (testErr) {
            return NextResponse.json(
              {
                success: false,
                error: 'Kata sandi saat ini tidak sesuai. Harap periksa kembali kata sandi lama Anda.',
              },
              { status: 400 }
            );
          }
        } catch {
          // ignore
        }
      }
    }

    // 3. Perbarui kata sandi di Supabase Auth
    const { error: updateErr } = await admin.auth.admin.updateUserById(targetUser.id, {
      password: newPassword,
      email_confirm: true,
    });

    if (updateErr) {
      return NextResponse.json(
        { success: false, error: updateErr.message || 'Gagal memperbarui kata sandi di sistem.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Kata sandi Anda berhasil diperbarui. Silakan gunakan kata sandi baru untuk login berikutnya.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Terjadi kesalahan sistem saat memperbarui kata sandi.' },
      { status: 500 }
    );
  }
}

