import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Database admin tidak terhubung.' }, { status: 500 });
    }

    const [profilesRes, accountsRes, authRes] = await Promise.all([
      admin.from('profiles').select('*'),
      admin.from('accounts').select('*'),
      admin.auth.admin.listUsers({ perPage: 1000 }),
    ]);

    const authUsers = authRes.data?.users || [];
    const profiles = profilesRes.data || [];
    const accounts = accountsRes.data || [];

    const accountsMap = new Map<string, any>();
    accounts.forEach((acc: any) => {
      if (acc.user_id) accountsMap.set(acc.user_id, acc);
    });

    const profilesMap = new Map<string, any>();
    profiles.forEach((p: any) => {
      if (p.id) profilesMap.set(p.id, p);
      if (p.email) profilesMap.set(p.email.toLowerCase(), p);
    });

    const combinedList = authUsers.map((u: any) => {
      const email = (u.email || '').toLowerCase().trim();
      const profile = profilesMap.get(u.id) || profilesMap.get(email);
      const acc = accountsMap.get(u.id);

      const fullName = profile?.full_name || u.user_metadata?.full_name || (email.split('@')[0]);
      const role = u.user_metadata?.role || acc?.role || (email.startsWith('admin@') ? 'admin' : 'owner');
      const plan = acc?.plan_code || (role === 'admin' ? 'admin' : 'free');

      return {
        id: u.id,
        userId: u.id,
        name: fullName,
        email: u.email,
        role: role === 'admin' ? 'Admin' : 'Owner',
        plan: plan,
        isEmailVerified: !!u.email_confirmed_at,
        avatar: profile?.avatar_url || u.user_metadata?.avatar_url || null,
        createdAt: u.created_at,
      };
    });

    return NextResponse.json({ success: true, data: combinedList });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let targetUserId = searchParams.get('userId') || searchParams.get('id');
    let targetEmail = searchParams.get('email');

    try {
      const body = await req.json();
      if (body.userId) targetUserId = body.userId;
      if (body.id && !targetUserId) targetUserId = body.id;
      if (body.email) targetEmail = body.email;
    } catch {
      // Body may be empty if params provided in query
    }

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: 'User ID wajib disertakan.' },
        { status: 400 }
      );
    }

    const cleanEmail = (targetEmail || '').trim().toLowerCase();
    const isAdminEmail =
      cleanEmail === 'admin@udaplanner.id' ||
      cleanEmail.startsWith('admin@');

    if (isAdminEmail) {
      return NextResponse.json(
        { success: false, error: 'Sebagai sesama admin, Anda tidak diberikan hak untuk menghapus user admin.' },
        { status: 403 }
      );
    }

    const isUuid = (val?: string | null) =>
      !!val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

    // 1. Hapus dari Supabase Auth
    const adminClient = createAdminClient();
    if (adminClient) {
      try {
        // Cek apakah target pengguna merupakan admin
        const { data: listData } = await adminClient.auth.admin.listUsers();
        const matchUser = ((listData as any)?.users || []).find(
          (u: any) => u.id === targetUserId || (cleanEmail && u.email?.toLowerCase() === cleanEmail)
        );
        if (matchUser && (matchUser.user_metadata?.role === 'admin' || matchUser.email?.toLowerCase().startsWith('admin@'))) {
          return NextResponse.json(
            { success: false, error: 'Sebagai sesama admin, Anda tidak diberikan hak untuk menghapus user admin.' },
            { status: 403 }
          );
        }

        if (isUuid(targetUserId)) {
          await adminClient.auth.admin.deleteUser(targetUserId);
        }
        if (targetEmail) {
          if (matchUser && matchUser.id !== targetUserId) {
            await adminClient.auth.admin.deleteUser(matchUser.id);
          }
        }
      } catch (authEx: any) {
        console.warn('adminClient deleteUser warning:', authEx.message);
      }
    }

    // 2. Hapus data dari tabel publik
    const serverClient = createServerClient();
    if (serverClient) {
      try {
        await (serverClient as any).rpc('admin_delete_user_complete', {
          target_email: targetEmail || undefined,
          target_id: targetUserId || undefined,
        });
      } catch {
        if (isUuid(targetUserId)) {
          try {
            await (serverClient as any).rpc('admin_delete_user', { target_user_id: targetUserId });
          } catch {}
        }
      }

      try {
        await Promise.allSettled([
          serverClient.from('posts' as any).delete().eq('created_by', targetUserId),
          serverClient.from('snippets' as any).delete().eq('created_by', targetUserId),
          serverClient.from('brand_members' as any).delete().eq('user_id', targetUserId),
          serverClient.from('brands' as any).delete().eq('owner_id', targetUserId),
          serverClient.from('payments' as any).delete().eq('user_id', targetUserId),
          serverClient.from('verification_logs' as any).delete().eq('user_id', targetUserId),
          serverClient.from('accounts' as any).delete().or(`user_id.eq.${targetUserId},id.eq.${targetUserId}`),
          serverClient.from('profiles' as any).delete().eq('id', targetUserId),
        ]);

        if (targetEmail) {
          await Promise.allSettled([
            serverClient.from('invitations' as any).delete().eq('email', targetEmail),
            serverClient.from('profiles' as any).delete().eq('email', targetEmail),
            serverClient.from('accounts' as any).delete().eq('email', targetEmail),
          ]);
        }
      } catch (dbErr: any) {
        console.warn('Database deletion warning:', dbErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Pengguna berhasil dihapus secara permanen.',
      userId: targetUserId,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menghapus pengguna.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cleanEmail = (body.email || '').trim().toLowerCase();
    const fullName = (body.name || body.fullName || '').trim() || 'Administrator UdaPlanner';
    const password = body.password || 'admin123';

    if (!cleanEmail) {
      return NextResponse.json(
        { success: false, error: 'Email administrator wajib diisi.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Kata sandi minimal 6 karakter.' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Koneksi database admin Supabase tidak tersedia.' },
        { status: 500 }
      );
    }

    // 1. Cek apakah user sudah ada di Supabase Auth
    const { data: usersData, error: listErr } = await admin.auth.admin.listUsers();
    if (!listErr && usersData && usersData.users) {
      const existing = (usersData.users as any[]).find(
        (u: any) => u.email?.toLowerCase() === cleanEmail
      );

      if (existing) {
        // Update user menjadi admin
        await admin.auth.admin.updateUserById(existing.id, {
          password,
          email_confirm: true,
          user_metadata: {
            ...existing.user_metadata,
            full_name: fullName,
            role: 'admin',
            has_completed_onboarding: true,
            has_logged_in_before: true,
          },
        });

        await admin.from('profiles').upsert({
          id: existing.id,
          email: cleanEmail,
          full_name: fullName,
          updated_at: new Date().toISOString(),
        });

        await admin.from('accounts').upsert(
          {
            user_id: existing.id,
            role: 'admin',
            plan_code: 'team',
          },
          { onConflict: 'user_id' }
        );

        return NextResponse.json({
          success: true,
          message: 'Akun berhasil diperbarui sebagai Administrator.',
          userId: existing.id,
          user: {
            id: existing.id,
            userId: existing.id,
            email: cleanEmail,
            name: fullName,
            role: 'Admin',
            plan: 'admin',
          },
        });
      }
    }

    // 2. Buat akun admin baru
    const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: 'admin',
        has_completed_onboarding: true,
        has_logged_in_before: true,
      },
    });

    if (createErr || !newUser.user) {
      return NextResponse.json(
        { success: false, error: createErr?.message || 'Gagal membuat akun admin baru.' },
        { status: 400 }
      );
    }

    // 3. Upsert profiles dan accounts
    await admin.from('profiles').upsert({
      id: newUser.user.id,
      email: cleanEmail,
      full_name: fullName,
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

    return NextResponse.json({
      success: true,
      message: 'Akun Administrator baru berhasil dibuat.',
      userId: newUser.user.id,
      user: {
        id: newUser.user.id,
        userId: newUser.user.id,
        email: cleanEmail,
        name: fullName,
        role: 'Admin',
        plan: 'admin',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Terjadi kesalahan server saat membuat admin.' },
      { status: 500 }
    );
  }
}
