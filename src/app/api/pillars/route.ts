import { NextRequest, NextResponse } from 'next/server';
import { ContentPillarService } from '@/services/content-pillar.service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const brandId = searchParams.get('brandId');
    if (!brandId) {
      return NextResponse.json({ success: false, error: 'brandId query param is required' }, { status: 400 });
    }
    const pillars = await ContentPillarService.getPillars(brandId);
    return NextResponse.json({ success: true, data: pillars });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const pillar = await ContentPillarService.createPillar({
      brandId: body.brandId,
      name: body.name,
      color: body.color,
      description: body.description,
    });
    return NextResponse.json({ success: true, data: pillar }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
