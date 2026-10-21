import { createClient } from '@/lib/supabase/client';

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
  static async getPayments(accountId?: string): Promise<any[]> {
    const supabase = createClient();
    if (supabase) {
      try {
        let query = supabase.from('payments' as any).select('*').order('created_at', { ascending: false });
        if (accountId) query = query.eq('user_id', accountId);
        const { data, error } = await query;
        if (!error && data) return data;
      } catch (err) {
        console.warn('PaymentService.getPayments db error:', err);
      }
    }
    return [];
  }

  static async submitPayment(payload: SubmitPaymentPayload): Promise<any> {
    const supabase = createClient();
    const planCode = payload.planCode || payload.planId || 'pro';
    const senderName = payload.senderName || payload.userName || 'Pelanggan';
    const senderBank = payload.senderBank || payload.paymentMethod || 'Transfer Bank';
    const proofPath = payload.proofPath || payload.proofUrl || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600';

    const insertPayload: any = {
      plan_code: planCode,
      amount: payload.amount,
      duration_days: payload.durationDays || 30,
      duration_label: payload.durationLabel || (payload.durationDays ? `${payload.durationDays} Hari` : '1 Bulan'),
      plan_duration_id: payload.planDurationId || null,
      target_bank_name: payload.targetBankName || null,
      target_account_number: payload.targetAccountNumber || null,
      target_account_name: payload.targetAccountName || null,
      sender_name: senderName,
      sender_bank: senderBank,
      proof_path: proofPath,
      status: 'pending',
    };

    const targetUser = payload.userId || payload.accountId;
    if (targetUser && targetUser.includes('-') && targetUser.length > 20) {
      insertPayload.user_id = targetUser;
    }

    let createdRecord: any = null;

    if (supabase) {
      try {
        const { data, error } = await (supabase.from('payments' as any) as any).insert(insertPayload).select().single();
        if (!error && data) {
          createdRecord = data;
        }
      } catch (err) {
        console.warn('PaymentService.submitPayment exception:', err);
      }
    }

    const finalRecord = createdRecord || { id: `pay-${Date.now()}`, ...insertPayload };

    // Sinkronkan ke uda_admin_payments agar panel admin langsung mendeteksi pengajuan pembayaran baru
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
          amount: payload.amount,
          bank: `${senderBank} — A/N ${senderName}`,
          proof: proofPath,
          status: 'pending',
          date: new Date().toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        };
        const updatedList = [adminItem, ...list.filter((it: any) => it.id !== finalRecord.id)];
        localStorage.setItem('uda_admin_payments', JSON.stringify(updatedList));
      } catch (e) {}
    }

    return finalRecord;
  }

  static async verifyPayment(paymentId: string, status: string, adminId?: string, notes?: string): Promise<any> {
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
        if (!error && data) return data;
      } catch (err) {
        console.warn('PaymentService.verifyPayment exception:', err);
      }
    }
    return { id: paymentId, status, notes };
  }
}
