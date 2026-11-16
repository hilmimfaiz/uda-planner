import { NextResponse } from 'next/server';
import { PlanService } from '@/services/plan.service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const plans = await PlanService.getActivePlans();
    return NextResponse.json(
      { success: true, data: plans },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
