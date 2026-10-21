import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/services/payment.service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('accountId') || undefined;
    const payments = await PaymentService.getPayments(accountId);
    return NextResponse.json({ success: true, data: payments });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const payment = await PaymentService.submitPayment({
      userId: body.userId,
      accountId: body.accountId || 'acc-001',
      planId: body.planId,
      planCode: body.planCode,
      planDurationId: body.planDurationId,
      durationLabel: body.durationLabel,
      durationDays: body.durationDays,
      amount: body.amount,
      senderName: body.senderName,
      senderBank: body.senderBank,
      targetBankName: body.targetBankName,
      targetAccountNumber: body.targetAccountNumber,
      targetAccountName: body.targetAccountName,
      paymentMethod: body.paymentMethod,
      proofUrl: body.proofUrl,
      proofPath: body.proofPath,
      notes: body.notes,
    });
    return NextResponse.json({ success: true, data: payment }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { paymentId, status, adminId, notes } = body;
    const updated = await PaymentService.verifyPayment(paymentId, status, adminId || 'user-001', notes);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
