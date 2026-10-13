import { NextRequest, NextResponse } from 'next/server';
import { BrandService } from '@/services/brand.service';
import { QuotaService } from '@/services/quota.service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('accountId') || undefined;
    const brands = await BrandService.getBrands(accountId);
    return NextResponse.json({ success: true, data: brands });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const accountId = body.accountId || 'acc-001';

    // Validate quota
    const quotaCheck = await QuotaService.canCreateBrand(accountId);
    if (!quotaCheck.allowed) {
      return NextResponse.json({ success: false, error: quotaCheck.message }, { status: 403 });
    }

    const brand = await BrandService.createBrand({
      accountId,
      name: body.name,
      slug: body.slug,
      description: body.description,
      color: body.color,
      industry: body.industry,
      userId: body.userId || 'user-001',
    });

    return NextResponse.json({ success: true, data: brand }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
