import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const cleanEmail = (body.email || '').trim().toLowerCase();
    const inputPassword = body.password || '';

    const isAdminEmail =
      cleanEmail === 'admin@udaplanner.id' ||
      cleanEmail === 'admin@udaplanner.com' ||
      cleanEmail === 'admin@udacoding.id';

    if (!isAdminEmail) {
      return NextResponse.json(
        { success: false, error: 'Bukan alamat email administrator.' },
        { status: 403 }
      );
    }

    // Password admin WAJIB persis 'admin123'
    if (inputPassword !== 'admin123') {
      return NextResponse.json(
        { success: false, error: 'Kata sandi admin salah. Hanya admin123 yang diizinkan.' },
        { status: 401 }
      );
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Konfigurasi admin database tidak tersedia.' },
        { status: 500 }
      );
    }

    // 1. Cari user admin di Supabase Auth
    const { data: usersData, error: listErr } = await admin.auth.admin.listUsers();
    if (listErr) {
      return NextResponse.json(
        { success: false, error: listErr.message },
        { status: 500 }
      );
    }

    const adminUser = (usersData.users as any[]).find((u: any) => u.email?.toLowerCase() === cleanEmail);

    const targetPassword = 'admin123';

    if (!adminUser) {
      // Buat akun admin jika belum ada di auth
      const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
        email: cleanEmail,
        password: targetPassword,
        email_confirm: true,
        user_metadata: {
          full_name: 'Administrator UdaPlanner',
          role: 'admin',
          has_completed_onboarding: true,
          has_logged_in_before: true,
        },
      });

      if (createErr || !newUser.user) {
        return NextResponse.json(
          { success: false, error: createErr?.message || 'Gagal membuat akun admin.' },
          { status: 500 }
        );
      }

      await admin.from('profiles').upsert({
        id: newUser.user.id,
        email: cleanEmail,
        full_name: 'Administrator UdaPlanner',
        updated_at: new Date().toISOString(),
      });

      await admin.from('accounts').upsert(
        {
          user_id: newUser.user.id,
          role: 'admin',
          plan_code: 'team',
        },
        { onConflict: 'user_id' }
      );

      return NextResponse.json({ success: true, targetPassword, userId: newUser.user.id });
    }

    // Update password dan metadata admin agar selalu aktif dan cocok
    await admin.auth.admin.updateUserById(adminUser.id, {
      password: targetPassword,
      email_confirm: true,
      user_metadata: {
        ...adminUser.user_metadata,
        full_name: adminUser.user_metadata?.full_name || 'Administrator UdaPlanner',
        role: 'admin',
        has_completed_onboarding: true,
        has_logged_in_before: true,
      },
    });

    // Pastikan tabel profiles & accounts tercatat sebagai admin
    await admin.from('profiles').upsert({
      id: adminUser.id,
      email: cleanEmail,
      full_name: 'Administrator UdaPlanner',
      updated_at: new Date().toISOString(),
    });

    await admin.from('accounts').upsert(
      {
        user_id: adminUser.id,
        role: 'admin',
        plan_code: 'team',
      },
      { onConflict: 'user_id' }
    );

    return NextResponse.json({ success: true, targetPassword, userId: adminUser.id });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Terjadi kesalahan sistem.' },
      { status: 500 }
    );
  }
}
