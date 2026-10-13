import { createClient } from '@/lib/supabase/client';
import { initialPillars } from '@/lib/supabase/mock-data';
import { ContentPillar } from '@/types/database.types';

let mockPillars: ContentPillar[] = [...initialPillars];

export class ContentPillarService {
  static async getPillars(brandId: string): Promise<ContentPillar[]> {
    const supabase = createClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('content_pillars')
        .select('*')
        .eq('brand_id', brandId)
        .order('name', { ascending: true });
      if (!error && data) return data as ContentPillar[];
    }
    return mockPillars.filter((p) => p.brand_id === brandId);
  }

  static async createPillar(payload: {
    brandId: string;
    name: string;
    color?: string;
    description?: string;
  }): Promise<ContentPillar> {
    const newPillar: ContentPillar = {
      id: `pillar-${Date.now()}`,
      brand_id: payload.brandId,
      name: payload.name,
      color: payload.color || '#3b82f6',
      description: payload.description || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const supabase = createClient();
    if (supabase) {
      const { data, error } = await supabase.from('content_pillars').insert({
        brand_id: payload.brandId,
        name: payload.name,
        color: payload.color || '#3b82f6',
        description: payload.description,
      } as any).select().single();
      if (!error && data) return data as ContentPillar;
    }

    mockPillars.push(newPillar);
    return newPillar;
  }

  static async updatePillar(id: string, updates: Partial<ContentPillar>): Promise<ContentPillar | null> {
    const supabase = createClient();
    if (supabase) {
      const { data, error } = await (supabase.from('content_pillars' as any) as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (!error && data) return data as ContentPillar;
    }

    const index = mockPillars.findIndex((p) => p.id === id);
    if (index !== -1) {
      mockPillars[index] = { ...mockPillars[index], ...updates, updated_at: new Date().toISOString() };
      return mockPillars[index];
    }
    return null;
  }

  static async deletePillar(id: string): Promise<boolean> {
    const supabase = createClient();
    if (supabase) {
      const { error } = await supabase.from('content_pillars').delete().eq('id', id);
      if (!error) return true;
    }
    mockPillars = mockPillars.filter((p) => p.id !== id);
    return true;
  }
}
