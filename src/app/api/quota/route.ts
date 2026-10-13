import { NextRequest, NextResponse } from 'next/server';
import { QuotaService } from '@/services/quota.service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('accountId') || 'acc-001';
    const usage = await QuotaService.getAccountUsage(accountId);
    const plans = await QuotaService.getPlans();
    return NextResponse.json({ success: true, data: { usage, plans } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
