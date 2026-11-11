import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, email } = body;

    if (!userId && !email) {
      return NextResponse.json({ success: false, error: 'User ID atau Email wajib disertakan.' }, { status: 400 });
    }

    const admin = createAdminClient();
    let targetUserId = userId;
    const cleanEmail = (email || '').trim().toLowerCase();

    if (admin) {
      // 1. Dapatkan userId target jika hanya email yang dikirim
      if (!targetUserId && cleanEmail) {
        const { data: prof } = await (admin.from('profiles' as any) as any)
          .select('id')
          .ilike('email', cleanEmail)
          .maybeSingle();
        if (prof?.id) targetUserId = prof.id;
      }

      // 2. Update tabel accounts: ubah plan_code menjadi 'free' dan plan_until menjadi null
      if (targetUserId) {
        await (admin.from('accounts' as any) as any)
          .update({
            plan_code: 'free',
            plan_until: null,
            role: 'user',
            updated_at: new Date().toISOString(),
          })
          .or(`user_id.eq.${targetUserId},id.eq.${targetUserId}`);

        // 3. Update Supabase Auth user_metadata
        try {
          await admin.auth.admin.updateUserById(targetUserId, {
            user_metadata: {
              plan_code: 'free',
              plan_until: null,
            },
          });
        } catch (metaErr) {
          console.warn('Update user metadata cancel warning:', metaErr);
        }

        // 4. Update tabel payments: tandai pembayaran approved/pending menjadi 'cancelled'
        // agar query database tidak mendeteksi pembayaran berbayar aktif lagi
        await (admin.from('payments' as any) as any)
          .update({
            status: 'cancelled',
            admin_note: 'Langganan dihentikan oleh pengguna (Downgrade ke Paket Gratis)',
            reviewed_at: new Date().toISOString(),
          })
          .eq('user_id', targetUserId)
          .in('status', ['approved', 'pending']);

        // 5. Jika pengguna terdaftar sebagai anggota tim non-owner di brand lain, hapus keanggotaannya
        try {
          await (admin.from('brand_members' as any) as any)
            .delete()
            .eq('user_id', targetUserId)
            .neq('role', 'owner');
        } catch {}
      }

      if (cleanEmail) {
        await (admin.from('payments' as any) as any)
          .update({
            status: 'cancelled',
            admin_note: 'Langganan dihentikan oleh pengguna (Downgrade ke Paket Gratis)',
            reviewed_at: new Date().toISOString(),
          })
          .ilike('user', cleanEmail)
          .in('status', ['approved', 'pending']);
      }
    }

    // 6. Bersihkan juga file backup server payments (.server_payments.json)
    try {
      const backupPath = path.join(process.cwd(), '.server_payments.json');
      if (fs.existsSync(backupPath)) {
        const raw = fs.readFileSync(backupPath, 'utf-8');
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          const updated = list.map((p: any) => {
            const matchUser =
              (targetUserId && (p.user_id === targetUserId || p.userId === targetUserId)) ||
              (cleanEmail && (p.email?.toLowerCase() === cleanEmail || p.user?.toLowerCase() === cleanEmail));
            if (matchUser && (p.status === 'approved' || p.status === 'pending')) {
              return { ...p, status: 'cancelled', reason: 'Langganan dihentikan oleh pengguna' };
            }
            return p;
          });
          fs.writeFileSync(backupPath, JSON.stringify(updated, null, 2), 'utf-8');
        }
      }
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Langganan berhasil dihentikan. Status akun Anda kini telah menjadi Gratis (Free).',
      plan: 'free',
      planUntil: null,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

