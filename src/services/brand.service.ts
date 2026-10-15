import { createClient } from '@/lib/supabase/client';
import { DUMMY_BRANDS, DummyBrand } from '@/lib/dummy-data';

export const isUuid = (val?: string | null): boolean => {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
};

const STORAGE_KEY = 'uda_custom_brands';

const getStoredCustomBrands = (): DummyBrand[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveCustomBrands = (brands: DummyBrand[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(brands));
  } catch {}
};

let localBrands: DummyBrand[] = [...DUMMY_BRANDS];

export class BrandService {
  static async getRealBrandId(requestedId?: string, fallbackUserId?: string): Promise<string> {
    if (requestedId && isUuid(requestedId)) {
      return requestedId;
    }

    const supabase = createClient();
    if (supabase) {
      try {
        let userId = fallbackUserId;
        if (!userId) {
          const { data: { user } } = await supabase.auth.getUser();
          userId = user?.id;
        }

        if (userId && isUuid(userId)) {
          const { data } = await supabase
            .from('brands' as any)
            .select('id')
            .eq('owner_id', userId)
            .order('created_at', { ascending: true })
            .limit(1);

          const rows = data as any[];
          if (rows && rows.length > 0 && rows[0]?.id) {
            return rows[0].id;
          }

          // Otomatis buatkan brand pertama di database Supabase jika belum ada
          const defaultBrand = await this.ensureDefaultBrand(userId);
          if (defaultBrand && isUuid(defaultBrand.id)) {
            return defaultBrand.id;
          }
        }
      } catch (err) {
        console.warn('BrandService.getRealBrandId db lookup:', err);
      }
    }

    // Periksa local storage custom brands jika ada yang uuid
    const custom = getStoredCustomBrands();
    const foundCustom = custom.find((b) => isUuid(b.id));
    if (foundCustom) return foundCustom.id;

    return '00000000-0000-0000-0000-000000000001';
  }

  static async ensureDefaultBrand(userId?: string): Promise<DummyBrand | null> {
    const supabase = createClient();
    if (!supabase) return null;

    try {
      let finalUserId = userId;
      if (!finalUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        finalUserId = user?.id;
      }

      if (!finalUserId || !isUuid(finalUserId)) return null;

      // Cek apakah sudah ada brand di Supabase
      const { data: existing } = await supabase
        .from('brands' as any)
        .select('*')
        .eq('owner_id', finalUserId)
        .limit(1);

      if (existing && existing.length > 0) {
        const d = existing[0] as any;
        return {
          id: d.id,
          owner_id: d.owner_id,
          name: d.name,
          handle: d.handle || 'udacoding',
          platforms: d.platforms || ['instagram', 'tiktok', 'facebook'],
          color: d.color || '#16A34A',
          avatar_url: d.avatar_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
          require_approval: d.require_approval ?? false,
          is_archived: d.is_archived ?? false,
          post_count_this_month: 0,
        };
      }

      // Buat default brand di Supabase
      const insertPayload = {
        owner_id: finalUserId,
        name: 'UdaCoding',
        handle: 'udacoding',
        platforms: ['instagram', 'tiktok', 'facebook'],
        color: '#16A34A',
        avatar_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
        require_approval: false,
        is_archived: false,
      };

      const { data: created, error } = await (supabase.from('brands' as any) as any)
        .insert(insertPayload)
        .select()
        .single();

      if (!error && created) {
        const d = created as any;
        const brandObj: DummyBrand = {
          id: d.id,
          owner_id: d.owner_id,
          name: d.name,
          handle: d.handle,
          platforms: d.platforms,
          color: d.color,
          avatar_url: d.avatar_url,
          require_approval: d.require_approval,
          is_archived: d.is_archived,
          post_count_this_month: 0,
        };
        localBrands.unshift(brandObj);
        return brandObj;
      }
    } catch (err) {
      console.warn('BrandService.ensureDefaultBrand error:', err);
    }
    return null;
  }

  static async getBrands(ownerId?: string): Promise<DummyBrand[]> {
    const supabase = createClient();
    const storedCustom = getStoredCustomBrands();

    if (supabase) {
      try {
        let finalOwnerId = ownerId;
        if (!finalOwnerId) {
          const { data: { user } } = await supabase.auth.getUser();
          finalOwnerId = user?.id;
        }

        let query = supabase.from('brands' as any).select('*').order('created_at', { ascending: false });
        if (finalOwnerId && isUuid(finalOwnerId)) {
          query = query.eq('owner_id', finalOwnerId);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          const dbBrands: DummyBrand[] = data.map((b: any) => ({
            id: b.id,
            owner_id: b.owner_id || finalOwnerId || 'user-1',
            name: b.name,
            handle: b.handle || b.slug || b.name.toLowerCase().replace(/[^a-z0-9]+/g, ''),
            platforms: b.platforms || ['instagram'],
            color: b.color || '#16A34A',
            avatar_url: b.avatar_url || b.logo_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
            require_approval: b.require_approval ?? false,
            is_archived: b.is_archived ?? false,
            post_count_this_month: 0,
          }));

          const dbIds = new Set(dbBrands.map((b) => b.id));
          const combined = [
            ...dbBrands,
            ...storedCustom.filter((c) => !dbIds.has(c.id)),
            ...localBrands.filter((d) => !dbIds.has(d.id) && !storedCustom.some((c) => c.id === d.id)),
          ];
          return combined;
        } else if (finalOwnerId && isUuid(finalOwnerId)) {
          // Jika belum ada brand di Supabase, buatkan brand default
          const defaultBrand = await this.ensureDefaultBrand(finalOwnerId);
          if (defaultBrand) {
            return [defaultBrand, ...storedCustom, ...localBrands.filter((d) => d.id !== defaultBrand.id)];
          }
        }
      } catch (err) {
        console.warn('BrandService.getBrands fallback:', err);
      }
    }

    const existingIds = new Set(storedCustom.map((b) => b.id));
    return [...storedCustom, ...localBrands.filter((d) => !existingIds.has(d.id))];
  }

  static async getBrandById(id: string): Promise<DummyBrand | null> {
    const supabase = createClient();
    if (supabase && isUuid(id)) {
      try {
        const { data, error } = await supabase.from('brands' as any).select('*').eq('id', id).maybeSingle();
        if (!error && data) {
          const d = data as any;
          return {
            id: d.id,
            owner_id: d.owner_id || 'user-1',
            name: d.name,
            handle: d.handle || d.slug || d.name.toLowerCase().replace(/[^a-z0-9]+/g, ''),
            platforms: d.platforms || ['instagram'],
            color: d.color || '#16A34A',
            avatar_url: d.avatar_url || d.logo_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
            require_approval: d.require_approval ?? false,
            is_archived: d.is_archived ?? false,
            post_count_this_month: 0,
          };
        }
      } catch (err) {
        console.warn('BrandService.getBrandById fallback:', err);
      }
    }

    const stored = getStoredCustomBrands();
    const found = stored.find((b) => b.id === id);
    if (found) return found;

    return localBrands.find((b) => b.id === id) || null;
  }

  static async createBrand(payload: {
    ownerId?: string;
    accountId?: string;
    name: string;
    handle?: string;
    slug?: string;
    description?: string;
    platforms?: string[];
    color?: string;
    industry?: string;
    avatarUrl?: string;
    userId?: string;
    requireApproval?: boolean;
  }): Promise<DummyBrand> {
    const cleanHandle = (payload.handle || payload.slug || payload.name)
      .toLowerCase()
      .replace(/@/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const supabase = createClient();
    let effectiveOwnerId = payload.ownerId || payload.userId || payload.accountId;

    if (supabase && (!effectiveOwnerId || !isUuid(effectiveOwnerId))) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) effectiveOwnerId = user.id;
      } catch {}
    }

    const fallbackId = `brand-${Date.now()}`;
    const newBrand: DummyBrand = {
      id: fallbackId,
      owner_id: effectiveOwnerId || 'user-1',
      name: payload.name,
      handle: cleanHandle,
      platforms: payload.platforms || ['instagram'],
      color: payload.color || '#16A34A',
      avatar_url: payload.avatarUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
      require_approval: payload.requireApproval ?? false,
      is_archived: false,
      post_count_this_month: 0,
    };

    if (supabase && effectiveOwnerId && isUuid(effectiveOwnerId)) {
      try {
        const insertPayload: any = {
          owner_id: effectiveOwnerId,
          name: payload.name,
          handle: cleanHandle,
          platforms: newBrand.platforms,
          color: newBrand.color,
          avatar_url: newBrand.avatar_url,
          require_approval: newBrand.require_approval,
          is_archived: false,
        };

        const { data, error } = await (supabase.from('brands' as any) as any).insert(insertPayload).select().single();
        if (!error && data) {
          const d = data as any;
          const created: DummyBrand = {
            id: d.id,
            owner_id: d.owner_id || effectiveOwnerId,
            name: d.name,
            handle: d.handle || cleanHandle,
            platforms: d.platforms || newBrand.platforms,
            color: d.color || newBrand.color,
            avatar_url: d.avatar_url || newBrand.avatar_url,
            require_approval: d.require_approval ?? false,
            is_archived: d.is_archived ?? false,
            post_count_this_month: 0,
          };
          localBrands.unshift(created);
          const currentStored = getStoredCustomBrands();
          saveCustomBrands([created, ...currentStored.filter((b) => b.id !== created.id)]);
          return created;
        } else if (error) {
          console.error('BrandService.createBrand Supabase insert error:', error.message, error.details);
        }
      } catch (err) {
        console.warn('BrandService.createBrand db error, using local:', err);
      }
    }

    localBrands.unshift(newBrand);
    const currentStored = getStoredCustomBrands();
    saveCustomBrands([newBrand, ...currentStored.filter((b) => b.id !== newBrand.id)]);
    return newBrand;
  }

  static async updateBrand(id: string, updates: Partial<DummyBrand>): Promise<DummyBrand | null> {
    const supabase = createClient();
    if (supabase && isUuid(id)) {
      try {
        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.handle !== undefined) dbUpdates.handle = updates.handle;
        if (updates.color !== undefined) dbUpdates.color = updates.color;
        if (updates.avatar_url !== undefined) {
          dbUpdates.avatar_url = updates.avatar_url;
        }
        if (updates.platforms !== undefined) dbUpdates.platforms = updates.platforms;
        if (updates.require_approval !== undefined) dbUpdates.require_approval = updates.require_approval;
        if (updates.is_archived !== undefined) dbUpdates.is_archived = updates.is_archived;
        dbUpdates.updated_at = new Date().toISOString();

        await (supabase.from('brands' as any) as any)
          .update(dbUpdates)
          .eq('id', id);
      } catch (err) {
        console.warn('BrandService.updateBrand db error:', err);
      }
    }

    const currentStored = getStoredCustomBrands();
    const updatedStored = currentStored.map((b) => (b.id === id ? { ...b, ...updates } : b));
    saveCustomBrands(updatedStored);

    const index = localBrands.findIndex((b) => b.id === id);
    if (index !== -1) {
      localBrands[index] = { ...localBrands[index], ...updates };
      return localBrands[index];
    }
    return null;
  }

  static async deleteBrand(id: string): Promise<boolean> {
    const supabase = createClient();
    if (supabase && isUuid(id)) {
      try {
        await supabase.from('brands' as any).delete().eq('id', id);
      } catch (err) {
        console.warn('BrandService.deleteBrand db error:', err);
      }
    }

    const currentStored = getStoredCustomBrands();
    saveCustomBrands(currentStored.filter((b) => b.id !== id));
    localBrands = localBrands.filter((b) => b.id !== id);
    return true;
  }
}

