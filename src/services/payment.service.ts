import { createClient } from '@/lib/supabase/client';

export interface SubmitPaymentPayload {
  userId?: string;
  accountId?: string;
  planCode?: string;
  planId?: string;
  amount: number;
  durationDays?: number;
  senderName?: string;
  senderBank?: string;
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
    const senderName = payload.senderName || 'Pelanggan';
    const senderBank = payload.senderBank || payload.paymentMethod || 'Transfer BCA';
    const proofPath = payload.proofPath || payload.proofUrl || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600';

    const insertPayload: any = {
      plan_code: planCode,
      amount: payload.amount,
      duration_days: payload.durationDays || 30,
      sender_name: senderName,
      sender_bank: senderBank,
      proof_path: proofPath,
      status: 'pending',
    };

    const targetUser = payload.userId || payload.accountId;
    if (targetUser && targetUser.includes('-') && targetUser.length > 20) {
      insertPayload.user_id = targetUser;
    }

    if (supabase) {
      try {
        const { data, error } = await (supabase.from('payments' as any) as any).insert(insertPayload).select().single();
        if (!error && data) return data;
      } catch (err) {
        console.warn('PaymentService.submitPayment exception:', err);
      }
    }
    return { id: `pay-${Date.now()}`, ...insertPayload };
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
