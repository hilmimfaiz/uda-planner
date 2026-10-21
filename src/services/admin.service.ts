import { createClient } from '@/lib/supabase/client';
import { DUMMY_PLANS } from '@/lib/dummy-data';

export interface AdminPaymentItem {
  id: string;
  userId?: string;
  user: string;
  email: string;
  plan: 'free' | 'pro' | 'team';
  amount: number;
  bank: string;
  proof: string;
  status: 'pending' | 'approved' | 'rejected';
  date: string;
  reason?: string;
}

export interface AdminUserItem {
  id: string;
  userId?: string;
  name: string;
  email: string;
  role?: 'user' | 'admin';
  plan: 'free' | 'pro' | 'team';
  planUntil: string | null;
  brandsCount: number;
  storageMb: number;
  isSuspended: boolean;
  createdAt: string;
}

export interface EditablePlan {
  code: 'free' | 'pro' | 'team';
  name: string;
  price: number;
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
}

export interface AppSettingsData {
  bankName: string;
  accountNumber: string;
  accountName: string;
  adminWhatsapp: string;
}

// Initial fallback mock data
let localPayments: AdminPaymentItem[] = [
  {
    id: 'pay-1',
    user: 'Budi Santoso',
    email: 'budi@gmail.com',
    plan: 'pro',
    amount: 49137,
    bank: 'BCA — 8839210928 A/N Budi Santoso',
    proof: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
    status: 'pending',
    date: '14 Okt 2026, 09.15 WIB',
  },
  {
    id: 'pay-2',
    user: 'PT Muda Kreatif Indonesia',
    email: 'admin@muda.id',
    plan: 'team',
    amount: 149452,
    bank: 'Bank Mandiri — 1280019283 A/N PT Muda Kreatif',
    proof: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
    status: 'pending',
    date: '14 Okt 2026, 08.40 WIB',
  },
  {
    id: 'pay-3',
    user: 'Sarah Rahmawati',
    email: 'sarah@udaplanner.id',
    plan: 'pro',
    amount: 49721,
    bank: 'BCA — 5271928311 A/N Sarah Rahmawati',
    proof: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
    status: 'approved',
    date: '12 Okt 2026, 14.10 WIB',
  },
];

let localUsers: AdminUserItem[] = [
  {
    id: 'usr-1',
    name: 'Administrator UdaPlanner',
    email: 'admin@udaplanner.id',
    role: 'admin',
    plan: 'team',
    planUntil: null,
    brandsCount: 5,
    storageMb: 120,
    isSuspended: false,
    createdAt: '10 Okt 2026',
  },
  {
    id: 'usr-2',
    name: 'Rizki Pratama',
    email: 'rizki@udacoding.id',
    role: 'user',
    plan: 'pro',
    planUntil: '12 Nov 2026',
    brandsCount: 3,
    storageMb: 450,
    isSuspended: false,
    createdAt: '11 Okt 2026',
  },
  {
    id: 'usr-3',
    name: 'Sarah Rahmawati',
    email: 'sarah@udaplanner.id',
    role: 'user',
    plan: 'free',
    planUntil: null,
    brandsCount: 1,
    storageMb: 45,
    isSuspended: false,
    createdAt: '12 Okt 2026',
  },
  {
    id: 'usr-4',
    name: 'Budi Santoso',
    email: 'budi@gmail.com',
    role: 'user',
    plan: 'free',
    planUntil: null,
    brandsCount: 1,
    storageMb: 15,
    isSuspended: false,
    createdAt: '13 Okt 2026',
  },
  {
    id: 'usr-5',
    name: 'Spam User Example',
    email: 'spam@botmail.com',
    role: 'user',
    plan: 'free',
    planUntil: null,
    brandsCount: 0,
    storageMb: 0,
    isSuspended: true,
    createdAt: '08 Okt 2026',
  },
];

let localPlans: EditablePlan[] = DUMMY_PLANS.map((p) => ({
  code: p.code as 'free' | 'pro' | 'team',
  name: p.name,
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
}));

let localSettings: AppSettingsData = {
  bankName: 'BCA (Bank Central Asia)',
  accountNumber: '8839210928',
  accountName: 'PT. Koding Teknologi Asia',
  adminWhatsapp: '6281234567890',
};

// LocalStorage Persistence Helpers for Admin
const getAdminStorage = <T>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const setAdminStorage = <T>(key: string, data: T) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
};

export class AdminService {
  // ==========================================
  // APP SETTINGS
  // ==========================================
  static async getAppSettings(): Promise<AppSettingsData> {
    const stored = getAdminStorage<AppSettingsData | null>('uda_admin_settings', null);
    if (stored) {
      localSettings = stored;
    }

    const supabase = createClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('app_settings' as any).select('*').eq('id', 1).maybeSingle();
        if (!error && data) {
          const d = data as any;
          localSettings = {
            bankName: d.bank_name || localSettings.bankName,
            accountNumber: d.bank_account_number || localSettings.accountNumber,
            accountName: d.bank_account_name || localSettings.accountName,
            adminWhatsapp: d.admin_whatsapp || localSettings.adminWhatsapp,
          };
          setAdminStorage('uda_admin_settings', localSettings);
          return localSettings;
        }
      } catch (err) {
        console.warn('AdminService.getAppSettings db fallback:', err);
      }
    }
    return localSettings;
  }

  static async updateAppSettings(settings: AppSettingsData): Promise<boolean> {
    localSettings = { ...settings };
    setAdminStorage('uda_admin_settings', localSettings);

    const supabase = createClient();
    if (supabase) {
      try {
        await (supabase.from('app_settings' as any) as any).upsert({
          id: 1,
          bank_name: settings.bankName,
          bank_account_number: settings.accountNumber,
          bank_account_name: settings.accountName,
          admin_whatsapp: settings.adminWhatsapp,
          updated_at: new Date().toISOString(),
        });
        return true;
      } catch (err) {
        console.warn('AdminService.updateAppSettings db error:', err);
      }
    }
    return true;
  }


  // ==========================================
  // PEMBAYARAN / PAYMENTS
  // ==========================================
  static async getPayments(): Promise<AdminPaymentItem[]> {
    const stored = getAdminStorage<AdminPaymentItem[]>('uda_admin_payments', []);
    const supabase = createClient();
    if (supabase) {
      try {
        const [payRes, profRes] = await Promise.all([
          supabase.from('payments' as any).select('*').order('created_at', { ascending: false }),
          supabase.from('profiles' as any).select('id, full_name, email'),
        ]);

        if (!payRes.error && payRes.data && payRes.data.length > 0) {
          const profMap = new Map((profRes.data || []).map((pr: any) => [pr.id, pr]));
          const dbPayments: AdminPaymentItem[] = payRes.data.map((p: any) => {
            const prof: any = profMap.get(p.user_id) || {};
            return {
              id: p.id,
              userId: p.user_id,
              user: p.sender_name || prof.full_name || 'Pelanggan',
              email: prof.email || (p.sender_name ? `${p.sender_name.toLowerCase().replace(/\s+/g, '')}@gmail.com` : 'pelanggan@udaplanner.id'),
              plan: (p.plan_code as any) || 'pro',
              amount: p.amount || 49000,
              bank: `${p.sender_bank || 'Transfer'} — A/N ${p.sender_name || prof.full_name || 'Pelanggan'}`,
              proof: p.proof_path || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
              status: p.status || 'pending',
              date: new Date(p.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
              reason: p.admin_note,
            };
          });

          const dbIds = new Set(dbPayments.map((p) => p.id));
          const combined = [
            ...dbPayments,
            ...stored.filter((st) => !dbIds.has(st.id)),
            ...localPayments.filter((lp) => !dbIds.has(lp.id) && !stored.some((st) => st.id === lp.id)),
          ];
          setAdminStorage('uda_admin_payments', combined);
          return combined;
        }
      } catch (err) {
        console.warn('AdminService.getPayments db fallback:', err);
      }
    }

    if (stored.length > 0) {
      const storedIds = new Set(stored.map((p) => p.id));
      return [...stored, ...localPayments.filter((lp) => !storedIds.has(lp.id))];
    }
    return [...localPayments];
  }

  static async approvePayment(paymentId: string, userId?: string, planCode: string = 'pro'): Promise<boolean> {
    const supabase = createClient();
    if (supabase) {
      try {
        await (supabase.from('payments' as any) as any)
          .update({
            status: 'approved',
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', paymentId);

        if (userId) {
          const planUntil = new Date(Date.now() + 30 * 86400000).toISOString();
          await (supabase.from('accounts' as any) as any)
            .update({
              plan_code: planCode,
              plan_until: planUntil,
            })
            .eq('user_id', userId);
        }
      } catch (err) {
        console.warn('AdminService.approvePayment db error:', err);
      }
    }

    localPayments = localPayments.map((p) => (p.id === paymentId ? { ...p, status: 'approved' } : p));
    const currentStored = getAdminStorage<AdminPaymentItem[]>('uda_admin_payments', localPayments);
    const updated = currentStored.map((p) => (p.id === paymentId ? { ...p, status: 'approved' } : p));
    setAdminStorage('uda_admin_payments', updated);
    return true;
  }

  static async rejectPayment(paymentId: string, reason: string): Promise<boolean> {
    const supabase = createClient();
    if (supabase) {
      try {
        await (supabase.from('payments' as any) as any)
          .update({
            status: 'rejected',
            admin_note: reason,
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', paymentId);
      } catch (err) {
        console.warn('AdminService.rejectPayment db error:', err);
      }
    }

    localPayments = localPayments.map((p) => (p.id === paymentId ? { ...p, status: 'rejected', reason } : p));
    const currentStored = getAdminStorage<AdminPaymentItem[]>('uda_admin_payments', localPayments);
    const updated = currentStored.map((p) => (p.id === paymentId ? { ...p, status: 'rejected', reason } : p));
    setAdminStorage('uda_admin_payments', updated);
    return true;
  }

  // ==========================================
  // PENGGUNA / ACCOUNTS
  // ==========================================
  static async getAdminUsers(): Promise<AdminUserItem[]> {
    const stored = getAdminStorage<AdminUserItem[]>('uda_admin_users', []);
    const supabase = createClient();
    if (supabase) {
      try {
        const [accRes, profRes] = await Promise.all([
          supabase.from('accounts' as any).select('*'),
          supabase.from('profiles' as any).select('*'),
        ]);

        if (!accRes.error && accRes.data && accRes.data.length > 0) {
          const profilesMap = new Map((profRes.data || []).map((p: any) => [p.id, p]));
          const dbUsers: AdminUserItem[] = accRes.data.map((a: any) => {
            const prof = profilesMap.get(a.user_id) || {};
            return {
              id: a.id,
              userId: a.user_id,
              name: prof.full_name || 'Pengguna UdaPlanner',
              email: prof.email || 'user@udaplanner.id',
              role: a.role || 'user',
              plan: a.plan_code || 'free',
              planUntil: a.plan_until ? new Date(a.plan_until).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : null,
              brandsCount: 1,
              storageMb: a.plan_code === 'team' ? 120 : a.plan_code === 'pro' ? 450 : 25,
              isSuspended: a.is_suspended ?? false,
              createdAt: a.created_at ? new Date(a.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '10 Okt 2026',
            };
          });

          const dbIds = new Set(dbUsers.map((u) => u.id));
          const combined = [
            ...dbUsers,
            ...stored.filter((st) => !dbIds.has(st.id)),
            ...localUsers.filter((lu) => !dbIds.has(lu.id) && !stored.some((st) => st.id === lu.id)),
          ];
          setAdminStorage('uda_admin_users', combined);
          return combined;
        }
      } catch (err) {
        console.warn('AdminService.getAdminUsers db fallback:', err);
      }
    }

    if (stored.length > 0) {
      const storedIds = new Set(stored.map((u) => u.id));
      return [...stored, ...localUsers.filter((lu) => !storedIds.has(lu.id))];
    }
    return [...localUsers];
  }

  static async updateUserPlan(userIdOrAccountId: string, newPlan: 'free' | 'pro' | 'team', durationDays: number): Promise<boolean> {
    const planUntil = newPlan === 'free' ? null : new Date(Date.now() + durationDays * 86400000).toISOString();
    const supabase = createClient();
    if (supabase) {
      try {
        await (supabase.from('accounts' as any) as any)
          .update({
            plan_code: newPlan,
            plan_until: planUntil,
          })
          .or(`user_id.eq.${userIdOrAccountId},id.eq.${userIdOrAccountId}`);
      } catch (err) {
        console.warn('AdminService.updateUserPlan db error:', err);
      }
    }

    const updater = (u: AdminUserItem) => {
      if (u.id === userIdOrAccountId || u.userId === userIdOrAccountId) {
        return {
          ...u,
          plan: newPlan,
          planUntil: planUntil ? new Date(planUntil).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : null,
        };
      }
      return u;
    };

    localUsers = localUsers.map(updater);
    const currentStored = getAdminStorage<AdminUserItem[]>('uda_admin_users', localUsers);
    setAdminStorage('uda_admin_users', currentStored.map(updater));
    return true;
  }

  static async toggleUserSuspend(userIdOrAccountId: string, isSuspended: boolean): Promise<boolean> {
    const supabase = createClient();
    if (supabase) {
      try {
        await (supabase.from('accounts' as any) as any)
          .update({ is_suspended: isSuspended })
          .or(`user_id.eq.${userIdOrAccountId},id.eq.${userIdOrAccountId}`);
      } catch (err) {
        console.warn('AdminService.toggleUserSuspend db error:', err);
      }
    }

    const updater = (u: AdminUserItem) => {
      if (u.id === userIdOrAccountId || u.userId === userIdOrAccountId) {
        return { ...u, isSuspended };
      }
      return u;
    };

    localUsers = localUsers.map(updater);
    const currentStored = getAdminStorage<AdminUserItem[]>('uda_admin_users', localUsers);
    setAdminStorage('uda_admin_users', currentStored.map(updater));
    return true;
  }

  static async deleteUserPermanently(userIdOrAccountId: string, email?: string): Promise<{ success: boolean; message: string }> {
    // 1. Panggil API route server untuk menghapus secara permanen dari Supabase Auth dan database
    try {
      await fetch(`/api/admin/users/${userIdOrAccountId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } catch (apiErr) {
      console.warn('API route deleteUserPermanently error:', apiErr);
    }

    // 2. Direct database cleanup via Supabase client jika aktif di browser
    const supabase = createClient();
    if (supabase) {
      try {
        await Promise.allSettled([
          supabase.from('posts' as any).delete().eq('created_by', userIdOrAccountId),
          supabase.from('snippets' as any).delete().eq('created_by', userIdOrAccountId),
          supabase.from('brand_members' as any).delete().eq('user_id', userIdOrAccountId),
          supabase.from('brands' as any).delete().eq('owner_id', userIdOrAccountId),
          supabase.from('payments' as any).delete().eq('user_id', userIdOrAccountId),
          supabase.from('accounts' as any).delete().or(`user_id.eq.${userIdOrAccountId},id.eq.${userIdOrAccountId}`),
          supabase.from('profiles' as any).delete().eq('id', userIdOrAccountId),
        ]);
        if (email) {
          await supabase.from('profiles' as any).delete().eq('email', email);
        }
      } catch (dbErr) {
        console.warn('Direct db delete fallback error:', dbErr);
      }
    }

    // 3. Bersihkan memori dan LocalStorage
    localUsers = localUsers.filter((u) => u.id !== userIdOrAccountId && u.userId !== userIdOrAccountId);
    const currentStored = getAdminStorage<AdminUserItem[]>('uda_admin_users', localUsers);
    const filteredStored = currentStored.filter((u) => u.id !== userIdOrAccountId && u.userId !== userIdOrAccountId);
    setAdminStorage('uda_admin_users', filteredStored);

    if (typeof window !== 'undefined') {
      try {
        // Hapus dari penyimpanan verifikasi admin
        const storedVer = localStorage.getItem('uda_verifiable_users');
        if (storedVer) {
          const list = JSON.parse(storedVer);
          if (Array.isArray(list)) {
            const filtered = list.filter((u: any) => u.id !== userIdOrAccountId && u.userId !== userIdOrAccountId && u.email !== email);
            localStorage.setItem('uda_verifiable_users', JSON.stringify(filtered));
          }
        }

        // Hapus state onboarding user agar saat didaftarkan ulang murni fresh
        localStorage.removeItem('uda_custom_avatar_' + userIdOrAccountId);
        localStorage.removeItem('uda_profile_setup_done_' + userIdOrAccountId);
        localStorage.removeItem('uda_has_logged_in_before_' + userIdOrAccountId);
        localStorage.removeItem('uda_disable_auto_tour_' + userIdOrAccountId);
      } catch (e) {}
    }

    return {
      success: true,
      message: 'Pengguna berhasil dihapus secara permanen. Email kini dapat didaftarkan kembali sebagai akun baru.',
    };
  }

  // ==========================================
  // PAKET / PLANS
  // ==========================================
  static async getPlans(): Promise<EditablePlan[]> {
    const stored = getAdminStorage<EditablePlan[]>('uda_admin_plans', []);
    const supabase = createClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('plans' as any).select('*').order('sort_order', { ascending: true });
        if (!error && data && data.length > 0) {
          const dbPlans: EditablePlan[] = data.map((p: any) => ({
            code: p.code as any,
            name: p.name,
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
          }));
          setAdminStorage('uda_admin_plans', dbPlans);
          return dbPlans;
        }
      } catch (err) {
        console.warn('AdminService.getPlans db fallback:', err);
      }
    }

    if (stored.length > 0) return stored;
    return [...localPlans];
  }

  static async updatePlan(code: string, updates: Partial<EditablePlan>): Promise<boolean> {
    const supabase = createClient();
    if (supabase) {
      try {
        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.price !== undefined) dbUpdates.price = updates.price;
        if (updates.maxBrands !== undefined) dbUpdates.max_brands = updates.maxBrands;
        if (updates.maxMembers !== undefined) dbUpdates.max_members = updates.maxMembers;
        if (updates.storageMb !== undefined) dbUpdates.storage_mb = updates.storageMb;
        if (updates.allowVideo !== undefined) dbUpdates.allow_video = updates.allowVideo;
        if (updates.allowGrid !== undefined) dbUpdates.allow_grid = updates.allowGrid;
        if (updates.allowExport !== undefined) dbUpdates.allow_export = updates.allowExport;
        if (updates.allowApproval !== undefined) dbUpdates.allow_approval = updates.allowApproval;
        if (updates.allowComments !== undefined) dbUpdates.allow_comments = updates.allowComments;
        dbUpdates.updated_at = new Date().toISOString();

        await (supabase.from('plans' as any) as any)
          .update(dbUpdates)
          .eq('code', code);
      } catch (err) {
        console.warn('AdminService.updatePlan db error:', err);
      }
    }

    localPlans = localPlans.map((p) => (p.code === code ? { ...p, ...updates } : p));
    const currentStored = getAdminStorage<EditablePlan[]>('uda_admin_plans', localPlans);
    setAdminStorage('uda_admin_plans', currentStored.map((p) => (p.code === code ? { ...p, ...updates } : p)));
    return true;
  }
}

