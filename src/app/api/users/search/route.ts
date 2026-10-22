import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query') || searchParams.get('email') || '';
    const cleanQuery = query.trim().toLowerCase();

    if (!cleanQuery) {
      return NextResponse.json({ success: false, error: 'Query pencarian diperlukan.' }, { status: 400 });
    }

    const cleanPhone = cleanQuery.replace(/[^0-9]/g, '');

    const adminClient = createAdminClient();
    const serverClient = createServerClient() || adminClient;

    let matchedUser: any = null;

    // 1. Cek semua user di Supabase Auth (mencakup pendaftar email biasa & Google OAuth)
    if (adminClient) {
      try {
        const { data: listData, error: listErr } = await adminClient.auth.admin.listUsers({
          perPage: 1000,
        });

        if (!listErr && listData?.users) {
          const authFound = listData.users.find((u: any) => {
            const uEmail = u.email ? u.email.trim().toLowerCase() : '';
            const uPhone = u.phone ? u.phone.replace(/[^0-9]/g, '') : '';
            const metaPhone = u.user_metadata?.phone ? String(u.user_metadata.phone).replace(/[^0-9]/g, '') : '';

            const emailMatch = uEmail === cleanQuery;
            const phoneMatch = cleanPhone && cleanPhone.length >= 8 && (uPhone === cleanPhone || metaPhone === cleanPhone);

            return emailMatch || phoneMatch;
          });

          if (authFound) {
            const meta = authFound.user_metadata || {};
            const isGoogle =
              authFound.app_metadata?.provider === 'google' ||
              (authFound.identities || []).some((id: any) => id.provider === 'google');

            matchedUser = {
              id: authFound.id,
              name: meta.full_name || meta.name || authFound.email?.split('@')[0] || 'Pengguna Terdaftar',
              email: authFound.email || '',
              avatar: meta.avatar_url || meta.picture || null,
              phone: authFound.phone || meta.phone || null,
              isGoogleUser: isGoogle,
              provider: isGoogle ? 'google' : 'email',
              systemRole: meta.role || 'user',
            };
          }
        }
      } catch (authErr) {
        console.warn('Auth admin list users error:', authErr);
      }
    }

    // 2. Cek tabel profiles di database publik untuk sinkronisasi nama, avatar, dan nomor telepon
    if (serverClient) {
      try {
        let profileQuery = serverClient
          .from('profiles' as any)
          .select('id, full_name, email, avatar_url, phone, role');

        if (matchedUser?.id) {
          profileQuery = profileQuery.eq('id', matchedUser.id);
        } else if (cleanPhone && cleanPhone.length >= 8) {
          profileQuery = profileQuery.or(`email.ilike.${cleanQuery},phone.ilike.%${cleanPhone}%`);
        } else {
          profileQuery = profileQuery.ilike('email', cleanQuery);
        }

        const { data: prof, error: profErr } = await profileQuery.maybeSingle();

        if (!profErr && prof) {
          const p = prof as any;
          if (matchedUser) {
            matchedUser.name = p.full_name || matchedUser.name;
            matchedUser.avatar = p.avatar_url || matchedUser.avatar;
            matchedUser.phone = p.phone || matchedUser.phone;
            matchedUser.systemRole = p.role || matchedUser.systemRole;
          } else {
            matchedUser = {
              id: p.id,
              name: p.full_name || p.email?.split('@')[0] || 'Pengguna Terdaftar',
              email: p.email || cleanQuery,
              avatar: p.avatar_url || null,
              phone: p.phone || null,
              isGoogleUser: cleanQuery.endsWith('@gmail.com'),
              provider: cleanQuery.endsWith('@gmail.com') ? 'google' : 'email',
              systemRole: p.role || 'user',
            };
          }
        }
      } catch (profErr) {
        console.warn('Profile search error:', profErr);
      }
    }

    if (!matchedUser) {
      return NextResponse.json({
        success: false,
        found: false,
        message: `Pengguna dengan email atau kontak "${query}" belum terdaftar di Uda-Planner.`,
      });
    }

    return NextResponse.json({
      success: true,
      found: true,
      user: matchedUser,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Terjadi kesalahan sistem saat mencari user.' },
      { status: 500 }
    );
  }
}
