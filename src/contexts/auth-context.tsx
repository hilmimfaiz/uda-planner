'use client';

import React, { createContext, useContext, useEffect, useState, useTransition } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

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
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null; requiresEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  // Helper untuk memuat data profil dan akun dari tabel Supabase
  const loadUserData = async (currentUser: User) => {
    if (!supabase) return;

    try {
      // 1. Ambil atau buat profil pengguna
      const { data: profData, error: profErr } = await (supabase.from('profiles' as any) as any)
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (profData) {
        setProfile({
          id: profData.id,
          email: profData.email || currentUser.email || '',
          full_name: profData.full_name || currentUser.user_metadata?.full_name || 'Pengguna UdaPlanner',
          avatar_url: profData.avatar_url,
          reminder_minutes: profData.reminder_minutes ?? 15,
        });
      } else {
        // Jika profil belum ada di tabel profiles, buat secara otomatis
        const newProfile = {
          id: currentUser.id,
          email: currentUser.email || '',
          full_name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Pengguna UdaPlanner',
          reminder_minutes: 15,
        };
        const { data: createdProf } = await (supabase.from('profiles' as any) as any).insert(newProfile).select().maybeSingle();
        setProfile(createdProf || newProfile);
      }

      // 2. Ambil atau buat akun pengguna
      const { data: accData } = await (supabase.from('accounts' as any) as any)
        .select('*')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (accData) {
        setAccount({
          id: accData.id,
          user_id: accData.user_id,
          role: (accData.role as 'user' | 'admin') || 'user',
          plan_code: accData.plan_code || 'free',
          plan_until: accData.plan_until,
          is_suspended: !!accData.is_suspended,
        });
      } else {
        // Inisialisasi akun jika belum ada
        const newAccount = {
          user_id: currentUser.id,
          role: (currentUser.user_metadata?.role as 'user' | 'admin') || 'user',
          plan_code: 'free',
          payment_code: Math.floor(100 + Math.random() * 899),
        };
        const { data: createdAcc } = await (supabase.from('accounts' as any) as any).insert(newAccount).select().maybeSingle();
        if (createdAcc) {
          setAccount({
            id: createdAcc.id,
            user_id: createdAcc.user_id,
            role: createdAcc.role as 'user' | 'admin',
            plan_code: createdAcc.plan_code,
            plan_until: createdAcc.plan_until,
            is_suspended: !!createdAcc.is_suspended,
          });
        }
      }
    } catch (err) {
      console.error('Gagal memuat profil/akun:', err);
      // Fallback ke metadata Auth user
      setProfile({
        id: currentUser.id,
        email: currentUser.email || '',
        full_name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Pengguna UdaPlanner',
      });
      setAccount({
        id: currentUser.id,
        user_id: currentUser.id,
        role: (currentUser.user_metadata?.role as 'user' | 'admin') || 'user',
        plan_code: 'free',
      });
    }
  };

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    // Periksa sesi saat ini
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserData(session.user).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    // Dengarkan perubahan status otentikasi
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        await loadUserData(newSession.user);
      } else {
        setProfile(null);
        setAccount(null);
      }
      setIsLoading(false);
    });

    return () => {
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
      await loadUserData(data.user);

      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Terjadi kesalahan sistem saat mencoba masuk.' };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    if (!supabase) {
      return { error: 'Konfigurasi Supabase tidak ditemukan.', requiresEmailConfirmation: false };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
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
        await loadUserData(data.user);
      }

      return { error: null, requiresEmailConfirmation: requiresConfirmation };
    } catch (err: any) {
      return { error: err.message || 'Terjadi kesalahan saat pendaftaran.', requiresEmailConfirmation: false };
    }
  };

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    setProfile(null);
    setAccount(null);
    router.push('/masuk');
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
