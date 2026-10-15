import { createClient } from '@/lib/supabase/client';
import { DUMMY_SNIPPETS, DummySnippet } from '@/lib/dummy-data';
import { BrandService, isUuid } from './brand.service';

const STORAGE_KEY = 'uda_custom_snippets';

const getStoredSnippets = (): DummySnippet[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
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
  static async getSnippets(brandId?: string, type?: 'caption' | 'hashtag'): Promise<DummySnippet[]> {
    const supabase = createClient();
    const stored = getStoredSnippets();

    if (supabase) {
      try {
        let query = supabase.from('snippets' as any).select('*').order('created_at', { ascending: false });
        if (brandId && brandId !== 'all' && isUuid(brandId)) {
          query = query.eq('brand_id', brandId);
        }
        if (type) {
          query = query.eq('type', type);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          const dbSnippets: DummySnippet[] = data.map((s: any) => ({
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
            ...localSnippets.filter((ls) => !dbIds.has(ls.id) && !stored.some((st) => st.id === ls.id)),
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
    const combined = [...stored, ...localSnippets.filter((ls) => !storedIds.has(ls.id))];

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

    const fallbackId = `snip-${Date.now()}`;
    const newSnippet: DummySnippet = {
      id: fallbackId,
      brand_id: realBrandId || payload.brandId,
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

  static async deleteSnippet(id: string): Promise<boolean> {
    const supabase = createClient();
    if (supabase && isUuid(id)) {
      try {
        await supabase.from('snippets' as any).delete().eq('id', id);
      } catch (err) {
        console.warn('SnippetService.deleteSnippet db error:', err);
      }
    }

    const currentStored = getStoredSnippets();
    saveStoredSnippets(currentStored.filter((s) => s.id !== id));
    localSnippets = localSnippets.filter((s) => s.id !== id);
    return true;
  }
}

