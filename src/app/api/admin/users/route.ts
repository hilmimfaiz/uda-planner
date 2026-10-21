import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerClient } from '@/lib/supabase/server';

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

    // 1. Hapus dari Supabase Auth
    const adminClient = createAdminClient();
    if (adminClient) {
      try {
        await adminClient.auth.admin.deleteUser(targetUserId);
      } catch (authEx: any) {
        console.warn('adminClient deleteUser warning:', authEx.message);
      }
    }

    // 2. Hapus data dari tabel publik
    const serverClient = createServerClient();
    if (serverClient) {
      try {
        await (serverClient as any).rpc('admin_delete_user', { target_user_id: targetUserId });
      } catch {
        // Fallback
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
