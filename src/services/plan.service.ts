import { createClient } from '@/lib/supabase/client';
import { DUMMY_PLANS } from '@/lib/dummy-data';

export interface PlanDurationItem {
  id: string;
  planCode: string;
  name: string;
  durationDays: number;
  price: number;
  discountPercent: number;
  isActive: boolean;
  sortOrder: number;
}

export interface DynamicPlan {
  id?: string;
  code: string;
  name: string;
  description: string;
  price: number; // Harga dasar / 1 bulan
  durationDays: number;
  maxBrands: number;
  maxMembers: number;
  maxPosts: number | null;
  storageMb: number;
  maxFileMb: number;
  maxSnippets: number | null;
  allowVideo: boolean;
  allowGrid: boolean;
  allowExport: boolean;
  allowApproval: boolean;
  allowComments: boolean;
  isActive: boolean;
  sortOrder: number;
  durations: PlanDurationItem[];
}

const STORAGE_PLANS_KEY = 'uda_dynamic_plans';

const DEFAULT_DURATIONS: Record<string, PlanDurationItem[]> = {
  free: [
    { id: 'dur-free-1', planCode: 'free', name: 'Selamanya', durationDays: 0, price: 0, discountPercent: 0, isActive: true, sortOrder: 1 },
  ],
  pro: [
    { id: 'dur-pro-1', planCode: 'pro', name: '1 Bulan', durationDays: 30, price: 49000, discountPercent: 0, isActive: true, sortOrder: 1 },
    { id: 'dur-pro-3', planCode: 'pro', name: '3 Bulan', durationDays: 90, price: 139000, discountPercent: 5, isActive: true, sortOrder: 2 },
    { id: 'dur-pro-6', planCode: 'pro', name: '6 Bulan', durationDays: 180, price: 259000, discountPercent: 12, isActive: true, sortOrder: 3 },
    { id: 'dur-pro-12', planCode: 'pro', name: '12 Bulan', durationDays: 365, price: 479000, discountPercent: 18, isActive: true, sortOrder: 4 },
  ],
  team: [
    { id: 'dur-team-1', planCode: 'team', name: '1 Bulan', durationDays: 30, price: 149000, discountPercent: 0, isActive: true, sortOrder: 1 },
    { id: 'dur-team-3', planCode: 'team', name: '3 Bulan', durationDays: 90, price: 419000, discountPercent: 6, isActive: true, sortOrder: 2 },
    { id: 'dur-team-6', planCode: 'team', name: '6 Bulan', durationDays: 180, price: 789000, discountPercent: 12, isActive: true, sortOrder: 3 },
    { id: 'dur-team-12', planCode: 'team', name: '12 Bulan', durationDays: 365, price: 1429000, discountPercent: 20, isActive: true, sortOrder: 4 },
  ],
};

export function resolvePaymentDuration(
  durationDays?: number,
  durationLabel?: string,
  amount?: number,
  planCode?: string
): { days: number; label: string } {
  let days = Number(durationDays) || 0;
  const amt = Number(amount) || 0;
  const plan = (planCode || 'pro').toLowerCase();

  // Jika terdapat label durasi eksplisit
  if (durationLabel) {
    const l = durationLabel.toLowerCase();
    if (l.includes('12 bulan') || l.includes('1 tahun') || l.includes('365')) days = 365;
    else if (l.includes('6 bulan') || l.includes('180')) days = 180;
    else if (l.includes('3 bulan') || l.includes('90')) days = 90;
    else if (l.includes('1 bulan') || l.includes('30')) days = 30;
  }

  // Jika durasi kosong atau default 30 hari tetapi nominal menunjukkan paket berdurasi lebih panjang
  if (days <= 0 || (days === 30 && amt >= 200000)) {
    if (plan === 'team') {
      if (amt >= 1200000) days = 365;
      else if (amt >= 600000) days = 180;
      else if (amt >= 300000) days = 90;
      else days = 30;
    } else {
      if (amt >= 400000) days = 365;
      else if (amt >= 200000) days = 180;
      else if (amt >= 100000) days = 90;
      else days = 30;
    }
  }

  if (days <= 0) days = 30;

  let label = durationLabel || '';
  if (!label || label === '30 Hari' || label === '1 Bulan') {
    if (days >= 365) label = '1 Tahun';
    else if (days >= 180) label = '6 Bulan';
    else if (days >= 90) label = '3 Bulan';
    else label = '1 Bulan';
  }

  return { days, label };
}

const DEFAULT_PLANS: DynamicPlan[] = DUMMY_PLANS.map((p, idx) => ({
  id: `plan-${p.code}`,
  code: p.code,
  name: p.name,
  description: p.code === 'free'
    ? 'Ideal untuk kreator pemula yang mengelola akun pribadi'
    : p.code === 'pro'
    ? 'Pilihan utama profesional kreator dan digital marketer'
    : 'Untuk tim agensi kreatif dan bisnis dengan kolaborasi penuh',
  price: p.price,
  durationDays: p.duration_days,
  maxBrands: p.max_brands,
  maxMembers: p.max_members,
  maxPosts: p.max_scheduled_per_month,
  storageMb: p.storage_mb,
  maxFileMb: p.max_file_mb,
  maxSnippets: p.max_snippets,
  allowVideo: p.allow_video,
  allowGrid: p.allow_grid,
  allowExport: p.allow_export,
  allowApproval: p.allow_approval,
  allowComments: p.allow_comments,
  isActive: true,
  sortOrder: idx + 1,
  durations: DEFAULT_DURATIONS[p.code] || [
    { id: `dur-${p.code}-1`, planCode: p.code, name: '1 Bulan', durationDays: 30, price: p.price, discountPercent: 0, isActive: true, sortOrder: 1 }
  ],
}));

const getStorage = (): DynamicPlan[] => {
  if (typeof window === 'undefined') return DEFAULT_PLANS;
  try {
    const raw = localStorage.getItem(STORAGE_PLANS_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_PLANS;
  } catch {
    return DEFAULT_PLANS;
  }
};

const setStorage = (data: DynamicPlan[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_PLANS_KEY, JSON.stringify(data));
  } catch {}
};

export class PlanService {
  /**
   * Mengambil semua paket aktif beserta variasi durasinya untuk halaman publik & langganan pengguna
   */
  static async getActivePlans(): Promise<DynamicPlan[]> {
    const all = await this.getAllPlans();
    return all
      .filter((p) => p.isActive)
      .map((p) => ({
        ...p,
        durations: (p.durations || []).filter((d) => d.isActive).sort((a, b) => a.sortOrder - b.sortOrder),
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /**
   * Mengambil semua paket untuk Panel Admin
   */
  static async getAllPlans(): Promise<DynamicPlan[]> {
    const local = getStorage();
    const supabase = createClient();

    if (supabase) {
      try {
        const [plansRes, durRes] = await Promise.all([
          supabase.from('plans' as any).select('*').order('sort_order', { ascending: true }),
          supabase.from('plan_durations' as any).select('*').order('sort_order', { ascending: true }),
        ]);

        if (!plansRes.error && plansRes.data && plansRes.data.length > 0) {
          const durationsMap = new Map<string, PlanDurationItem[]>();

          if (!durRes.error && durRes.data) {
            durRes.data.forEach((d: any) => {
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
            const rawDurations = durationsMap.get(p.code);
            const durations = rawDurations && rawDurations.length > 0
              ? rawDurations
              : DEFAULT_DURATIONS[p.code] || [
                  { id: `dur-${p.code}-1`, planCode: p.code, name: '1 Bulan', durationDays: p.duration_days || 30, price: p.price, discountPercent: 0, isActive: true, sortOrder: 1 },
                ];

            return {
              id: p.id,
              code: p.code,
              name: p.name,
              description: p.description || (DEFAULT_PLANS.find(dp => dp.code === p.code)?.description || ''),
              price: p.price,
              durationDays: p.duration_days || 30,
              maxBrands: p.max_brands || 1,
              maxMembers: p.max_members || 0,
              maxPosts: p.max_scheduled_per_month,
              storageMb: p.storage_mb || 200,
              maxFileMb: p.max_file_mb || 10,
              maxSnippets: p.max_snippets,
              allowVideo: p.allow_video ?? false,
              allowGrid: p.allow_grid ?? false,
              allowExport: p.allow_export ?? false,
              allowApproval: p.allow_approval ?? false,
              allowComments: p.allow_comments ?? false,
              isActive: p.is_active ?? true,
              sortOrder: p.sort_order || 0,
              durations,
            };
          });

          setStorage(dbPlans);
          return dbPlans;
        }
      } catch (err) {
        console.warn('PlanService.getAllPlans db fallback:', err);
      }
    }

    return local;
  }

  /**
   * Menambahkan paket baru oleh Admin
   */
  static async createPlan(plan: Omit<DynamicPlan, 'id'>): Promise<DynamicPlan> {
    const supabase = createClient();
    const newId = `plan-${plan.code}-${Date.now()}`;
    const newPlan: DynamicPlan = {
      ...plan,
      id: newId,
      durations: plan.durations && plan.durations.length > 0 ? plan.durations : [
        {
          id: `dur-${plan.code}-1`,
          planCode: plan.code,
          name: '1 Bulan',
          durationDays: 30,
          price: plan.price,
          discountPercent: 0,
          isActive: true,
          sortOrder: 1,
        }
      ]
    };

    if (supabase) {
      try {
        await (supabase.from('plans' as any) as any).insert({
          code: plan.code,
          name: plan.name,
          description: plan.description,
          price: plan.price,
          duration_days: plan.durationDays,
          max_brands: plan.maxBrands,
          max_members: plan.maxMembers,
          max_scheduled_per_month: plan.maxPosts,
          storage_mb: plan.storageMb,
          max_file_mb: plan.maxFileMb,
          max_snippets: plan.maxSnippets,
          allow_video: plan.allowVideo,
          allow_grid: plan.allowGrid,
          allow_export: plan.allowExport,
          allow_approval: plan.allowApproval,
          allow_comments: plan.allowComments,
          is_active: plan.isActive,
          sort_order: plan.sortOrder,
        });

        // Insert initial durations
        for (const dur of newPlan.durations) {
          await (supabase.from('plan_durations' as any) as any).insert({
            plan_code: plan.code,
            name: dur.name,
            duration_days: dur.durationDays,
            price: dur.price,
            discount_percent: dur.discountPercent,
            is_active: dur.isActive,
            sort_order: dur.sortOrder,
          });
        }
      } catch (err) {
        console.warn('PlanService.createPlan db error:', err);
      }
    }

    const current = getStorage();
    const updated = [...current, newPlan];
    setStorage(updated);
    return newPlan;
  }

  /**
   * Memperbarui data paket
   */
  static async updatePlan(code: string, updates: Partial<DynamicPlan>): Promise<boolean> {
    const supabase = createClient();

    if (supabase) {
      try {
        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.price !== undefined) dbUpdates.price = updates.price;
        if (updates.durationDays !== undefined) dbUpdates.duration_days = updates.durationDays;
        if (updates.maxBrands !== undefined) dbUpdates.max_brands = updates.maxBrands;
        if (updates.maxMembers !== undefined) dbUpdates.max_members = updates.maxMembers;
        if (updates.maxPosts !== undefined) dbUpdates.max_scheduled_per_month = updates.maxPosts;
        if (updates.storageMb !== undefined) dbUpdates.storage_mb = updates.storageMb;
        if (updates.maxFileMb !== undefined) dbUpdates.max_file_mb = updates.maxFileMb;
        if (updates.maxSnippets !== undefined) dbUpdates.max_snippets = updates.maxSnippets;
        if (updates.allowVideo !== undefined) dbUpdates.allow_video = updates.allowVideo;
        if (updates.allowGrid !== undefined) dbUpdates.allow_grid = updates.allowGrid;
        if (updates.allowExport !== undefined) dbUpdates.allow_export = updates.allowExport;
        if (updates.allowApproval !== undefined) dbUpdates.allow_approval = updates.allowApproval;
        if (updates.allowComments !== undefined) dbUpdates.allow_comments = updates.allowComments;
        if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
        if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;
        dbUpdates.updated_at = new Date().toISOString();

        await (supabase.from('plans' as any) as any).update(dbUpdates).eq('code', code);
      } catch (err) {
        console.warn('PlanService.updatePlan db error:', err);
      }
    }

    const current = getStorage();
    const updated = current.map((p) => (p.code === code ? { ...p, ...updates } : p));
    setStorage(updated);
    return true;
  }

  /**
   * Menambahkan variasi durasi pada paket
   */
  static async addDurationVariant(planCode: string, variant: Omit<PlanDurationItem, 'id' | 'planCode'>): Promise<PlanDurationItem> {
    const supabase = createClient();
    const newId = `dur-${planCode}-${Date.now()}`;
    const newVariant: PlanDurationItem = {
      ...variant,
      id: newId,
      planCode,
    };

    if (supabase) {
      try {
        const { data, error } = await (supabase.from('plan_durations' as any) as any)
          .insert({
            plan_code: planCode,
            name: variant.name,
            duration_days: variant.durationDays,
            price: variant.price,
            discount_percent: variant.discountPercent,
            is_active: variant.isActive,
            sort_order: variant.sortOrder,
          })
          .select()
          .single();

        if (!error && data) {
          newVariant.id = data.id;
        }
      } catch (err) {
        console.warn('PlanService.addDurationVariant db error:', err);
      }
    }

    const current = getStorage();
    const updated = current.map((p) => {
      if (p.code === planCode) {
        return {
          ...p,
          durations: [...(p.durations || []), newVariant].sort((a, b) => a.sortOrder - b.sortOrder),
        };
      }
      return p;
    });
    setStorage(updated);
    return newVariant;
  }

  /**
   * Memperbarui variasi durasi paket
   */
  static async updateDurationVariant(planCode: string, durationId: string, updates: Partial<PlanDurationItem>): Promise<boolean> {
    const supabase = createClient();

    if (supabase) {
      try {
        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.durationDays !== undefined) dbUpdates.duration_days = updates.durationDays;
        if (updates.price !== undefined) dbUpdates.price = updates.price;
        if (updates.discountPercent !== undefined) dbUpdates.discount_percent = updates.discountPercent;
        if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
        if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;
        dbUpdates.updated_at = new Date().toISOString();

        await (supabase.from('plan_durations' as any) as any).update(dbUpdates).eq('id', durationId);
      } catch (err) {
        console.warn('PlanService.updateDurationVariant db error:', err);
      }
    }

    const current = getStorage();
    const updated = current.map((p) => {
      if (p.code === planCode) {
        return {
          ...p,
          durations: (p.durations || []).map((d) => (d.id === durationId ? { ...d, ...updates } : d)),
        };
      }
      return p;
    });
    setStorage(updated);
    return true;
  }

  /**
   * Menghapus variasi durasi paket
   */
  static async deleteDurationVariant(planCode: string, durationId: string): Promise<boolean> {
    const supabase = createClient();

    if (supabase) {
      try {
        await (supabase.from('plan_durations' as any) as any).delete().eq('id', durationId);
      } catch (err) {
        console.warn('PlanService.deleteDurationVariant db error:', err);
      }
    }

    const current = getStorage();
    const updated = current.map((p) => {
      if (p.code === planCode) {
        return {
          ...p,
          durations: (p.durations || []).filter((d) => d.id !== durationId),
        };
      }
      return p;
    });
    setStorage(updated);
    return true;
  }
}
