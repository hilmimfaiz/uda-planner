import { createClient } from '@/lib/supabase/client';
import { DUMMY_PILLARS, DummyPillar } from '@/lib/dummy-data';
import { BrandService, isUuid } from './brand.service';

let localPillars: DummyPillar[] = [...DUMMY_PILLARS];

export class ContentPillarService {
  static async getPillars(brandId?: string, userId?: string): Promise<DummyPillar[]> {
    const supabase = createClient();

    // Dapatkan brand yang dapat diakses pengguna
    const userBrands = await BrandService.getBrands(userId);
    const accessibleBrandIds = new Set(userBrands.map((b) => b.id));

    if (accessibleBrandIds.size === 0) {
      return [];
    }

    if (supabase) {
      try {
        let query = supabase.from('content_pillars' as any).select('*').order('created_at', { ascending: true });

        if (brandId && brandId !== 'all') {
          if (!accessibleBrandIds.has(brandId)) {
            return [];
          }
          if (isUuid(brandId)) {
            query = query.eq('brand_id', brandId);
          }
        } else {
          const uuidBrandIds = Array.from(accessibleBrandIds).filter((id) => isUuid(id));
          if (uuidBrandIds.length > 0) {
            query = query.in('brand_id', uuidBrandIds);
          } else {
            return localPillars.filter((p) => accessibleBrandIds.has(p.brand_id));
          }
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          const dbPillars: DummyPillar[] = data
            .filter((p: any) => accessibleBrandIds.has(p.brand_id))
            .map((p: any) => ({
              id: p.id,
              brand_id: p.brand_id,
              name: p.name,
              color: p.color || '#3b82f6',
            }));

          const dbIds = new Set(dbPillars.map((p) => p.id));
          const combined = [
            ...dbPillars,
            ...localPillars.filter((lp) => accessibleBrandIds.has(lp.brand_id) && !dbIds.has(lp.id)),
          ];
          return brandId && brandId !== 'all' ? combined.filter((p) => p.brand_id === brandId) : combined;
        }
      } catch (err) {
        console.warn('ContentPillarService.getPillars db error:', err);
      }
    }

    if (brandId && brandId !== 'all') {
      return localPillars.filter((p) => p.brand_id === brandId && accessibleBrandIds.has(p.brand_id));
    }
    return localPillars.filter((p) => accessibleBrandIds.has(p.brand_id));
  }

  static async createPillar(payload: {
    brandId: string;
    name: string;
    color?: string;
    description?: string;
    userId?: string;
  }): Promise<DummyPillar> {
    const role = await BrandService.getUserBrandRole(payload.brandId, payload.userId);
    if (!role) {
      throw new Error('Akses Ditolak: Anda tidak terdaftar pada brand ini.');
    }
    if (role === 'viewer') {
      throw new Error('Akses Ditolak: Peran Viewer tidak diizinkan menambah pilar konten.');
    }

    const newPillar: DummyPillar = {
      id: `pil-${Date.now()}`,
      brand_id: payload.brandId,
      name: payload.name,
      color: payload.color || '#3b82f6',
    };

    const supabase = createClient();
    if (supabase && isUuid(payload.brandId)) {
      try {
        const { data, error } = await (supabase.from('content_pillars' as any) as any).insert({
          brand_id: payload.brandId,
          name: payload.name,
          color: payload.color || '#3b82f6',
        }).select().single();

        if (!error && data) {
          const d = data as any;
          const created: DummyPillar = {
            id: d.id,
            brand_id: d.brand_id,
            name: d.name,
            color: d.color || newPillar.color,
          };
          localPillars.push(created);
          return created;
        }
      } catch (err) {
        console.warn('ContentPillarService.createPillar db error:', err);
      }
    }

    localPillars.push(newPillar);
    return newPillar;
  }

  static async updatePillar(id: string, updates: Partial<DummyPillar>, userId?: string): Promise<DummyPillar | null> {
    const existing = localPillars.find((p) => p.id === id);
    if (existing?.brand_id) {
      const role = await BrandService.getUserBrandRole(existing.brand_id, userId);
      if (!role) {
        throw new Error('Akses Ditolak: Anda tidak memiliki akses ke brand ini.');
      }
      if (role === 'viewer') {
        throw new Error('Akses Ditolak: Peran Viewer tidak diizinkan mengedit pilar.');
      }
    }

    const supabase = createClient();
    if (supabase && isUuid(id)) {
      try {
        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.color !== undefined) dbUpdates.color = updates.color;

        await (supabase.from('content_pillars' as any) as any)
          .update(dbUpdates)
          .eq('id', id);
      } catch (err) {
        console.warn('ContentPillarService.updatePillar db error:', err);
      }
    }

    const index = localPillars.findIndex((p) => p.id === id);
    if (index !== -1) {
      localPillars[index] = { ...localPillars[index], ...updates };
      return localPillars[index];
    }
    return null;
  }

  static async deletePillar(id: string, userId?: string): Promise<boolean> {
    const existing = localPillars.find((p) => p.id === id);
    if (existing?.brand_id) {
      const role = await BrandService.getUserBrandRole(existing.brand_id, userId);
      if (!role) {
        throw new Error('Akses Ditolak: Anda tidak memiliki akses ke brand ini.');
      }
      if (role === 'viewer') {
        throw new Error('Akses Ditolak: Peran Viewer tidak diizinkan menghapus pilar.');
      }
    }

    const supabase = createClient();
    if (supabase && isUuid(id)) {
      try {
        await supabase.from('content_pillars' as any).delete().eq('id', id);
      } catch (err) {
        console.warn('ContentPillarService.deletePillar db error:', err);
      }
    }
    localPillars = localPillars.filter((p) => p.id !== id);
    return true;
  }
}
