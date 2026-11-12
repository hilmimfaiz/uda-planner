import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cleanEmail = (body?.email || '').trim().toLowerCase();

    if (!cleanEmail) {
      return NextResponse.json({ exists: false });
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ exists: false });
    }

    // 1. Cek tabel profiles
    const { data: profile } = await (admin.from('profiles' as any) as any)
      .select('id, full_name, email')
      .ilike('email', cleanEmail)
      .maybeSingle();

    // 2. Cek tabel auth.users via Supabase Admin
    let authUser: any = null;
    try {
      const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 1000 });
      if (usersData?.users && usersData.users.length > 0) {
        authUser = usersData.users.find((u: any) => u.email?.toLowerCase() === cleanEmail);
      }
    } catch (authErr) {
      console.warn('Check email listUsers warning:', authErr);
    }

    if (authUser || profile) {
      const providers: string[] =
        authUser?.app_metadata?.providers ||
        (authUser?.app_metadata?.provider ? [authUser.app_metadata.provider] : []);
      const isGoogle = providers.includes('google');

      let message = 'Email ini sudah terdaftar. Silakan gunakan menu Masuk untuk mengakses akun Anda.';
      if (isGoogle) {
        message =
          'Email ini sudah terdaftar menggunakan akun Google. Silakan masuk menggunakan tombol "Google" atau melalui menu Masuk.';
      }

      return NextResponse.json({
        exists: true,
        isGoogle,
        provider: isGoogle ? 'google' : 'email',
        message,
      });
    }

    return NextResponse.json({ exists: false });
  } catch (err: any) {
    return NextResponse.json({ exists: false, error: err.message }, { status: 500 });
  }
}

