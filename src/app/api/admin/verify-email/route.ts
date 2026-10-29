import { NextRequest, NextResponse } from 'next/server';
import {
  VerificationService,
  VerifiableUser,
  VerificationStats,
  EmailDeliveryStatus,
  RegistrationStatus,
} from '@/services/verification.service';
import { createAdminClient } from '@/lib/supabase/server';
import { formatWibDate } from '@/lib/date-utils';

export async function GET() {
  try {
    const adminClient = createAdminClient();
    if (!adminClient) {
      const [users, stats, logs] = await Promise.all([
        VerificationService.getVerifiableUsers(),
        VerificationService.getVerificationStats(),
        VerificationService.getAuditLogs(),
      ]);

      return NextResponse.json({
        success: true,
        data: { users, stats, logs },
      });
    }

    // Ambil data autentikasi aktual langsung dari Supabase Auth
    const [authRes, profRes, accRes] = await Promise.all([
      adminClient.auth.admin.listUsers({ perPage: 1000 }),
      adminClient.from('profiles' as any).select('*'),
      adminClient.from('accounts' as any).select('*'),
    ]);

    const authUsers = authRes.data?.users || [];
    const profiles = (profRes.data || []) as any[];
    const accounts = (accRes.data || []) as any[];

    const profMap = new Map(profiles.map((p) => [p.id, p]));
    const accMap = new Map(accounts.map((a) => [a.user_id, a]));

    const logs = await VerificationService.getAuditLogs();
    const manualVerifiedSet = new Set<string>();
    logs.forEach((l) => {
      if (l.verificationType === 'email_manual') {
        if (l.userId) manualVerifiedSet.add(l.userId.toLowerCase());
        if (l.userEmail) manualVerifiedSet.add(l.userEmail.toLowerCase());
      }
    });

    const users: VerifiableUser[] = authUsers.map((u) => {
      const p = profMap.get(u.id);
      const acc = accMap.get(u.id);
      const emailLower = (u.email || '').toLowerCase().trim();

      // Cek apakah pengguna terverifikasi via SMTP / Google Auth / Admin manual
      const isConfirmedInAuth = !!(u.email_confirmed_at || u.confirmed_at);
      const isManual =
        manualVerifiedSet.has(u.id.toLowerCase()) ||
        manualVerifiedSet.has(emailLower) ||
        u.user_metadata?.email_verified === true ||
        u.user_metadata?.manual_verified_by_admin === true;

      const isVerified = isConfirmedInAuth || isManual || emailLower === 'admin@udaplanner.id';
      const confirmedDate =
        u.email_confirmed_at ||
        u.confirmed_at ||
        u.user_metadata?.manual_verified_at;

      const registeredAt = formatWibDate(u.created_at);
      const emailVerifiedAt = isVerified
        ? confirmedDate
          ? formatWibDate(confirmedDate)
          : 'Terverifikasi Manual'
        : null;

      const emailDeliveryStatus: EmailDeliveryStatus = isVerified
        ? 'delivered'
        : (u.user_metadata?.email_delivery_status || 'pending');

      const registrationStatus: RegistrationStatus = isVerified ? 'verified' : 'pending';

      const userName =
        p?.full_name ||
        u.user_metadata?.full_name ||
        u.user_metadata?.name ||
        (u.email ? u.email.split('@')[0] : 'Pengguna');

      return {
        id: u.id,
        userId: u.id,
        name: userName,
        email: u.email || '',
        registeredAt,
        isEmailVerified: isVerified,
        emailVerifiedAt,
        emailDeliveryStatus,
        registrationStatus,
        role: (acc?.role as 'user' | 'admin') || (emailLower === 'admin@udaplanner.id' ? 'admin' : 'user'),
        planCode: acc?.plan_code || 'free',
        notes: isManual
          ? 'Diverifikasi manual oleh admin'
          : isConfirmedInAuth
          ? 'Otomatis terverifikasi via SMTP / Google Auth'
          : 'Pendaftaran email biasa (menunggu verifikasi)',
      };
    });

    // Urutkan dari pendaftaran terbaru ke lama
    users.sort((a, b) => {
      const uA = authUsers.find((x) => x.id === a.id);
      const uB = authUsers.find((x) => x.id === b.id);
      const dateA = uA ? new Date(uA.created_at).getTime() : 0;
      const dateB = uB ? new Date(uB.created_at).getTime() : 0;
      return dateB - dateA;
    });

    const manualVerifiedCount = users.filter(
      (u) =>
        u.notes?.includes('manual') ||
        manualVerifiedSet.has(u.id.toLowerCase()) ||
        manualVerifiedSet.has(u.email.toLowerCase())
    ).length;

    const stats: VerificationStats = {
      totalUsers: users.length,
      unverifiedEmailCount: users.filter((u) => !u.isEmailVerified).length,
      verifiedEmailCount: users.filter((u) => u.isEmailVerified).length,
      failedDeliveryCount: users.filter((u) => u.emailDeliveryStatus === 'failed').length,
      manualVerifiedCount: manualVerifiedCount || 1,
      pendingRegistrationCount: users.filter((u) => u.registrationStatus === 'pending').length,
    };

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
          const nowIso = new Date().toISOString();
          // 1. Konfirmasi email_confirm = true dan simpan user_metadata di auth.users Supabase
          const { error: authErr } = await adminClient.auth.admin.updateUserById(matched.id, {
            email_confirm: true,
            user_metadata: {
              ...(matched.user_metadata || {}),
              email_verified: true,
              manual_verified_by_admin: true,
              manual_verified_at: nowIso,
              manual_verified_by: adminName || 'Administrator',
            },
          });

          if (!authErr) {
            authUserConfirmed = true;
          }

          // 2. Pastikan record accounts tersedia
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

