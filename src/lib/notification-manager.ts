// Notification Manager with real-time events and Web Audio API
import { DUMMY_NOTIFICATIONS, DummyNotification } from './dummy-data';
import { playNotificationSound } from './audio-effects';

const NOTIF_STORAGE_KEY = 'uda_custom_notifications';
const DELETED_NOTIFS_STORAGE_KEY = 'uda_deleted_notification_ids';
const DELETED_INVITES_STORAGE_KEY = 'uda_deleted_invite_ids';

export function getDeletedNotifIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DELETED_NOTIFS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getDeletedInviteIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DELETED_INVITES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function recordDeletedNotification(notif: DummyNotification | string) {
  if (typeof window === 'undefined') return;
  try {
    let notifId = typeof notif === 'string' ? notif : notif.id;
    let inviteId = typeof notif !== 'string' ? notif.invite_data?.invite_id : undefined;
    let brandId = typeof notif !== 'string' ? notif.invite_data?.brand_id : undefined;
    let targetEmail = typeof notif !== 'string' ? (notif.target_email || notif.invite_data?.target_email) : undefined;
    let targetUserId = typeof notif !== 'string' ? (notif.target_user_id || notif.invite_data?.target_user_id) : undefined;

    if (typeof notif === 'string') {
      try {
        const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
        if (raw) {
          const list: DummyNotification[] = JSON.parse(raw);
          const found = list.find((n) => n.id === notif);
          if (found) {
            inviteId = found.invite_data?.invite_id;
            brandId = found.invite_data?.brand_id;
            targetEmail = found.target_email || found.invite_data?.target_email;
            targetUserId = found.target_user_id || found.invite_data?.target_user_id;
          }
        }
      } catch {}
    }

    const notifIds = getDeletedNotifIds();
    if (notifId && !notifIds.includes(notifId)) {
      notifIds.push(notifId);
      localStorage.setItem(DELETED_NOTIFS_STORAGE_KEY, JSON.stringify(notifIds));
    }

    if (inviteId) {
      const invIds = getDeletedInviteIds();
      if (!invIds.includes(inviteId)) {
        invIds.push(inviteId);
        localStorage.setItem(DELETED_INVITES_STORAGE_KEY, JSON.stringify(invIds));
      }
    }

    try {
      const rawInv = localStorage.getItem('uda_brand_invitations');
      if (rawInv) {
        const invList = JSON.parse(rawInv);
        const updatedInv = invList.map((item: any) => {
          if (
            (inviteId && item.id === inviteId) ||
            (brandId && targetEmail && item.brand_id === brandId && item.target_email?.toLowerCase() === targetEmail.toLowerCase())
          ) {
            return { ...item, status: 'cancelled' };
          }
          return item;
        });
        localStorage.setItem('uda_brand_invitations', JSON.stringify(updatedInv));
      }
    } catch {}

    if (inviteId || (brandId && (targetEmail || targetUserId))) {
      fetch('/api/invitations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          inviteId,
          brandId,
          userEmail: targetEmail,
          userId: targetUserId,
        }),
      }).catch(() => {});
    }
  } catch {}
}

/**
 * Format waktu notifikasi secara dinamis:
 * - Baru masuk (< 1 menit): "Baru saja"
 * - Hitungan menit (< 1 jam): "1 menit yang lalu", "5 menit yang lalu", dst.
 * - Hitungan jam (< 24 jam): "1 jam yang lalu", "2 jam yang lalu", dst.
 * - Lebih dari 24 jam / hari lain: contoh "12:01 01/11/26" (HH:mm DD/MM/YY)
 */
export function formatNotificationTime(
  created_at?: string,
  id?: string,
  fallback?: string
): string {
  let timeMs = 0;
  if (created_at) {
    const parsed = new Date(created_at).getTime();
    if (!isNaN(parsed) && parsed > 0) timeMs = parsed;
  }
  if (!timeMs && id) {
    const match = id.match(/\d+/);
    if (match) {
      const parsedNum = parseInt(match[0], 10);
      if (parsedNum > 1000000000000) {
        timeMs = parsedNum;
      }
    }
  }

  if (!timeMs) {
    return fallback || 'Baru saja';
  }

  const date = new Date(timeMs);
  const now = Date.now();
  const diffMs = Math.max(0, now - timeMs);
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);

  // Komponen jam dan tanggal (contoh: 12:01 01/11/26)
  const hoursStr = String(date.getHours()).padStart(2, '0');
  const minsStr = String(date.getMinutes()).padStart(2, '0');
  const dayStr = String(date.getDate()).padStart(2, '0');
  const monthStr = String(date.getMonth() + 1).padStart(2, '0');
  const yearShort = String(date.getFullYear()).slice(-2);
  const fullDateTime = `${hoursStr}:${minsStr} ${dayStr}/${monthStr}/${yearShort}`;

  // 1. Kurang dari 1 menit: Baru saja
  if (diffMins < 1) {
    return 'Baru saja';
  }

  // 2. 1 menit sampai 59 menit: misal "1 menit yang lalu", "15 menit yang lalu"
  if (diffMins < 60) {
    return `${diffMins} menit yang lalu`;
  }

  // 3. 1 jam sampai 23 jam: misal "1 jam yang lalu", "5 jam yang lalu"
  if (diffHours < 24) {
    return `${diffHours} jam yang lalu`;
  }

  // 4. Lebih dari 24 jam: format waktu & tanggal contoh 12:01 01/11/26
  return fullDateTime;
}

export function formatFullDateTime(created_at?: string, id?: string): string {
  let timeMs = 0;
  if (created_at) {
    const parsed = new Date(created_at).getTime();
    if (!isNaN(parsed) && parsed > 0) timeMs = parsed;
  }
  if (!timeMs && id) {
    const match = id.match(/\d+/);
    if (match) {
      const parsedNum = parseInt(match[0], 10);
      if (parsedNum > 1000000000000) {
        timeMs = parsedNum;
      }
    }
  }
  if (!timeMs) return '';
  const date = new Date(timeMs);
  const hoursStr = String(date.getHours()).padStart(2, '0');
  const minsStr = String(date.getMinutes()).padStart(2, '0');
  const dayStr = String(date.getDate()).padStart(2, '0');
  const monthStr = String(date.getMonth() + 1).padStart(2, '0');
  const yearShort = String(date.getFullYear()).slice(-2);
  return `${hoursStr}:${minsStr} ${dayStr}/${monthStr}/${yearShort}`;
}

export function getStoredNotifications(userEmail?: string, userId?: string): DummyNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
    if (!raw) return [];
    const custom: DummyNotification[] = JSON.parse(raw);
    const deletedIds = getDeletedNotifIds();
    const list = (Array.isArray(custom) ? custom : []).filter(
      (n: any) => n && !['notif-1', 'notif-2', 'notif-3', 'notif-4', 'notif-5'].includes(n.id) && !deletedIds.includes(n.id)
    );

    // Resolve current user email & ID if not provided directly
    let targetEmail = userEmail ? userEmail.trim().toLowerCase() : '';
    let targetId = userId ? userId.trim() : '';
    if (!targetEmail || !targetId) {
      try {
        const rawProfile = localStorage.getItem('uda_auth_profile');
        if (rawProfile) {
          const parsed = JSON.parse(rawProfile);
          if (!targetEmail && parsed.email) targetEmail = parsed.email.trim().toLowerCase();
          if (!targetId && parsed.id) targetId = parsed.id.trim();
        }
      } catch {}
    }

    // Filter: Undangan tim atau notifikasi terarah HANYA boleh tampil untuk user yang dituju!
    const filtered = list.filter((n: DummyNotification) => {
      const inviteTargetEmail = (n.target_email || n.invite_data?.target_email)?.trim().toLowerCase();
      const inviteTargetId = (n.target_user_id || n.invite_data?.target_user_id)?.trim();

      const isTargeted = n.type === 'team_invite' || !!inviteTargetEmail || !!inviteTargetId;

      if (isTargeted) {
        if (!targetEmail && !targetId) {
          // Jika belum ada user aktif yang terdeteksi, jangan tampilkan undangan privat
          return false;
        }

        const emailMatches = !!(targetEmail && inviteTargetEmail && targetEmail === inviteTargetEmail);
        const idMatches = !!(targetId && inviteTargetId && targetId === inviteTargetId);

        // Hanya tampil jika email atau user_id cocok dengan user yang dituju
        return emailMatches || idMatches;
      }

      // Notifikasi umum / broadcast sistem
      return true;
    });

    // Perbarui label waktu (time_ago) secara real-time dan akurat
    return filtered.map((n) => ({
      ...n,
      time_ago: formatNotificationTime(n.created_at, n.id, n.time_ago),
    }));
  } catch {
    return [];
  }
}

export function saveStoredNotifications(notifs: DummyNotification[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(notifs));
  } catch {}
}

export function addAppNotification(payload: {
  type: 'review_request' | 'approved' | 'revision' | 'assigned' | 'comment' | 'system' | 'team_invite' | 'status_change' | string;
  message: string;
  title?: string;
  link?: string;
  playSound?: boolean;
  target_email?: string;
  target_user_id?: string;
  invite_data?: DummyNotification['invite_data'];
}): DummyNotification {
  const newNotif: DummyNotification = {
    id: `notif-${Date.now()}`,
    type: (payload.type || 'system') as any,
    title: payload.title,
    message: payload.message,
    link: payload.link || '/app/notifikasi',
    is_read: false,
    time_ago: 'Baru saja',
    created_at: new Date().toISOString(),
    target_email: payload.target_email || payload.invite_data?.target_email,
    target_user_id: payload.target_user_id || payload.invite_data?.target_user_id,
    invite_data: payload.invite_data,
  };

  // Baca seluruh notifikasi mentah dari storage tanpa filter untuk disimpan kembali
  let rawAll: DummyNotification[] = [];
  try {
    const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
    if (raw) rawAll = JSON.parse(raw);
  } catch {}

  const updated = [newNotif, ...rawAll.filter((n) => n && n.id !== newNotif.id)];
  saveStoredNotifications(updated);

  // Putar nada dering hanya jika ditujukan ke user saat ini atau notifikasi umum
  if (payload.playSound !== false) {
    let shouldPlaySound = true;
    const targetEmail = (payload.target_email || payload.invite_data?.target_email)?.trim().toLowerCase();
    const targetId = payload.target_user_id || payload.invite_data?.target_user_id;

    if (targetEmail || targetId) {
      let myEmail = '';
      let myId = '';
      try {
        const rawProfile = localStorage.getItem('uda_auth_profile');
        if (rawProfile) {
          const parsed = JSON.parse(rawProfile);
          if (parsed.email) myEmail = parsed.email.trim().toLowerCase();
          if (parsed.id) myId = parsed.id.trim();
        }
      } catch {}

      const isMe = (myEmail && targetEmail && myEmail === targetEmail) || (myId && targetId && myId === targetId);
      if (!isMe) {
        shouldPlaySound = false;
      }
    }

    if (shouldPlaySound) {
      playNotificationSound();
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('uda_notification_added', { detail: newNotif }));
    window.dispatchEvent(new Event('storage'));
  }

  return newNotif;
}

export function updateNotificationInviteStatus(notifId: string, status: 'accepted' | 'rejected'): DummyNotification[] {
  let rawAll: DummyNotification[] = [];
  try {
    const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
    if (raw) rawAll = JSON.parse(raw);
  } catch {}

  const updated = rawAll.map((n) => {
    if (n.id === notifId && n.invite_data) {
      return {
        ...n,
        is_read: true,
        invite_data: {
          ...n.invite_data,
          status,
        },
      };
    }
    return n;
  });
  saveStoredNotifications(updated);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('uda_notification_added'));
    window.dispatchEvent(new Event('storage'));
  }

  return updated;
}

export function markSingleNotificationAsRead(notifId: string): DummyNotification[] {
  let rawAll: DummyNotification[] = [];
  try {
    const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
    if (raw) rawAll = JSON.parse(raw);
  } catch {}

  const updated = rawAll.map((n) => (n.id === notifId ? { ...n, is_read: true } : n));
  saveStoredNotifications(updated);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('uda_notifications_read'));
    window.dispatchEvent(new Event('storage'));
  }

  return updated;
}

export function markAllNotificationsAsRead(): DummyNotification[] {
  let rawAll: DummyNotification[] = [];
  try {
    const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
    if (raw) rawAll = JSON.parse(raw);
  } catch {}

  const updated = rawAll.map((n) => ({ ...n, is_read: true }));
  saveStoredNotifications(updated);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('uda_notifications_read'));
    window.dispatchEvent(new Event('storage'));
  }

  return updated;
}

export async function syncServerInvitations(userEmail?: string, userId?: string): Promise<DummyNotification[]> {
  if (typeof window === 'undefined') return [];

  let cleanEmail = (userEmail || '').trim().toLowerCase();
  let cleanId = (userId || '').trim();

  if (!cleanEmail || !cleanId) {
    try {
      const rawProfile = localStorage.getItem('uda_auth_profile');
      if (rawProfile) {
        const parsed = JSON.parse(rawProfile);
        if (!cleanEmail && parsed.email) cleanEmail = parsed.email.trim().toLowerCase();
        if (!cleanId && parsed.id) cleanId = parsed.id.trim();
      }
    } catch {}
  }

  if (!cleanEmail && !cleanId) return [];

  try {
    const query = new URLSearchParams();
    if (cleanEmail) query.set('email', cleanEmail);
    if (cleanId) query.set('userId', cleanId);

    const res = await fetch(`/api/invitations?${query.toString()}`);
    if (!res.ok) return [];

    const data = await res.json();
    if (!data.success || !Array.isArray(data.invitations)) return [];

    let rawAll: DummyNotification[] = [];
    try {
      const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
      if (raw) rawAll = JSON.parse(raw);
    } catch {}

    let hasNew = false;
    const updatedList = [...rawAll];
    const deletedNotifIds = getDeletedNotifIds();
    const deletedInviteIds = getDeletedInviteIds();

    for (const inv of data.invitations) {
      const inviteTargetEmail = (inv.target_email || inv.email || '').trim().toLowerCase();
      const inviteTargetId = (inv.target_user_id || inv.invited_user_id || '').trim();

      const matchesUser =
        (cleanEmail && inviteTargetEmail === cleanEmail) ||
        (cleanId && inviteTargetId === cleanId);

      if (!matchesUser) continue;

      // Cek apakah undangan ini atau notifikasinya telah dihapus oleh pengguna
      const notifId = `notif-inv-${inv.id || ''}`;
      const isAlreadyDeleted =
        deletedInviteIds.includes(inv.id) ||
        (inv.token && deletedInviteIds.includes(inv.token)) ||
        deletedNotifIds.includes(notifId);

      if (isAlreadyDeleted) {
        continue;
      }

      // Jangan tampilkan jika status undangan sudah bukan pending
      if (inv.status && inv.status !== 'pending') {
        continue;
      }

      const existingIdx = updatedList.findIndex(
        (n) =>
          n.invite_data?.invite_id === inv.id ||
          (n.invite_data?.brand_id === inv.brand_id &&
            n.invite_data?.target_email?.toLowerCase() === inviteTargetEmail)
      );

      if (existingIdx >= 0) {
        if (
          updatedList[existingIdx].invite_data &&
          updatedList[existingIdx].invite_data!.status !== inv.status
        ) {
          updatedList[existingIdx] = {
            ...updatedList[existingIdx],
            invite_data: {
              ...updatedList[existingIdx].invite_data!,
              status: inv.status,
            },
          };
          hasNew = true;
        }
      } else if (inv.status === 'pending') {
        const newNotif: DummyNotification = {
          id: notifId,
          type: 'team_invite',
          title: `Undangan Bergabung ke Brand ${inv.brand_name || 'Brand'}`,
          message: `${inv.inviter_name || 'Owner'} mengundang Anda bergabung ke brand "${inv.brand_name || 'Brand'}" sebagai ${(inv.role || 'editor').toUpperCase()}. Silakan konfirmasi terima atau tolak undangan ini.`,
          link: '/app/notifikasi',
          is_read: false,
          time_ago: 'Baru saja',
          created_at: inv.created_at || new Date().toISOString(),
          target_email: cleanEmail,
          target_user_id: cleanId,
          invite_data: {
            invite_id: inv.id,
            brand_id: inv.brand_id,
            brand_name: inv.brand_name || 'Brand',
            brand_avatar: inv.brand_avatar,
            role: inv.role || 'editor',
            inviter_name: inv.inviter_name || 'Owner',
            inviter_email: inv.inviter_email || '',
            target_email: cleanEmail,
            target_user_id: cleanId,
            target_name: inv.target_name || cleanEmail.split('@')[0],
            status: 'pending',
            created_at: inv.created_at || new Date().toISOString(),
          },
        };
        updatedList.unshift(newNotif);
        hasNew = true;
      }
    }

    if (hasNew) {
      saveStoredNotifications(updatedList);
      playNotificationSound();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('uda_notification_added'));
        window.dispatchEvent(new Event('storage'));
      }
    }

    return updatedList;
  } catch (err) {
    console.warn('Sync invitations error:', err);
    return [];
  }
}

export function clearNotificationsByDuration(
  duration: '1h' | '24h' | '7d' | '30d' | 'all',
  userEmail?: string,
  userId?: string
): DummyNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    let rawAll: DummyNotification[] = [];
    const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
    if (raw) rawAll = JSON.parse(raw);

    const targetEmail = userEmail?.trim().toLowerCase();
    const targetId = userId?.trim();

    const now = Date.now();
    let maxAgeMs = 0;
    if (duration === '1h') maxAgeMs = 1 * 60 * 60 * 1000;
    else if (duration === '24h') maxAgeMs = 24 * 60 * 60 * 1000;
    else if (duration === '7d') maxAgeMs = 7 * 24 * 60 * 60 * 1000;
    else if (duration === '30d') maxAgeMs = 30 * 24 * 60 * 60 * 1000;

    const remaining = rawAll.filter((n) => {
      const inviteTargetEmail = (n.target_email || n.invite_data?.target_email)?.trim().toLowerCase();
      const inviteTargetId = (n.target_user_id || n.invite_data?.target_user_id)?.trim();

      const isForThisUser =
        (targetEmail && inviteTargetEmail === targetEmail) ||
        (targetId && inviteTargetId === targetId) ||
        (!inviteTargetEmail && !inviteTargetId);

      if (!isForThisUser) return true; // Simpan notifikasi akun lain

      if (duration === 'all') {
        recordDeletedNotification(n);
        return false; // Hapus semua
      }

      // Cek umur notifikasi
      let notifTime = 0;
      if (n.created_at) {
        const parsed = new Date(n.created_at).getTime();
        if (!isNaN(parsed)) notifTime = parsed;
      }
      if (!notifTime) {
        const idMatch = n.id.match(/\d+/);
        if (idMatch) {
          const num = parseInt(idMatch[0], 10);
          if (num > 1000000000000) notifTime = num;
        }
      }
      if (!notifTime) {
        notifTime = now;
      }

      const diff = now - notifTime;
      // Jika notifikasi dibuat dalam rentang waktu yang dipilih, maka dihapus
      if (diff <= maxAgeMs) {
        recordDeletedNotification(n);
        return false;
      }

      return true;
    });

    saveStoredNotifications(remaining);
    window.dispatchEvent(new CustomEvent('uda_notifications_cleared'));
    window.dispatchEvent(new Event('storage'));
    return getStoredNotifications(userEmail, userId);
  } catch {
    return [];
  }
}

export function clearAllNotifications(userEmail?: string, userId?: string): DummyNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    let rawAll: DummyNotification[] = [];
    const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
    if (raw) rawAll = JSON.parse(raw);

    const targetEmail = userEmail?.trim().toLowerCase();
    const targetId = userId?.trim();

    // Hapus notifikasi yang relevan dengan user ini atau notifikasi umum
    const remaining = rawAll.filter((n) => {
      const inviteTargetEmail = (n.target_email || n.invite_data?.target_email)?.trim().toLowerCase();
      const inviteTargetId = (n.target_user_id || n.invite_data?.target_user_id)?.trim();

      const isMatch =
        (targetEmail && inviteTargetEmail === targetEmail) ||
        (targetId && inviteTargetId === targetId) ||
        (!inviteTargetEmail && !inviteTargetId);

      if (isMatch) {
        recordDeletedNotification(n);
        return false;
      }
      return true;
    });

    saveStoredNotifications(remaining);

    window.dispatchEvent(new CustomEvent('uda_notifications_cleared'));
    window.dispatchEvent(new Event('storage'));
    return [];
  } catch {
    return [];
  }
}

export function deleteSingleNotification(notifId: string): DummyNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    let rawAll: DummyNotification[] = [];
    const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
    if (raw) rawAll = JSON.parse(raw);

    const target = rawAll.find((n) => n.id === notifId);
    if (target) {
      recordDeletedNotification(target);
    } else {
      recordDeletedNotification(notifId);
    }

    const remaining = rawAll.filter((n) => n.id !== notifId);
    saveStoredNotifications(remaining);

    window.dispatchEvent(new CustomEvent('uda_notifications_cleared'));
    window.dispatchEvent(new Event('storage'));
    return remaining;
  } catch {
    return [];
  }
}

