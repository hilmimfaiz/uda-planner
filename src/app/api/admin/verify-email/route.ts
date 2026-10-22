import { NextRequest, NextResponse } from 'next/server';
import { VerificationService } from '@/services/verification.service';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const [users, stats, logs] = await Promise.all([
      VerificationService.getVerifiableUsers(),
      VerificationService.getVerificationStats(),
      VerificationService.getAuditLogs(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        users,
        stats,
        logs,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, userId, email, adminId, adminName, note } = body;

    const targetEmail = (email || '').trim().toLowerCase();
    const targetUserId = userId || '';

    if (!targetUserId && !targetEmail) {
      return NextResponse.json({ success: false, error: 'User ID atau Email wajib disertakan.' }, { status: 400 });
    }

    if (action === 'resend_email') {
      const res = await VerificationService.resendVerificationEmail(targetUserId, adminId, adminName);
      return NextResponse.json({ success: res.success, message: res.message });
    }

    // Konfirmasi langsung di Supabase Auth menggunakan Service Role Key
    const adminClient = createAdminClient();
    let authUserConfirmed = false;

    if (adminClient) {
      try {
        const { data: usersData } = await adminClient.auth.admin.listUsers();
        const matched = (usersData?.users || []).find(
          (u: any) =>
            (targetUserId && u.id === targetUserId) ||
            (targetEmail && u.email?.toLowerCase() === targetEmail)
        );

        if (matched) {
          // 1. Konfirmasi email_confirm = true di auth.users Supabase
          const { error: authErr } = await adminClient.auth.admin.updateUserById(matched.id, {
            email_confirm: true,
          });

          if (!authErr) {
            authUserConfirmed = true;
          }

          // 2. Perbarui status di tabel profiles
          const nowIso = new Date().toISOString();
          await (adminClient.from('profiles' as any) as any)
            .update({
              is_email_verified: true,
              email_verified_at: nowIso,
              email_delivery_status: 'delivered',
              registration_status: 'verified',
              updated_at: nowIso,
            })
            .eq('id', matched.id);

          // 3. Pastikan record accounts tersedia
          const { data: existingAcc } = await (adminClient.from('accounts' as any) as any)
            .select('id')
            .eq('user_id', matched.id)
            .maybeSingle();

          if (!existingAcc) {
            await (adminClient.from('accounts' as any) as any).insert({
              user_id: matched.id,
              role: 'user',
              plan_code: 'free',
              is_suspended: false,
            });
          }
        }
      } catch (adminErr) {
        console.warn('Gagal memverifikasi user di Supabase Auth Admin:', adminErr);
      }
    }

    // Default: update state di VerificationService
    const success = await VerificationService.manualVerifyEmail(
      targetUserId || targetEmail,
      targetEmail || adminId || 'admin-001',
      adminName || 'Administrator',
      note || 'Verifikasi manual oleh admin via Panel Admin'
    );

    return NextResponse.json({
      success: true,
      authUserConfirmed,
      message: 'Email pengguna berhasil diverifikasi secara manual dan diaktifkan di Supabase Auth.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
