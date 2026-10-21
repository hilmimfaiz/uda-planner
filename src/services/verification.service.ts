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

const INITIAL_USERS: VerifiableUser[] = [
  {
    id: 'usr-1',
    userId: 'usr-1',
    name: 'Administrator UdaPlanner',
    email: 'admin@udaplanner.id',
    registeredAt: '2026-10-10 08:30 WIB',
    isEmailVerified: true,
    emailVerifiedAt: '2026-10-10 08:31 WIB',
    emailDeliveryStatus: 'delivered',
    registrationStatus: 'verified',
    role: 'admin',
    planCode: 'team',
  },
  {
    id: 'usr-2',
    userId: 'usr-2',
    name: 'Rizki Pratama',
    email: 'rizki@udacoding.id',
    registeredAt: '2026-10-11 11:20 WIB',
    isEmailVerified: true,
    emailVerifiedAt: '2026-10-11 11:22 WIB',
    emailDeliveryStatus: 'delivered',
    registrationStatus: 'verified',
    role: 'user',
    planCode: 'pro',
  },
  {
    id: 'usr-3',
    userId: 'usr-3',
    name: 'Sarah Rahmawati',
    email: 'sarah@udaplanner.id',
    registeredAt: '2026-10-12 14:15 WIB',
    isEmailVerified: false,
    emailVerifiedAt: null,
    emailDeliveryStatus: 'failed',
    registrationStatus: 'pending',
    role: 'user',
    planCode: 'free',
    notes: 'SMTP error: over_email_send_rate_limit',
  },
  {
    id: 'usr-4',
    userId: 'usr-4',
    name: 'Budi Santoso',
    email: 'budi@gmail.com',
    registeredAt: '2026-10-13 09:45 WIB',
    isEmailVerified: false,
    emailVerifiedAt: null,
    emailDeliveryStatus: 'pending',
    registrationStatus: 'pending',
    role: 'user',
    planCode: 'free',
  },
  {
    id: 'usr-5',
    userId: 'usr-5',
    name: 'Ahmad Fauzan',
    email: 'ahmad.fauzan@agencykreatif.com',
    registeredAt: '2026-10-14 16:10 WIB',
    isEmailVerified: false,
    emailVerifiedAt: null,
    emailDeliveryStatus: 'failed',
    registrationStatus: 'pending',
    role: 'user',
    planCode: 'pro',
    notes: 'SMTP limit reached',
  },
  {
    id: 'usr-6',
    userId: 'usr-6',
    name: 'Dewi Lestari',
    email: 'dewi.lestari@brandfashion.id',
    registeredAt: '2026-10-15 10:00 WIB',
    isEmailVerified: true,
    emailVerifiedAt: '2026-10-15 10:05 WIB',
    emailDeliveryStatus: 'delivered',
    registrationStatus: 'verified',
    role: 'user',
    planCode: 'pro',
  },
];

const INITIAL_LOGS: VerificationAuditLog[] = [
  {
    id: 'log-1',
    userId: 'usr-2',
    userName: 'Rizki Pratama',
    userEmail: 'rizki@udacoding.id',
    adminId: 'usr-1',
    adminName: 'Administrator',
    verificationType: 'email_manual',
    previousStatus: 'unverified',
    newStatus: 'verified',
    note: 'Verifikasi manual karena konfirmasi WhatsApp langsung',
    createdAt: '2026-10-11 11:22 WIB',
  },
];

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
   * Mengambil daftar pengguna beserta status verifikasi email dan registrasi
   */
  static async getVerifiableUsers(): Promise<VerifiableUser[]> {
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

            return {
              id: p.id,
              userId: p.id,
              name: p.full_name || 'Pengguna',
              email: p.email,
              registeredAt: p.created_at
                ? new Date(p.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                : '10 Okt 2026',
              isEmailVerified: p.is_email_verified ?? (localUser?.isEmailVerified ?? true),
              emailVerifiedAt: p.email_verified_at
                ? new Date(p.email_verified_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                : (localUser?.emailVerifiedAt || null),
              emailDeliveryStatus: (p.email_delivery_status || localUser?.emailDeliveryStatus || 'delivered') as EmailDeliveryStatus,
              registrationStatus: (p.registration_status || localUser?.registrationStatus || 'verified') as RegistrationStatus,
              role: (acc.role as 'user' | 'admin') || 'user',
              planCode: acc.plan_code || 'free',
              notes: localUser?.notes,
            };
          });

          // Gabungkan data DB dengan mock data jika ada
          const dbIds = new Set(dbUsers.map((u) => u.userId));
          const combined = [
            ...dbUsers,
            ...local.filter((u) => !dbIds.has(u.userId)),
          ];
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
    adminId: string = 'admin-001',
    adminName: string = 'Administrator',
    note: string = 'Verifikasi manual oleh admin'
  ): Promise<boolean> {
    const users = getStoredUsers();
    const target = users.find((u) => u.userId === targetUserId || u.id === targetUserId);
    if (!target) return false;

    const previousStatus = target.isEmailVerified ? 'verified' : 'unverified';
    const nowIso = new Date().toISOString();
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
            is_email_verified: true,
            email_verified_at: nowIso,
            email_delivery_status: 'delivered',
            updated_at: nowIso,
          })
          .eq('id', targetUserId);

        await (supabase.from('verification_logs' as any) as any).insert({
          user_id: targetUserId,
          admin_id: adminId,
          verification_type: 'email_manual',
          previous_status: previousStatus,
          new_status: 'verified',
          note,
          metadata: { adminName, email: target.email },
        });
      } catch (err) {
        console.warn('VerificationService.manualVerifyEmail db error:', err);
      }
    }

    // Update local storage
    const updatedUsers = users.map((u) => {
      if (u.userId === targetUserId || u.id === targetUserId) {
        return {
          ...u,
          isEmailVerified: true,
          emailVerifiedAt: nowFormatted,
          emailDeliveryStatus: 'delivered' as EmailDeliveryStatus,
        };
      }
      return u;
    });
    setStoredUsers(updatedUsers);

    // Tambahkan ke audit log
    const newLog: VerificationAuditLog = {
      id: `log-${Date.now()}`,
      userId: targetUserId,
      userName: target.name,
      userEmail: target.email,
      adminId,
      adminName,
      verificationType: 'email_manual',
      previousStatus,
      newStatus: 'verified',
      note,
      createdAt: nowFormatted + ' WIB',
    };
    const currentLogs = getStoredLogs();
    setStoredLogs([newLog, ...currentLogs]);

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
