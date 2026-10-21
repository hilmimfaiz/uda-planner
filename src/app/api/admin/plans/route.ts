import { NextRequest, NextResponse } from 'next/server';
import { PlanService } from '@/services/plan.service';

export async function GET() {
  try {
    const plans = await PlanService.getAllPlans();
    return NextResponse.json({ success: true, data: plans });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'add_duration') {
      const { planCode, variant } = body;
      if (!planCode || !variant) {
        return NextResponse.json({ success: false, error: 'planCode dan data variasi durasi wajib diisi.' }, { status: 400 });
      }
      const created = await PlanService.addDurationVariant(planCode, variant);
      return NextResponse.json({ success: true, data: created }, { status: 201 });
    }

    // Default: create new plan
    const { plan } = body;
    if (!plan || !plan.code || !plan.name) {
      return NextResponse.json({ success: false, error: 'Data paket tidak lengkap.' }, { status: 400 });
    }
    const createdPlan = await PlanService.createPlan(plan);
    return NextResponse.json({ success: true, data: createdPlan }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'update_duration') {
      const { planCode, durationId, updates } = body;
      if (!planCode || !durationId || !updates) {
        return NextResponse.json({ success: false, error: 'Parameter update variasi durasi tidak lengkap.' }, { status: 400 });
      }
      await PlanService.updateDurationVariant(planCode, durationId, updates);
      return NextResponse.json({ success: true });
    }

    // Default: update plan
    const { code, updates } = body;
    if (!code || !updates) {
      return NextResponse.json({ success: false, error: 'Kode paket dan data pembaruan wajib diisi.' }, { status: 400 });
    }
    await PlanService.updatePlan(code, updates);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const planCode = searchParams.get('planCode');
    const durationId = searchParams.get('durationId');

    if (!planCode || !durationId) {
      return NextResponse.json({ success: false, error: 'planCode dan durationId wajib disertakan.' }, { status: 400 });
    }

    await PlanService.deleteDurationVariant(planCode, durationId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
