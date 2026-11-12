import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cleanEmail = body.email ? String(body.email).trim().toLowerCase() : undefined;
    const targetUserId = body.userId ? String(body.userId).trim() : undefined;

    if (!cleanEmail && !targetUserId) {
      return NextResponse.json(
        { exists: false, isDeleted: false, isSuspended: false, error: 'Email atau userId diperlukan' },
        { status: 400 }
      );
    }

    // Akun super admin tidak pernah dibekukan atau dihapus
    if (cleanEmail === 'admin@udaplanner.id') {
      return NextResponse.json({
        exists: true,
        isDeleted: false,
        isSuspended: false,
        role: 'admin',
      });
    }

    const adminClient = createAdminClient();
    const serverClient = createServerClient();
    const db = adminClient || serverClient;

    let authUser: any = null;
    let authUserId: string | null = null;

    if (adminClient) {
      try {
        const { data: listData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
        const users = (listData as any)?.users || [];
        authUser = users.find(
          (u: any) =>
            (cleanEmail && u.email?.toLowerCase().trim() === cleanEmail) ||
            (targetUserId && u.id === targetUserId)
        );
        if (authUser) {
          authUserId = authUser.id;
        }
      } catch (err: any) {
        console.warn('check-status listUsers notice:', err.message);
      }
    }

    // Cek juga di tabel profiles
    let profileData: any = null;
    if (db) {
      try {
        let profQuery = db.from('profiles' as any).select('id, email, full_name');
        if (authUserId) {
          profQuery = profQuery.eq('id', authUserId);
        } else if (cleanEmail) {
          profQuery = profQuery.ilike('email', cleanEmail);
        } else if (targetUserId) {
          profQuery = profQuery.eq('id', targetUserId);
        }
        const { data: prof } = await profQuery.limit(1).maybeSingle();
        profileData = prof;
      } catch {}
    }

    // Jika pengguna tidak ditemukan di auth.users maupun profiles -> Akun telah dihapus
    const exists = !!authUser || !!profileData;
    if (!exists) {
      return NextResponse.json({
        exists: false,
        isDeleted: true,
        isSuspended: false,
      });
    }

    // Pengecekan status suspend / pembekuan
    let isSuspended = false;

    // 1. Cek di auth.users (ban duration atau user_metadata)
    if (authUser) {
      if (authUser.banned_until) {
        const banDate = new Date(authUser.banned_until);
        if (!isNaN(banDate.getTime()) && banDate > new Date()) {
          isSuspended = true;
        }
      }
      if (authUser.user_metadata?.is_suspended === true) {
        isSuspended = true;
      }
    }

    // 2. Cek di tabel accounts (is_suspended)
    if (!isSuspended && db) {
      try {
        const queryIds = [authUserId, targetUserId, profileData?.id].filter(Boolean);
        if (queryIds.length > 0) {
          for (const uid of queryIds) {
            const { data: acc } = await (db.from('accounts' as any) as any)
              .select('is_suspended, role')
              .or(`user_id.eq.${uid},id.eq.${uid}`)
              .limit(1)
              .maybeSingle();

            if (acc && acc.is_suspended === true) {
              isSuspended = true;
              break;
            }
          }
        }
      } catch {}
    }

    return NextResponse.json({
      exists: true,
      isDeleted: false,
      isSuspended,
      userId: authUserId || profileData?.id || targetUserId,
      email: cleanEmail || authUser?.email || profileData?.email,
    });
  } catch (error: any) {
    return NextResponse.json(
      { exists: false, isDeleted: false, isSuspended: false, error: error.message },
      { status: 500 }
    );
  }
}
