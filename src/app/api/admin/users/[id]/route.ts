import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerClient } from '@/lib/supabase/server';

interface RouteParams {
  params: {
    id: string;
  };
}

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

    const isUuid = (val?: string | null) =>
      !!val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

    // 1. Coba hapus akun dari Supabase Auth jika Service Role Key tersedia
    const adminClient = createAdminClient();
    if (adminClient) {
      try {
        if (isUuid(targetUserId)) {
          const { error: authErr } = await adminClient.auth.admin.deleteUser(targetUserId);
          if (authErr) {
            console.warn('adminClient.auth.admin.deleteUser warning:', authErr.message);
          }
        }

        if (targetEmail) {
          const { data: listData } = await adminClient.auth.admin.listUsers();
          const matchUser = ((listData as any)?.users || []).find(
            (u: any) => u.email?.toLowerCase() === targetEmail.toLowerCase()
          );
          if (matchUser && matchUser.id !== targetUserId) {
            await adminClient.auth.admin.deleteUser(matchUser.id);
          }
        }
      } catch (authEx: any) {
        console.warn('adminClient deleteUser exception:', authEx.message);
      }
    }

    // 2. Hapus data dari database menggunakan RPC dan query langsung
    const serverClient = createServerClient();
    if (serverClient) {
      try {
        // Coba jalankan RPC komprehensif admin_delete_user_complete
        await (serverClient as any).rpc('admin_delete_user_complete', {
          target_email: targetEmail || undefined,
          target_id: targetUserId || undefined,
        });
      } catch (rpcCompleteErr) {
        // Fallback ke RPC admin_delete_user lama jika targetUserId adalah UUID
        if (isUuid(targetUserId)) {
          try {
            await (serverClient as any).rpc('admin_delete_user', { target_user_id: targetUserId });
          } catch (rpcErr) {}
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
      message: 'Pengguna berhasil dihapus secara permanen dari sistem.',
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
          const { data: prof } = await db.from('profiles' as any).select('id').eq('email', email).maybeSingle();
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

