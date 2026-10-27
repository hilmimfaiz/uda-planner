import { createClient } from '@/lib/supabase/client';
import { resolvePaymentDuration } from './plan.service';

export interface SubmitPaymentPayload {
  userId?: string;
  accountId?: string;
  userEmail?: string;
  userName?: string;
  planCode?: string;
  planId?: string;
  planDurationId?: string;
  durationLabel?: string;
  amount: number;
  durationDays?: number;
  senderName?: string;
  senderBank?: string;
  targetBankName?: string;
  targetAccountNumber?: string;
  targetAccountName?: string;
  paymentMethod?: string;
  proofPath?: string;
  proofUrl?: string;
  notes?: string;
}

export class PaymentService {
  static async getPayments(accountId?: string, email?: string): Promise<any[]> {
    let dbPayments: any[] = [];
    const supabase = createClient();
    if (supabase) {
      try {
        let query = supabase.from('payments' as any).select('*').order('created_at', { ascending: false });
        if (accountId && accountId.includes('-') && accountId.length > 20) {
          query = query.eq('user_id', accountId);
        }
        const { data, error } = await query;
        if (!error && data) {
          dbPayments = data.map((p: any) => {
            const res = resolvePaymentDuration(p.duration_days, p.duration_label, p.amount, p.plan_code);
            return {
              ...p,
              duration_days: res.days,
              duration_label: res.label,
            };
          });
        }
      } catch (err) {
        console.warn('PaymentService.getPayments db error:', err);
      }
    }

    // Sinkronkan juga dari server API /api/payments
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams();
        if (accountId) params.set('accountId', accountId);
        if (email) params.set('email', email);
        const res = await fetch(`/api/payments?${params.toString()}`);
        if (res.ok) {
          const resData = await res.json();
          if (resData.success && Array.isArray(resData.data)) {
            const serverItems = resData.data.map((it: any) => ({
              id: it.id,
              user_id: it.userId || accountId,
              plan_code: it.plan || 'pro',
              amount: it.amount,
              duration_days: it.durationDays,
              duration_label: it.durationLabel,
              sender_name: it.user,
              sender_bank: it.bank?.split(' — ')[0] || 'Transfer Bank',
              proof_path: it.proof,
              status: it.status || 'pending',
              admin_note: it.reason,
              created_at: it.created_at || new Date().toISOString(),
            }));
            const dbIds = new Set(dbPayments.map((p) => p.id));
            dbPayments = [...dbPayments, ...serverItems.filter((s: any) => !dbIds.has(s.id))];
          }
        }
      } catch (e) {}
    }

    // Sinkronkan juga data pengajuan pembayaran dari localStorage (agar instan muncul tanpa jeda)
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('uda_admin_payments');
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            const userLocal = list.filter((it: any) => {
              if (accountId && (it.userId === accountId || it.id === accountId)) return true;
              if (email && it.email && it.email.toLowerCase() === email.toLowerCase()) return true;
              return !accountId && !email;
            });

            const dbIds = new Set(dbPayments.map((p) => p.id));
            const formattedLocal = userLocal
              .filter((it: any) => !dbIds.has(it.id))
              .map((it: any) => {
                const res = resolvePaymentDuration(it.durationDays, it.durationLabel, it.amount, it.plan);
                return {
                  id: it.id,
                  user_id: it.userId || accountId,
                  plan_code: it.plan || 'pro',
                  amount: it.amount,
                  duration_days: res.days,
                  duration_label: res.label,
                  sender_name: it.user,
                  sender_bank: it.bank?.split(' — ')[0] || 'Transfer Bank',
                  proof_path: it.proof,
                  status: it.status || 'pending',
                  admin_note: it.reason,
                  created_at: new Date().toISOString(),
                };
              });

            return [...dbPayments, ...formattedLocal];
          }
        }
      } catch (e) {}
    }

    return dbPayments;
  }

  static async submitPayment(payload: SubmitPaymentPayload): Promise<any> {
    const supabase = createClient();
    const planCode = payload.planCode || payload.planId || 'pro';
    const senderName = payload.senderName || payload.userName || 'Pelanggan';
    const senderBank = payload.senderBank || payload.paymentMethod || 'Transfer Bank';
    const proofPath = payload.proofPath || payload.proofUrl || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600';
    const durationDays = payload.durationDays || 30;
    const durationLabel = payload.durationLabel || `${durationDays} Hari`;
    const targetUser = payload.userId || payload.accountId;

    // Payload murni sesuai skema tabel public.payments di database Supabase
    const dbPayload: any = {
      plan_code: planCode,
      amount: payload.amount,
      duration_days: durationDays,
      sender_name: senderName,
      sender_bank: senderBank,
      proof_path: proofPath,
      status: 'pending',
    };

    if (targetUser && targetUser.includes('-') && targetUser.length > 20) {
      dbPayload.user_id = targetUser;
    }

    let createdRecord: any = null;

    if (supabase && dbPayload.user_id) {
      try {
        const { data, error } = await (supabase.from('payments' as any) as any)
          .insert(dbPayload)
          .select()
          .single();
        if (!error && data) {
          createdRecord = data;
        } else if (error) {
          console.warn('PaymentService.submitPayment supabase insert error:', error.message);
        }
      } catch (err) {
        console.warn('PaymentService.submitPayment exception:', err);
      }
    }

    // Panggil juga API route server untuk persistensi ganda & bypass RLS
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch('/api/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: targetUser,
            userEmail: payload.userEmail,
            userName: senderName,
            planCode,
            durationDays,
            durationLabel,
            amount: payload.amount,
            senderName,
            senderBank,
            proofPath,
            targetBankName: payload.targetBankName,
            targetAccountNumber: payload.targetAccountNumber,
            targetAccountName: payload.targetAccountName,
          }),
        });
        if (res.ok) {
          const resData = await res.json();
          if (resData.success && resData.data) {
            createdRecord = { ...createdRecord, ...resData.data };
          }
        }
      } catch (apiErr) {
        console.warn('API /api/payments error:', apiErr);
      }
    }

    const finalRecord = createdRecord || {
      id: `pay-${Date.now()}`,
      ...dbPayload,
      duration_label: durationLabel,
      target_bank_name: payload.targetBankName,
      target_account_number: payload.targetAccountNumber,
      target_account_name: payload.targetAccountName,
    };

    // Sinkronkan ke uda_admin_payments agar panel admin langsung mendeteksi pengajuan pembayaran baru secara real-time
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('uda_admin_payments');
        const list = raw ? JSON.parse(raw) : [];
        const adminItem = {
          id: finalRecord.id,
          userId: targetUser,
          user: senderName,
          email: payload.userEmail || (senderName ? `${senderName.toLowerCase().replace(/\s+/g, '')}@gmail.com` : 'pelanggan@udaplanner.id'),
          plan: planCode,
          durationDays,
          durationLabel,
          amount: payload.amount,
          bank: `${senderBank} — A/N ${senderName}`,
          proof: proofPath,
          status: 'pending',
          date: new Date().toLocaleString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
        };

        const updatedList = [adminItem, ...list.filter((it: any) => it.id !== finalRecord.id)];
        localStorage.setItem('uda_admin_payments', JSON.stringify(updatedList));

        // Trigger event agar tab admin atau komponen lain langsung memperbarui antrean
        window.dispatchEvent(new CustomEvent('uda_payment_submitted', { detail: adminItem }));
      } catch (e) {}
    }

    return finalRecord;
  }

  static async verifyPayment(
    paymentId: string,
    status: string,
    adminId?: string,
    notes?: string,
    extra?: { userId?: string; planCode?: string; durationDays?: number }
  ): Promise<any> {
    const supabase = createClient();
    if (supabase) {
      try {
        const { data, error } = await (supabase.from('payments' as any) as any)
          .update({
            status,
            admin_note: notes || undefined,
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', paymentId)
          .select()
          .single();

        // Jika disetujui, update akun pengguna di database
        if (status === 'approved' && extra?.userId) {
          let planUntil = (extra as any)?.customPlanUntil;
          if (!planUntil) {
            let baseTime = Date.now();
            try {
              const { data: curAcc } = await (supabase.from('accounts' as any) as any)
                .select('plan_code, plan_until')
                .or(`user_id.eq.${extra.userId},id.eq.${extra.userId}`)
                .maybeSingle();

              if (curAcc && curAcc.plan_until) {
                const curExp = new Date(curAcc.plan_until).getTime();
                if (!isNaN(curExp) && curExp > Date.now() && curAcc.plan_code === (extra.planCode || 'pro')) {
                  baseTime = curExp;
                }
              }
            } catch (accErr) {}
            planUntil = new Date(baseTime + (extra.durationDays || 30) * 86400000).toISOString();
          }

          await (supabase.from('accounts' as any) as any)
            .update({
              plan_code: extra.planCode || 'pro',
              plan_until: planUntil,
            })
            .or(`user_id.eq.${extra.userId},id.eq.${extra.userId}`);
        }

        if (!error && data) return data;
      } catch (err) {
        console.warn('PaymentService.verifyPayment exception:', err);
      }
    }
    return { id: paymentId, status, notes };
  }
}
