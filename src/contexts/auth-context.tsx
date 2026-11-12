'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
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
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Sync cache lokal hanya setelah komponen ter-mount di sisi client untuk mencegah Hydration Error (#418 & #423)
  useEffect(() => {
    try {
      const cachedUser = localStorage.getItem('uda_auth_user');
      const cachedProfile = localStorage.getItem('uda_auth_profile');
      const cachedAccount = localStorage.getItem('uda_auth_account');
      if (cachedUser) setUser(JSON.parse(cachedUser));
      if (cachedProfile) setProfile(JSON.parse(cachedProfile));
      if (cachedAccount) setAccount(JSON.parse(cachedAccount));
    } catch (e) {}
  }, []);

  const supabase = createClient();
  const loadedUserIdRef = React.useRef<string | null>(null);

  // Helper untuk memuat data profil dan akun dari tabel Supabase secara paralel (bukan sequential)
  const loadUserData = async (currentUser: User) => {
    if (!supabase) return;

    const emailLower = (currentUser.email || '').toLowerCase().trim();
    const isEmailAdmin =
      emailLower === 'admin@udaplanner.id' ||
      emailLower === 'admin@udaplanner.com' ||
      emailLower.startsWith('admin@') ||
      currentUser.user_metadata?.role === 'admin';

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
      role: isEmailAdmin ? 'admin' : ((currentUser.user_metadata?.role as 'user' | 'admin') || 'user'),
      plan_code: 'free',
    });

    try {
      // Jalankan query profil, akun, dan pembayaran approved secara bersamaan (PARALLEL)
      const [profRes, accRes, dbApprovedRes] = await Promise.all([
        (supabase.from('profiles' as any) as any)
          .select('*')
          .eq('id', currentUser.id)
          .maybeSingle(),
        (supabase.from('accounts' as any) as any)
          .select('*')
          .eq('user_id', currentUser.id)
          .maybeSingle(),
        (supabase.from('payments' as any) as any)
          .select('plan_code, duration_days, amount, created_at')
          .eq('user_id', currentUser.id)
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      // 1. Proses Profil
      let finalProfile: UserProfile;
      const googleFullName = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name;
      const googleAvatar = currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture;

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
          reminder_minutes: 15,
        };
        const { data: createdProf } = await (supabase.from('profiles' as any) as any).insert(newProfile).select().maybeSingle();
        finalProfile = createdProf ? { ...createdProf, avatar_url: resolvedAvatar || createdProf.avatar_url, phone: createdProf.phone || localPhone } : newProfile;

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

      // Sinkronisasi status konfirmasi email pengguna (SMTP atau Google Auth)
      const isConfirmed =
        !!(currentUser.email_confirmed_at || currentUser.confirmed_at || currentUser.user_metadata?.email_verified) ||
        currentUser.app_metadata?.provider === 'google' ||
        isEmailAdmin;

      if (isConfirmed && currentUser.email) {
        try {
          localStorage.setItem(`uda_manually_verified_${emailLower}`, 'true');
          localStorage.setItem(`uda_manually_verified_${currentUser.id}`, 'true');
          localStorage.removeItem(`uda_unverified_registration_${emailLower}`);
          localStorage.removeItem(`uda_unverified_registration_${currentUser.id}`);
        } catch (e) {}
      }

      // 2. Proses Akun & Resolusi Paket yang Akurat (Pro vs Team)
      let finalAccount: UserAccount;

      let cachedLocalPlan: string | null = null;
      let cachedLocalPlanUntil: string | null = null;
      if (typeof window !== 'undefined') {
        try {
          const directPlanById = localStorage.getItem(`uda_user_plan_${currentUser.id}`);
          const directPlanByEmail = emailLower ? localStorage.getItem(`uda_user_plan_${emailLower}`) : null;
          if (directPlanById && directPlanById !== 'free') {
            cachedLocalPlan = directPlanById.toLowerCase();
          } else if (directPlanByEmail && directPlanByEmail !== 'free') {
            cachedLocalPlan = directPlanByEmail.toLowerCase();
          }

          const rawAcc = localStorage.getItem('uda_auth_account');
          if (rawAcc) {
            const parsed = JSON.parse(rawAcc);
            if ((parsed.user_id === currentUser.id || parsed.id === currentUser.id) && parsed.plan_code && parsed.plan_code !== 'free') {
              // Hanya terima 'team' dari cache lama jika memiliki plan_until atau directPlan
              if (!(parsed.plan_code === 'team' && !parsed.plan_until && !cachedLocalPlan)) {
                cachedLocalPlan = cachedLocalPlan || parsed.plan_code.toLowerCase();
                cachedLocalPlanUntil = parsed.plan_until || cachedLocalPlanUntil;
              }
            }
          }
          const upgradeEvt = localStorage.getItem('uda_last_upgraded_user');
          if (upgradeEvt) {
            const parsedEvt = JSON.parse(upgradeEvt);
            if (
              (parsedEvt.userId === currentUser.id || (emailLower && parsedEvt.email?.toLowerCase() === emailLower)) &&
              parsedEvt.planCode
            ) {
              cachedLocalPlan = parsedEvt.planCode.toLowerCase();
              cachedLocalPlanUntil = parsedEvt.planUntil || cachedLocalPlanUntil;
            }
          }
        } catch (e) {}
      }

      // Cek apakah pengguna telah membatalkan langganan atau secara eksplisit diset ke free
      const isExplicitlyFree = typeof window !== 'undefined' && (
        localStorage.getItem(`uda_subscription_cancelled_${currentUser.id}`) === 'true' ||
        (emailLower && localStorage.getItem(`uda_subscription_cancelled_${emailLower}`) === 'true') ||
        localStorage.getItem(`uda_user_plan_${currentUser.id}`) === 'free' ||
        (emailLower && localStorage.getItem(`uda_user_plan_${emailLower}`) === 'free')
      );

      // Cek apakah ada pembayaran approved terbaru di localStorage atau Supabase
      let latestApprovedPlan: string | null = null;
      let latestApprovedUntil: string | null = null;

      if (!isExplicitlyFree && typeof window !== 'undefined') {
        try {
          const rawAdminPays = localStorage.getItem('uda_admin_payments');
          if (rawAdminPays) {
            const payList = JSON.parse(rawAdminPays);
            const myApproved = payList.filter(
              (p: any) =>
                (p.userId === currentUser.id || (emailLower && p.email?.toLowerCase() === emailLower)) &&
                p.status === 'approved'
            );
            if (myApproved.length > 0) {
              // Urutkan dari yang terbaru
              myApproved.sort((a: any, b: any) => {
                const tA = new Date(a.createdAt || a.date || 0).getTime();
                const tB = new Date(b.createdAt || b.date || 0).getTime();
                return (isNaN(tB) ? 0 : tB) - (isNaN(tA) ? 0 : tA);
              });
              const latest = myApproved[0];
              latestApprovedPlan = (latest.plan || latest.plan_code || 'pro').toLowerCase();
              const durDays = Number(latest.durationDays || latest.duration_days) || 30;
              const payTime = latest.createdAt ? new Date(latest.createdAt).getTime() : Date.now();
              const baseTime = isNaN(payTime) ? Date.now() : payTime;
              latestApprovedUntil = new Date(baseTime + Math.max(durDays, 30) * 86400000).toISOString();
            }
          }
        } catch (e) {}
      }

      const dbApproved = dbApprovedRes?.data;
      if (!isExplicitlyFree && dbApproved && dbApproved.plan_code && dbApproved.status === 'approved') {
        const dbPlan = String(dbApproved.plan_code).toLowerCase();
        const dDays = Number(dbApproved.duration_days) || 30;
        const payTime = dbApproved.created_at ? new Date(dbApproved.created_at).getTime() : Date.now();
        const baseTime = isNaN(payTime) ? Date.now() : payTime;
        const dbUntil = new Date(baseTime + Math.max(dDays, 30) * 86400000).toISOString();

        if (!latestApprovedPlan) {
          latestApprovedPlan = dbPlan;
          latestApprovedUntil = dbUntil;
        }
      }

      if (accRes.data) {
        // Jika di DB tercatat 'team' namun plan_until kosong dan tidak ada pembayaran 'team',
        // itu adalah efek bug brand_members owner lama -> abaikan dan anggap 'free'
        const rawDbPlan = (accRes.data.plan_code || 'free').toLowerCase();
        const isStaleOwnerTeamBug = rawDbPlan === 'team' && !accRes.data.plan_until && latestApprovedPlan !== 'team';
        const cleanDbPlan = isStaleOwnerTeamBug ? 'free' : rawDbPlan;

        // Prioritas resolusi paket:
        let resolvedPlan = 'free';
        if (isExplicitlyFree) {
          resolvedPlan = 'free';
        } else if (cleanDbPlan === 'free') {
          resolvedPlan = 'free';
        } else if (cleanDbPlan && cleanDbPlan !== 'free') {
          resolvedPlan = cleanDbPlan;
        } else if (latestApprovedPlan) {
          resolvedPlan = latestApprovedPlan;
        } else if (currentUser.user_metadata?.plan_code && currentUser.user_metadata.plan_code !== 'free') {
          resolvedPlan = String(currentUser.user_metadata.plan_code).toLowerCase();
        } else if (cachedLocalPlan) {
          resolvedPlan = cachedLocalPlan;
        }

        let resolvedUntil = resolvedPlan === 'free' ? null : (
          accRes.data.plan_until ||
          latestApprovedUntil ||
          currentUser.user_metadata?.plan_until ||
          cachedLocalPlanUntil ||
          null
        );

        // Cek juga keanggotaan brand_members (HANYA anggota yang diundang, BUKAN owner!)
        if (!isExplicitlyFree && currentUser.id && (resolvedPlan === 'free' || !resolvedPlan)) {
          let isInvitedTeamMember = false;
          if (supabase) {
            try {
              const { data: dbMembers } = await (supabase.from('brand_members' as any) as any)
                .select('id, role')
                .eq('user_id', currentUser.id)
                .neq('role', 'owner')
                .limit(1);
              if (dbMembers && dbMembers.length > 0) {
                isInvitedTeamMember = true;
              }
            } catch (e) {}
          }
          if (!isInvitedTeamMember && typeof window !== 'undefined') {
            try {
              const uId = currentUser.id;
              if (uId && localStorage.getItem('uda_team_membership_' + uId)) {
                isInvitedTeamMember = true;
              }
              const sysRole = uId ? localStorage.getItem('uda_system_role_' + uId) : null;
              if (sysRole && ['Editor', 'Reviewer', 'Viewer'].includes(sysRole)) {
                isInvitedTeamMember = true;
              }
              const rawInv = localStorage.getItem('uda_brand_invitations');
              if (rawInv) {
                const invList = JSON.parse(rawInv);
                if (
                  invList.some(
                    (inv: any) =>
                      inv.status === 'accepted' &&
                      ((emailLower && inv.target_email?.toLowerCase() === emailLower) || (uId && inv.target_user_id === uId))
                  )
                ) {
                  isInvitedTeamMember = true;
                }
              }
            } catch (e) {}
          }
          if (isInvitedTeamMember) {
            resolvedPlan = 'team';
          }
        }

        // Jika status terdeteksi 'team' namun bukan dari pembayaran disetujui 'team' (misal dulunya anggota tim):
        // Pastikan keanggotaan timnya di brand_members memang masih aktif. Jika sudah keluar -> kembalikan ke 'free'!
        if (resolvedPlan === 'team' && latestApprovedPlan !== 'team') {
          let hasActiveTeam = false;
          if (supabase && currentUser.id) {
            try {
              const { data: activeMems } = await (supabase.from('brand_members' as any) as any)
                .select('id, role')
                .eq('user_id', currentUser.id)
                .neq('role', 'owner')
                .limit(1);
              if (activeMems && activeMems.length > 0) {
                hasActiveTeam = true;
              }
            } catch (e) {}
          }
          if (!hasActiveTeam && typeof window !== 'undefined') {
            try {
              const uId = currentUser.id;
              const rawTeam = uId ? localStorage.getItem('uda_team_membership_' + uId) : null;
              if (rawTeam) {
                const parsedT = JSON.parse(rawTeam);
                if (parsedT?.brand_id) {
                  const rawInv = localStorage.getItem('uda_brand_invitations');
                  if (rawInv) {
                    const invList = JSON.parse(rawInv);
                    const match = invList.find((i: any) => i.brand_id === parsedT.brand_id && (i.status === 'left' || i.status === 'cancelled'));
                    if (!match) hasActiveTeam = true;
                  } else {
                    hasActiveTeam = true;
                  }
                }
              }
            } catch (e) {}
          }

          if (!hasActiveTeam) {
            resolvedPlan = 'free';
            resolvedUntil = null;
            if (typeof window !== 'undefined') {
              try {
                localStorage.removeItem(`uda_user_plan_${currentUser.id}`);
                if (emailLower) localStorage.removeItem(`uda_user_plan_${emailLower}`);
                localStorage.removeItem(`uda_team_membership_${currentUser.id}`);
                localStorage.removeItem(`uda_system_role_${currentUser.id}`);
                localStorage.removeItem('uda_team_membership');
                localStorage.removeItem('uda_last_upgraded_user');
              } catch (e) {}
            }
          }
        }

        const resolvedRole: 'user' | 'admin' = isEmailAdmin ? 'admin' : ((accRes.data.role as 'user' | 'admin') || 'user');

        // Sinkronkan kembali ke tabel accounts jika plan_code atau role di DB belum sesuai
        if (
          supabase &&
          accRes.data.id &&
          (accRes.data.plan_code !== resolvedPlan || accRes.data.role !== resolvedRole || (resolvedUntil && !accRes.data.plan_until))
        ) {
          (supabase.from('accounts' as any) as any)
            .update({
              plan_code: resolvedPlan,
              plan_until: resolvedUntil,
              role: resolvedRole,
              updated_at: new Date().toISOString(),
            })
            .eq('id', accRes.data.id)
            .then(() => {})
            .catch(() => {});
        }

        finalAccount = {
          id: accRes.data.id,
          user_id: accRes.data.user_id,
          role: resolvedRole,
          plan_code: resolvedPlan,
          plan_until: resolvedUntil,
          is_suspended: !!accRes.data.is_suspended,
        };
      } else {
        let fallbackPlan = isExplicitlyFree
          ? 'free'
          : latestApprovedPlan ||
            (currentUser.user_metadata?.plan_code && currentUser.user_metadata.plan_code !== 'free'
              ? String(currentUser.user_metadata.plan_code).toLowerCase()
              : null) ||
            cachedLocalPlan ||
            'free';
        let fallbackUntil = fallbackPlan === 'free' ? null : (latestApprovedUntil || currentUser.user_metadata?.plan_until || cachedLocalPlanUntil || null);

        // Cek juga keanggotaan brand_members (HANYA anggota yang diundang, BUKAN owner)
        if (!isExplicitlyFree && currentUser.id && (fallbackPlan === 'free' || !fallbackPlan)) {
          let isInvitedTeamMember = false;
          if (supabase) {
            try {
              const { data: dbMembers } = await (supabase.from('brand_members' as any) as any)
                .select('id, role')
                .eq('user_id', currentUser.id)
                .neq('role', 'owner')
                .limit(1);
              if (dbMembers && dbMembers.length > 0) {
                isInvitedTeamMember = true;
              }
            } catch (e) {}
          }
          if (!isInvitedTeamMember && typeof window !== 'undefined') {
            try {
              const uId = currentUser.id;
              if (uId && localStorage.getItem('uda_team_membership_' + uId)) {
                isInvitedTeamMember = true;
              }
              const sysRole = uId ? localStorage.getItem('uda_system_role_' + uId) : null;
              if (sysRole && ['Editor', 'Reviewer', 'Viewer'].includes(sysRole)) {
                isInvitedTeamMember = true;
              }
              const rawInv = localStorage.getItem('uda_brand_invitations');
              if (rawInv) {
                const invList = JSON.parse(rawInv);
                if (
                  invList.some(
                    (inv: any) =>
                      inv.status === 'accepted' &&
                      ((emailLower && inv.target_email?.toLowerCase() === emailLower) || (uId && inv.target_user_id === uId))
                  )
                ) {
                  isInvitedTeamMember = true;
                }
              }
            } catch (e) {}
          }
          if (isInvitedTeamMember) {
            fallbackPlan = 'team';
          }
        }

        // Validasi fallback: jika 'team' tapi bukan pembayaran disetujui, pastikan keanggotaan aktif
        if (fallbackPlan === 'team' && latestApprovedPlan !== 'team') {
          let hasActiveTeam = false;
          if (supabase && currentUser.id) {
            try {
              const { data: activeMems } = await (supabase.from('brand_members' as any) as any)
                .select('id, role')
                .eq('user_id', currentUser.id)
                .neq('role', 'owner')
                .limit(1);
              if (activeMems && activeMems.length > 0) {
                hasActiveTeam = true;
              }
            } catch (e) {}
          }
          if (!hasActiveTeam && typeof window !== 'undefined') {
            try {
              const uId = currentUser.id;
              const rawTeam = uId ? localStorage.getItem('uda_team_membership_' + uId) : null;
              if (rawTeam) {
                const parsedT = JSON.parse(rawTeam);
                if (parsedT?.brand_id) {
                  const rawInv = localStorage.getItem('uda_brand_invitations');
                  if (rawInv) {
                    const invList = JSON.parse(rawInv);
                    const match = invList.find((i: any) => i.brand_id === parsedT.brand_id && (i.status === 'left' || i.status === 'cancelled'));
                    if (!match) hasActiveTeam = true;
                  } else {
                    hasActiveTeam = true;
                  }
                }
              }
            } catch (e) {}
          }

          if (!hasActiveTeam) {
            fallbackPlan = 'free';
            fallbackUntil = null;
            if (typeof window !== 'undefined') {
              try {
                localStorage.removeItem(`uda_user_plan_${currentUser.id}`);
                if (emailLower) localStorage.removeItem(`uda_user_plan_${emailLower}`);
                localStorage.removeItem(`uda_team_membership_${currentUser.id}`);
                localStorage.removeItem(`uda_system_role_${currentUser.id}`);
                localStorage.removeItem('uda_team_membership');
                localStorage.removeItem('uda_last_upgraded_user');
              } catch (e) {}
            }
          }
        }

        const resolvedRole: 'user' | 'admin' = isEmailAdmin ? 'admin' : ((currentUser.user_metadata?.role as 'user' | 'admin') || 'user');

        const newAccount = {
          user_id: currentUser.id,
          role: resolvedRole,
          plan_code: fallbackPlan,
          plan_until: fallbackUntil,
          payment_code: Math.floor(100 + Math.random() * 899),
        };
        const { data: createdAcc } = await (supabase.from('accounts' as any) as any).insert(newAccount).select().maybeSingle();
        finalAccount = createdAcc ? {
          id: createdAcc.id,
          user_id: createdAcc.user_id,
          role: (createdAcc.role as 'user' | 'admin') || resolvedRole,
          plan_code: createdAcc.plan_code || fallbackPlan,
          plan_until: createdAcc.plan_until || fallbackUntil,
          is_suspended: !!createdAcc.is_suspended,
        } : {
          id: currentUser.id,
          user_id: currentUser.id,
          role: resolvedRole,
          plan_code: fallbackPlan,
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

    // Safety timeout: JANGAN PERNAH biarkan loading terjebak lebih dari 600ms
    const safetyTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 600);

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

          if (isTarget && detail.planCode !== undefined) {
            const targetPlan = String(detail.planCode).toLowerCase();
            const targetUntil = targetPlan === 'free' ? null : (detail.planUntil !== undefined ? detail.planUntil : null);

            setAccount((prev) => {
              const updated = {
                ...(prev || { id: authUser?.id || 'acc-001', user_id: authUser?.id || 'acc-001', role: 'user' as const }),
                plan_code: targetPlan,
                plan_until: targetUntil,
              };
              try {
                localStorage.setItem('uda_auth_account', JSON.stringify(updated));
                if (targetPlan === 'free') {
                  localStorage.removeItem('uda_last_upgraded_user');
                }
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
      const cleanEmail = email.trim().toLowerCase();
      const isAdminEmail =
        cleanEmail === 'admin@udaplanner.id' ||
        cleanEmail === 'admin@udaplanner.com' ||
        cleanEmail === 'admin@udacoding.id';

      // Validasi ketat khusus akun admin melalui endpoint verifikasi password server
      let adminLoginSuccess = false;
      if (isAdminEmail) {
        try {
          const apiRes = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: cleanEmail, password }),
          });
          const apiData = await apiRes.json();
          if (!apiData.success) {
            return { error: 'Email atau kata sandi salah. Pastikan akun sudah terdaftar di UdaPlanner.' };
          }
          adminLoginSuccess = true;
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('uda_admin_custom_password', password);
            } catch (e) {}
          }
        } catch (apiErr) {
          console.warn('Admin login validation error:', apiErr);
        }
      }

      let { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      // Dukungan khusus akun administrator: Jika password benar tapi auth belum tersinkron
      if (error && isAdminEmail && adminLoginSuccess) {
        try {
          const retryAfterSync = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });
          if (!retryAfterSync.error && retryAfterSync.data?.user) {
            data = retryAfterSync.data;
            error = null;
          } else {
            // Jika auth supabase tetap terkendala tapi validasi /api/admin/login sukses
            const adminUser: any = {
              id: `admin-${cleanEmail}`,
              email: cleanEmail,
              app_metadata: { provider: 'email', providers: ['email'] },
              user_metadata: {
                full_name: 'Administrator UdaPlanner',
                role: 'admin',
                has_completed_onboarding: true,
                has_logged_in_before: true,
              },
              aud: 'authenticated',
              created_at: new Date().toISOString(),
              email_confirmed_at: new Date().toISOString(),
            };
            setUser(adminUser);
            try {
              localStorage.setItem('uda_auth_user', JSON.stringify(adminUser));
              localStorage.setItem('uda_is_admin', 'true');
              localStorage.setItem('uda_auth_role', 'admin');
              if (typeof document !== 'undefined') {
                document.cookie = 'uda_user_role=admin; path=/; max-age=604800; SameSite=Lax';
                document.cookie = 'uda_auth_token=true; path=/; max-age=604800; SameSite=Lax';
              }
            } catch (e) {}
            const loaded = await loadUserData(adminUser);
            return { error: null, isAdmin: true, needsOnboarding: false };
          }
        } catch (syncErr) {
          console.warn('Admin sync error:', syncErr);
        }
      }

      if (error) {
        if (error.message.includes('Invalid login credentials') || error.code === 'invalid_credentials') {
          return { error: 'Email atau kata sandi salah. Pastikan akun sudah terdaftar di UdaPlanner.' };
        }
        if (error.message.includes('Email not confirmed') || error.code === 'email_not_confirmed') {
          const cleanEmail = email.trim().toLowerCase();
          let isManuallyVerified = await VerificationService.isUserVerified(cleanEmail);
          if (!isManuallyVerified && typeof window !== 'undefined') {
            try {
              isManuallyVerified =
                localStorage.getItem(`uda_manually_verified_${cleanEmail}`) === 'true' ||
                localStorage.getItem(`uda_manually_verified_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`) === 'true';
            } catch (e) {}
          }

          if (isManuallyVerified) {
            try {
              await fetch('/api/admin/verify-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'manual_verify', email: cleanEmail }),
              });
            } catch (e) {}

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
        data.user.email?.toLowerCase() === 'admin@udaplanner.id' ||
        data.user.email?.toLowerCase() === 'admin@udaplanner.com' ||
        data.user.email?.toLowerCase().startsWith('admin@');

      if (isUserAdmin) {
        try {
          localStorage.setItem('uda_is_admin', 'true');
          localStorage.setItem('uda_auth_role', 'admin');
          if (typeof document !== 'undefined') {
            document.cookie = 'uda_user_role=admin; path=/; max-age=604800; SameSite=Lax';
            document.cookie = 'uda_auth_token=true; path=/; max-age=604800; SameSite=Lax';
          }
        } catch (e) {}
      }

      const needsOnboarding =
        !isUserAdmin &&
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

      if (data.user?.email) {
        const cEmail = data.user.email.toLowerCase().trim();
        try {
          localStorage.setItem(`uda_manually_verified_${cEmail}`, 'true');
          localStorage.setItem(`uda_manually_verified_${data.user.id}`, 'true');
          localStorage.removeItem(`uda_unverified_registration_${cEmail}`);
          localStorage.removeItem(`uda_unverified_registration_${data.user.id}`);
        } catch (e) {}
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
      // 1. Validasi awal: Periksa apakah email sudah terdaftar di database Supabase atau provider lain (Google OAuth)
      try {
        const checkRes = await fetch('/api/auth/check-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail }),
        });
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          if (checkData.exists) {
            return {
              error: checkData.message || 'Email ini sudah terdaftar. Silakan gunakan menu Masuk.',
              requiresEmailConfirmation: false,
            };
          }
        }
      } catch (checkErr) {
        console.warn('Pre-check email error:', checkErr);
      }

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
        if (
          error.message.includes('already registered') ||
          error.message.includes('already exists') ||
          error.code === 'user_already_exists'
        ) {
          return { error: 'Email ini sudah terdaftar. Silakan gunakan menu Masuk.', requiresEmailConfirmation: false };
        }
        if (error.message.includes('rate limit') || (error as any).status === 429 || error.code === 'over_email_send_rate_limit') {
          isRateLimited = true;
        } else {
          return { error: error.message, requiresEmailConfirmation: false };
        }
      } else {
        // PERIKSA IDENTITAS DARI SUPABASE AUTH:
        // Ketika email sudah pernah terdaftar (misal via Google atau email sebelumnya),
        // Supabase Auth mengembalikan data.user dengan identities = [] (array kosong).
        // Ini adalah mekanisme proteksi Supabase yang menandakan akun sudah ada!
        const identities = data?.user?.identities;
        if (data?.user && (!identities || identities.length === 0)) {
          return {
            error:
              'Email ini sudah terdaftar di sistem (terhubung dengan akun Google). Silakan masuk menggunakan tombol "Lanjutkan dengan Google" atau gunakan menu Masuk.',
            requiresEmailConfirmation: false,
          };
        }
        authResultUser = data.user;
      }

      const generatedUserId = authResultUser?.id || `usr-${Date.now()}`;
      await VerificationService.recordNewRegistration({
        userId: generatedUserId,
        email: cleanEmail,
        name: cleanName,
        authProvider: 'email',
        deliveryStatus: isRateLimited ? 'failed' : 'pending',
        notes: isRateLimited
          ? 'Email verifikasi gagal terkirim otomatis (SMTP limit). Menunggu konfirmasi manual oleh Admin di Panel Admin.'
          : 'Pendaftaran email biasa: Menunggu konfirmasi email pengguna atau konfirmasi manual Admin.',
      });

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
      if (user?.id) {
        localStorage.removeItem('uda_system_role_' + user.id);
        localStorage.removeItem('uda_team_membership_' + user.id);
      }
      // Bersihkan seluruh token cache auth Supabase di localStorage
      Object.keys(localStorage).forEach((key) => {
        if ((key.startsWith('sb-') && key.endsWith('-auth-token')) || key.startsWith('uda_auth_')) {
          localStorage.removeItem(key);
        }
      });
      // Bersihkan seluruh cookie auth
      if (typeof document !== 'undefined') {
        document.cookie = 'uda_auth_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
          const eqPos = cookie.indexOf('=');
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
          if (name.includes('auth') || name.includes('sb-') || name.includes('uda_')) {
            document.cookie = `${name}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
          }
        }
      }
    } catch (e) {}

    if (supabase) {
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch (e) {
        try {
          await supabase.auth.signOut();
        } catch (e2) {}
      }
    }

    setUser(null);
    setSession(null);
    setProfile(null);
    setAccount(null);

    if (typeof window !== 'undefined') {
      window.location.replace('/masuk?logout=true');
    } else {
      router.push('/masuk?logout=true');
    }
  };

  const signInWithGoogle = async (targetPath: string = '/app') => {
    if (!supabase) {
      return { error: 'Konfigurasi Supabase tidak ditemukan. Periksa file .env.local.' };
    }

    try {
      const siteUrl = getSiteUrl();
      const redirectTo = `${siteUrl}${targetPath}`;

      const { error } = await supabase.auth.signInWithOAuth({
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

  const isAdmin =
    account?.role === 'admin' ||
    user?.user_metadata?.role === 'admin' ||
    user?.email?.toLowerCase() === 'admin@udaplanner.id' ||
    user?.email?.toLowerCase().startsWith('admin@');

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
