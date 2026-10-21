'use client';

import React, { createContext, useContext, useEffect, useState, useTransition } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { getSiteUrl } from '@/lib/site-url';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
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
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

        finalProfile = {
          id: profRes.data.id,
          email: profRes.data.email || currentUser.email || '',
          full_name: profRes.data.full_name || googleFullName || 'Pengguna UdaPlanner',
          avatar_url: resolvedAvatar,
          reminder_minutes: profRes.data.reminder_minutes ?? 15,
        };
      } else {
        const newProfile = {
          id: currentUser.id,
          email: currentUser.email || '',
          full_name: googleFullName || currentUser.email?.split('@')[0] || 'Pengguna UdaPlanner',
          avatar_url: resolvedAvatar || null,
          role: 'user',
          reminder_minutes: 15,
        };
        const { data: createdProf } = await (supabase.from('profiles' as any) as any).insert(newProfile).select().maybeSingle();
        finalProfile = createdProf ? { ...createdProf, avatar_url: resolvedAvatar || createdProf.avatar_url } : newProfile;

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
      if (accRes.data) {
        finalAccount = {
          id: accRes.data.id,
          user_id: accRes.data.user_id,
          role: (accRes.data.role as 'user' | 'admin') || 'user',
          plan_code: accRes.data.plan_code || 'free',
          plan_until: accRes.data.plan_until,
          is_suspended: !!accRes.data.is_suspended,
        };
      } else {
        const newAccount = {
          user_id: currentUser.id,
          role: (currentUser.user_metadata?.role as 'user' | 'admin') || 'user',
          plan_code: 'free',
          payment_code: Math.floor(100 + Math.random() * 899),
        };
        const { data: createdAcc } = await (supabase.from('accounts' as any) as any).insert(newAccount).select().maybeSingle();
        finalAccount = createdAcc ? {
          id: createdAcc.id,
          user_id: createdAcc.user_id,
          role: createdAcc.role as 'user' | 'admin',
          plan_code: createdAcc.plan_code,
          plan_until: createdAcc.plan_until,
          is_suspended: !!createdAcc.is_suspended,
        } : {
          id: currentUser.id,
          user_id: currentUser.id,
          role: (currentUser.user_metadata?.role as 'user' | 'admin') || 'user',
          plan_code: 'free',
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

    return () => {
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
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
          return { error: 'Email akun Anda belum dikonfirmasi. Silakan periksa kotak masuk/spam email Anda untuk verifikasi pendaftaran.' };
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

    try {
      const siteUrl = getSiteUrl();
      const emailRedirectTo = `${siteUrl}/masuk?verified=true`;

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo,
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (error) {
        if (error.message.includes('already registered') || error.code === 'user_already_exists') {
          return { error: 'Email ini sudah terdaftar. Silakan gunakan menu Masuk.', requiresEmailConfirmation: false };
        }
        if (error.message.includes('rate limit') || (error as any).status === 429 || error.code === 'over_email_send_rate_limit') {
          return {
            error: 'Batas pengiriman email Supabase (SMTP gratis) tercapai: "email rate limit exceeded". Solusi: Matikan opsi "Confirm email" di Dashboard Supabase (Authentication > Providers > Email > matikan Confirm email) agar pendaftaran dapat langsung aktif tanpa batas kuota email.',
            requiresEmailConfirmation: false,
          };
        }
        return { error: error.message, requiresEmailConfirmation: false };
      }

      // Jika session null tetapi user terbuat, artinya Supabase mewajibkan email confirmation
      const requiresConfirmation = !data.session && !!data.user;

      if (data.user && data.session) {
        setUser(data.user);
        setSession(data.session);
        try {
          localStorage.setItem('uda_auth_user', JSON.stringify(data.user));
        } catch (e) {}
        await loadUserData(data.user);
      }

      return { error: null, requiresEmailConfirmation: requiresConfirmation };
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
