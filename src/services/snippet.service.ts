import { createClient } from '@/lib/supabase/client';
import { initialSnippets } from '@/lib/supabase/mock-data';
import { Snippet, SnippetType } from '@/types/database.types';

let mockSnippets: Snippet[] = [...initialSnippets];

export class SnippetService {
  static async getSnippets(brandId: string, type?: SnippetType): Promise<Snippet[]> {
    const supabase = createClient();
    if (supabase) {
      let query = supabase.from('snippets').select('*').eq('brand_id', brandId).order('created_at', { ascending: false });
      if (type) query = query.eq('type', type);
      const { data, error } = await query;
      if (!error && data) return data as Snippet[];
    }

    let results = mockSnippets.filter((s) => s.brand_id === brandId);
    if (type) results = results.filter((s) => s.type === type);
    return results;
  }

  static async createSnippet(payload: {
    brandId: string;
    type: SnippetType;
    title: string;
    content: string;
    tags?: string[];
    userId?: string;
  }): Promise<Snippet> {
    const newSnippet: Snippet = {
      id: `snip-${Date.now()}`,
      brand_id: payload.brandId,
      type: payload.type,
      title: payload.title,
      content: payload.content,
      tags: payload.tags || [],
      created_by: payload.userId || 'user-001',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const supabase = createClient();
    if (supabase) {
      const { data, error } = await supabase.from('snippets').insert({
        brand_id: payload.brandId,
        type: payload.type,
        title: payload.title,
        content: payload.content,
        tags: payload.tags || [],
        created_by: payload.userId || null,
      } as any).select().single();
      if (!error && data) return data as Snippet;
    }

    mockSnippets.unshift(newSnippet);
    return newSnippet;
  }

  static async updateSnippet(id: string, updates: Partial<Snippet>): Promise<Snippet | null> {
    const supabase = createClient();
    if (supabase) {
      const { data, error } = await (supabase.from('snippets' as any) as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (!error && data) return data as Snippet;
    }

    const index = mockSnippets.findIndex((s) => s.id === id);
    if (index !== -1) {
      mockSnippets[index] = { ...mockSnippets[index], ...updates, updated_at: new Date().toISOString() };
      return mockSnippets[index];
    }
    return null;
  }

  static async deleteSnippet(id: string): Promise<boolean> {
    const supabase = createClient();
    if (supabase) {
      const { error } = await supabase.from('snippets').delete().eq('id', id);
      if (!error) return true;
    }
    mockSnippets = mockSnippets.filter((s) => s.id !== id);
    return true;
  }
}
