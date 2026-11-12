import { NextResponse } from 'next/server';
import { createAdminClient, createServerClient } from '@/lib/supabase/server';
import { resolvePaymentDuration } from '@/services/plan.service';
import { formatWibDate } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const adminClient = createAdminClient();
    const serverClient = createServerClient();
    const db = adminClient || serverClient;

    if (!db) {
      return NextResponse.json({
        success: false,
        error: 'Database client tidak tersedia',
      }, { status: 500 });
    }

    const [accRes, profRes, payRes, authRes] = await Promise.all([
      db.from('accounts' as any).select('*'),
      db.from('profiles' as any).select('*'),
      db.from('payments' as any).select('*').order('created_at', { ascending: false }),
      adminClient ? adminClient.auth.admin.listUsers({ perPage: 1000 }) : Promise.resolve({ data: { users: [] }, error: null }),
    ]);

    const accounts = (accRes.data || []) as any[];
    const profiles = (profRes.data || []) as any[];
    const payments = (payRes.data || []) as any[];
    const authUsers = (authRes.data?.users || []) as any[];

    const profMap = new Map(profiles.map((p) => [p.id, p]));
    const accMap = new Map(accounts.map((a) => [a.user_id, a]));
    const authMap = new Map(authUsers.map((u) => [u.id, u]));

    // Buat daftar user unik berbasis user_id / email dari database
    const userIds = new Set<string>();
    accounts.forEach((a) => { if (a.user_id) userIds.add(a.user_id); });
    profiles.forEach((p) => { if (p.id) userIds.add(p.id); });
    authUsers.forEach((u) => { if (u.id) userIds.add(u.id); });

    let freeUsersCount = 0;
    let proUsersCount = 0;
    let teamUsersCount = 0;
    let unverifiedEmailCount = 0;

    const seenEmails = new Set<string>();
    let totalUsersCount = 0;

    userIds.forEach((uId) => {
      const a = accMap.get(uId);
      const p = profMap.get(uId);
      const u = authMap.get(uId);

      const email = (p?.email || a?.email || u?.email || '').toLowerCase().trim();
      if (!email || seenEmails.has(email)) return;
      seenEmails.add(email);
      totalUsersCount++;

      const isSuspended = a?.is_suspended === true;
      const isAdmin =
        a?.role === 'admin' ||
        p?.role === 'admin' ||
        email === 'admin@udaplanner.id' ||
        email.startsWith('admin@');

      const planCode = (a?.plan_code || 'free').toLowerCase();

      if (!isSuspended) {
        if (planCode === 'pro') {
          proUsersCount++;
        } else if (planCode === 'team') {
          teamUsersCount++;
        } else {
          freeUsersCount++;
        }
      } else {
        freeUsersCount++;
      }

      // Verifikasi status email
      const isGoogle =
        u?.app_metadata?.provider === 'google' ||
        (Array.isArray(u?.app_metadata?.providers) && u.app_metadata.providers.includes('google')) ||
        (Array.isArray(u?.identities) && u.identities.some((i: any) => i.provider === 'google')) ||
        p?.auth_provider === 'google';

      const isConfirmed = !!(u?.email_confirmed_at || u?.confirmed_at || p?.is_email_verified === true);
      const isVerified = isGoogle || isConfirmed || isAdmin;

      if (!isVerified) {
        unverifiedEmailCount++;
      }
    });

    // Perhitungan pembayaran dari tabel payments database Supabase
    let pendingPaymentsCount = 0;
    let totalApprovedRevenue = 0;
    let approvedTransactionsCount = 0;

    const formattedPayments = payments.map((p) => {
      const prof: any = profMap.get(p.user_id) || {};
      const planCode = (p.plan_code || 'pro').toLowerCase();
      const resolved = resolvePaymentDuration(p.duration_days, p.duration_label, p.amount, planCode);
      const amount = Number(p.amount) || 0;

      if (p.status === 'pending') {
        pendingPaymentsCount++;
      } else if (p.status === 'approved') {
        totalApprovedRevenue += amount;
        approvedTransactionsCount++;
      }

      return {
        id: p.id,
        userId: p.user_id,
        user: p.sender_name || prof.full_name || 'Pelanggan',
        email: prof.email || (p.sender_name ? `${p.sender_name.toLowerCase().replace(/\s+/g, '')}@gmail.com` : 'pelanggan@udaplanner.id'),
        plan: planCode,
        durationDays: resolved.days,
        durationLabel: resolved.label,
        amount,
        bank: `${p.sender_bank || 'Transfer'} — A/N ${p.sender_name || prof.full_name || 'Pelanggan'}`,
        proof: p.proof_path || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
        status: p.status || 'pending',
        date: formatWibDate(p.created_at),
        created_at: p.created_at,
        reason: p.admin_note,
      };
    });

    const pendingList = formattedPayments.filter((p) => p.status === 'pending');

    return NextResponse.json({
      success: true,
      data: {
        totalUsersCount,
        freeUsersCount,
        proUsersCount,
        teamUsersCount,
        pendingPaymentsCount,
        unverifiedEmailCount,
        totalApprovedRevenue,
        approvedTransactionsCount,
        pendingPayments: pendingList,
        allPayments: formattedPayments,
      },
    });
  } catch (error: any) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'Gagal memuat statistik admin',
    }, { status: 500 });
  }
}

