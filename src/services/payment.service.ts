import { createClient } from '@/lib/supabase/client';
import { resolvePaymentDuration } from './plan.service';
import { formatWibDate } from '@/lib/date-utils';

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

function isDummyPaymentItem(it: any): boolean {
  if (!it) return true;
  if (['pay-1', 'pay-2', 'pay-3'].includes(it.id)) return true;
  if (['Budi Santoso', 'PT Muda Kreatif Indonesia', 'Sarah Rahmawati'].includes(it.user || it.sender_name)) return true;
  return false;
}

export class PaymentService {
  static getCachedPayments(accountId?: string, email?: string): any[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('uda_admin_payments');
      if (!raw) return [];
      const list = JSON.parse(raw);
      if (!Array.isArray(list)) return [];
      return list
        .filter((it: any) => {
          if (isDummyPaymentItem(it)) return false;
          if (accountId && (it.userId === accountId || it.id === accountId)) return true;
          if (email && it.email && it.email.toLowerCase() === email.toLowerCase()) return true;
          return !accountId && !email;
        })
        .map((it: any) => {
          const planCode = (it.plan || it.plan_code || 'pro').toLowerCase();
          const res = resolvePaymentDuration(it.durationDays || it.duration_days, it.durationLabel || it.duration_label, it.amount, planCode);
          return {
            id: it.id,
            user_id: it.userId || accountId,
            plan_code: planCode,
            plan: planCode,
            amount: it.amount,
            duration_days: res.days,
            duration_label: res.label,
            sender_name: it.user || it.sender_name,
            sender_bank: it.bank?.split(' — ')[0] || it.sender_bank || 'Transfer Bank',
            proof_path: it.proof || it.proof_path,
            status: it.status || 'pending',
            admin_note: it.reason || it.admin_note,
            created_at: it.created_at || new Date().toISOString(),
          };
        });
    } catch {
      return [];
    }
  }

  static async getPayments(accountId?: string, email?: string): Promise<any[]> {
    const supabase = createClient();
    let dbPayments: any[] = [];

    // 1. Prioritaskan query langsung ke database Supabase (cepat ~50ms, tanpa serverless cold-start)
    if (supabase) {
      try {
        let query = supabase.from('payments' as any).select('*').order('created_at', { ascending: false });
        if (accountId && accountId.includes('-') && accountId.length > 20) {
          query = query.eq('user_id', accountId);
        }
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          dbPayments = data
            .filter((p: any) => !isDummyPaymentItem(p))
            .map((p: any) => {
              const planCode = (p.plan_code || 'pro').toLowerCase();
              const res = resolvePaymentDuration(p.duration_days, p.duration_label, p.amount, planCode);
              return {
                ...p,
                plan_code: planCode,
                plan: planCode,
                duration_days: res.days,
                duration_label: res.label,
              };
            });
        }
      } catch (err) {
        console.warn('PaymentService.getPayments db error:', err);
      }
    }

    // 2. Hanya panggil API server jika query database langsung tidak mengembalikan data (misal saat offline / fallback)
    let serverItems: any[] = [];
    if (dbPayments.length === 0 && typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams();
        if (accountId) params.set('accountId', accountId);
        if (email) params.set('email', email);
        const res = await fetch(`/api/payments?${params.toString()}`);
        if (res.ok) {
          const resData = await res.json();
          if (resData.success && Array.isArray(resData.data)) {
            serverItems = resData.data
              .filter((it: any) => !isDummyPaymentItem(it))
              .map((it: any) => {
                const planCode = (it.plan || it.plan_code || 'pro').toLowerCase();
                const res = resolvePaymentDuration(it.durationDays, it.durationLabel, it.amount, planCode);
                return {
                  id: it.id,
                  user_id: it.userId || accountId,
                  plan_code: planCode,
                  plan: planCode,
                  amount: it.amount,
                  duration_days: res.days,
                  duration_label: res.label,
                  sender_name: it.user,
                  sender_bank: it.bank?.split(' — ')[0] || 'Transfer Bank',
                  proof_path: it.proof,
                  status: it.status || 'pending',
                  admin_note: it.reason,
                  created_at: it.created_at || new Date().toISOString(),
                };
              });
          }
        }
      } catch {}
    }

    const mergedMap = new Map<string, any>();
    dbPayments.forEach((p: any) => mergedMap.set(p.id, p));
    serverItems.forEach((s: any) => {
      const existing = mergedMap.get(s.id);
      if (!existing) {
        mergedMap.set(s.id, s);
      } else if (existing.status === 'pending' && s.status !== 'pending') {
        mergedMap.set(s.id, { ...existing, status: s.status, admin_note: s.admin_note || existing.admin_note });
      }
    });

    // Gabungkan juga dari localStorage agar pembayaran baru langsung muncul tanpa jeda
    const localItems = this.getCachedPayments(accountId, email);
    localItems.forEach((loc: any) => {
      const existing = mergedMap.get(loc.id);
      if (!existing) {
        mergedMap.set(loc.id, loc);
      } else if (existing.status === 'pending' && loc.status !== 'pending') {
        mergedMap.set(loc.id, { ...existing, status: loc.status, admin_note: loc.admin_note || existing.admin_note });
      }
    });

    // Cek apakah ada event persetujuan spesifik dari Admin pada uda_last_upgraded_user
    if (typeof window !== 'undefined') {
      try {
        const rawUpgrade = localStorage.getItem('uda_last_upgraded_user');
        if (rawUpgrade) {
          const upg = JSON.parse(rawUpgrade);
          if (upg && upg.paymentId && mergedMap.has(upg.paymentId)) {
            const target = mergedMap.get(upg.paymentId);
            mergedMap.set(upg.paymentId, {
              ...target,
              status: 'approved',
              plan_code: (upg.planCode || target.plan_code || 'pro').toLowerCase(),
              plan: (upg.planCode || target.plan || 'pro').toLowerCase(),
            });
          }
        }
      } catch {}
    }

    return Array.from(mergedMap.values());
  }

  static async submitPayment(payload: SubmitPaymentPayload): Promise<any> {
    const supabase = createClient();
    const planCode = (payload.planCode || payload.planId || 'pro').toLowerCase();
    const senderName = payload.senderName || payload.userName || 'Pelanggan';
    const senderBank = payload.senderBank || payload.paymentMethod || 'Transfer Bank';
    const proofPath = payload.proofPath || payload.proofUrl || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600';
    const durationDays = payload.durationDays || 30;
    const durationLabel = payload.durationLabel || `${durationDays} Hari`;
    const targetUser = payload.userId || payload.accountId;

    // Payload sesuai skema tabel public.payments di database Supabase
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
        // Cek apakah sudah ada baris berstatus pending di DB untuk user_id ini (menghindari error unique index idx_payments_user_pending)
        const { data: existingPending } = await (supabase.from('payments' as any) as any)
          .select('id')
          .eq('user_id', dbPayload.user_id)
          .eq('status', 'pending')
          .maybeSingle();

        if (existingPending && existingPending.id) {
          const { data: updatedData, error: updateErr } = await (supabase.from('payments' as any) as any)
            .update({
              ...dbPayload,
              created_at: new Date().toISOString(),
            })
            .eq('id', existingPending.id)
            .select()
            .single();
          if (!updateErr && updatedData) {
            createdRecord = updatedData;
          }
        } else {
          const { data, error } = await (supabase.from('payments' as any) as any)
            .insert(dbPayload)
            .select()
            .single();
          if (!error && data) {
            createdRecord = data;
          } else if (error) {
            console.warn('PaymentService.submitPayment supabase insert error:', error.message);
          }
        }
      } catch (err) {
        console.warn('PaymentService.submitPayment exception:', err);
      }
    }

    const generatedId =
      createdRecord?.id ||
      (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `pay-${Date.now()}`);

    // Panggil API route server untuk persistensi lintas sesi
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch('/api/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: generatedId,
            alreadyInsertedInDb: !!createdRecord,
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
            createdRecord = { ...createdRecord, ...resData.data, plan_code: planCode, plan: planCode };
          }
        }
      } catch (apiErr) {
        console.warn('API /api/payments error:', apiErr);
      }
    }

    const nowIso = new Date().toISOString();
    const finalRecord = {
      id: createdRecord?.id || generatedId,
      user_id: targetUser,
      ...dbPayload,
      plan_code: planCode,
      plan: planCode,
      duration_label: durationLabel,
      target_bank_name: payload.targetBankName,
      target_account_number: payload.targetAccountNumber,
      target_account_name: payload.targetAccountName,
      created_at: createdRecord?.created_at || nowIso,
    };

    // Sinkronkan ke uda_admin_payments agar panel admin langsung mendeteksi pengajuan pembayaran baru secara instan tanpa jeda
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('uda_admin_payments');
        const list = raw ? JSON.parse(raw) : [];
        const cleanEmail = payload.userEmail || (senderName ? `${senderName.toLowerCase().replace(/\s+/g, '')}@gmail.com` : 'pelanggan@udaplanner.id');
        const adminItem = {
          id: finalRecord.id,
          userId: targetUser,
          user: senderName,
          email: cleanEmail,
          plan: planCode,
          plan_code: planCode,
          durationDays,
          durationLabel,
          amount: payload.amount,
          bank: `${senderBank} — A/N ${senderName}`,
          proof: proofPath,
          status: 'pending',
          date: formatWibDate(new Date()),
          created_at: finalRecord.created_at,
        };

        // Hapus item pending lama dari user yang sama atau ID yang sama agar tidak duplikat
        const filteredList = (Array.isArray(list) ? list : []).filter(
          (it: any) =>
            !isDummyPaymentItem(it) &&
            it.id !== finalRecord.id &&
            !(
              it.status === 'pending' &&
              ((targetUser && it.userId === targetUser) || (cleanEmail && it.email?.toLowerCase() === cleanEmail.toLowerCase()))
            )
        );
        const updatedList = [adminItem, ...filteredList];
        localStorage.setItem('uda_admin_payments', JSON.stringify(updatedList));

        window.dispatchEvent(new CustomEvent('uda_payment_submitted', { detail: adminItem }));
        window.dispatchEvent(new Event('storage'));
      } catch {}
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
    const targetPlan = (extra?.planCode || 'pro').toLowerCase();
    if (supabase) {
      try {
        const { data, error } = await (supabase.from('payments' as any) as any)
          .update({
            status,
            plan_code: targetPlan,
            admin_note: notes || undefined,
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', paymentId)
          .select()
          .single();

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
                if (!isNaN(curExp) && curExp > Date.now() && curAcc.plan_code === targetPlan) {
                  baseTime = curExp;
                }
              }
            } catch {}
            planUntil = new Date(baseTime + (extra.durationDays || 30) * 86400000).toISOString();
          }

          await (supabase.from('accounts' as any) as any)
            .update({
              plan_code: targetPlan,
              plan_until: planUntil,
            })
            .or(`user_id.eq.${extra.userId},id.eq.${extra.userId}`);
        }

        if (!error && data) return data;
      } catch (err) {
        console.warn('PaymentService.verifyPayment exception:', err);
      }
    }
    return { id: paymentId, status, notes, plan_code: targetPlan };
  }
}
