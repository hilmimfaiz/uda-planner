import { NextResponse } from 'next/server';
import { PlanService } from '@/services/plan.service';

export async function GET() {
  try {
    const plans = await PlanService.getActivePlans();
    return NextResponse.json({ success: true, data: plans });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
