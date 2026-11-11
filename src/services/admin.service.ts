import { createClient } from '@/lib/supabase/client';
import { DUMMY_PLANS } from '@/lib/dummy-data';
import { resolvePaymentDuration } from './plan.service';
import { formatWibDate } from '@/lib/date-utils';
import { VerificationService } from './verification.service';

export interface AdminPaymentItem {
  id: string;
  userId?: string;
  user: string;
  email: string;
  plan: 'free' | 'pro' | 'team';
  durationDays?: number;
  durationLabel?: string;
  amount: number;
  bank: string;
  proof: string;
  status: 'pending' | 'approved' | 'rejected';
  date: string;
  created_at?: string;
  reason?: string;
}

export interface AdminUserItem {
  id: string;
  userId?: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  phone?: string | null;
  role?: 'Admin' | 'Owner' | 'Reviewer' | 'Editor' | 'Viewer' | 'admin' | 'user' | string;
  plan: 'free' | 'pro' | 'team' | 'admin';
  planUntil: string | null;
  brandsCount: number;
  storageMb: number;
  postsCount?: number;
  isSuspended: boolean;
  createdAt: string;
  isEmailVerified?: boolean;
  registrationStatus?: 'pending' | 'verified' | 'rejected' | string;
  authMethod?: 'google' | 'email';
  isGoogleUser?: boolean;
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
let localPayments: AdminPaymentItem[] = [];

let localUsers: AdminUserItem[] = [];

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
      localSettings = { ...localSettings, ...stored };
    }

    if (typeof window !== 'undefined') {
      try {
        const wa = localStorage.getItem('uda_admin_whatsapp');
        if (wa) {
          localSettings.adminWhatsapp = wa;
        }
      } catch (e) {}
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
          if (typeof window !== 'undefined') {
            localStorage.setItem('uda_admin_whatsapp', localSettings.adminWhatsapp);
          }
          return localSettings;
        }
      } catch (err) {
        console.warn('AdminService.getAppSettings db fallback:', err);
      }
    }

    if (typeof window !== 'undefined') {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            localSettings = {
              bankName: json.data.bankName || localSettings.bankName,
              accountNumber: json.data.accountNumber || localSettings.accountNumber,
              accountName: json.data.accountName || localSettings.accountName,
              adminWhatsapp: json.data.adminWhatsapp || localSettings.adminWhatsapp,
            };
            setAdminStorage('uda_admin_settings', localSettings);
            localStorage.setItem('uda_admin_whatsapp', localSettings.adminWhatsapp);
          }
        }
      } catch {}
    }

    return localSettings;
  }

  static async updateAppSettings(settings: Partial<AppSettingsData>): Promise<boolean> {
    localSettings = { ...localSettings, ...settings };
    setAdminStorage('uda_admin_settings', localSettings);

    if (typeof window !== 'undefined') {
      try {
        if (localSettings.adminWhatsapp) {
          localStorage.setItem('uda_admin_whatsapp', localSettings.adminWhatsapp);
        }
        window.dispatchEvent(new CustomEvent('uda_settings_updated', { detail: localSettings }));
        window.dispatchEvent(new Event('storage'));
      } catch (e) {}
    }

    // Sinkronisasi via API server
    if (typeof window !== 'undefined') {
      try {
        await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(localSettings),
        });
      } catch (e) {}
    }

    const supabase = createClient();
    if (supabase) {
      try {
        await (supabase.from('app_settings' as any) as any).upsert({
          id: 1,
          bank_name: localSettings.bankName,
          bank_account_number: localSettings.accountNumber,
          bank_account_name: localSettings.accountName,
          admin_whatsapp: localSettings.adminWhatsapp,
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
  static isDummyPayment(p: any): boolean {
    if (!p) return true;
    if (['pay-1', 'pay-2', 'pay-3'].includes(p.id)) return true;
    if (['Budi Santoso', 'PT Muda Kreatif Indonesia', 'Sarah Rahmawati'].includes(p.user)) return true;
    return false;
  }

  static getCachedPayments(): AdminPaymentItem[] {
    const rawStored = getAdminStorage<AdminPaymentItem[]>('uda_admin_payments', []);
    return rawStored
      .filter((p) => !this.isDummyPayment(p))
      .map((p) => {
        const plan = ((p.plan || (p as any).plan_code || 'pro').toLowerCase() as 'free' | 'pro' | 'team');
        const res = resolvePaymentDuration(p.durationDays, p.durationLabel, p.amount, plan);
        return {
          ...p,
          plan,
          durationDays: res.days,
          durationLabel: res.label,
        };
      });
  }

  static getCachedAdminUsers(): AdminUserItem[] {
    const rawStored = getAdminStorage<AdminUserItem[]>('uda_admin_users', []);
    return rawStored.filter(
      (u) =>
        !(typeof u.id === 'string' && u.id.startsWith('usr-')) &&
        !(typeof u.userId === 'string' && u.userId.startsWith('usr-'))
    );
  }

  static async getPayments(): Promise<AdminPaymentItem[]> {
    const stored = this.getCachedPayments();
    const supabase = createClient();
    let dbPayments: AdminPaymentItem[] = [];

    // 1. Query langsung dari database Supabase (cepat ~50ms, tanpa overhead serverless API)
    if (supabase) {
      try {
        const [payRes, profRes] = await Promise.all([
          supabase.from('payments' as any).select('*').order('created_at', { ascending: false }),
          supabase.from('profiles' as any).select('id, full_name, email'),
        ]);

        if (!payRes.error && payRes.data && payRes.data.length > 0) {
          const profMap = new Map((profRes.data || []).map((pr: any) => [pr.id, pr]));
          dbPayments = payRes.data
            .filter((p: any) => !this.isDummyPayment(p))
            .map((p: any) => {
              const prof: any = profMap.get(p.user_id) || {};
              const plan = ((p.plan_code || 'pro').toLowerCase() as 'free' | 'pro' | 'team');
              const resolved = resolvePaymentDuration(p.duration_days, p.duration_label, p.amount, plan);
              return {
                id: p.id,
                userId: p.user_id,
                user: p.sender_name || prof.full_name || 'Pelanggan',
                email: prof.email || (p.sender_name ? `${p.sender_name.toLowerCase().replace(/\s+/g, '')}@gmail.com` : 'pelanggan@udaplanner.id'),
                plan,
                durationDays: resolved.days,
                durationLabel: resolved.label,
                amount: p.amount || 49000,
                bank: `${p.sender_bank || 'Transfer'} — A/N ${p.sender_name || prof.full_name || 'Pelanggan'}`,
                proof: p.proof_path || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
                status: p.status || 'pending',
                date: formatWibDate(p.created_at),
                reason: p.admin_note,
              };
            });
        }
      } catch (err) {
        console.warn('AdminService.getPayments db fallback:', err);
      }
    }

    // 2. Hanya fetch ke API server jika database kosong / offline
    let apiPayments: AdminPaymentItem[] = [];
    if (dbPayments.length === 0 && typeof window !== 'undefined') {
      try {
        const res = await fetch('/api/payments?all=true');
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            apiPayments = json.data
              .filter((p: any) => !this.isDummyPayment(p))
              .map((p: any) => {
                const plan = ((p.plan || p.plan_code || 'pro').toLowerCase() as 'free' | 'pro' | 'team');
                const resDur = resolvePaymentDuration(p.durationDays, p.durationLabel, p.amount, plan);
                return {
                  ...p,
                  plan,
                  durationDays: resDur.days,
                  durationLabel: resDur.label,
                };
              });
          }
        }
      } catch (apiErr) {
        console.warn('AdminService.getPayments fetch /api/payments warning:', apiErr);
      }
    }

    const mergedMap = new Map<string, AdminPaymentItem>();
    dbPayments.forEach((p) => mergedMap.set(p.id, p));
    apiPayments.forEach((p) => {
      const existing = mergedMap.get(p.id);
      if (!existing) {
        mergedMap.set(p.id, p);
      } else if (existing.status === 'pending' && p.status !== 'pending') {
        mergedMap.set(p.id, { ...existing, status: p.status, reason: p.reason || existing.reason });
      }
    });
    stored.forEach((st) => {
      const existing = mergedMap.get(st.id);
      if (!existing) {
        mergedMap.set(st.id, st);
      } else if (existing.status === 'pending' && st.status !== 'pending') {
        mergedMap.set(st.id, { ...existing, status: st.status, reason: st.reason || existing.reason });
      }
    });

    const combined = Array.from(mergedMap.values()).filter((p) => !this.isDummyPayment(p));
    setAdminStorage('uda_admin_payments', combined);
    return combined;
  }

  static async approvePayment(
    paymentId: string,
    userId?: string,
    planCode: string = 'pro',
    options?: { email?: string; durationDays?: number }
  ): Promise<boolean> {
    const currentStored = getAdminStorage<AdminPaymentItem[]>('uda_admin_payments', []);
    const targetPayment = currentStored.find((p) => p.id === paymentId);
    const targetUserId = userId || targetPayment?.userId;
    const targetEmail = options?.email || targetPayment?.email;
    const rawPlan = (planCode || targetPayment?.plan || (targetPayment as any)?.plan_code || 'pro').toLowerCase();
    const targetPlan: 'pro' | 'team' = rawPlan === 'team' ? 'team' : 'pro';

    // Selesaikan durasi hari secara akurat sesuai paket yang dipilih
    const resolvedDur = resolvePaymentDuration(
      options?.durationDays || targetPayment?.durationDays,
      targetPayment?.durationLabel,
      targetPayment?.amount,
      targetPlan
    );
    const targetDays = resolvedDur.days;

    // Tentukan tanggal masa aktif bertambah secara akumulatif jika sebelumnya masih berada pada paket yang sama
    let baseStartTime = Date.now();
    let currentPlanCode = 'free';
    let currentPlanUntilStr: string | null = null;

    const usersList = getAdminStorage<AdminUserItem[]>('uda_admin_users', localUsers);
    const existingUser = usersList.find(
      (u) =>
        (targetUserId && (u.id === targetUserId || u.userId === targetUserId)) ||
        (targetEmail && u.email?.toLowerCase() === targetEmail.toLowerCase())
    );
    if (existingUser) {
      currentPlanCode = (existingUser.plan || 'free').toLowerCase();
      currentPlanUntilStr = existingUser.planUntil || null;
    }

    const supabase = createClient();
    if (supabase && targetUserId) {
      try {
        const { data: dbAcc } = await (supabase.from('accounts' as any) as any)
          .select('plan_code, plan_until')
          .or(`user_id.eq.${targetUserId},id.eq.${targetUserId}`)
          .maybeSingle();

        if (dbAcc) {
          currentPlanCode = (dbAcc.plan_code || currentPlanCode).toLowerCase();
          currentPlanUntilStr = dbAcc.plan_until || currentPlanUntilStr;
        }
      } catch {}
    }

    if (currentPlanUntilStr) {
      const currentExpiry = new Date(currentPlanUntilStr).getTime();
      const isStillActive = !isNaN(currentExpiry) && currentExpiry > Date.now();
      if (isStillActive && currentPlanCode === targetPlan) {
        baseStartTime = currentExpiry;
      }
    }

    const planUntil = new Date(baseStartTime + targetDays * 86400000).toISOString();

    // Update status pembayaran di memori & localStorage admin secara instan
    localPayments = localPayments.map((p) => (p.id === paymentId ? { ...p, status: 'approved', plan: targetPlan } : p));
    const updated = currentStored.map((p) => (p.id === paymentId ? { ...p, status: 'approved', plan: targetPlan } : p));
    setAdminStorage('uda_admin_payments', updated);

    // Update sesi / cache lokal secara instan
    if (typeof window !== 'undefined') {
      try {
        const cleanTargetEmail = targetEmail?.toLowerCase().trim();
        const formattedUntil = new Date(planUntil).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });

        if (cleanTargetEmail) {
          localStorage.setItem(`uda_user_plan_${cleanTargetEmail}`, targetPlan);
          localStorage.setItem(`uda_user_plan_until_${cleanTargetEmail}`, formattedUntil);
        }
        if (targetUserId) {
          localStorage.setItem(`uda_user_plan_${targetUserId}`, targetPlan);
          localStorage.setItem(`uda_user_plan_until_${targetUserId}`, formattedUntil);
        }

        const authUserRaw = localStorage.getItem('uda_auth_user');
        const authAccountRaw = localStorage.getItem('uda_auth_account');
        const authUser = authUserRaw ? JSON.parse(authUserRaw) : null;
        const authAccount = authAccountRaw ? JSON.parse(authAccountRaw) : null;

        const isMatch =
          (targetUserId && authUser?.id === targetUserId) ||
          (cleanTargetEmail &&
            (authUser?.email?.toLowerCase() === cleanTargetEmail ||
              authAccount?.email?.toLowerCase() === cleanTargetEmail)) ||
          (!targetUserId && !cleanTargetEmail);

        if (isMatch && authAccount) {
          const upgradedAccount = {
            ...authAccount,
            plan_code: targetPlan,
            plan_until: planUntil,
          };
          localStorage.setItem('uda_auth_account', JSON.stringify(upgradedAccount));
        }

        localStorage.setItem(
          'uda_last_upgraded_user',
          JSON.stringify({
            userId: targetUserId,
            email: targetEmail,
            planCode: targetPlan,
            planUntil,
            paymentId,
            timestamp: Date.now(),
          })
        );

        window.dispatchEvent(
          new CustomEvent('uda_account_updated', {
            detail: {
              userId: targetUserId,
              email: targetEmail,
              planCode: targetPlan,
              planUntil,
            },
          })
        );
        window.dispatchEvent(
          new CustomEvent('uda_payment_approved', {
            detail: {
              paymentId,
              userId: targetUserId,
              email: targetEmail,
              planCode: targetPlan,
              planUntil,
            },
          })
        );
      } catch {}
    }

    // Jalankan seluruh operasi database & API secara PARALEL agar tidak lambat
    await Promise.allSettled([
      fetch('/api/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId,
          status: 'approved',
          userId: targetUserId,
          userEmail: targetEmail,
          planCode: targetPlan,
          durationDays: targetDays,
          customPlanUntil: planUntil,
        }),
      }),
      (async () => {
        if (!supabase) return;
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paymentId);
        if (isUuid) {
          await (supabase.from('payments' as any) as any)
            .update({
              status: 'approved',
              plan_code: targetPlan,
              reviewed_at: new Date().toISOString(),
            })
            .eq('id', paymentId);
        }
        if (targetUserId) {
          await (supabase.from('accounts' as any) as any)
            .update({
              plan_code: targetPlan,
              plan_until: planUntil,
            })
            .or(`user_id.eq.${targetUserId},id.eq.${targetUserId}`);
        }
      })(),
      targetUserId
        ? AdminService.updateUserPlan(targetUserId, targetPlan, targetDays, {
            customPlanUntil: planUntil,
            email: targetEmail,
          })
        : Promise.resolve(true),
      (async () => {
        if (targetEmail) {
          const matchUser = usersList.find((u) => u.email.toLowerCase() === targetEmail.toLowerCase());
          if (matchUser && matchUser.id !== targetUserId) {
            await AdminService.updateUserPlan(matchUser.id, targetPlan, targetDays, {
              customPlanUntil: planUntil,
              email: targetEmail,
            });
          }
        }
      })(),
    ]);

    return true;
  }

  static async rejectPayment(paymentId: string, reason: string): Promise<boolean> {
    localPayments = localPayments.map((p) => (p.id === paymentId ? { ...p, status: 'rejected', reason } : p));
    const currentStored = getAdminStorage<AdminPaymentItem[]>('uda_admin_payments', []);
    const updated = currentStored.map((p) => (p.id === paymentId ? { ...p, status: 'rejected', reason } : p));
    setAdminStorage('uda_admin_payments', updated);

    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(
          new CustomEvent('uda_payment_rejected', {
            detail: { paymentId, reason },
          })
        );
      } catch {}
    }

    const supabase = createClient();
    await Promise.allSettled([
      fetch('/api/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId,
          status: 'rejected',
          notes: reason,
        }),
      }),
      (async () => {
        if (!supabase) return;
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paymentId);
        if (isUuid) {
          await (supabase.from('payments' as any) as any)
            .update({
              status: 'rejected',
              admin_note: reason,
              reviewed_at: new Date().toISOString(),
            })
            .eq('id', paymentId);
        }
      })(),
    ]);

    return true;
  }

  static async deletePayments(paymentIds: string[]): Promise<{ success: boolean; count: number }> {
    if (!paymentIds || paymentIds.length === 0) return { success: true, count: 0 };

    const deleteSet = new Set(paymentIds);

    // 1. Bersihkan HANYA dari cache pembayaran lokal (status akun pengguna tidak disentuh)
    localPayments = localPayments.filter((p) => !deleteSet.has(p.id));
    const currentStored = getAdminStorage<AdminPaymentItem[]>('uda_admin_payments', []);
    const updated = currentStored.filter((p) => !deleteSet.has(p.id));
    setAdminStorage('uda_admin_payments', updated);

    // 2. Dispatch event ke seluruh komponen di browser
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(
          new CustomEvent('uda_payment_deleted', {
            detail: { deletedIds: paymentIds },
          })
        );
      } catch {}
    }

    // 3. Jalankan penghapusan di database Supabase & server API secara paralel
    const supabase = createClient();
    await Promise.allSettled([
      fetch('/api/payments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: paymentIds }),
      }),
      (async () => {
        if (!supabase) return;
        const uuidList = paymentIds.filter((id) =>
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
        );
        if (uuidList.length > 0) {
          await (supabase.from('payments' as any) as any).delete().in('id', uuidList);
        }
      })(),
    ]);

    return { success: true, count: paymentIds.length };
  }

  // ==========================================
  // PENGGUNA / ACCOUNTS
  // ==========================================
  static async getAdminUsers(): Promise<AdminUserItem[]> {
    const stored = getAdminStorage<AdminUserItem[]>('uda_admin_users', []);
    const supabase = createClient();
    if (supabase) {
      try {
        const [accRes, profRes, brandRes, postRes, verifiableUsers] = await Promise.all([
          supabase.from('accounts' as any).select('*'),
          supabase.from('profiles' as any).select('*'),
          supabase.from('brands' as any).select('id, owner_id'),
          supabase.from('posts' as any).select('id, brand_id, media_url, notes'),
          VerificationService.getVerifiableUsers().catch(() => []),
        ]);

        if (!accRes.error && accRes.data && accRes.data.length > 0) {
          const profilesMap = new Map((profRes.data || []).map((p: any) => [p.id, p]));

          // Map status verifikasi & deteksi akun Google aktual dari Supabase Auth
          const verifiedMap = new Map<string, boolean>();
          const googleUserSet = new Set<string>();
          if (Array.isArray(verifiableUsers)) {
            verifiableUsers.forEach((vu: any) => {
              const em = (vu.email || '').toLowerCase().trim();
              if (em) {
                verifiedMap.set(em, !!vu.isEmailVerified);
                if (vu.isGoogleUser || vu.authMethod === 'google') googleUserSet.add(em);
              }
              if (vu.userId) {
                verifiedMap.set(vu.userId, !!vu.isEmailVerified);
                if (vu.isGoogleUser || vu.authMethod === 'google') googleUserSet.add(vu.userId);
              }
              if (vu.id) {
                verifiedMap.set(vu.id, !!vu.isEmailVerified);
                if (vu.isGoogleUser || vu.authMethod === 'google') googleUserSet.add(vu.id);
              }
            });
          }

          // Hitung brand per pengguna
          const brandCountMap = new Map<string, number>();
          const userBrandIdsMap = new Map<string, Set<string>>();
          (brandRes.data || []).forEach((b: any) => {
            if (b.owner_id) {
              brandCountMap.set(b.owner_id, (brandCountMap.get(b.owner_id) || 0) + 1);
              if (!userBrandIdsMap.has(b.owner_id)) {
                userBrandIdsMap.set(b.owner_id, new Set<string>());
              }
              userBrandIdsMap.get(b.owner_id)!.add(b.id);
            }
          });

          // Hitung postingan & penyimpanan per brand
          const postCountMap = new Map<string, number>();
          const storageMap = new Map<string, number>();
          (postRes.data || []).forEach((p: any) => {
            if (p.brand_id) {
              postCountMap.set(p.brand_id, (postCountMap.get(p.brand_id) || 0) + 1);
              const hasMedia = p.media_url || (p.notes && p.notes.includes('<!--MEDIA_URL'));
              const size = hasMedia ? 8 : 1; // Estimasi 8MB per media foto/video
              storageMap.set(p.brand_id, (storageMap.get(p.brand_id) || 0) + size);
            }
          });

          const dbUsers: AdminUserItem[] = accRes.data.map((a: any) => {
            const prof = profilesMap.get(a.user_id) || {};
            const userBrands = userBrandIdsMap.get(a.user_id) || new Set<string>();
            const brandsCount = brandCountMap.get(a.user_id) || 0;

            let userPosts = 0;
            let userStorage = 0;
            userBrands.forEach((bId) => {
              userPosts += postCountMap.get(bId) || 0;
              userStorage += storageMap.get(bId) || 0;
            });

            let localAvatar: string | null = null;
            let localRole: string = 'Owner';
            if (typeof window !== 'undefined') {
              try {
                localAvatar = localStorage.getItem('uda_custom_avatar_' + a.user_id);
                const r = localStorage.getItem('uda_system_role_' + a.user_id);
                if (r) localRole = r;
              } catch {}
            }

            const cleanEmail = (prof.email || a.email || 'user@udaplanner.id').toLowerCase();
            const targetId = a.user_id || a.id;

            const isGoogle =
              googleUserSet.has(cleanEmail) ||
              googleUserSet.has(targetId) ||
              googleUserSet.has(a.id) ||
              prof.auth_provider === 'google' ||
              (typeof window !== 'undefined' && localStorage.getItem(`uda_auth_provider_${cleanEmail}`) === 'google');

            // 1. Cek dari verifiedMap aktual Supabase Auth
            let isVerified = false;
            let isPendingUnverified = false;

            if (verifiedMap.has(cleanEmail)) {
              isVerified = !!verifiedMap.get(cleanEmail);
              isPendingUnverified = !isVerified;
            } else if (verifiedMap.has(targetId)) {
              isVerified = !!verifiedMap.get(targetId);
              isPendingUnverified = !isVerified;
            } else if (isGoogle) {
              // Akun Google selalu otomatis terverifikasi tanpa verifikasi manual
              isVerified = true;
              isPendingUnverified = false;
            } else {
              // Cek fast flags di localStorage
              if (typeof window !== 'undefined') {
                try {
                  if (
                    localStorage.getItem(`uda_manually_verified_${cleanEmail}`) === 'true' ||
                    localStorage.getItem(`uda_manually_verified_${targetId}`) === 'true' ||
                    localStorage.getItem(`uda_manually_verified_${a.id}`) === 'true'
                  ) {
                    isVerified = true;
                  } else if (
                    localStorage.getItem(`uda_unverified_registration_${cleanEmail}`) === 'true' ||
                    localStorage.getItem(`uda_unverified_registration_${targetId}`) === 'true' ||
                    localStorage.getItem(`uda_unverified_registration_${a.id}`) === 'true'
                  ) {
                    isPendingUnverified = true;
                  }
                } catch {}
              }

              // Cek profile kolom database
              if (!isVerified) {
                if (prof.is_email_verified === true) {
                  isVerified = true;
                } else if (prof.is_email_verified === false) {
                  isPendingUnverified = true;
                }
              }
            }

            // Akun Google atau akun admin selalu otomatis terverifikasi
            if (isGoogle || cleanEmail === 'admin@udaplanner.id' || a.role === 'admin') {
              isVerified = true;
              isPendingUnverified = false;
            }

            const finalVerified = isVerified;

            // Selesaikan status Paket Aktif secara akurat sesuai paket langganan yang dipilih & disetujui
            let resolvedPlan: 'free' | 'pro' | 'team' | 'admin' = 'free';
            let resolvedPlanUntil: string | null = null;

            // Mulai dari database jika memiliki plan berbayar dengan masa berlaku yang sah
            if (a.plan_code && a.plan_code !== 'free') {
              // Abaikan nilai 'team' tanpa plan_until yang berasal dari bug lama
              if (!(a.plan_code === 'team' && !a.plan_until)) {
                resolvedPlan = a.plan_code.toLowerCase() as any;
                resolvedPlanUntil = a.plan_until || null;
              }
            }

            if (typeof window !== 'undefined') {
              try {
                // 1. Cek fast flags
                const flagPlan =
                  localStorage.getItem(`uda_user_plan_${cleanEmail}`) ||
                  localStorage.getItem(`uda_user_plan_${targetId}`) ||
                  localStorage.getItem(`uda_user_plan_${a.id}`);
                const flagUntil =
                  localStorage.getItem(`uda_user_plan_until_${cleanEmail}`) ||
                  localStorage.getItem(`uda_user_plan_until_${targetId}`) ||
                  localStorage.getItem(`uda_user_plan_until_${a.id}`);

                if (flagPlan === 'pro' || flagPlan === 'team' || flagPlan === 'free') {
                  resolvedPlan = flagPlan as any;
                  resolvedPlanUntil = flagUntil || resolvedPlanUntil;
                }

                // 2. Cek apakah ini akun yang sedang aktif di session browser ini
                const rawAuthAcc = localStorage.getItem('uda_auth_account');
                const rawAuthUser = localStorage.getItem('uda_auth_user');
                if (rawAuthAcc) {
                  const authAcc = JSON.parse(rawAuthAcc);
                  const authUser = rawAuthUser ? JSON.parse(rawAuthUser) : null;
                  const isCurrentAuthUser =
                    (authUser && (authUser.id === targetId || authUser.id === a.id || authUser.email?.toLowerCase() === cleanEmail)) ||
                    (authAcc.email && authAcc.email.toLowerCase() === cleanEmail);

                  if (isCurrentAuthUser && authAcc.plan_code && authAcc.plan_code !== 'free') {
                    resolvedPlan = authAcc.plan_code.toLowerCase();
                    resolvedPlanUntil = authAcc.plan_until || resolvedPlanUntil;
                  }
                }

                // 3. Cek daftar pembayaran yang disetujui (uda_admin_payments)
                const isExplicitlyCancelled =
                  localStorage.getItem('uda_subscription_cancelled_' + targetId) === 'true' ||
                  (cleanEmail && localStorage.getItem('uda_subscription_cancelled_' + cleanEmail) === 'true') ||
                  localStorage.getItem('uda_user_plan_' + targetId) === 'free' ||
                  (cleanEmail && localStorage.getItem('uda_user_plan_' + cleanEmail) === 'free');

                if (isExplicitlyCancelled || (a.plan_code === 'free' && !a.plan_until)) {
                  resolvedPlan = 'free';
                  resolvedPlanUntil = null;
                } else {
                  const rawPayments = localStorage.getItem('uda_admin_payments');
                  if (rawPayments) {
                    const payList = JSON.parse(rawPayments);
                    const myApproved = payList.filter(
                      (p: any) =>
                        (p.userId === targetId || p.userId === a.id || (p.email && p.email.toLowerCase() === cleanEmail)) &&
                        p.status === 'approved'
                    );
                    if (myApproved.length > 0) {
                      const latest = myApproved[0];
                      const latestPlan = (latest.plan || latest.plan_code || '').toLowerCase();
                      if (latestPlan === 'pro' || latestPlan === 'team') {
                        resolvedPlan = latestPlan as 'pro' | 'team';
                        if (!resolvedPlanUntil) {
                          const days = latest.durationDays || 30;
                          resolvedPlanUntil = new Date(Date.now() + days * 86400000).toISOString();
                        }
                      }
                    }
                  }
                }

                // 4. Cek event upgrade terakhir (jika baru saja di-approve / diubah admin)
                const rawLastUpgrade = localStorage.getItem('uda_last_upgraded_user');
                if (rawLastUpgrade) {
                  const lastUp = JSON.parse(rawLastUpgrade);
                  if (
                    (lastUp.userId === targetId || lastUp.userId === a.id || (lastUp.email && lastUp.email.toLowerCase() === cleanEmail)) &&
                    lastUp.planCode
                  ) {
                    resolvedPlan = lastUp.planCode.toLowerCase();
                    resolvedPlanUntil = lastUp.planUntil || resolvedPlanUntil;
                  }
                }
              } catch {}
            }

            // Format tanggal masa berlaku
            let formattedPlanUntil: string | null = null;
            if (resolvedPlan !== 'free' && resolvedPlan !== 'admin') {
              if (resolvedPlanUntil) {
                try {
                  const d = new Date(resolvedPlanUntil);
                  formattedPlanUntil = !isNaN(d.getTime())
                    ? d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                    : resolvedPlanUntil;
                } catch {
                  formattedPlanUntil = resolvedPlanUntil;
                }
              } else {
                formattedPlanUntil = new Date(Date.now() + 30 * 86400000).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                });
              }

              if (typeof window !== 'undefined') {
                try {
                  localStorage.setItem(`uda_user_plan_${cleanEmail}`, resolvedPlan);
                  localStorage.setItem(`uda_user_plan_${targetId}`, resolvedPlan);
                  localStorage.setItem(`uda_user_plan_${a.id}`, resolvedPlan);
                  if (formattedPlanUntil) {
                    localStorage.setItem(`uda_user_plan_until_${cleanEmail}`, formattedPlanUntil);
                    localStorage.setItem(`uda_user_plan_until_${targetId}`, formattedPlanUntil);
                    localStorage.setItem(`uda_user_plan_until_${a.id}`, formattedPlanUntil);
                  }
                } catch {}
              }
            }

            const isAdmin =
              a.role === 'admin' ||
              prof.role === 'admin' ||
              cleanEmail === 'admin@udaplanner.id' ||
              cleanEmail.startsWith('admin@') ||
              (typeof window !== 'undefined' && localStorage.getItem(`uda_is_admin_${cleanEmail}`) === 'true') ||
              (typeof window !== 'undefined' && localStorage.getItem(`uda_is_admin_${targetId}`) === 'true');

            const resolvedRole = isAdmin ? 'Admin' : (localRole === 'Admin' ? 'Owner' : (localRole || 'Owner'));
            const finalPlan: 'free' | 'pro' | 'team' | 'admin' = isAdmin ? 'admin' : resolvedPlan;
            const finalPlanUntil: string | null = isAdmin ? null : formattedPlanUntil;

            return {
              id: a.id,
              userId: a.user_id,
              name: prof.full_name || (isAdmin ? 'Administrator UdaPlanner' : 'Pengguna UdaPlanner'),
              email: prof.email || 'user@udaplanner.id',
              avatarUrl: prof.avatar_url || localAvatar || null,
              phone: prof.phone || null,
              role: resolvedRole as any,
              plan: finalPlan,
              planUntil: finalPlanUntil,
              brandsCount: brandsCount,
              postsCount: userPosts,
              storageMb: userStorage,
              isSuspended: a.is_suspended ?? false,
              createdAt: a.created_at ? new Date(a.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '10 Okt 2026',
              isEmailVerified: isAdmin ? true : finalVerified,
              registrationStatus: isAdmin ? 'verified' : (finalVerified ? 'verified' : 'pending'),
              authMethod: isGoogle ? 'google' : 'email',
              isGoogleUser: isGoogle,
            };
          });

          const isDummyUser = (u: any) =>
            (typeof u.id === 'string' && u.id.startsWith('usr-')) ||
            (typeof u.userId === 'string' && u.userId.startsWith('usr-')) ||
            [
              'budi@gmail.com',
              'dewi.agency@kreatif.com',
              'ahmad.fauzi@digitalhub.id',
              'siti@fashionhub.co',
              'hendrik@wijaya.media',
              'spam@botmail.com',
              'rizki@udacoding.id',
              'sarah@udaplanner.id',
            ].includes((u.email || '').toLowerCase());

          const dbIds = new Set(dbUsers.map((u) => u.id));
          const dbUserIds = new Set(dbUsers.map((u) => u.userId).filter(Boolean));
          const dbEmails = new Set(dbUsers.map((u) => (u.email || '').toLowerCase().trim()).filter(Boolean));

          const cleanStored = stored.filter((st) => {
            const stEmail = (st.email || '').toLowerCase().trim();
            if (isDummyUser(st)) return false;
            if (dbIds.has(st.id)) return false;
            if (st.userId && dbUserIds.has(st.userId)) return false;
            if (stEmail && dbEmails.has(stEmail)) return false;
            return true;
          });

          const seenEmails = new Set<string>();
          const combined: AdminUserItem[] = [];

          for (const u of dbUsers) {
            if (isDummyUser(u)) continue;
            const em = (u.email || '').toLowerCase().trim();
            if (em) {
              if (seenEmails.has(em)) continue;
              seenEmails.add(em);
            }
            combined.push(u);
          }

          // Sinkronisasikan pengguna dari Supabase Auth yang belum memiliki baris accounts
          if (Array.isArray(verifiableUsers)) {
            for (const vu of verifiableUsers) {
              if (isDummyUser(vu)) continue;
              const em = (vu.email || '').toLowerCase().trim();
              if (em && !seenEmails.has(em)) {
                seenEmails.add(em);
                combined.push({
                  id: vu.id,
                  userId: vu.userId || vu.id,
                  name: vu.name || em.split('@')[0],
                  email: vu.email,
                  avatarUrl: null,
                  phone: null,
                  role: vu.role === 'admin' ? 'Admin' : 'Owner',
                  plan: (vu.planCode as any) || 'free',
                  planUntil: null,
                  brandsCount: 0,
                  postsCount: 0,
                  storageMb: 0,
                  isSuspended: false,
                  createdAt: vu.registeredAt || 'Terbaru',
                  isEmailVerified: vu.isEmailVerified,
                  registrationStatus: vu.registrationStatus,
                  authMethod: vu.authMethod,
                  isGoogleUser: !!vu.isGoogleUser,
                });
              }
            }
          }

          for (const st of cleanStored) {
            const em = (st.email || '').toLowerCase().trim();
            if (em) {
              if (seenEmails.has(em)) continue;
              seenEmails.add(em);
            }
            combined.push(st);
          }

          setAdminStorage('uda_admin_users', combined);
          return combined;
        }
      } catch (err) {
        console.warn('AdminService.getAdminUsers db fallback:', err);
      }
    }

    const isDummyUser = (u: any) =>
      (typeof u.id === 'string' && u.id.startsWith('usr-')) ||
      (typeof u.userId === 'string' && u.userId.startsWith('usr-')) ||
      [
        'budi@gmail.com',
        'dewi.agency@kreatif.com',
        'ahmad.fauzi@digitalhub.id',
        'siti@fashionhub.co',
        'hendrik@wijaya.media',
        'spam@botmail.com',
        'rizki@udacoding.id',
        'sarah@udaplanner.id',
      ].includes((u.email || '').toLowerCase());

    const cleanStored = stored.filter((st) => !isDummyUser(st));
    if (cleanStored.length > 0) {
      setAdminStorage('uda_admin_users', cleanStored);
      const mapped = cleanStored.map((u) => {
        const emailLower = (u.email || '').toLowerCase();
        const isAdmin =
          emailLower === 'admin@udaplanner.id' ||
          (emailLower.startsWith('admin@') && emailLower.includes('udaplanner')) ||
          ((u.role === 'Admin' || u.role === 'admin') && (emailLower === 'admin@udaplanner.id' || emailLower.startsWith('admin@')));

        let verified = isAdmin ? true : u.isEmailVerified;
        let role = isAdmin ? 'Admin' : (u.role === 'Admin' ? 'Owner' : (u.role || 'Owner'));
        let plan: 'free' | 'pro' | 'team' | 'admin' = isAdmin ? 'admin' : ((u.plan as any) || 'free');
        let planUntil = isAdmin ? null : u.planUntil;

        if (typeof window !== 'undefined') {
          if (
            localStorage.getItem(`uda_manually_verified_${emailLower}`) === 'true' ||
            localStorage.getItem(`uda_manually_verified_${u.userId}`) === 'true' ||
            localStorage.getItem(`uda_manually_verified_${u.id}`) === 'true'
          ) {
            verified = true;
          }

          const flagPlan =
            localStorage.getItem(`uda_user_plan_${emailLower}`) ||
            localStorage.getItem(`uda_user_plan_${u.userId}`) ||
            localStorage.getItem(`uda_user_plan_${u.id}`);
          const flagUntil =
            localStorage.getItem(`uda_user_plan_until_${emailLower}`) ||
            localStorage.getItem(`uda_user_plan_until_${u.userId}`) ||
            localStorage.getItem(`uda_user_plan_until_${u.id}`);
          if (flagPlan === 'pro' || flagPlan === 'team' || flagPlan === 'free') {
            plan = flagPlan as any;
            planUntil = flagUntil || planUntil;
          }
        }

        if (isAdmin) {
          plan = 'admin';
          planUntil = null;
          role = 'Admin';
          verified = true;
        }

        return {
          ...u,
          name: isAdmin ? (u.name || 'Administrator UdaPlanner') : u.name,
          role: role as any,
          plan,
          planUntil,
          isEmailVerified: verified,
          registrationStatus: verified ? 'verified' : (u.registrationStatus || 'pending'),
        };
      });

      const seenEmails = new Set<string>();
      const deduped: AdminUserItem[] = [];
      for (const u of mapped) {
        const em = (u.email || '').toLowerCase().trim();
        if (em) {
          if (seenEmails.has(em)) continue;
          seenEmails.add(em);
        }
        deduped.push(u);
      }
      return deduped;
    }
    return [];
  }

  static async updateUserPlan(
    userIdOrAccountId: string,
    newPlan: 'free' | 'pro' | 'team',
    durationDays: number,
    options?: { customPlanUntil?: string; email?: string }
  ): Promise<boolean> {
    let planUntil: string | null = null;
    let formattedPlanUntil: string | null = null;
    const targetEmail = options?.email?.toLowerCase();

    if (newPlan !== 'free') {
      if (options?.customPlanUntil) {
        planUntil = options.customPlanUntil;
      } else {
        const usersList = getAdminStorage<AdminUserItem[]>('uda_admin_users', localUsers);
        const currentUser = usersList.find(
          (u) =>
            u.id === userIdOrAccountId ||
            u.userId === userIdOrAccountId ||
            (targetEmail && u.email?.toLowerCase() === targetEmail)
        );
        let baseTime = Date.now();
        if (currentUser && currentUser.planUntil && currentUser.plan === newPlan) {
          const expTime = new Date(currentUser.planUntil).getTime();
          if (!isNaN(expTime) && expTime > Date.now()) {
            baseTime = expTime;
          }
        }
        planUntil = new Date(baseTime + durationDays * 86400000).toISOString();
      }

      try {
        const d = new Date(planUntil);
        formattedPlanUntil = !isNaN(d.getTime())
          ? d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
          : planUntil;
      } catch {
        formattedPlanUntil = planUntil;
      }
    }

    // 1. Simpan Fast Flags di localStorage
    if (typeof window !== 'undefined') {
      try {
        if (targetEmail) {
          localStorage.setItem(`uda_user_plan_${targetEmail}`, newPlan);
          if (formattedPlanUntil) {
            localStorage.setItem(`uda_user_plan_until_${targetEmail}`, formattedPlanUntil);
          } else {
            localStorage.removeItem(`uda_user_plan_until_${targetEmail}`);
          }
        }
        localStorage.setItem(`uda_user_plan_${userIdOrAccountId}`, newPlan);
        if (formattedPlanUntil) {
          localStorage.setItem(`uda_user_plan_until_${userIdOrAccountId}`, formattedPlanUntil);
        } else {
          localStorage.removeItem(`uda_user_plan_until_${userIdOrAccountId}`);
        }

        // Cek jika ini user yang sedang login di sesi browser
        const rawAcc = localStorage.getItem('uda_auth_account');
        if (rawAcc) {
          const acc = JSON.parse(rawAcc);
          const rawUser = localStorage.getItem('uda_auth_user');
          const usr = rawUser ? JSON.parse(rawUser) : null;
          const isCurrent =
            (usr && (usr.id === userIdOrAccountId || (targetEmail && usr.email?.toLowerCase() === targetEmail))) ||
            (acc && (acc.id === userIdOrAccountId || acc.user_id === userIdOrAccountId));
          if (isCurrent) {
            acc.plan_code = newPlan;
            acc.plan_until = planUntil;
            localStorage.setItem('uda_auth_account', JSON.stringify(acc));
          }
        }
      } catch {}
    }

    const updater = (u: AdminUserItem) => {
      if (
        u.id === userIdOrAccountId ||
        u.userId === userIdOrAccountId ||
        (targetEmail && u.email?.toLowerCase() === targetEmail)
      ) {
        return {
          ...u,
          plan: newPlan,
          planUntil: formattedPlanUntil,
        };
      }
      return u;
    };

    localUsers = localUsers.map(updater);
    const currentStored = getAdminStorage<AdminUserItem[]>('uda_admin_users', localUsers);
    setAdminStorage('uda_admin_users', currentStored.map(updater));

    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(
          new CustomEvent('uda_account_updated', {
            detail: {
              userId: userIdOrAccountId,
              email: targetEmail,
              planCode: newPlan,
              planUntil: formattedPlanUntil,
            },
          })
        );
        window.dispatchEvent(new Event('storage'));
      } catch {}
    }

    const supabase = createClient();
    await Promise.allSettled([
      fetch(`/api/admin/users/${userIdOrAccountId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: newPlan,
          planUntil,
          durationDays,
          email: targetEmail,
        }),
      }),
      (async () => {
        if (!supabase) return;
        await (supabase.from('accounts' as any) as any)
          .update({
            plan_code: newPlan,
            plan_until: planUntil,
          })
          .or(`user_id.eq.${userIdOrAccountId},id.eq.${userIdOrAccountId}`);
      })(),
    ]);

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
    try {
      await fetch(`/api/admin/users/${userIdOrAccountId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } catch (apiErr) {
      console.warn('API route deleteUserPermanently error:', apiErr);
    }

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

    localUsers = localUsers.filter((u) => u.id !== userIdOrAccountId && u.userId !== userIdOrAccountId);
    const currentStored = getAdminStorage<AdminUserItem[]>('uda_admin_users', localUsers);
    const filteredStored = currentStored.filter((u) => u.id !== userIdOrAccountId && u.userId !== userIdOrAccountId);
    setAdminStorage('uda_admin_users', filteredStored);

    if (typeof window !== 'undefined') {
      try {
        const storedVer = localStorage.getItem('uda_verifiable_users');
        if (storedVer) {
          const list = JSON.parse(storedVer);
          if (Array.isArray(list)) {
            const filtered = list.filter((u: any) => u.id !== userIdOrAccountId && u.userId !== userIdOrAccountId && u.email !== email);
            localStorage.setItem('uda_verifiable_users', JSON.stringify(filtered));
          }
        }

        localStorage.removeItem('uda_custom_avatar_' + userIdOrAccountId);
        localStorage.removeItem('uda_profile_setup_done_' + userIdOrAccountId);
        localStorage.removeItem('uda_has_logged_in_before_' + userIdOrAccountId);
        localStorage.removeItem('uda_disable_auto_tour_' + userIdOrAccountId);
      } catch {}
    }

    return {
      success: true,
      message: 'Pengguna berhasil dihapus secara permanen. Email kini dapat didaftarkan kembali sebagai akun baru.',
    };
  }

  static async deleteMultipleUsersPermanently(
    usersToDelete: Array<{ id: string; userId?: string; email?: string }>
  ): Promise<{ success: boolean; count: number }> {
    for (const u of usersToDelete) {
      await AdminService.deleteUserPermanently(u.userId || u.id, u.email);
    }
    return { success: true, count: usersToDelete.length };
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
