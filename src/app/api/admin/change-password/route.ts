import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerClient } from '@/lib/supabase/server';
import {
  getValidAdminPassword,
  setValidAdminPassword,
  verifyAdminPassword,
} from '@/lib/admin-password-store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();
    const currentPassword = body.currentPassword || '';
    const newPassword = body.newPassword || '';
    const confirmPassword = body.confirmPassword || '';

    if (!currentPassword) {
      return NextResponse.json(
        { success: false, error: 'Kata sandi saat ini wajib diisi.' },
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
        { success: false, error: 'Konfirmasi kata sandi baru tidak sesuai.' },
        { status: 400 }
      );
    }

    // 1. Verifikasi kecocokan kata sandi lama
    let isOldPasswordValid = verifyAdminPassword(currentPassword);

    // Cek tambahan jika akun admin spesifik memiliki password di auth
    if (!isOldPasswordValid && email) {
      const serverClient = createServerClient();
      if (serverClient) {
        try {
          const { data: testAuth, error: testErr } = await serverClient.auth.signInWithPassword({
            email,
            password: currentPassword,
          });
          if (!testErr && testAuth?.user) {
            isOldPasswordValid = true;
          }
        } catch {
          // ignore
        }
      }
    }

    if (!isOldPasswordValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Kata sandi lama tidak sesuai. Silakan periksa kembali kata sandi akun Anda saat ini.',
        },
        { status: 400 }
      );
    }

    // 2. Simpan kata sandi baru ke credential store
    setValidAdminPassword(newPassword);

    // 3. Sinkronisasikan ke Supabase Auth untuk seluruh akun Administrator
    const adminClient = createAdminClient();
    if (adminClient) {
      try {
        const { data: usersData } = await adminClient.auth.admin.listUsers();
        const users = (usersData?.users || []) as any[];

        const adminEmailsToUpdate = [
          'admin@udaplanner.id',
          'admin@udaplanner.com',
          'admin@udacoding.id',
        ];

        if (email && !adminEmailsToUpdate.includes(email)) {
          adminEmailsToUpdate.push(email);
        }

        for (const targetEmail of adminEmailsToUpdate) {
          const matched = users.find((u) => u.email?.toLowerCase() === targetEmail);
          if (matched) {
            await adminClient.auth.admin.updateUserById(matched.id, {
              password: newPassword,
              email_confirm: true,
            });
          }
        }
      } catch (authErr: any) {
        console.warn('Update admin auth password warning:', authErr?.message);
      }

      try {
        await (adminClient.from('app_settings' as any) as any).upsert({
          id: 1,
          admin_password: newPassword,
          updated_at: new Date().toISOString(),
        });
      } catch {
        // ignore if column doesn't exist
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Kata sandi akun Administrator berhasil diperbarui.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal mengubah kata sandi.' },
      { status: 500 }
    );
  }
}

