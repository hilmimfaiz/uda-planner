import { NextResponse } from 'next/server';
import { BankService } from '@/services/bank.service';

export async function GET() {
  try {
    const bankAccounts = await BankService.getActiveBankAccounts();
    return NextResponse.json({ success: true, data: bankAccounts });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
