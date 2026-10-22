import { createClient } from '@/lib/supabase/client';
import { DUMMY_SNIPPETS, DummySnippet } from '@/lib/dummy-data';
import { BrandService, isUuid } from './brand.service';

const STORAGE_KEY = 'uda_custom_snippets';

const getStoredSnippets = (): DummySnippet[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return (Array.isArray(parsed) ? parsed : []).filter(
      (s: any) => s && !['snip-1', 'snip-2', 'snip-3', 'snip-4', 'snip-5', 'snip-6'].includes(s.id)
    );
  } catch {
    return [];
  }
};

const saveStoredSnippets = (snippets: DummySnippet[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snippets));
  } catch {}
};

let localSnippets: DummySnippet[] = [...DUMMY_SNIPPETS];

export class SnippetService {
  static async getSnippets(brandId?: string, type?: 'caption' | 'hashtag', userId?: string): Promise<DummySnippet[]> {
    const supabase = createClient();

    // Dapatkan brand yang dapat diakses pengguna
    const userBrands = await BrandService.getBrands(userId);
    const accessibleBrandIds = new Set(userBrands.map((b) => b.id));

    if (accessibleBrandIds.size === 0) {
      return [];
    }

    const stored = getStoredSnippets().filter((s) => s.brand_id && accessibleBrandIds.has(s.brand_id));

    if (supabase) {
      try {
        let query = supabase.from('snippets' as any).select('*').order('created_at', { ascending: false });

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
            let res = stored;
            if (type) res = res.filter((s) => s.type === type);
            return res;
          }
        }

        if (type) {
          query = query.eq('type', type);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          const dbSnippets: DummySnippet[] = data
            .filter((s: any) => accessibleBrandIds.has(s.brand_id))
            .map((s: any) => ({
              id: s.id,
              brand_id: s.brand_id,
              type: s.type,
              title: s.title,
              body: s.body,
            }));

          const dbIds = new Set(dbSnippets.map((s) => s.id));
          const combined = [
            ...dbSnippets,
            ...stored.filter((st) => !dbIds.has(st.id)),
            ...localSnippets.filter((ls) => accessibleBrandIds.has(ls.brand_id) && !dbIds.has(ls.id) && !stored.some((st) => st.id === ls.id)),
          ];

          let results = combined;
          if (brandId && brandId !== 'all') {
            results = results.filter((s) => s.brand_id === brandId || !isUuid(brandId));
          }
          if (type) results = results.filter((s) => s.type === type);
          return results;
        }
      } catch (err) {
        console.warn('SnippetService.getSnippets db fallback:', err);
      }
    }

    const storedIds = new Set(stored.map((s) => s.id));
    const combined = [
      ...stored,
      ...localSnippets.filter((ls) => accessibleBrandIds.has(ls.brand_id) && !storedIds.has(ls.id)),
    ];

    let results = combined;
    if (brandId && brandId !== 'all') results = results.filter((s) => s.brand_id === brandId);
    if (type) results = results.filter((s) => s.type === type);
    return results;
  }

  static async createSnippet(payload: {
    brandId: string;
    type: 'caption' | 'hashtag';
    title: string;
    body?: string;
    content?: string;
    tags?: string[];
    userId?: string;
  }): Promise<DummySnippet> {
    const textBody = payload.body || payload.content || '';
    const supabase = createClient();

    let effectiveUserId = payload.userId;
    if (supabase && (!effectiveUserId || !isUuid(effectiveUserId))) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) effectiveUserId = user.id;
      } catch {}
    }

    // Resolusikan brand_id ke UUID riil yang ada di Supabase
    const realBrandId = await BrandService.getRealBrandId(payload.brandId, effectiveUserId);
    const targetBrandId = realBrandId || payload.brandId;

    // Verifikasi peran pengguna
    const role = await BrandService.getUserBrandRole(targetBrandId, effectiveUserId);
    if (!role) {
      throw new Error('Akses Ditolak: Anda tidak terdaftar pada brand ini.');
    }
    if (role === 'viewer') {
      throw new Error('Akses Ditolak: Peran Viewer tidak diizinkan membuat template baru.');
    }

    const fallbackId = `snip-${Date.now()}`;
    const newSnippet: DummySnippet = {
      id: fallbackId,
      brand_id: targetBrandId,
      type: payload.type,
      title: payload.title,
      body: textBody,
    };

    if (supabase) {
      try {
        const insertPayload: any = {
          brand_id: realBrandId,
          type: payload.type,
          title: payload.title,
          body: textBody,
        };

        if (effectiveUserId && isUuid(effectiveUserId)) {
          insertPayload.created_by = effectiveUserId;
        }

        const { data, error } = await (supabase.from('snippets' as any) as any)
          .insert(insertPayload)
          .select()
          .single();

        if (!error && data) {
          const d = data as any;
          const created: DummySnippet = {
            id: d.id,
            brand_id: d.brand_id,
            type: d.type,
            title: d.title,
            body: d.body,
          };
          localSnippets.unshift(created);
          const currentStored = getStoredSnippets();
          saveStoredSnippets([created, ...currentStored.filter((s) => s.id !== created.id)]);
          return created;
        } else if (error) {
          console.error('SnippetService.createSnippet Supabase insert error:', error.message, error.details);
        }
      } catch (err) {
        console.warn('SnippetService.createSnippet db error:', err);
      }
    }

    localSnippets.unshift(newSnippet);
    const currentStored = getStoredSnippets();
    saveStoredSnippets([newSnippet, ...currentStored.filter((s) => s.id !== newSnippet.id)]);
    return newSnippet;
  }

  static async deleteSnippet(id: string, userId?: string): Promise<boolean> {
    const currentStored = getStoredSnippets();
    const existing = currentStored.find((s) => s.id === id) || localSnippets.find((s) => s.id === id);
    if (existing?.brand_id) {
      const role = await BrandService.getUserBrandRole(existing.brand_id, userId);
      if (!role) {
        throw new Error('Akses Ditolak: Anda tidak memiliki akses ke brand ini.');
      }
      if (role === 'viewer') {
        throw new Error('Akses Ditolak: Peran Viewer tidak diizinkan menghapus template.');
      }
    }

    const supabase = createClient();
    if (supabase && isUuid(id)) {
      try {
        await supabase.from('snippets' as any).delete().eq('id', id);
      } catch (err) {
        console.warn('SnippetService.deleteSnippet db error:', err);
      }
    }

    saveStoredSnippets(currentStored.filter((s) => s.id !== id));
    localSnippets = localSnippets.filter((s) => s.id !== id);
    return true;
  }
}

