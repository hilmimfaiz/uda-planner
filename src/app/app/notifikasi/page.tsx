'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, ArrowLeft } from 'lucide-react';
import { DUMMY_NOTIFICATIONS } from '@/lib/dummy-data';
import { GuidedTour, TourStep } from '@/components/guided-tour';

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
  const [notifications, setNotifications] = useState(DUMMY_NOTIFICATIONS);

  const markAllRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 680 }}>
      <div id="tour-notif-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

      <div id="tour-notif-list" className="uda-card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {notifications.map((n) => (
          <div
            key={n.id}
            onClick={() => router.push(n.link)}
            style={{
              padding: 14,
              borderRadius: 10,
              background: n.is_read ? '#f8fafc' : '#f0fdf4',
              border: `1px solid ${n.is_read ? '#e2e8f0' : '#bbf7d0'}`,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontWeight: n.is_read ? 600 : 800, fontSize: '0.88rem', color: '#0f172a' }}>
                {n.message}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
                {n.time_ago}
              </div>
            </div>
            {!n.is_read && (
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a' }} />
            )}
          </div>
        ))}
      </div>

      <GuidedTour steps={notifTourSteps} tourKey="uda_tour_notifikasi" />
    </div>
  );
}
