import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { DUMMY_PLANS } from '@/lib/dummy-data';
import { DynamicPlan, PlanDurationItem } from '@/services/plan.service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const admin = createAdminClient();
    if (admin) {
      const [plansRes, durRes] = await Promise.all([
        admin.from('plans' as any).select('*').order('sort_order', { ascending: true }),
        admin.from('plan_durations' as any).select('*').order('sort_order', { ascending: true }),
      ]);

      if (!plansRes.error && plansRes.data && plansRes.data.length > 0) {
        const durationsMap = new Map<string, PlanDurationItem[]>();

        if (!durRes.error && durRes.data) {
          durRes.data.forEach((d: any) => {
            if (
              d.name?.toLowerCase().trim() === 'paket uji 1 bulan' ||
              d.name?.toLowerCase().trim().includes('paket uji')
            ) {
              return;
            }
            const list = durationsMap.get(d.plan_code) || [];
            list.push({
              id: d.id,
              planCode: d.plan_code,
              name: d.name,
              durationDays: d.duration_days,
              price: d.price,
              discountPercent: d.discount_percent || 0,
              isActive: d.is_active ?? true,
              sortOrder: d.sort_order || 0,
            });
            durationsMap.set(d.plan_code, list);
          });
        }

        const dbPlans: DynamicPlan[] = plansRes.data.map((p: any) => {
          const dummy = DUMMY_PLANS.find((dp) => dp.code === p.code) as any;
          const durations = durationsMap.get(p.code) || [
            {
              id: `dur-${p.code}-default`,
              planCode: p.code,
              name: p.duration_days ? `${p.duration_days} Hari` : 'Selamanya',
              durationDays: p.duration_days || 0,
              price: p.price || 0,
              discountPercent: 0,
              isActive: true,
              sortOrder: 1,
            },
          ];

          return {
            id: p.id,
            code: p.code,
            name: p.name,
            description: p.description || dummy?.description || '',
            price: p.price ?? (dummy?.price || 0),
            durationDays: p.duration_days ?? (dummy?.duration_days || 30),
            maxBrands: p.max_brands ?? (dummy?.max_brands || 1),
            maxMembers: p.max_members ?? (dummy?.max_members || 0),
            maxPosts: p.max_scheduled_per_month ?? (dummy?.max_scheduled_per_month ?? null),
            storageMb: p.storage_mb ?? (dummy?.storage_mb || 200),
            maxFileMb: p.max_file_mb ?? (dummy?.max_file_mb || 10),
            maxSnippets: p.max_snippets ?? (dummy?.max_snippets ?? null),
            allowVideo: p.allow_video ?? (dummy?.allow_video || false),
            allowGrid: p.allow_grid ?? (dummy?.allow_grid || false),
            allowExport: p.allow_export ?? (dummy?.allow_export || false),
            allowApproval: p.allow_approval ?? (dummy?.allow_approval || false),
            allowComments: p.allow_comments ?? (dummy?.allow_comments || false),
            isActive: p.is_active ?? true,
            sortOrder: p.sort_order ?? 0,
            durations,
          };
        });

        return NextResponse.json({ success: true, data: dbPlans });
      }
    }

    // Fallback dummy plans formatted as DynamicPlan[]
    const fallbackPlans: DynamicPlan[] = DUMMY_PLANS.map((dp: any, idx: number) => ({
      id: dp.code,
      code: dp.code,
      name: dp.name,
      description: dp.description || '',
      price: dp.price,
      durationDays: dp.duration_days || 30,
      maxBrands: dp.max_brands,
      maxMembers: dp.max_members,
      maxPosts: dp.max_scheduled_per_month ?? null,
      storageMb: dp.storage_mb,
      maxFileMb: dp.max_file_mb,
      maxSnippets: dp.max_snippets ?? null,
      allowVideo: dp.allow_video,
      allowGrid: dp.allow_grid,
      allowExport: dp.allow_export,
      allowApproval: dp.allow_approval,
      allowComments: dp.allow_comments,
      isActive: true,
      sortOrder: idx + 1,
      durations: [
        {
          id: `dur-${dp.code}-1`,
          planCode: dp.code,
          name: dp.duration_days ? `${dp.duration_days} Hari` : 'Selamanya',
          durationDays: dp.duration_days || 0,
          price: dp.price,
          discountPercent: 0,
          isActive: true,
          sortOrder: 1,
        },
      ],
    }));

    return NextResponse.json({ success: true, data: fallbackPlans });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;
    const admin = createAdminClient();

    if (!admin) {
      return NextResponse.json({ success: false, error: 'Koneksi database tidak tersedia.' }, { status: 500 });
    }

    if (action === 'add_duration') {
      const { planCode, variant } = body;
      if (!planCode || !variant) {
        return NextResponse.json({ success: false, error: 'planCode dan data variasi durasi wajib diisi.' }, { status: 400 });
      }

      const { data, error } = await (admin.from('plan_durations' as any) as any)
        .insert({
          plan_code: planCode,
          name: variant.name,
          duration_days: variant.durationDays,
          price: variant.price,
          discount_percent: variant.discountPercent || 0,
          is_active: variant.isActive !== undefined ? !!variant.isActive : true,
          sort_order: variant.sortOrder || 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        data: {
          id: data.id,
          planCode: data.plan_code,
          name: data.name,
          durationDays: data.duration_days,
          price: data.price,
          discountPercent: data.discount_percent,
          isActive: data.is_active,
          sortOrder: data.sort_order,
        },
      }, { status: 201 });
    }

    // Default: create new plan
    const { plan } = body;
    if (!plan || !plan.code || !plan.name) {
      return NextResponse.json({ success: false, error: 'Data paket tidak lengkap.' }, { status: 400 });
    }

    const { data: createdPlan, error: planErr } = await (admin.from('plans' as any) as any)
      .insert({
        code: plan.code,
        name: plan.name,
        price: plan.price || 0,
        duration_days: plan.durationDays || 30,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (planErr) {
      return NextResponse.json({ success: false, error: planErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: createdPlan }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;
    const admin = createAdminClient();

    if (!admin) {
      return NextResponse.json({ success: false, error: 'Koneksi database tidak tersedia.' }, { status: 500 });
    }

    if (action === 'update_duration') {
      const { durationId, updates } = body;
      if (!durationId || !updates) {
        return NextResponse.json({ success: false, error: 'durationId dan updates wajib disertakan.' }, { status: 400 });
      }

      const dbUpdates: any = { updated_at: new Date().toISOString() };
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.durationDays !== undefined) dbUpdates.duration_days = updates.durationDays;
      if (updates.price !== undefined) dbUpdates.price = updates.price;
      if (updates.discountPercent !== undefined) dbUpdates.discount_percent = updates.discountPercent;
      if (updates.isActive !== undefined) dbUpdates.is_active = !!updates.isActive;
      if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;

      const { data, error } = await (admin.from('plan_durations' as any) as any)
        .update(dbUpdates)
        .eq('id', durationId)
        .select()
        .maybeSingle();

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, data });
    }

    // Default: update plan
    const { code, updates } = body;
    if (!code || !updates) {
      return NextResponse.json({ success: false, error: 'Kode paket dan data pembaruan wajib diisi.' }, { status: 400 });
    }

    const dbUpdates: any = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.durationDays !== undefined) dbUpdates.duration_days = updates.durationDays;
    if (updates.maxBrands !== undefined) dbUpdates.max_brands = updates.maxBrands;
    if (updates.maxMembers !== undefined) dbUpdates.max_members = updates.maxMembers;
    if (updates.storageMb !== undefined) dbUpdates.storage_mb = updates.storageMb;

    const { data, error } = await (admin.from('plans' as any) as any)
      .update(dbUpdates)
      .eq('code', code)
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const durationId = searchParams.get('durationId') || searchParams.get('id');

    if (!durationId) {
      return NextResponse.json({ success: false, error: 'durationId wajib disertakan.' }, { status: 400 });
    }

    const admin = createAdminClient();
    if (admin) {
      const { error } = await (admin.from('plan_durations' as any) as any)
        .delete()
        .eq('id', durationId);

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
