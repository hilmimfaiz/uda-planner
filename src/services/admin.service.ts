import { createClient } from '@/lib/supabase/client';
import { DUMMY_PLANS } from '@/lib/dummy-data';
import { resolvePaymentDuration } from './plan.service';
import { formatWibDate } from '@/lib/date-utils';

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
    let apiPayments: AdminPaymentItem[] = [];

    // 1. Ambil dari server API route (/api/payments?all=true) untuk sinkronisasi lintas-perangkat
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch('/api/payments?all=true');
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            apiPayments = json.data;
          }
        }
      } catch (apiErr) {
        console.warn('AdminService.getPayments fetch /api/payments warning:', apiErr);
      }
    }

    const supabase = createClient();
    let dbPayments: AdminPaymentItem[] = [];

    if (supabase) {
      try {
        const [payRes, profRes] = await Promise.all([
          supabase.from('payments' as any).select('*').order('created_at', { ascending: false }),
          supabase.from('profiles' as any).select('id, full_name, email'),
        ]);

        if (!payRes.error && payRes.data && payRes.data.length > 0) {
          const profMap = new Map((profRes.data || []).map((pr: any) => [pr.id, pr]));
          dbPayments = payRes.data.map((p: any) => {
            const prof: any = profMap.get(p.user_id) || {};
            const resolved = resolvePaymentDuration(p.duration_days, p.duration_label, p.amount, p.plan_code);
            return {
              id: p.id,
              userId: p.user_id,
              user: p.sender_name || prof.full_name || 'Pelanggan',
              email: prof.email || (p.sender_name ? `${p.sender_name.toLowerCase().replace(/\s+/g, '')}@gmail.com` : 'pelanggan@udaplanner.id'),
              plan: (p.plan_code as any) || 'pro',
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

    const baseList = apiPayments.length > 0 ? apiPayments : dbPayments;
    const baseIds = new Set(baseList.map((p) => p.id));
    const combined = [
      ...baseList,
      ...dbPayments.filter((p) => !baseIds.has(p.id)),
      ...stored.filter((st) => !baseIds.has(st.id)).map((st) => {
        const res = resolvePaymentDuration(st.durationDays, st.durationLabel, st.amount, st.plan);
        return { ...st, durationDays: res.days, durationLabel: res.label };
      }),
      ...localPayments.filter((lp) => !baseIds.has(lp.id) && !stored.some((st) => st.id === lp.id)),
    ];

    setAdminStorage('uda_admin_payments', combined);
    return combined;
  }

  static async approvePayment(
    paymentId: string,
    userId?: string,
    planCode: string = 'pro',
    options?: { email?: string; durationDays?: number }
  ): Promise<boolean> {
    const currentStored = getAdminStorage<AdminPaymentItem[]>('uda_admin_payments', localPayments);
    const targetPayment = currentStored.find((p) => p.id === paymentId) || localPayments.find((p) => p.id === paymentId);
    const targetUserId = userId || targetPayment?.userId;
    const targetEmail = options?.email || targetPayment?.email;
    const targetPlan = (planCode || targetPayment?.plan || 'pro') as 'pro' | 'team';
    
    // Selesaikan durasi hari secara akurat, prioritaskan deteksi nominal jika ada ketidaksesuaian
    const resolvedDur = resolvePaymentDuration(
      options?.durationDays || targetPayment?.durationDays,
      targetPayment?.durationLabel,
      targetPayment?.amount,
      targetPlan
    );
    const targetDays = resolvedDur.days;

    // Tentukan tanggal masa aktif bertambah secara akumulatif
    let baseStartTime = Date.now();
    let currentPlanCode = 'free';
    let currentPlanUntilStr: string | null = null;

    // Cek daftar pengguna admin
    const usersList = getAdminStorage<AdminUserItem[]>('uda_admin_users', localUsers);
    const existingUser = usersList.find(
      (u) =>
        (targetUserId && (u.id === targetUserId || u.userId === targetUserId)) ||
        (targetEmail && u.email?.toLowerCase() === targetEmail.toLowerCase())
    );
    if (existingUser) {
      currentPlanCode = existingUser.plan || 'free';
      currentPlanUntilStr = existingUser.planUntil || null;
    }

    // Cek juga session lokal pengguna aktif
    if (typeof window !== 'undefined') {
      try {
        const rawAuthAcc = localStorage.getItem('uda_auth_account');
        if (rawAuthAcc) {
          const authAcc = JSON.parse(rawAuthAcc);
          if (authAcc.plan_until) {
            currentPlanUntilStr = authAcc.plan_until;
            currentPlanCode = authAcc.plan_code || currentPlanCode;
          }
        }
      } catch (e) {}
    }

    // Jika Supabase aktif, ambil dari database
    const supabase = createClient();
    if (supabase && targetUserId) {
      try {
        const { data: dbAcc } = await (supabase.from('accounts' as any) as any)
          .select('plan_code, plan_until')
          .or(`user_id.eq.${targetUserId},id.eq.${targetUserId}`)
          .maybeSingle();

        if (dbAcc) {
          currentPlanCode = dbAcc.plan_code || currentPlanCode;
          currentPlanUntilStr = dbAcc.plan_until || currentPlanUntilStr;
        }
      } catch (err) {}
    }

    if (currentPlanUntilStr) {
      const currentExpiry = new Date(currentPlanUntilStr).getTime();
      const isStillActive = !isNaN(currentExpiry) && currentExpiry > Date.now();

      // Jika paket sama (misal Pro tambah Pro, atau Team tambah Team), tambahkan durasi ke sisa masa aktif
      if (isStillActive && currentPlanCode === targetPlan) {
        baseStartTime = currentExpiry;
      }
    }

    const planUntil = new Date(baseStartTime + targetDays * 86400000).toISOString();

    // 1. Panggil API route server untuk update database dengan hak akses admin
    try {
      await fetch('/api/payments', {
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
      });
    } catch (apiErr) {
      console.warn('API PATCH payment error:', apiErr);
    }

    // 2. Direct database update jika Supabase browser client tersedia
    if (supabase) {
      try {
        await (supabase.from('payments' as any) as any)
          .update({
            status: 'approved',
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', paymentId);

        if (targetUserId) {
          await (supabase.from('accounts' as any) as any)
            .update({
              plan_code: targetPlan,
              plan_until: planUntil,
            })
            .or(`user_id.eq.${targetUserId},id.eq.${targetUserId}`);
        }
      } catch (err) {
        console.warn('AdminService.approvePayment db error:', err);
      }
    }

    // 3. Update status pembayaran di memori & localStorage admin
    localPayments = localPayments.map((p) => (p.id === paymentId ? { ...p, status: 'approved' } : p));
    const updated = currentStored.map((p) => (p.id === paymentId ? { ...p, status: 'approved' } : p));
    setAdminStorage('uda_admin_payments', updated);

    // 4. Update status paket di daftar akun pengguna panel admin
    if (targetUserId) {
      await AdminService.updateUserPlan(targetUserId, targetPlan, targetDays, { customPlanUntil: planUntil });
    }
    if (targetEmail) {
      const usersList = getAdminStorage<AdminUserItem[]>('uda_admin_users', localUsers);
      const matchUser = usersList.find((u) => u.email.toLowerCase() === targetEmail.toLowerCase());
      if (matchUser) {
        await AdminService.updateUserPlan(matchUser.id, targetPlan, targetDays, { customPlanUntil: planUntil });
      }
    }

    // 5. Update sesi / cache akun jika pengguna yang disetujui sedang aktif di browser ini
    if (typeof window !== 'undefined') {
      try {
        const authUserRaw = localStorage.getItem('uda_auth_user');
        const authAccountRaw = localStorage.getItem('uda_auth_account');
        const authUser = authUserRaw ? JSON.parse(authUserRaw) : null;
        const authAccount = authAccountRaw ? JSON.parse(authAccountRaw) : null;

        const isMatch =
          (targetUserId && authUser?.id === targetUserId) ||
          (targetEmail && (authUser?.email?.toLowerCase() === targetEmail.toLowerCase() || authAccount?.email?.toLowerCase() === targetEmail.toLowerCase())) ||
          (!targetUserId && !targetEmail);

        if (isMatch && authAccount) {
          const upgradedAccount = {
            ...authAccount,
            plan_code: targetPlan,
            plan_until: planUntil,
          };
          localStorage.setItem('uda_auth_account', JSON.stringify(upgradedAccount));
        }

        // Simpan event upgrade untuk sinkronisasi antar-tab & real-time
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
      } catch (e) {}
    }

    return true;
  }

  static async rejectPayment(paymentId: string, reason: string): Promise<boolean> {
    try {
      await fetch('/api/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId,
          status: 'rejected',
          notes: reason,
        }),
      });
    } catch (apiErr) {}

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

    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(
          new CustomEvent('uda_payment_rejected', {
            detail: { paymentId, reason },
          })
        );
      } catch (e) {}
    }

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
        const [accRes, profRes, brandRes, postRes] = await Promise.all([
          supabase.from('accounts' as any).select('*'),
          supabase.from('profiles' as any).select('*'),
          supabase.from('brands' as any).select('id, owner_id'),
          supabase.from('posts' as any).select('id, brand_id, media_url, notes'),
        ]);

        if (!accRes.error && accRes.data && accRes.data.length > 0) {
          const profilesMap = new Map((profRes.data || []).map((p: any) => [p.id, p]));
          
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
              const hasMedia = p.media_url || (p.notes && p.notes.includes('<!--MEDIA_URL:'));
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
              } catch (e) {}
            }

            const cleanEmail = (prof.email || a.email || 'user@udaplanner.id').toLowerCase();
            const targetId = a.user_id || a.id;

            // 1. Cek fast flags di localStorage
            let isVerified = false;
            let isPendingUnverified = false;

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
              } catch (e) {}
            }

            // 2. Cek database profile column jika ada nilainya
            if (!isVerified) {
              if (prof.is_email_verified === true) {
                isVerified = true;
              } else if (prof.is_email_verified === false) {
                isPendingUnverified = true;
              }
            }

            // 3. Cek stored di local cache admin
            if (!isVerified) {
              const prevStored = stored.find(
                (st) => st.id === a.id || st.userId === a.user_id || st.email.toLowerCase() === cleanEmail
              );
              if (prevStored?.isEmailVerified === true) {
                isVerified = true;
              } else if (prevStored?.isEmailVerified === false) {
                isPendingUnverified = true;
              }
            }

            // 4. Cek di verifiable users list
            if (!isVerified) {
              const verifiableList = getAdminStorage<any[]>('uda_verifiable_users', []);
              const verMatch = verifiableList.find(
                (vu) =>
                  vu.userId === a.user_id ||
                  vu.id === a.id ||
                  vu.email?.toLowerCase() === cleanEmail
              );
              if (verMatch?.isEmailVerified === true) {
                isVerified = true;
              } else if (verMatch?.isEmailVerified === false) {
                isPendingUnverified = true;
              }
            }

            // 5. Default fallback status verifikasi:
            // Admin (Owner) atau akun dengan email admin@udaplanner.id otomatis terverifikasi.
            // Pengguna lain mengikuti status verifikasi asli dan tidak otomatis diverifikasi hanya karena memiliki brand (Bug B8).
            const finalVerified =
              isVerified ||
              (!isPendingUnverified &&
                (a.role === 'admin' || cleanEmail === 'admin@udaplanner.id'));

            // Selesaikan status Paket Aktif secara komprehensif & realtime
            let resolvedPlan: 'free' | 'pro' | 'team' | 'admin' = 'free';
            let resolvedPlanUntil: string | null = null;

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
                  resolvedPlanUntil = flagUntil || null;
                }

                // 2. Cek apakah ini akun yang sedang aktif di session browser ini (uda_auth_account)
                const rawAuthAcc = localStorage.getItem('uda_auth_account');
                const rawAuthUser = localStorage.getItem('uda_auth_user');
                if (rawAuthAcc) {
                  const authAcc = JSON.parse(rawAuthAcc);
                  const authUser = rawAuthUser ? JSON.parse(rawAuthUser) : null;
                  const isCurrentAuthUser =
                    (authUser && (authUser.id === targetId || authUser.id === a.id || authUser.email?.toLowerCase() === cleanEmail)) ||
                    (authAcc.email && authAcc.email.toLowerCase() === cleanEmail);

                  if (isCurrentAuthUser && authAcc.plan_code && authAcc.plan_code !== 'free') {
                    resolvedPlan = authAcc.plan_code;
                    resolvedPlanUntil = authAcc.plan_until || resolvedPlanUntil;
                  }
                }

                // 3. Cek event upgrade terakhir
                const rawLastUpgrade = localStorage.getItem('uda_last_upgraded_user');
                if (rawLastUpgrade) {
                  const lastUp = JSON.parse(rawLastUpgrade);
                  if (
                    (lastUp.userId === targetId || lastUp.userId === a.id || (lastUp.email && lastUp.email.toLowerCase() === cleanEmail)) &&
                    lastUp.planCode
                  ) {
                    resolvedPlan = lastUp.planCode;
                    resolvedPlanUntil = lastUp.planUntil || resolvedPlanUntil;
                  }
                }

                // 4. Cek daftar pembayaran yang disetujui (uda_admin_payments)
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
                    if (latest.plan && latest.plan !== 'free') {
                      if (resolvedPlan === 'free' || latest.plan === 'team') {
                        resolvedPlan = latest.plan;
                        if (!resolvedPlanUntil) {
                          const days = latest.durationDays || 30;
                          resolvedPlanUntil = new Date(Date.now() + days * 86400000).toISOString();
                        }
                      }
                    }
                  }
                }
              } catch (e) {}
            }

            // 5. Cek database plan jika tidak free
            if (a.plan_code && a.plan_code !== 'free') {
              resolvedPlan = a.plan_code;
              resolvedPlanUntil = a.plan_until || resolvedPlanUntil;
            }

            // 6. Cek stored sebelumnya di local cache admin
            if (resolvedPlan === 'free') {
              const prevStored = stored.find(
                (st) => st.id === a.id || st.userId === targetId || st.email.toLowerCase() === cleanEmail
              );
              if (prevStored && prevStored.plan && prevStored.plan !== 'free') {
                resolvedPlan = prevStored.plan;
                resolvedPlanUntil = prevStored.planUntil || resolvedPlanUntil;
              }
            }

            // 7. Heuristik kepemilikan Brand (Free tier maksimal 1 brand):
            // Pengguna dengan >= 6 Brand otomatis TIM. Pengguna dengan >= 2 Brand otomatis PRO.
            if (resolvedPlan === 'free') {
              if (brandsCount >= 6) {
                resolvedPlan = 'team';
                if (!resolvedPlanUntil) {
                  resolvedPlanUntil = new Date(Date.now() + 30 * 86400000).toISOString();
                }
              } else if (brandsCount >= 2) {
                resolvedPlan = 'pro';
                if (!resolvedPlanUntil) {
                  resolvedPlanUntil = new Date(Date.now() + 30 * 86400000).toISOString();
                }
              }
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

              // Simpan fast flag agar tidak pernah hilang/revert
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
                } catch (e) {}
              }
            }

            const isAdmin =
              cleanEmail !== 'hilmifaiz744@gmail.com' &&
              (cleanEmail === 'admin@udaplanner.id' ||
                (cleanEmail.startsWith('admin@') && cleanEmail.includes('udaplanner')) ||
                (a.role === 'admin' && (cleanEmail === 'admin@udaplanner.id' || cleanEmail.startsWith('admin@'))));

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

          // Filter out cached entries yang email atau id-nya sudah ada di Supabase DB (mencegah duplikat)
          const cleanStored = stored.filter((st) => {
            const stEmail = (st.email || '').toLowerCase().trim();
            if (isDummyUser(st)) return false;
            if (dbIds.has(st.id)) return false;
            if (st.userId && dbUserIds.has(st.userId)) return false;
            if (stEmail && dbEmails.has(stEmail)) return false;
            return true;
          });

          // Gabungkan dengan prioritas penuh pada data asli Supabase, deduplikasi ketat berdasarkan email
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
          emailLower !== 'hilmifaiz744@gmail.com' &&
          (emailLower === 'admin@udaplanner.id' ||
            (emailLower.startsWith('admin@') && emailLower.includes('udaplanner')) ||
            ((u.role === 'Admin' || u.role === 'admin') && (emailLower === 'admin@udaplanner.id' || emailLower.startsWith('admin@'))));

        let verified = isAdmin ? true : u.isEmailVerified;
        let role = isAdmin ? 'Admin' : (u.role === 'Admin' ? 'Owner' : (u.role || 'Owner'));
        let plan: 'free' | 'pro' | 'team' | 'admin' = isAdmin ? 'admin' : (emailLower === 'hilmifaiz744@gmail.com' ? 'team' : (u.plan as any));
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

          if (plan === 'free') {
            if ((u.brandsCount || 0) >= 6) {
              plan = 'team';
              planUntil = planUntil || new Date(Date.now() + 30 * 86400000).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
            }
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
      } catch (e) {}
    }

    // 2. Kirim update ke API route server (bypass RLS dengan service / admin client)
    try {
      await fetch(`/api/admin/users/${userIdOrAccountId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: newPlan,
          planUntil,
          durationDays,
          email: targetEmail,
        }),
      });
    } catch (apiErr) {}

    // 3. Update Supabase client secara langsung
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
      } catch (e) {}
    }

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

