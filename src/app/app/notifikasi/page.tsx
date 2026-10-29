'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Check,
  ArrowLeft,
  X,
  Shield,
  Building,
  CheckCircle2,
  XCircle,
  Package,
  FileText,
  Sparkles,
  Clock,
  Settings,
  Info,
  CreditCard,
  User,
  ChevronRight,
} from 'lucide-react';
import { DUMMY_NOTIFICATIONS, DummyNotification, DummyMember } from '@/lib/dummy-data';
import { getStoredNotifications, markAllNotificationsAsRead, updateNotificationInviteStatus, addAppNotification, syncServerInvitations } from '@/lib/notification-manager';
import { GuidedTour, TourStep } from '@/components/guided-tour';
import { useAuth } from '@/contexts/auth-context';
import { MemberService } from '@/services/member.service';
import { createClient } from '@/lib/supabase/client';
import { playSuccessSound, playErrorSound, playNotificationSound } from '@/lib/audio-effects';

const notifTourSteps: TourStep[] = [
  {
    targetId: 'tour-notif-header',
    title: 'Pusat Notifikasi & Aktivitas',
    description: 'Semua informasi jadwal tayang konten, pengingat alarm harian, dan pembaruan sistem akan muncul di sini.',
    placement: 'bottom',
  },
  {
    targetId: 'tour-notif-list',
    title: 'Daftar Pesan & Tindakan',
    description: 'Klik pada kartu notifikasi untuk langsung menuju detail postingan atau konten yang bersangkutan.',
    placement: 'bottom',
  },
];

export default function NotifikasiPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [notifications, setNotifications] = useState<DummyNotification[]>(DUMMY_NOTIFICATIONS);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  React.useEffect(() => {
    const refresh = () => setNotifications(getStoredNotifications(user?.email || undefined, user?.id || undefined));
    refresh();

    if (user?.email || user?.id) {
      syncServerInvitations(user?.email || undefined, user?.id || undefined).then(refresh);
    }

    window.addEventListener('uda_notification_added', refresh);
    window.addEventListener('uda_notifications_read', refresh);
    window.addEventListener('storage', refresh);

    return () => {
      window.removeEventListener('uda_notification_added', refresh);
      window.removeEventListener('uda_notifications_read', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [user?.email, user?.id]);

  const markAllRead = () => {
    setNotifications(markAllNotificationsAsRead());
  };

  const getNotifMeta = (n: DummyNotification) => {
    if (n.type === 'team_invite') {
      return {
        icon: Building,
        badgeBg: '#f3e8ff',
        iconColor: '#7e22ce',
        defaultTitle: `Undangan Tim: ${n.invite_data?.brand_name || 'Brand'}`,
      };
    }
    if (n.type === 'approved') {
      return {
        icon: CheckCircle2,
        badgeBg: '#dcfce7',
        iconColor: '#15803d',
        defaultTitle: 'Konten Telah Disetujui',
      };
    }
    if (n.type === 'review_request') {
      return {
        icon: FileText,
        badgeBg: '#dbeafe',
        iconColor: '#1d4ed8',
        defaultTitle: 'Permintaan Review Konten',
      };
    }
    if (n.type === 'revision') {
      return {
        icon: XCircle,
        badgeBg: '#fee2e2',
        iconColor: '#b91c1c',
        defaultTitle: 'Catatan Revisi Konten',
      };
    }
    if (n.type === 'assigned') {
      return {
        icon: User,
        badgeBg: '#e0f2fe',
        iconColor: '#0284c7',
        defaultTitle: 'Tugas Konten Baru',
      };
    }
    return {
      icon: Bell,
      badgeBg: '#fef9c3',
      iconColor: '#854d0e',
      defaultTitle: 'Notifikasi Aktivitas',
    };
  };

  // Terima Undangan Brand & Otomatis Ubah Status Langganan Menjadi TIM
  const handleAcceptInvite = async (notif: DummyNotification) => {
    if (!notif.invite_data) return;
    const inv = notif.invite_data;
    const currentUserId = user?.id || `usr-${Date.now()}`;
    const currentUserName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Anggota Baru';
    const currentUserEmail = user?.email || inv.target_email;

    // 1. Update status notifikasi menjadi accepted
    updateNotificationInviteStatus(notif.id, 'accepted');

    // 2. Update status undangan di localStorage 'uda_brand_invitations' & Server API
    try {
      fetch('/api/invitations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteId: inv.invite_id,
          brandId: inv.brand_id,
          action: 'accept',
          userId: currentUserId,
          userEmail: currentUserEmail,
          userName: currentUserName,
          role: inv.role,
        }),
      }).catch(() => {});

      const raw = localStorage.getItem('uda_brand_invitations');
      if (raw) {
        const list = JSON.parse(raw);
        const updated = list.map((item: any) =>
          item.id === inv.invite_id || (item.brand_id === inv.brand_id && item.target_email?.toLowerCase() === inv.target_email?.toLowerCase())
            ? { ...item, status: 'accepted', target_user_id: currentUserId }
            : item
        );
        localStorage.setItem('uda_brand_invitations', JSON.stringify(updated));
      }
    } catch {}

    // 3. Tambahkan ke member brand
    try {
      await MemberService.addMember(inv.brand_id, currentUserId, inv.role as any);

      const localMemberKey = 'uda_brand_members_' + inv.brand_id;
      let existingMembers: DummyMember[] = [];
      const rawM = localStorage.getItem(localMemberKey);
      if (rawM) existingMembers = JSON.parse(rawM);

      const newMemberObj: DummyMember = {
        id: currentUserId,
        name: currentUserName,
        email: currentUserEmail,
        avatar:
          profile?.avatar_url ||
          (user?.id ? localStorage.getItem('uda_custom_avatar_' + user.id) : null) ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUserName || 'User')}&background=0ea5e9&color=fff&bold=true`,
        role: inv.role as any,
      };

      if (!existingMembers.some((m) => m.email.toLowerCase() === currentUserEmail.toLowerCase())) {
        existingMembers.push(newMemberObj);
        localStorage.setItem(localMemberKey, JSON.stringify(existingMembers));
      }

      // 4. Update status langganan pengguna menjadi TIM
      // a. Simpan data keanggotaan tim
      const teamMembershipData = {
        brand_id: inv.brand_id,
        brand_name: inv.brand_name,
        role: inv.role,
        joined_at: new Date().toISOString(),
        inviter_name: inv.inviter_name,
        inviter_email: inv.inviter_email,
      };
      localStorage.setItem('uda_team_membership_' + currentUserId, JSON.stringify(teamMembershipData));

      // b. Update tabel accounts di database Supabase
      const supabase = createClient();
      if (supabase && user?.id) {
        try {
          await (supabase.from('accounts' as any) as any)
            .update({
              plan_code: 'team',
              role: 'user',
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', user.id);
        } catch (dbErr) {
          console.warn('Update accounts db plan to team notice:', dbErr);
        }
      }

      // c. Update cache akun lokal & role sistem
      const capitalizedRole = inv.role.charAt(0).toUpperCase() + inv.role.slice(1);
      if (user) {
        localStorage.setItem('uda_system_role_' + user.id, capitalizedRole);
      }

      try {
        const rawAcc = localStorage.getItem('uda_auth_account');
        let accObj: any = rawAcc ? JSON.parse(rawAcc) : {};
        accObj = {
          ...accObj,
          plan_code: 'team',
          role: 'user',
          team_member_brand_id: inv.brand_id,
          team_member_brand_name: inv.brand_name,
        };
        localStorage.setItem('uda_auth_account', JSON.stringify(accObj));

        localStorage.setItem(
          'uda_last_upgraded_user',
          JSON.stringify({
            userId: currentUserId,
            email: currentUserEmail,
            planCode: 'team',
            updatedAt: new Date().toISOString(),
          })
        );
      } catch {}

      window.dispatchEvent(new CustomEvent('uda_brand_member_added', { detail: newMemberObj }));
      window.dispatchEvent(new CustomEvent('uda_account_updated', { detail: { planCode: 'team' } }));
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      console.warn('Accept invite add member:', err);
    }

    playSuccessSound();
    showToast(`✅ Berhasil bergabung ke brand "${inv.brand_name}"! Status langganan Anda kini berubah menjadi TIM.`);
    setNotifications(getStoredNotifications(user?.email || undefined, user?.id || undefined));
  };

  // Tolak Undangan Brand
  const handleRejectInvite = (notif: DummyNotification) => {
    if (!notif.invite_data) return;
    const inv = notif.invite_data;

    // 1. Update status notifikasi menjadi rejected
    updateNotificationInviteStatus(notif.id, 'rejected');

    // 2. Update status undangan di localStorage & Server API
    try {
      fetch('/api/invitations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteId: inv.invite_id,
          brandId: inv.brand_id,
          action: 'reject',
          userId: user?.id,
          userEmail: user?.email,
        }),
      }).catch(() => {});

      const raw = localStorage.getItem('uda_brand_invitations');
      if (raw) {
        const list = JSON.parse(raw);
        const updated = list.map((item: any) =>
          item.id === inv.invite_id || (item.brand_id === inv.brand_id && item.target_email === inv.target_email)
            ? { ...item, status: 'rejected' }
            : item
        );
        localStorage.setItem('uda_brand_invitations', JSON.stringify(updated));
      }
    } catch {}

    playErrorSound();
    showToast(`Undangan untuk bergabung ke brand "${inv.brand_name}" telah ditolak.`);
    setNotifications(getStoredNotifications(user?.email || undefined, user?.id || undefined));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 720 }}>
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: '#0f172a',
            color: '#f8fafc',
            padding: '12px 18px',
            borderRadius: 10,
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            zIndex: 9999,
            fontSize: '0.88rem',
            fontWeight: 600,
          }}
        >
          {toastMessage}
        </div>
      )}

      <div id="tour-notif-header" className="desktop-notif-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn-uda btn-uda-secondary btn-uda-sm" onClick={() => router.back()}>
            <ArrowLeft size={16} />
          </button>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>Semua Notifikasi</h1>
        </div>
        <button className="btn-uda btn-uda-secondary btn-uda-sm" onClick={markAllRead}>
          <Check size={14} />
          <span>Tandai Semua Dibaca</span>
        </button>
      </div>

      {/* List Notifikasi (Sesuai Layout Gambar Referensi 1) */}
      <div id="tour-notif-list" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {notifications.length === 0 ? (
          <div className="uda-card" style={{ textAlign: 'center', padding: '36px 16px', color: '#64748b' }}>
            <Bell size={28} style={{ color: '#cbd5e1', margin: '0 auto 8px' }} />
            <p style={{ margin: 0, fontWeight: 600 }}>Belum ada notifikasi saat ini.</p>
          </div>
        ) : (
          notifications.map((n) => {
            // Guard: Pastikan notifikasi berarah hanya terlihat oleh penerima yang sah
            const targetEmail = (n.target_email || n.invite_data?.target_email)?.trim().toLowerCase();
            const targetId = n.target_user_id || n.invite_data?.target_user_id;
            const isTargeted = n.type === 'team_invite' || !!targetEmail || !!targetId;

            if (isTargeted) {
              const myEmail = user?.email?.trim().toLowerCase();
              const myId = user?.id?.trim();
              const isMine = (myEmail && targetEmail && myEmail === targetEmail) || (myId && targetId && myId === targetId);
              if (!isMine) return null;
            }

            const isInvite = n.type === 'team_invite' && n.invite_data;
            const inviteStatus = n.invite_data?.status || 'pending';

            if (isInvite && n.invite_data) {
              const inv = n.invite_data;
              return (
                <div
                  key={n.id}
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    background: inviteStatus === 'pending' ? '#f0fdf4' : '#f8fafc',
                    border: `1.5px solid ${inviteStatus === 'pending' ? '#86efac' : '#e2e8f0'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    boxShadow: inviteStatus === 'pending' ? '0 4px 12px rgba(22, 163, 74, 0.08)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 10,
                          background: '#16a34a',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Building size={22} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.94rem', color: '#0f172a' }}>
                            Undangan Brand: {inv.brand_name}
                          </span>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              padding: '2px 8px',
                              borderRadius: 999,
                              fontWeight: 800,
                              background: '#dcfce7',
                              color: '#15803d',
                              textTransform: 'uppercase',
                            }}
                          >
                            Peran: {inv.role}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: 3 }}>
                          <strong>{inv.inviter_name}</strong> mengundang Anda untuk bergabung ke brand <strong>{inv.brand_name}</strong> sebagai <strong>{inv.role.toUpperCase()}</strong>.
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {n.time_ago}
                    </span>
                  </div>

                  {/* Status Actions */}
                  {inviteStatus === 'pending' ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: 10,
                        borderTop: '1px solid #bbf7d0',
                        flexWrap: 'wrap',
                        gap: 10,
                      }}
                    >
                      <div style={{ fontSize: '0.76rem', color: '#15803d', fontWeight: 600 }}>
                        Sebagai {inv.role.toUpperCase()}, Anda dapat mengelola konten sesuai hak akses yang diberikan.
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          className="btn-uda btn-uda-secondary btn-uda-sm"
                          onClick={() => handleRejectInvite(n)}
                          style={{
                            color: '#dc2626',
                            borderColor: '#fca5a5',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '6px 14px',
                            fontSize: '0.82rem',
                          }}
                        >
                          <X size={14} />
                          <span>Tolak</span>
                        </button>
                        <button
                          type="button"
                          className="btn-uda btn-uda-primary btn-uda-sm"
                          onClick={() => handleAcceptInvite(n)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '6px 16px',
                            fontSize: '0.82rem',
                            fontWeight: 800,
                          }}
                        >
                          <Check size={14} />
                          <span>Terima Undangan</span>
                        </button>
                      </div>
                    </div>
                  ) : inviteStatus === 'accepted' ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: 8,
                        borderTop: '1px solid #e2e8f0',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.78rem',
                          color: '#15803d',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <CheckCircle2 size={16} />
                        <span>Anda telah menerima undangan ini (Status: {inv.role.toUpperCase()})</span>
                      </span>
                      <button
                        type="button"
                        className="btn-uda btn-uda-secondary btn-uda-sm"
                        style={{ fontSize: '0.78rem' }}
                        onClick={() => router.push(`/app/brand/${inv.brand_id}`)}
                      >
                        Buka Brand →
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{
                        paddingTop: 8,
                        borderTop: '1px solid #e2e8f0',
                        fontSize: '0.78rem',
                        color: '#991b1b',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <XCircle size={16} />
                      <span>Anda telah menolak undangan ini.</span>
                    </div>
                  )}
                </div>
              );
            }

            // Regular notification (Sesuai Referensi Gambar 1: Rounded Icon Badge + Title + Timestamp + Message)
            const meta = getNotifMeta(n);
            const IconComponent = meta.icon;

            return (
              <div
                key={n.id}
                className={`mobile-notif-item ${!n.is_read ? 'unread' : ''}`}
                onClick={() => router.push(n.link)}
              >
                {/* Left: Soft rounded icon badge */}
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: meta.badgeBg,
                    border: '2px solid #0f172a',
                    boxShadow: '2px 2px 0px #0f172a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: meta.iconColor,
                  }}
                >
                  <IconComponent size={20} />
                </div>

                {/* Right: Title, Timestamp, Description */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: '0.94rem',
                        color: '#0f172a',
                        letterSpacing: '-0.01em',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {n.title || meta.defaultTitle}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, flexShrink: 0 }}>
                      {n.time_ago}
                    </div>
                  </div>

                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.84rem',
                      color: '#475569',
                      lineHeight: 1.45,
                      fontWeight: 500,
                    }}
                  >
                    {n.message}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <GuidedTour steps={notifTourSteps} tourKey="uda_tour_notifikasi" />
    </div>
  );
}
