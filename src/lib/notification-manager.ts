// Notification Manager with real-time events and Web Audio API
import { DUMMY_NOTIFICATIONS, DummyNotification } from './dummy-data';
import { playNotificationSound } from './audio-effects';

const NOTIF_STORAGE_KEY = 'uda_custom_notifications';

export function getStoredNotifications(userEmail?: string, userId?: string): DummyNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
    if (!raw) return [];
    const custom: DummyNotification[] = JSON.parse(raw);
    const list = (Array.isArray(custom) ? custom : []).filter(
      (n: any) => n && !['notif-1', 'notif-2', 'notif-3', 'notif-4', 'notif-5'].includes(n.id)
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
    return list.filter((n: DummyNotification) => {
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

    for (const inv of data.invitations) {
      const inviteTargetEmail = (inv.target_email || inv.email || '').trim().toLowerCase();
      const inviteTargetId = (inv.target_user_id || inv.invited_user_id || '').trim();

      const matchesUser =
        (cleanEmail && inviteTargetEmail === cleanEmail) ||
        (cleanId && inviteTargetId === cleanId);

      if (!matchesUser) continue;

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
        const notifId = `notif-inv-${inv.id || Date.now()}`;
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

