import { createClient } from '@/lib/supabase/client';
import { initialPayments } from '@/lib/supabase/mock-data';
import { Payment, PaymentStatus } from '@/types/database.types';

let mockPayments: Payment[] = [...initialPayments];

export class PaymentService {
  static async getPayments(accountId?: string): Promise<Payment[]> {
    const supabase = createClient();
    if (supabase) {
      let query = supabase.from('payments').select('*').order('created_at', { ascending: false });
      if (accountId) query = query.eq('account_id', accountId);
      const { data, error } = await query;
      if (!error && data) return data as Payment[];
    }
    if (accountId) return mockPayments.filter((p) => p.account_id === accountId);
    return [...mockPayments];
  }

  static async submitPayment(payload: {
    accountId: string;
    planId: string;
    amount: number;
    paymentMethod?: string;
    proofUrl?: string;
    notes?: string;
  }): Promise<Payment> {
    const newPayment: Payment = {
      id: `pay-${Date.now()}`,
      account_id: payload.accountId,
      plan_id: payload.planId,
      amount: payload.amount,
      payment_method: payload.paymentMethod || 'Transfer Bank',
      payment_proof_url: payload.proofUrl || null,
      status: 'pending',
      notes: payload.notes || null,
      reviewed_by: null,
      reviewed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const supabase = createClient();
    if (supabase) {
      const { data, error } = await supabase.from('payments').insert(newPayment as any).select().single();
      if (!error && data) return data as Payment;
    }

    mockPayments.unshift(newPayment);
    return newPayment;
  }

  static async verifyPayment(
    paymentId: string,
    status: PaymentStatus,
    adminId: string,
    notes?: string
  ): Promise<Payment | null> {
    const now = new Date().toISOString();
    const supabase = createClient();
    if (supabase) {
      const { data, error } = await (supabase.from('payments' as any) as any)
        .update({
          status,
          reviewed_by: adminId,
          reviewed_at: now,
          notes: notes || undefined,
          updated_at: now,
        })
        .eq('id', paymentId)
        .select()
        .single();
      if (!error && data) return data as Payment;
    }

    const p = mockPayments.find((item) => item.id === paymentId);
    if (p) {
      p.status = status;
      p.reviewed_by = adminId;
      p.reviewed_at = now;
      if (notes) p.notes = notes;
      p.updated_at = now;
      return p;
    }
    return null;
  }
}
