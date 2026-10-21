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

    // 1. Coba hapus akun dari Supabase Auth jika Service Role Key tersedia
    const adminClient = createAdminClient();
    if (adminClient) {
      try {
        const { error: authErr } = await adminClient.auth.admin.deleteUser(targetUserId);
        if (authErr) {
          console.warn('adminClient.auth.admin.deleteUser warning:', authErr.message);
        }
      } catch (authEx: any) {
        console.warn('adminClient deleteUser exception:', authEx.message);
      }
    }

    // 2. Hapus data dari tabel publik database menggunakan client server / RPC
    const serverClient = createServerClient();
    if (serverClient) {
      try {
        // Coba jalankan fungsi RPC admin_delete_user jika sudah ada di Postgres
        await (serverClient as any).rpc('admin_delete_user', { target_user_id: targetUserId });
      } catch (rpcErr) {
        // Lanjutkan dengan query DELETE langsung
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
