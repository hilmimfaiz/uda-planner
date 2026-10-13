import { createClient } from '@/lib/supabase/client';
import { initialBrands } from '@/lib/supabase/mock-data';
import { Brand } from '@/types/database.types';

let mockBrands: Brand[] = [...initialBrands];

export class BrandService {
  static async getBrands(accountId?: string): Promise<Brand[]> {
    const supabase = createClient();
    if (supabase) {
      let query = supabase.from('brands').select('*').order('created_at', { ascending: false });
      if (accountId) {
        query = query.eq('account_id', accountId);
      }
      const { data, error } = await query;
      if (error) {
        console.warn('Supabase getBrands error, falling back to local:', error.message);
        return mockBrands;
      }
      return data as Brand[];
    }
    return [...mockBrands];
  }

  static async getBrandById(id: string): Promise<Brand | null> {
    const supabase = createClient();
    if (supabase) {
      const { data, error } = await supabase.from('brands').select('*').eq('id', id).single();
      if (!error && data) return data as Brand;
    }
    return mockBrands.find((b) => b.id === id) || null;
  }

  static async createBrand(payload: {
    accountId: string;
    name: string;
    slug?: string;
    description?: string;
    color?: string;
    industry?: string;
    userId: string;
  }): Promise<Brand> {
    const slug = payload.slug || payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const newBrand: Brand = {
      id: `brand-${Date.now()}`,
      account_id: payload.accountId,
      name: payload.name,
      slug,
      description: payload.description || '',
      logo_url: null,
      color: payload.color || '#6366f1',
      industry: payload.industry || 'Umum',
      created_by: payload.userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const supabase = createClient();
    if (supabase) {
      const { data, error } = await supabase.from('brands').insert({
        account_id: payload.accountId,
        name: payload.name,
        slug,
        description: payload.description,
        color: payload.color || '#6366f1',
        industry: payload.industry,
        created_by: payload.userId,
      } as any).select().single();

      if (!error && data) {
        return data as Brand;
      }
    }

    mockBrands.unshift(newBrand);
    return newBrand;
  }

  static async updateBrand(id: string, updates: Partial<Brand>): Promise<Brand | null> {
    const supabase = createClient();
    if (supabase) {
      const { data, error } = await (supabase.from('brands' as any) as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (!error && data) return data as Brand;
    }

    const index = mockBrands.findIndex((b) => b.id === id);
    if (index !== -1) {
      mockBrands[index] = { ...mockBrands[index], ...updates, updated_at: new Date().toISOString() };
      return mockBrands[index];
    }
    return null;
  }

  static async deleteBrand(id: string): Promise<boolean> {
    const supabase = createClient();
    if (supabase) {
      const { error } = await supabase.from('brands').delete().eq('id', id);
      if (!error) return true;
    }
    mockBrands = mockBrands.filter((b) => b.id !== id);
    return true;
  }
}
