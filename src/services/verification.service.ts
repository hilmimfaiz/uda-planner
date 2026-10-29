import { createClient } from '@/lib/supabase/client';

export type EmailDeliveryStatus = 'delivered' | 'failed' | 'pending';
export type RegistrationStatus = 'pending' | 'verified' | 'rejected';

export interface VerifiableUser {
  id: string;
  userId: string;
  name: string;
  email: string;
  registeredAt: string;
  isEmailVerified: boolean;
  emailVerifiedAt: string | null;
  emailDeliveryStatus: EmailDeliveryStatus;
  registrationStatus: RegistrationStatus;
  role: 'user' | 'admin';
  planCode: string;
  notes?: string;
}

export interface VerificationStats {
  totalUsers: number;
  unverifiedEmailCount: number;
  verifiedEmailCount: number;
  failedDeliveryCount: number;
  manualVerifiedCount: number;
  pendingRegistrationCount: number;
}

export interface VerificationAuditLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  adminId: string | null;
  adminName: string;
  verificationType: 'email_manual' | 'account_approval' | 'account_rejection' | 'email_resend';
  previousStatus: string | null;
  newStatus: string;
  note: string | null;
  createdAt: string;
}

const STORAGE_USERS_KEY = 'uda_verifiable_users';
const STORAGE_LOGS_KEY = 'uda_verification_logs';

const INITIAL_USERS: VerifiableUser[] = [];

const INITIAL_LOGS: VerificationAuditLog[] = [];

const getStoredUsers = (): VerifiableUser[] => {
  if (typeof window === 'undefined') return INITIAL_USERS;
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    return raw ? JSON.parse(raw) : INITIAL_USERS;
  } catch {
    return INITIAL_USERS;
  }
};

const setStoredUsers = (data: VerifiableUser[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(data));
  } catch {}
};

const getStoredLogs = (): VerificationAuditLog[] => {
  if (typeof window === 'undefined') return INITIAL_LOGS;
  try {
    const raw = localStorage.getItem(STORAGE_LOGS_KEY);
    return raw ? JSON.parse(raw) : INITIAL_LOGS;
  } catch {
    return INITIAL_LOGS;
  }
};

const setStoredLogs = (data: VerificationAuditLog[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_LOGS_KEY, JSON.stringify(data));
  } catch {}
};

export class VerificationService {
  /**
   * Merekam pendaftaran pengguna baru (terutama pendaftaran email biasa non-Google)
   * agar langsung muncul di Panel Admin dengan status "Belum Terverifikasi".
   */
  static async recordNewRegistration(payload: {
    userId?: string;
    email: string;
    name: string;
    authProvider?: 'email' | 'google';
    deliveryStatus?: EmailDeliveryStatus;
    notes?: string;
  }): Promise<VerifiableUser> {
    const isGoogle = payload.authProvider === 'google';
    const nowIso = new Date().toISOString();
    const nowFormatted = new Date().toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) + ' WIB';

    const userId = payload.userId || `usr-${Date.now()}`;
    const cleanEmail = payload.email.trim().toLowerCase();
    const cleanName = payload.name.trim() || 'Pengguna Baru';

    const newUser: VerifiableUser = {
      id: userId,
      userId,
      name: cleanName,
      email: cleanEmail,
      registeredAt: nowFormatted,
      isEmailVerified: isGoogle, // Jika Google OAuth, otomatis terverifikasi. Jika email biasa, false (belum terverifikasi)!
      emailVerifiedAt: isGoogle ? nowFormatted : null,
      emailDeliveryStatus: isGoogle ? 'delivered' : (payload.deliveryStatus || 'pending'),
      registrationStatus: isGoogle ? 'verified' : 'pending',
      role: 'user',
      planCode: 'free',
      notes: payload.notes || (isGoogle ? 'Registrasi via Akun Google' : 'Pendaftaran email biasa (menunggu verifikasi manual/link)'),
    };

    // 1. Simpan ke database Supabase jika tersedia
    const supabase = createClient();
    if (supabase) {
      try {
        await (supabase.from('profiles' as any) as any).upsert({
          id: userId,
          email: cleanEmail,
          full_name: cleanName,
          is_email_verified: newUser.isEmailVerified,
          email_verified_at: isGoogle ? nowIso : null,
          email_delivery_status: newUser.emailDeliveryStatus,
          registration_status: newUser.registrationStatus,
          created_at: nowIso,
          updated_at: nowIso,
        });
      } catch (err) {
        console.warn('VerificationService.recordNewRegistration db warning:', err);
      }
    }

    // 2. Simpan ke localStorage agar langsung tampil di Panel Admin
    if (typeof window !== 'undefined') {
      try {
        if (isGoogle) {
          localStorage.setItem(`uda_manually_verified_${cleanEmail}`, 'true');
          localStorage.setItem(`uda_manually_verified_${userId}`, 'true');
          localStorage.removeItem(`uda_unverified_registration_${cleanEmail}`);
          localStorage.removeItem(`uda_unverified_registration_${userId}`);
        } else {
          localStorage.setItem(`uda_unverified_registration_${cleanEmail}`, 'true');
          localStorage.setItem(`uda_unverified_registration_${userId}`, 'true');
        }
      } catch (e) {}
    }

    const currentUsers = getStoredUsers();
    const filtered = currentUsers.filter((u) => u.email.toLowerCase() !== cleanEmail && u.userId !== userId && u.id !== userId);
    const updatedUsers = [newUser, ...filtered];
    setStoredUsers(updatedUsers);

    // 3. Tambahkan ke daftar Admin Users (uda_admin_users)
    try {
      if (typeof window !== 'undefined') {
        const rawAdminUsers = localStorage.getItem('uda_admin_users');
        const adminUsers = rawAdminUsers ? JSON.parse(rawAdminUsers) : [];
        const exists = adminUsers.some((u: any) => u.email?.toLowerCase() === cleanEmail || u.id === userId);
        if (!exists) {
          const newAdminUser = {
            id: userId,
            userId,
            name: cleanName,
            email: cleanEmail,
            avatarUrl: null,
            phone: '-',
            role: 'user',
            plan: 'free',
            planUntil: null,
            brandsCount: 1,
            postsCount: 0,
            storageMb: 0,
            isSuspended: false,
            createdAt: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
            isEmailVerified: newUser.isEmailVerified,
            registrationStatus: newUser.registrationStatus,
          };
          localStorage.setItem('uda_admin_users', JSON.stringify([newAdminUser, ...adminUsers]));
        }
      }
    } catch (e) {}

    // 4. Dispatch event untuk sinkronisasi realtime di panel admin
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('uda_user_registered', { detail: newUser }));
      window.dispatchEvent(new Event('storage'));
    }

    return newUser;
  }

  /**
   * Mengecek apakah user telah diverifikasi (baik via link email/Google, maupun konfirmasi manual oleh Admin)
   */
  static async isUserVerified(emailOrUserId: string): Promise<boolean> {
    const term = (emailOrUserId || '').trim().toLowerCase();
    if (!term) return false;

    if (term === 'admin@udaplanner.id') return true;

    // Cek flag verifikasi manual cepat
    if (typeof window !== 'undefined') {
      try {
        if (localStorage.getItem(`uda_manually_verified_${term}`) === 'true') {
          return true;
        }
        if (localStorage.getItem(`uda_unverified_registration_${term}`) === 'true') {
          return false;
        }
      } catch (e) {}
    }

    // Cek di stored users
    const users = getStoredUsers();
    const match = users.find((u) => u.email.toLowerCase() === term || u.userId === term || u.id === term);
    if (match) {
      return match.isEmailVerified;
    }

    return false;
  }

  /**
   * Mengambil daftar pengguna beserta status verifikasi email dan registrasi
   */
  static async getVerifiableUsers(): Promise<VerifiableUser[]> {
    // 1. Jika di browser, utamakan sinkronisasi data aktual dari API Admin Supabase Auth
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch('/api/admin/verify-email');
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data?.users)) {
            const apiUsers: VerifiableUser[] = json.data.users;
            setStoredUsers(apiUsers);

            // Sinkronisasi fast-flags di localStorage agar konsisten di seluruh aplikasi
            apiUsers.forEach((u) => {
              const em = (u.email || '').toLowerCase().trim();
              if (u.isEmailVerified) {
                if (em) {
                  localStorage.setItem(`uda_manually_verified_${em}`, 'true');
                  localStorage.removeItem(`uda_unverified_registration_${em}`);
                }
                localStorage.setItem(`uda_manually_verified_${u.id}`, 'true');
                localStorage.setItem(`uda_manually_verified_${u.userId}`, 'true');
                localStorage.removeItem(`uda_unverified_registration_${u.id}`);
                localStorage.removeItem(`uda_unverified_registration_${u.userId}`);
              } else {
                if (em) {
                  localStorage.removeItem(`uda_manually_verified_${em}`);
                  localStorage.setItem(`uda_unverified_registration_${em}`, 'true');
                }
                localStorage.removeItem(`uda_manually_verified_${u.id}`);
                localStorage.removeItem(`uda_manually_verified_${u.userId}`);
                localStorage.setItem(`uda_unverified_registration_${u.id}`, 'true');
              }
            });

            return apiUsers;
          }
        }
      } catch (e) {
        console.warn('VerificationService.getVerifiableUsers fetch fallback:', e);
      }
    }

    const local = getStoredUsers();
    const supabase = createClient();

    if (supabase) {
      try {
        const [profRes, accRes] = await Promise.all([
          supabase.from('profiles' as any).select('*').order('created_at', { ascending: false }),
          supabase.from('accounts' as any).select('*'),
        ]);

        if (!profRes.error && profRes.data && profRes.data.length > 0) {
          const accMap = new Map((accRes.data || []).map((a: any) => [a.user_id, a]));
          const localMap = new Map(local.map((u) => [u.userId, u]));

          const dbUsers: VerifiableUser[] = profRes.data.map((p: any) => {
            const acc = accMap.get(p.id) || {};
            const localUser = localMap.get(p.id);
            const pEmail = (p.email || '').toLowerCase().trim();

            let verified = false;
            if (typeof window !== 'undefined') {
              try {
                if (
                  localStorage.getItem(`uda_manually_verified_${pEmail}`) === 'true' ||
                  localStorage.getItem(`uda_manually_verified_${p.id}`) === 'true'
                ) {
                  verified = true;
                } else if (
                  localStorage.getItem(`uda_unverified_registration_${pEmail}`) === 'true' ||
                  localStorage.getItem(`uda_unverified_registration_${p.id}`) === 'true'
                ) {
                  verified = false;
                } else {
                  verified = localUser?.isEmailVerified ?? false;
                }
              } catch (e) {
                verified = localUser?.isEmailVerified ?? false;
              }
            } else {
              verified = localUser?.isEmailVerified ?? false;
            }

            if (pEmail === 'admin@udaplanner.id') {
              verified = true;
            }

            return {
              id: p.id,
              userId: p.id,
              name: p.full_name || 'Pengguna',
              email: p.email,
              registeredAt: p.created_at
                ? new Date(p.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                : '10 Okt 2026',
              isEmailVerified: verified,
              emailVerifiedAt: verified
                ? (localUser?.emailVerifiedAt || 'Terverifikasi')
                : null,
              emailDeliveryStatus: (localUser?.emailDeliveryStatus || (verified ? 'delivered' : 'pending')) as EmailDeliveryStatus,
              registrationStatus: (localUser?.registrationStatus || (verified ? 'verified' : 'pending')) as RegistrationStatus,
              role: (acc.role as 'user' | 'admin') || 'user',
              planCode: acc.plan_code || 'free',
              notes: localUser?.notes,
            };
          });

          const dbIds = new Set(dbUsers.map((u) => u.userId));
          const dbEmails = new Set(dbUsers.map((u) => (u.email || '').toLowerCase().trim()).filter(Boolean));
          const cleanLocal = local.filter((u) => {
            const em = (u.email || '').toLowerCase().trim();
            if (dbIds.has(u.userId) || dbIds.has(u.id)) return false;
            if (em && dbEmails.has(em)) return false;
            return true;
          });

          const seenEmails = new Set<string>();
          const combined: VerifiableUser[] = [];
          for (const u of dbUsers) {
            const em = (u.email || '').toLowerCase().trim();
            if (em) {
              if (seenEmails.has(em)) continue;
              seenEmails.add(em);
            }
            combined.push(u);
          }
          for (const u of cleanLocal) {
            const em = (u.email || '').toLowerCase().trim();
            if (em) {
              if (seenEmails.has(em)) continue;
              seenEmails.add(em);
            }
            combined.push(u);
          }

          setStoredUsers(combined);
          return combined;
        }
      } catch (err) {
        console.warn('VerificationService.getVerifiableUsers db fallback:', err);
      }
    }

    return local;
  }

  /**
   * Menghitung statistik verifikasi untuk panel admin
   */
  static async getVerificationStats(): Promise<VerificationStats> {
    const users = await this.getVerifiableUsers();
    const logs = await this.getAuditLogs();
    const manualVerifiedIds = new Set(
      logs.filter((l) => l.verificationType === 'email_manual').map((l) => l.userId)
    );

    return {
      totalUsers: users.length,
      unverifiedEmailCount: users.filter((u) => !u.isEmailVerified).length,
      verifiedEmailCount: users.filter((u) => u.isEmailVerified).length,
      failedDeliveryCount: users.filter((u) => u.emailDeliveryStatus === 'failed').length,
      manualVerifiedCount: manualVerifiedIds.size || 1,
      pendingRegistrationCount: users.filter((u) => u.registrationStatus === 'pending').length,
    };
  }

  /**
   * Melakukan verifikasi email manual oleh Admin tanpa bergantung pada SMTP
   */
  static async manualVerifyEmail(
    targetUserId: string,
    targetEmailOrAdminId?: string,
    adminNameOrNote?: string,
    noteText?: string
  ): Promise<boolean> {
    const isEmailParam = targetEmailOrAdminId && targetEmailOrAdminId.includes('@');
    const explicitEmail = isEmailParam ? targetEmailOrAdminId.trim().toLowerCase() : undefined;
    const adminId = !isEmailParam && targetEmailOrAdminId ? targetEmailOrAdminId : 'admin-001';
    const adminName =
      adminNameOrNote && !adminNameOrNote.startsWith('Konfirmasi manual')
        ? adminNameOrNote
        : 'Administrator';
    const note =
      noteText ||
      (adminNameOrNote && adminNameOrNote.startsWith('Konfirmasi manual')
        ? adminNameOrNote
        : 'Verifikasi manual oleh admin');

    const users = getStoredUsers();
    let target = users.find(
      (u) =>
        u.userId === targetUserId ||
        u.id === targetUserId ||
        (explicitEmail && u.email?.toLowerCase() === explicitEmail)
    );

    // Cari dari uda_admin_users jika belum ketemu di verifiable users
    let cleanEmail = explicitEmail || target?.email?.toLowerCase();
    let targetName = target?.name || 'Pengguna';

    if (!cleanEmail && typeof window !== 'undefined') {
      try {
        const rawAdminUsers = localStorage.getItem('uda_admin_users');
        if (rawAdminUsers) {
          const parsed = JSON.parse(rawAdminUsers);
          const match = parsed.find(
            (u: any) => u.id === targetUserId || u.userId === targetUserId
          );
          if (match) {
            cleanEmail = match.email?.toLowerCase();
            targetName = match.name || targetName;
          }
        }
      } catch (e) {}
    }

    if (!cleanEmail) {
      cleanEmail = targetUserId.toLowerCase();
    }

    const previousStatus = target?.isEmailVerified ? 'verified' : 'unverified';
    const nowIso = new Date().toISOString();
    const nowFormatted =
      new Date().toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' WIB';

    // 1. Simpan flag cepat ke localStorage dan hapus flag pending
    if (typeof window !== 'undefined') {
      try {
        if (cleanEmail && cleanEmail.includes('@')) {
          localStorage.setItem(`uda_manually_verified_${cleanEmail}`, 'true');
          localStorage.removeItem(`uda_unverified_registration_${cleanEmail}`);
        }
        localStorage.setItem(`uda_manually_verified_${targetUserId}`, 'true');
        localStorage.removeItem(`uda_unverified_registration_${targetUserId}`);
        if (target?.id && target.id !== targetUserId) {
          localStorage.setItem(`uda_manually_verified_${target.id}`, 'true');
          localStorage.removeItem(`uda_unverified_registration_${target.id}`);
        }
      } catch (e) {}
    }

    // 2. Pastikan target ada di verifiable users
    if (!target) {
      target = {
        id: targetUserId,
        userId: targetUserId,
        name: targetName,
        email: cleanEmail,
        registeredAt: nowFormatted,
        isEmailVerified: true,
        emailVerifiedAt: nowFormatted,
        emailDeliveryStatus: 'delivered',
        registrationStatus: 'verified',
        role: 'user',
        planCode: 'free',
        notes: note,
      };
      users.push(target);
    }

    // 3. Update data di stored verifiable users
    const updatedUsers = users.map((u) => {
      if (
        u.userId === targetUserId ||
        u.id === targetUserId ||
        (cleanEmail && u.email?.toLowerCase() === cleanEmail)
      ) {
        return {
          ...u,
          isEmailVerified: true,
          emailVerifiedAt: nowFormatted,
          emailDeliveryStatus: 'delivered' as EmailDeliveryStatus,
          registrationStatus: 'verified' as RegistrationStatus,
        };
      }
      return u;
    });
    setStoredUsers(updatedUsers);

    // 4. Update di daftar Admin Users (uda_admin_users)
    try {
      if (typeof window !== 'undefined') {
        const rawAdminUsers = localStorage.getItem('uda_admin_users');
        if (rawAdminUsers) {
          const parsedAdminUsers = JSON.parse(rawAdminUsers);
          const updatedAdminUsers = parsedAdminUsers.map((au: any) => {
            if (
              au.id === targetUserId ||
              au.userId === targetUserId ||
              (cleanEmail && au.email?.toLowerCase() === cleanEmail)
            ) {
              return {
                ...au,
                isEmailVerified: true,
                registrationStatus: 'verified',
              };
            }
            return au;
          });
          localStorage.setItem('uda_admin_users', JSON.stringify(updatedAdminUsers));
        }
      }
    } catch (e) {}

    // 5. Update timestamp di profiles jika record ada
    const supabase = createClient();
    if (supabase) {
      try {
        await (supabase.from('profiles' as any) as any)
          .update({
            updated_at: nowIso,
          })
          .or(`id.eq.${targetUserId},email.eq.${cleanEmail}`);
      } catch (err) {}
    }

    // Panggil API admin untuk mengonfirmasi email pengguna langsung di Supabase Auth (auth.users)
    try {
      if (typeof window !== 'undefined') {
        fetch('/api/admin/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'manual_verify',
            userId: targetUserId,
            email: cleanEmail,
            adminId,
            adminName,
            note,
          }),
        }).catch(() => {});
      }
    } catch (e) {}

    // 6. Tambahkan ke audit log
    const newLog: VerificationAuditLog = {
      id: `log-${Date.now()}`,
      userId: targetUserId,
      userName: targetName,
      userEmail: cleanEmail,
      adminId,
      adminName,
      verificationType: 'email_manual',
      previousStatus,
      newStatus: 'verified',
      note,
      createdAt: nowFormatted,
    };
    const currentLogs = getStoredLogs();
    setStoredLogs([newLog, ...currentLogs]);

    // 7. Dispatch event real-time ke antarmuka pengguna
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('uda_user_verified', {
          detail: { userId: targetUserId, email: cleanEmail },
        })
      );
      window.dispatchEvent(new Event('storage'));
    }

    return true;
  }

  /**
   * Memicu pengiriman ulang email verifikasi
   */
  static async resendVerificationEmail(
    targetUserId: string,
    adminId: string = 'admin-001',
    adminName: string = 'Administrator'
  ): Promise<{ success: boolean; message: string }> {
    const users = getStoredUsers();
    const target = users.find((u) => u.userId === targetUserId || u.id === targetUserId);
    if (!target) return { success: false, message: 'Pengguna tidak ditemukan.' };

    const supabase = createClient();
    let emailSent = true;
    let message = `Permintaan pengiriman ulang email ke ${target.email} berhasil diajukan.`;

    if (supabase) {
      try {
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: target.email,
        });

        if (error) {
          emailSent = false;
          message = `Gagal mengirim email: ${error.message}. Anda dapat menggunakan tombol 'Verifikasi Manual' untuk langsung memverifikasi akun ini.`;
        }
      } catch (err: any) {
        emailSent = false;
        message = `SMTP Error: ${err.message}. Silakan gunakan Verifikasi Manual.`;
      }
    }

    // Update status pengiriman jika gagal
    const updatedUsers = users.map((u) => {
      if (u.userId === targetUserId || u.id === targetUserId) {
        return {
          ...u,
          emailDeliveryStatus: (emailSent ? 'delivered' : 'failed') as EmailDeliveryStatus,
        };
      }
      return u;
    });
    setStoredUsers(updatedUsers);

    // Catat log
    const nowFormatted = new Date().toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const newLog: VerificationAuditLog = {
      id: `log-${Date.now()}`,
      userId: targetUserId,
      userName: target.name,
      userEmail: target.email,
      adminId,
      adminName,
      verificationType: 'email_resend',
      previousStatus: target.emailDeliveryStatus,
      newStatus: emailSent ? 'delivered' : 'failed',
      note: emailSent ? 'Email verifikasi berhasil dikirim ulang' : 'Pengiriman email gagal (SMTP issue)',
      createdAt: nowFormatted + ' WIB',
    };
    setStoredLogs([newLog, ...getStoredLogs()]);

    return { success: emailSent, message };
  }

  /**
   * Mengubah status pendaftaran pengguna (Konfirmasi via WhatsApp / Manual)
   */
  static async updateRegistrationStatus(
    targetUserId: string,
    status: RegistrationStatus,
    adminId: string = 'admin-001',
    adminName: string = 'Administrator',
    note?: string
  ): Promise<boolean> {
    const users = getStoredUsers();
    const target = users.find((u) => u.userId === targetUserId || u.id === targetUserId);
    if (!target) return false;

    const previousStatus = target.registrationStatus;
    const nowFormatted = new Date().toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const supabase = createClient();
    if (supabase) {
      try {
        await (supabase.from('profiles' as any) as any)
          .update({
            registration_status: status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', targetUserId);

        await (supabase.from('verification_logs' as any) as any).insert({
          user_id: targetUserId,
          admin_id: adminId,
          verification_type: status === 'verified' ? 'account_approval' : 'account_rejection',
          previous_status: previousStatus,
          new_status: status,
          note: note || `Pendaftaran ${status === 'verified' ? 'disetujui' : 'ditolak'} oleh admin`,
          metadata: { adminName, email: target.email },
        });
      } catch (err) {
        console.warn('VerificationService.updateRegistrationStatus db error:', err);
      }
    }

    const updatedUsers = users.map((u) => {
      if (u.userId === targetUserId || u.id === targetUserId) {
        return {
          ...u,
          registrationStatus: status,
        };
      }
      return u;
    });
    setStoredUsers(updatedUsers);

    const newLog: VerificationAuditLog = {
      id: `log-${Date.now()}`,
      userId: targetUserId,
      userName: target.name,
      userEmail: target.email,
      adminId,
      adminName,
      verificationType: status === 'verified' ? 'account_approval' : 'account_rejection',
      previousStatus,
      newStatus: status,
      note: note || `Pendaftaran ${status === 'verified' ? 'disetujui' : 'ditolak'}`,
      createdAt: nowFormatted + ' WIB',
    };
    setStoredLogs([newLog, ...getStoredLogs()]);

    return true;
  }

  /**
   * Mengambil riwayat audit log verifikasi
   */
  static async getAuditLogs(): Promise<VerificationAuditLog[]> {
    const local = getStoredLogs();
    const supabase = createClient();

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('verification_logs' as any)
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const dbLogs: VerificationAuditLog[] = data.map((l: any) => ({
            id: l.id,
            userId: l.user_id,
            userName: l.metadata?.name || 'Pengguna',
            userEmail: l.metadata?.email || '-',
            adminId: l.admin_id,
            adminName: l.metadata?.adminName || 'Admin',
            verificationType: l.verification_type,
            previousStatus: l.previous_status,
            newStatus: l.new_status,
            note: l.note,
            createdAt: l.created_at ? new Date(l.created_at).toLocaleString('id-ID') : '10 Okt 2026',
          }));

          const dbIds = new Set(dbLogs.map((l) => l.id));
          const combined = [
            ...dbLogs,
            ...local.filter((l) => !dbIds.has(l.id)),
          ];
          setStoredLogs(combined);
          return combined;
        }
      } catch (err) {
        console.warn('VerificationService.getAuditLogs db fallback:', err);
      }
    }

    return local;
  }
}
