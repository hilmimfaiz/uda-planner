import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cleanFullName = (body.fullName || body.name || '').trim();
    const cleanEmail = (body.email || '').trim().toLowerCase();
    const userId = body.userId || body.id;

    if (!cleanFullName || cleanFullName.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Nama lengkap minimal 2 karakter.' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    if (adminClient) {
      try {
        // 1. Update di tabel profiles
        if (userId) {
          await adminClient
            .from('profiles')
            .update({
              full_name: cleanFullName,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);
        }

        if (cleanEmail) {
          await adminClient
            .from('profiles')
            .update({
              full_name: cleanFullName,
              updated_at: new Date().toISOString(),
            })
            .eq('email', cleanEmail);
        }

        // 2. Update di Supabase Auth user_metadata
        let targetId = userId;
        if (!targetId && cleanEmail) {
          const { data: usersData } = await adminClient.auth.admin.listUsers();
          const match = ((usersData as any)?.users || []).find(
            (u: any) => u.email?.toLowerCase() === cleanEmail
          );
          if (match) {
            targetId = match.id;
          }
        }

        if (targetId) {
          const { data: userData } = await adminClient.auth.admin.getUserById(targetId);
          await adminClient.auth.admin.updateUserById(targetId, {
            user_metadata: {
              ...(userData?.user?.user_metadata || {}),
              full_name: cleanFullName,
            },
          });
        }
      } catch (dbErr: any) {
        console.warn('Admin profile update warning:', dbErr?.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Nama lengkap administrator berhasil diperbarui.',
      fullName: cleanFullName,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal memperbarui profil admin.' },
      { status: 500 }
    );
  }
}

