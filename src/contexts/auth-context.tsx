'use client';

import React, { createContext, useContext, useEffect, useState, useTransition } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { getSiteUrl } from '@/lib/site-url';
import { VerificationService } from '@/services/verification.service';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  phone?: string | null;
  reminder_minutes?: number;
}

export interface UserAccount {
  id: string;
  user_id: string;
  role: 'user' | 'admin';
  plan_code: string;
  plan_until?: string | null;
  is_suspended?: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  account: UserAccount | null;
  isLoading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null; isAdmin?: boolean; needsOnboarding?: boolean }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null; requiresEmailConfirmation: boolean }>;
  signInWithGoogle: (targetPath?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('uda_auth_user');
        if (cached) return JSON.parse(cached);
      } catch (e) {}
    }
    return null;
  });
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('uda_auth_profile');
        if (cached) return JSON.parse(cached);
      } catch (e) {}
    }
    return null;
  });
  const [account, setAccount] = useState<UserAccount | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('uda_auth_account');
        if (cached) return JSON.parse(cached);
      } catch (e) {}
    }
    return null;
  });
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const supabase = createClient();
  const loadedUserIdRef = React.useRef<string | null>(null);

  // Helper untuk memuat data profil dan akun dari tabel Supabase secara paralel (bukan sequential)
  const loadUserData = async (currentUser: User) => {
    if (!supabase) return;

    // Set fallback instan dari metadata jika profile/account belum terisi
    setProfile((prev) => prev || {
      id: currentUser.id,
      email: currentUser.email || '',
      full_name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Pengguna UdaPlanner',
      reminder_minutes: 15,
    });
    setAccount((prev) => prev || {
      id: currentUser.id,
      user_id: currentUser.id,
      role: (currentUser.user_metadata?.role as 'user' | 'admin') || 'user',
      plan_code: 'free',
    });

    try {
      // Jalankan query profil dan akun secara bersamaan (PARALLEL)
      const [profRes, accRes] = await Promise.all([
        (supabase.from('profiles' as any) as any)
          .select('*')
          .eq('id', currentUser.id)
          .maybeSingle(),
        (supabase.from('accounts' as any) as any)
          .select('*')
          .eq('user_id', currentUser.id)
          .maybeSingle(),
      ]);

      // 1. Proses Profil
      let finalProfile: UserProfile;
      const googleFullName = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name;
      const googleAvatar = currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture;

      // Cek apakah ada avatar custom yang tersimpan di localStorage
      let localCustomAvatar: string | null = null;
      try {
        localCustomAvatar = localStorage.getItem('uda_custom_avatar_' + currentUser.id);
      } catch (e) {}

      const resolvedAvatar =
        profRes.data?.avatar_url ||
        localCustomAvatar ||
        (googleAvatar && typeof googleAvatar === 'string' && googleAvatar.trim().length > 5 ? googleAvatar : null);

      const isActuallyCompleted =
        currentUser.user_metadata?.has_completed_onboarding === true ||
        (typeof window !== 'undefined' && localStorage.getItem('uda_profile_setup_done_' + currentUser.id) === 'true');

      if (profRes.data) {
        if (isActuallyCompleted) {
          try {
            localStorage.removeItem('uda_google_auth_pending');
            localStorage.removeItem('uda_needs_profile_setup');
            localStorage.setItem('uda_profile_setup_done_' + currentUser.id, 'true');
            if (currentUser.user_metadata?.has_seen_dashboard_tour === true) {
              localStorage.setItem('uda_has_logged_in_before_' + currentUser.id, 'true');
              localStorage.setItem('uda_disable_auto_tour_' + currentUser.id, 'true');
              localStorage.setItem('uda_user_is_new', 'false');
            }
          } catch (e) {}
        } else {
          // Profil ada tetapi belum menyelesaikan onboarding /profil-awal
          try {
            localStorage.setItem('uda_user_is_new', 'true');
          } catch (e) {}
        }

        let localPhone: string | null = null;
        try {
          localPhone = localStorage.getItem('uda_custom_phone_' + currentUser.id);
        } catch (e) {}

        finalProfile = {
          id: profRes.data.id,
          email: profRes.data.email || currentUser.email || '',
          full_name: profRes.data.full_name || googleFullName || 'Pengguna UdaPlanner',
          avatar_url: resolvedAvatar,
          phone: profRes.data.phone || localPhone || currentUser.phone || null,
          reminder_minutes: profRes.data.reminder_minutes ?? 15,
        };
      } else {
        let localPhone: string | null = null;
        try {
          localPhone = localStorage.getItem('uda_custom_phone_' + currentUser.id);
        } catch (e) {}

        const newProfile = {
          id: currentUser.id,
          email: currentUser.email || '',
          full_name: googleFullName || currentUser.email?.split('@')[0] || 'Pengguna UdaPlanner',
          avatar_url: resolvedAvatar || null,
          phone: localPhone || currentUser.phone || null,
          role: 'user',
          reminder_minutes: 15,
        };
        const { data: createdProf } = await (supabase.from('profiles' as any) as any).insert(newProfile).select().maybeSingle();
        finalProfile = createdProf ? { ...createdProf, avatar_url: resolvedAvatar || createdProf.avatar_url, phone: createdProf.phone || localPhone } : newProfile;

        // Tandai sebagai user baru pada pendaftaran profil pertama kali
        try {
          localStorage.setItem('uda_user_is_new', 'true');
        } catch (e) {}
      }
      setProfile(finalProfile);
      try {
        localStorage.setItem('uda_auth_profile', JSON.stringify(finalProfile));
        if (finalProfile.avatar_url) {
          localStorage.setItem('uda_custom_avatar_' + currentUser.id, finalProfile.avatar_url);
        }
      } catch (e) {}

      // 2. Proses Akun
      let finalAccount: UserAccount;

      // Cek apakah ada upgrade paket yang tersimpan di cache lokal / admin
      let cachedLocalPlan: string | null = null;
      let cachedLocalPlanUntil: string | null = null;
      if (typeof window !== 'undefined') {
        try {
          const rawAcc = localStorage.getItem('uda_auth_account');
          if (rawAcc) {
            const parsed = JSON.parse(rawAcc);
            if (parsed.plan_code && parsed.plan_code !== 'free') {
              cachedLocalPlan = parsed.plan_code;
              cachedLocalPlanUntil = parsed.plan_until;
            }
          }
          const upgradeEvt = localStorage.getItem('uda_last_upgraded_user');
          if (upgradeEvt) {
            const parsedEvt = JSON.parse(upgradeEvt);
            if (
              (parsedEvt.userId === currentUser.id || (currentUser.email && parsedEvt.email?.toLowerCase() === currentUser.email.toLowerCase())) &&
              parsedEvt.planCode
            ) {
              cachedLocalPlan = parsedEvt.planCode;
              cachedLocalPlanUntil = parsedEvt.planUntil || cachedLocalPlanUntil;
            }
          }
        } catch (e) {}
      }

      if (accRes.data) {
        const resolvedPlan =
          accRes.data.plan_code && accRes.data.plan_code !== 'free'
            ? accRes.data.plan_code
            : cachedLocalPlan || 'free';
        let resolvedUntil = accRes.data.plan_until || cachedLocalPlanUntil;

        // Auto-heal / fix jika user memiliki pembayaran 1 tahun atau berdurasi panjang
        if (typeof window !== 'undefined') {
          try {
            const rawAdminPays = localStorage.getItem('uda_admin_payments');
            if (rawAdminPays) {
              const payList = JSON.parse(rawAdminPays);
              const myApproved = payList.filter(
                (p: any) =>
                  (p.userId === currentUser.id || (currentUser.email && p.email?.toLowerCase() === currentUser.email.toLowerCase())) &&
                  p.status === 'approved'
              );
              if (myApproved.length > 0) {
                const latest = myApproved[0];
                const amt = latest.amount || 0;
                const isOneYear =
                  latest.durationDays >= 365 ||
                  (latest.durationLabel && (latest.durationLabel.includes('1 Tahun') || latest.durationLabel.includes('12 Bulan'))) ||
                  amt >= 1200000 ||
                  (amt >= 400000 && resolvedPlan === 'pro');

                if (isOneYear) {
                  const curExp = resolvedUntil ? new Date(resolvedUntil).getTime() : 0;
                  const payTime = latest.date ? new Date(latest.date).getTime() : Date.now();
                  const targetTime = (isNaN(payTime) ? Date.now() : payTime) + 365 * 86400000;
                  // Jika masa aktif saat ini kurang dari 300 hari ke depan, perbaiki ke 1 tahun penuh
                  if (isNaN(curExp) || curExp < targetTime - 86400000 * 30) {
                    resolvedUntil = new Date(targetTime).toISOString();
                  }
                }
              }
            }
          } catch (e) {}
        }

        finalAccount = {
          id: accRes.data.id,
          user_id: accRes.data.user_id,
          role: (accRes.data.role as 'user' | 'admin') || 'user',
          plan_code: resolvedPlan,
          plan_until: resolvedUntil,
          is_suspended: !!accRes.data.is_suspended,
        };
      } else {
        let fallbackUntil = cachedLocalPlanUntil;
        if (typeof window !== 'undefined') {
          try {
            const rawAdminPays = localStorage.getItem('uda_admin_payments');
            if (rawAdminPays) {
              const payList = JSON.parse(rawAdminPays);
              const myApproved = payList.filter(
                (p: any) =>
                  (p.userId === currentUser.id || (currentUser.email && p.email?.toLowerCase() === currentUser.email.toLowerCase())) &&
                  p.status === 'approved'
              );
              if (myApproved.length > 0) {
                const latest = myApproved[0];
                const amt = latest.amount || 0;
                const isOneYear =
                  latest.durationDays >= 365 ||
                  (latest.durationLabel && (latest.durationLabel.includes('1 Tahun') || latest.durationLabel.includes('12 Bulan'))) ||
                  amt >= 1200000 ||
                  (amt >= 400000 && cachedLocalPlan === 'pro');
                if (isOneYear) {
                  fallbackUntil = new Date(Date.now() + 365 * 86400000).toISOString();
                }
              }
            }
          } catch (e) {}
        }

        const newAccount = {
          user_id: currentUser.id,
          role: (currentUser.user_metadata?.role as 'user' | 'admin') || 'user',
          plan_code: cachedLocalPlan || 'free',
          plan_until: fallbackUntil,
          payment_code: Math.floor(100 + Math.random() * 899),
        };
        const { data: createdAcc } = await (supabase.from('accounts' as any) as any).insert(newAccount).select().maybeSingle();
        finalAccount = createdAcc ? {
          id: createdAcc.id,
          user_id: createdAcc.user_id,
          role: createdAcc.role as 'user' | 'admin',
          plan_code: createdAcc.plan_code || cachedLocalPlan || 'free',
          plan_until: createdAcc.plan_until || fallbackUntil,
          is_suspended: !!createdAcc.is_suspended,
        } : {
          id: currentUser.id,
          user_id: currentUser.id,
          role: (currentUser.user_metadata?.role as 'user' | 'admin') || 'user',
          plan_code: cachedLocalPlan || 'free',
          plan_until: fallbackUntil,
        };
      }
      setAccount(finalAccount);
      try {
        localStorage.setItem('uda_auth_account', JSON.stringify(finalAccount));
      } catch (e) {}

      return { profile: finalProfile, account: finalAccount };
    } catch (err) {
      console.error('Gagal memuat profil/akun:', err);
      return { profile: null, account: null };
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // 1. Pulihkan cache lokal setelah mount pertama di browser (mencegah hydration mismatch SSR)
    try {
      const cachedUser = localStorage.getItem('uda_auth_user');
      if (cachedUser) setUser(JSON.parse(cachedUser));
      const cachedProfile = localStorage.getItem('uda_auth_profile');
      if (cachedProfile) setProfile(JSON.parse(cachedProfile));
      const cachedAccount = localStorage.getItem('uda_auth_account');
      if (cachedAccount) setAccount(JSON.parse(cachedAccount));
    } catch (e) {}

    // Safety timeout: JANGAN PERNAH biarkan loading terjebak lebih dari 800ms
    const safetyTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 800);

    if (!supabase) {
      setIsLoading(false);
      clearTimeout(safetyTimeout);
      return;
    }

    // Periksa sesi saat ini secara langsung
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (initialSession?.user) {
        setSession(initialSession);
        setUser(initialSession.user);
        try {
          localStorage.setItem('uda_auth_user', JSON.stringify(initialSession.user));
          if (typeof document !== 'undefined') {
            document.cookie = 'uda_auth_token=true; path=/; max-age=2592000; SameSite=Lax';
          }
        } catch (e) {}
        if (loadedUserIdRef.current !== initialSession.user.id) {
          loadedUserIdRef.current = initialSession.user.id;
          loadUserData(initialSession.user);
        }
      }
      setIsLoading(false);
      clearTimeout(safetyTimeout);
    }).catch(() => {
      setIsLoading(false);
      clearTimeout(safetyTimeout);
    });

    // Dengarkan perubahan status otentikasi
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      const currentUser = newSession?.user ?? null;
      setUser(currentUser);
      try {
        if (currentUser) {
          localStorage.setItem('uda_auth_user', JSON.stringify(currentUser));
          if (typeof document !== 'undefined') {
            document.cookie = 'uda_auth_token=true; path=/; max-age=2592000; SameSite=Lax';
          }
        } else {
          localStorage.removeItem('uda_auth_user');
        }
      } catch (e) {}

      if (newSession?.user) {
        if (loadedUserIdRef.current !== newSession.user.id) {
          loadedUserIdRef.current = newSession.user.id;
          loadUserData(newSession.user);
        }
      } else {
        loadedUserIdRef.current = null;
        setProfile(null);
        setAccount(null);
      }
      setIsLoading(false);
      clearTimeout(safetyTimeout);
    });

    const handleAccountSync = (e?: any) => {
      try {
        if (e && e.detail) {
          const detail = e.detail;
          const authUser = user || (localStorage.getItem('uda_auth_user') ? JSON.parse(localStorage.getItem('uda_auth_user')!) : null);
          const isTarget =
            (detail.userId && authUser?.id === detail.userId) ||
            (detail.email && authUser?.email?.toLowerCase() === detail.email.toLowerCase()) ||
            (!detail.userId && !detail.email);

          if (isTarget && detail.planCode) {
            setAccount((prev) => {
              const updated = {
                ...(prev || { id: authUser?.id || 'acc-001', user_id: authUser?.id || 'acc-001', role: 'user' as const }),
                plan_code: detail.planCode,
                plan_until: detail.planUntil || prev?.plan_until,
              };
              try {
                localStorage.setItem('uda_auth_account', JSON.stringify(updated));
              } catch (e) {}
              return updated;
            });
            return;
          }
        }

        const cachedAccount = localStorage.getItem('uda_auth_account');
        if (cachedAccount) {
          const parsed = JSON.parse(cachedAccount);
          setAccount((prev) => {
            if (!prev) return parsed;
            return { ...prev, ...parsed };
          });
        }
      } catch (err) {}
    };

    window.addEventListener('storage', handleAccountSync);
    window.addEventListener('uda_account_updated', handleAccountSync);

    return () => {
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
      window.removeEventListener('storage', handleAccountSync);
      window.removeEventListener('uda_account_updated', handleAccountSync);
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      return { error: 'Konfigurasi Supabase tidak ditemukan. Periksa file .env.local.' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials') || error.code === 'invalid_credentials') {
          return { error: 'Email atau kata sandi salah. Pastikan akun sudah terdaftar di UdaPlanner.' };
        }
        if (error.message.includes('Email not confirmed') || error.code === 'email_not_confirmed') {
          const cleanEmail = email.trim().toLowerCase();
          // Cek apakah akun ini telah diverifikasi secara manual oleh Admin di Panel Admin
          let isManuallyVerified = await VerificationService.isUserVerified(cleanEmail);
          if (!isManuallyVerified && typeof window !== 'undefined') {
            try {
              isManuallyVerified =
                localStorage.getItem(`uda_manually_verified_${cleanEmail}`) === 'true' ||
                localStorage.getItem(`uda_manually_verified_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`) === 'true';
            } catch (e) {}
          }

          if (isManuallyVerified) {
            // 1. Panggil API backend untuk mengonfirmasi email_confirm = true langsung di Supabase Auth (auth.users)
            try {
              await fetch('/api/admin/verify-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'manual_verify', email: cleanEmail }),
              });
            } catch (e) {}

            // 2. Sekarang login ulang dengan Supabase Auth karena akun sudah terkonfirmasi di server
            const retryRes = await supabase.auth.signInWithPassword({
              email: cleanEmail,
              password,
            });

            if (!retryRes.error && retryRes.data?.user) {
              setUser(retryRes.data.user);
              setSession(retryRes.data.session);
              try {
                localStorage.setItem('uda_auth_user', JSON.stringify(retryRes.data.user));
              } catch (e) {}

              const loaded = await loadUserData(retryRes.data.user);
              const isUserAdmin =
                loaded?.account?.role === 'admin' ||
                retryRes.data.user.user_metadata?.role === 'admin' ||
                retryRes.data.user.email?.toLowerCase() === 'admin@udaplanner.id' ||
                retryRes.data.user.email?.toLowerCase().startsWith('admin@');

              const needsOnboarding =
                retryRes.data.user.user_metadata?.has_completed_onboarding !== true &&
                (typeof window !== 'undefined'
                  ? localStorage.getItem('uda_profile_setup_done_' + retryRes.data.user.id) !== 'true'
                  : true);

              return { error: null, isAdmin: isUserAdmin, needsOnboarding };
            }

            // Fallback jika retry tertunda sesaat: bangun sesi manual
            const storedUsers = await VerificationService.getVerifiableUsers();
            const matched = storedUsers.find((u) => u.email.toLowerCase() === cleanEmail);

            const manualUser: any = {
              id: matched?.userId || matched?.id || `usr-${Date.now()}`,
              email: cleanEmail,
              app_metadata: { provider: 'email', providers: ['email'] },
              user_metadata: { full_name: matched?.name || cleanEmail.split('@')[0] },
              aud: 'authenticated',
              created_at: new Date().toISOString(),
              email_confirmed_at: new Date().toISOString(),
            };

            setUser(manualUser);
            try {
              localStorage.setItem('uda_auth_user', JSON.stringify(manualUser));
            } catch (e) {}

            const loaded = await loadUserData(manualUser);
            const isUserAdmin =
              loaded?.account?.role === 'admin' ||
              manualUser.email?.toLowerCase() === 'admin@udaplanner.id' ||
              manualUser.email?.toLowerCase().startsWith('admin@');

            const needsOnboarding =
              typeof window !== 'undefined'
                ? localStorage.getItem('uda_profile_setup_done_' + manualUser.id) !== 'true'
                : true;

            return { error: null, isAdmin: isUserAdmin, needsOnboarding };
          }

          return {
            error:
              'Email akun Anda belum terverifikasi. Silakan periksa kotak masuk (inbox) atau folder spam pada email Anda. Jika Anda tidak menerima pesan email verifikasi, Admin UdaPlanner dapat mengonfirmasi akun Anda secara manual melalui Panel Admin.',
          };
        }
        return { error: error.message };
      }

      if (!data.user) {
        return { error: 'Gagal mengotentikasi pengguna.' };
      }

      setUser(data.user);
      setSession(data.session);
      try {
        localStorage.setItem('uda_auth_user', JSON.stringify(data.user));
      } catch (e) {}

      const loaded = await loadUserData(data.user);

      const isUserAdmin =
        loaded?.account?.role === 'admin' ||
        data.user.user_metadata?.role === 'admin' ||
        data.user.email?.toLowerCase() === 'admin@udaplanner.com';

      const needsOnboarding =
        data.user.user_metadata?.has_completed_onboarding !== true &&
        (typeof window !== 'undefined' ? localStorage.getItem('uda_profile_setup_done_' + data.user.id) !== 'true' : true);

      if (!needsOnboarding) {
        try {
          if (data.user.user_metadata?.has_seen_dashboard_tour === true) {
            localStorage.setItem('uda_user_is_new', 'false');
            localStorage.setItem('uda_has_logged_in_before_' + data.user.id, 'true');
            localStorage.setItem('uda_disable_auto_tour_' + data.user.id, 'true');
          }
        } catch (e) {}

        if (!data.user.user_metadata?.has_logged_in_before && supabase) {
          supabase.auth.updateUser({
            data: { has_logged_in_before: true },
          }).catch(() => {});
        }
      }

      return { error: null, isAdmin: isUserAdmin, needsOnboarding };
    } catch (err: any) {
      return { error: err.message || 'Terjadi kesalahan sistem saat mencoba masuk.' };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    if (!supabase) {
      return { error: 'Konfigurasi Supabase tidak ditemukan.', requiresEmailConfirmation: false };
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim() || 'Pengguna Baru';

    try {
      const siteUrl = getSiteUrl();
      const emailRedirectTo = `${siteUrl}/masuk?verified=true`;

      let authResultUser: any = null;
      let isRateLimited = false;

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo,
          data: {
            full_name: cleanName,
          },
        },
      });

      if (error) {
        if (error.message.includes('already registered') || error.code === 'user_already_exists') {
          return { error: 'Email ini sudah terdaftar. Silakan gunakan menu Masuk.', requiresEmailConfirmation: false };
        }
        if (error.message.includes('rate limit') || (error as any).status === 429 || error.code === 'over_email_send_rate_limit') {
          // Supabase SMTP rate limit tercapai: catat akun agar admin bisa konfirmasi manual
          isRateLimited = true;
        } else {
          return { error: error.message, requiresEmailConfirmation: false };
        }
      } else {
        authResultUser = data.user;
      }

      // Catat akun pendaftaran ini ke VerificationService agar LANGSUNG MUNCUL di Panel Admin
      // dengan status "Belum Terverifikasi" (agar Admin dapat konfirmasi manual jika email tidak masuk)
      const generatedUserId = authResultUser?.id || `usr-${Date.now()}`;
      await VerificationService.recordNewRegistration({
        userId: generatedUserId,
        email: cleanEmail,
        name: cleanName,
        authProvider: 'email', // pendaftaran email biasa
        deliveryStatus: isRateLimited ? 'failed' : 'pending',
        notes: isRateLimited
          ? 'Email verifikasi gagal terkirim otomatis (SMTP limit). Menunggu konfirmasi manual oleh Admin di Panel Admin.'
          : 'Pendaftaran email biasa: Menunggu konfirmasi email pengguna atau konfirmasi manual Admin.',
      });

      // Jika session aktif langsung dari supabase (confirm email off di Supabase)
      if (data?.user && data?.session) {
        setUser(data.user);
        setSession(data.session);
        try {
          localStorage.setItem('uda_auth_user', JSON.stringify(data.user));
        } catch (e) {}
        await loadUserData(data.user);
        return { error: null, requiresEmailConfirmation: false };
      }

      return { error: null, requiresEmailConfirmation: true, isRateLimited };
    } catch (err: any) {
      return { error: err.message || 'Terjadi kesalahan saat pendaftaran.', requiresEmailConfirmation: false };
    }
  };

  const signOut = async () => {
    if (user?.id) {
      try {
        localStorage.setItem('uda_has_logged_in_before_' + user.id, 'true');
        localStorage.setItem('uda_disable_auto_tour_' + user.id, 'true');
        localStorage.setItem('uda_user_is_new', 'false');
      } catch (e) {}
    }

    try {
      localStorage.removeItem('uda_auth_user');
      localStorage.removeItem('uda_auth_profile');
      localStorage.removeItem('uda_auth_account');
      if (typeof document !== 'undefined') {
        document.cookie = 'uda_auth_token=; path=/; max-age=0; SameSite=Lax';
      }
    } catch (e) {}

    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    setProfile(null);
    setAccount(null);
    router.push('/masuk');
  };

  const signInWithGoogle = async (targetPath: string = '/app') => {
    if (!supabase) {
      return { error: 'Konfigurasi Supabase tidak ditemukan. Periksa file .env.local.' };
    }

    try {
      const siteUrl = getSiteUrl();
      const redirectTo = `${siteUrl}${targetPath}`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Gagal memulai autentikasi dengan akun Google.' };
    }
  };

  const refreshUserData = async () => {
    if (user) {
      await loadUserData(user);
    }
  };

  const isAdmin = account?.role === 'admin' || user?.user_metadata?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        account,
        isLoading,
        isAdmin,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
