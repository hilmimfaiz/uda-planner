import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerClient } from '@/lib/supabase/server';
import { performFullUserDeletion } from '@/lib/server-user-delete';

interface RouteParams {
  params: {
    id: string;
  };
}

const isUuid = (val?: string | null) =>
  !!val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const targetUserId = params.id;
    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: 'User ID tidak ditemukan.' },
        { status: 400 }
      );
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body may be empty
    }
    const targetEmail = body.email;

    const cleanEmail = (targetEmail || '').trim().toLowerCase();
    const isAdminEmail =
      cleanEmail === 'admin@udaplanner.id' ||
      cleanEmail === 'admin@udaplanner.com' ||
      cleanEmail === 'admin@udacoding.id' ||
      cleanEmail.startsWith('admin@');

    if (isAdminEmail) {
      return NextResponse.json(
        { success: false, error: 'Sebagai sesama admin, Anda tidak diberikan hak untuk menghapus user admin.' },
        { status: 403 }
      );
    }

    // Periksa apakah pengguna memiliki role admin di Supabase Auth
    const adminClient = createAdminClient();
    if (adminClient) {
      try {
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
      } catch (authEx: any) {
        console.warn('adminClient verify admin status exception:', authEx.message);
      }
    }

    // Jalankan penghapusan menyeluruh (DB tables, posts, assets, brands, notifications, payments, auth.users, backup json)
    await performFullUserDeletion(targetUserId, targetEmail);

    return NextResponse.json({
      success: true,
      message: 'Pengguna dan seluruh datanya berhasil dihapus secara bersih dan permanen dari sistem.',
      userId: targetUserId,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menghapus pengguna secara permanen.' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const targetUserId = params.id;
    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: 'User ID tidak ditemukan.' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { plan, durationDays, planUntil, isSuspended, email } = body;

    const adminClient = createAdminClient();
    const serverClient = createServerClient();
    const db = adminClient || serverClient;

    if (adminClient && typeof isSuspended === 'boolean') {
      try {
        let authUserId = isUuid(targetUserId) ? targetUserId : null;
        if (!authUserId) {
          const { data: listData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
          const matchUser = ((listData as any)?.users || []).find(
            (u: any) =>
              u.id === targetUserId ||
              (email && u.email?.toLowerCase().trim() === email.toLowerCase().trim())
          );
          if (matchUser) {
            authUserId = matchUser.id;
          }
        }

        if (authUserId) {
          await adminClient.auth.admin.updateUserById(authUserId, {
            user_metadata: { is_suspended: isSuspended },
            ban_duration: isSuspended ? '876000h' : 'none',
          });
        }
      } catch (authErr: any) {
        console.warn('Auth admin ban/suspend warning:', authErr.message);
      }
    }

    if (db) {
      const updatePayload: any = { updated_at: new Date().toISOString() };
      if (plan) updatePayload.plan_code = plan;
      if (planUntil) updatePayload.plan_until = planUntil;
      if (typeof isSuspended === 'boolean') updatePayload.is_suspended = isSuspended;

      try {
        await (db.from('accounts' as any) as any)
          .update(updatePayload)
          .or(`user_id.eq.${targetUserId},id.eq.${targetUserId}`);

        if (email) {
          await (db.from('accounts' as any) as any)
            .update(updatePayload)
            .ilike('email', email.trim());

          const { data: prof } = await db.from('profiles' as any).select('id').ilike('email', email.trim()).maybeSingle();
          if (prof && (prof as any).id) {
            await (db.from('accounts' as any) as any)
              .update(updatePayload)
              .or(`user_id.eq.${(prof as any).id},id.eq.${(prof as any).id}`);
          }
        }
      } catch (dbErr: any) {
        console.warn('API PATCH user warning:', dbErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Data pengguna berhasil diperbarui.',
      data: { userId: targetUserId, plan, planUntil, isSuspended },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memperbarui pengguna.' },
      { status: 500 }
    );
  }
}

