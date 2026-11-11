import { NextRequest, NextResponse } from 'next/server';
import { BrandService } from '@/services/brand.service';
import { QuotaService } from '@/services/quota.service';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ownerId = searchParams.get('ownerId') || searchParams.get('userId') || searchParams.get('accountId') || undefined;

    const admin = createAdminClient();
    if (admin && ownerId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ownerId)) {
      const [ownedRes, memberRes] = await Promise.all([
        (admin.from('brands' as any) as any)
          .select('*')
          .eq('owner_id', ownerId)
          .order('created_at', { ascending: false }),
        (admin.from('brand_members' as any) as any)
          .select('brand_id, role')
          .eq('user_id', ownerId),
      ]);

      const brandMap = new Map<string, any>();
      if (!ownedRes.error && ownedRes.data) {
        ownedRes.data.forEach((b: any) => {
          brandMap.set(b.id, {
            id: b.id,
            owner_id: b.owner_id || ownerId,
            name: b.name,
            handle: b.handle || b.slug || b.name.toLowerCase().replace(/[^a-z0-9]+/g, ''),
            platforms: b.platforms || ['instagram'],
            color: b.color || '#16A34A',
            avatar_url: b.avatar_url || b.logo_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
            require_approval: b.require_approval ?? false,
            is_archived: b.is_archived ?? false,
            post_count_this_month: 0,
          });
        });
      }

      if (!memberRes.error && memberRes.data && memberRes.data.length > 0) {
        const memberBrandIds = memberRes.data
          .map((m: any) => m.brand_id)
          .filter((id: string) => Boolean(id) && !brandMap.has(id));

        if (memberBrandIds.length > 0) {
          const { data: memberBrands } = await (admin.from('brands' as any) as any)
            .select('*')
            .in('id', memberBrandIds);

          if (memberBrands) {
            memberBrands.forEach((b: any) => {
              if (!brandMap.has(b.id)) {
                brandMap.set(b.id, {
                  id: b.id,
                  owner_id: b.owner_id,
                  name: b.name,
                  handle: b.handle || b.slug || b.name.toLowerCase().replace(/[^a-z0-9]+/g, ''),
                  platforms: b.platforms || ['instagram'],
                  color: b.color || '#16A34A',
                  avatar_url: b.avatar_url || b.logo_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
                  require_approval: b.require_approval ?? false,
                  is_archived: b.is_archived ?? false,
                  post_count_this_month: 0,
                });
              }
            });
          }
        }
      }

      const list = Array.from(brandMap.values());
      return NextResponse.json({ success: true, data: list });
    }

    const brands = await BrandService.getBrands(ownerId);
    return NextResponse.json({ success: true, data: brands });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const effectiveOwnerId = body.ownerId || body.userId || body.accountId || 'acc-001';

    // Validate quota
    const quotaCheck = await QuotaService.canCreateBrand(effectiveOwnerId);
    if (!quotaCheck.allowed) {
      return NextResponse.json({ success: false, error: quotaCheck.message }, { status: 403 });
    }

    const cleanHandle = (body.handle || body.slug || body.name || '')
      .toLowerCase()
      .replace(/@/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const admin = createAdminClient();
    if (admin && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(effectiveOwnerId)) {
      const insertPayload: any = {
        owner_id: effectiveOwnerId,
        name: body.name,
        handle: cleanHandle,
        platforms: body.platforms || ['instagram'],
        color: body.color || '#16A34A',
        avatar_url: body.avatarUrl || body.avatar_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
        require_approval: body.requireApproval ?? body.require_approval ?? false,
        is_archived: false,
      };

      const { data: newDbBrand, error: insertErr } = await (admin.from('brands' as any) as any)
        .insert(insertPayload)
        .select()
        .single();

      if (!insertErr && newDbBrand) {
        // Otomatis daftarkan owner di brand_members
        try {
          await (admin.from('brand_members' as any) as any).upsert({
            brand_id: newDbBrand.id,
            user_id: effectiveOwnerId,
            role: 'owner',
          }, { onConflict: 'brand_id,user_id' });
        } catch {}

        return NextResponse.json({
          success: true,
          data: {
            id: newDbBrand.id,
            owner_id: newDbBrand.owner_id,
            name: newDbBrand.name,
            handle: newDbBrand.handle,
            platforms: newDbBrand.platforms,
            color: newDbBrand.color,
            avatar_url: newDbBrand.avatar_url,
            require_approval: newDbBrand.require_approval,
            is_archived: newDbBrand.is_archived,
            post_count_this_month: 0,
          },
        }, { status: 201 });
      }
    }

    const brand = await BrandService.createBrand({
      ownerId: effectiveOwnerId,
      name: body.name,
      handle: cleanHandle,
      slug: cleanHandle,
      description: body.description,
      color: body.color,
      industry: body.industry,
      avatarUrl: body.avatarUrl || body.avatar_url,
      platforms: body.platforms,
      requireApproval: body.requireApproval ?? body.require_approval,
    });

    return NextResponse.json({ success: true, data: brand }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Brand ID wajib disertakan.' }, { status: 400 });
    }

    const admin = createAdminClient();
    if (admin && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.handle !== undefined) dbUpdates.handle = updates.handle;
      if (updates.color !== undefined) dbUpdates.color = updates.color;
      if (updates.avatar_url !== undefined || updates.avatarUrl !== undefined) {
        dbUpdates.avatar_url = updates.avatar_url || updates.avatarUrl;
      }
      if (updates.platforms !== undefined) dbUpdates.platforms = updates.platforms;
      if (updates.require_approval !== undefined || updates.requireApproval !== undefined) {
        dbUpdates.require_approval = updates.require_approval ?? updates.requireApproval;
      }
      if (updates.is_archived !== undefined) dbUpdates.is_archived = updates.is_archived;
      dbUpdates.updated_at = new Date().toISOString();

      const { data, error } = await (admin.from('brands' as any) as any)
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        return NextResponse.json({ success: true, data });
      }
    }

    const updated = await BrandService.updateBrand(id, updates);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
