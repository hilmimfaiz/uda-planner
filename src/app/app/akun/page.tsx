'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, LogOut, Shield, KeyRound, User, CheckCircle2 } from 'lucide-react';

export default function AkunPenggunaPage() {
  const router = useRouter();
  const [reminderMinutes, setReminderMinutes] = useState<number>(15);
  const [browserNotifEnabled, setBrowserNotifEnabled] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleRequestNotif = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        setBrowserNotifEnabled(true);
        showToast('🔔 Notifikasi browser berhasil diaktifkan!');
      } else {
        showToast('Izin notifikasi peramban ditolak.');
      }
    } else {
      setBrowserNotifEnabled(true);
      showToast('Simulasi notifikasi browser diaktifkan.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 640 }}>
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

      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Pengaturan Akun & Profil</h1>
        <p style={{ color: '#64748b', fontSize: '0.88rem' }}>
          Kelola profil pengguna, preferensi waktu pengingat jadwal, dan keamanan.
        </p>
      </div>

      {/* Profil User */}
      <div className="uda-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Data Pengguna</h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120"
            alt=""
            style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }}
          />
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>Rizki Pratama</div>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>rizki@udacoding.id</div>
          </div>
        </div>

        <div>
          <label style={{ fontSize: '0.82rem', fontWeight: 700 }}>Nama Lengkap</label>
          <input
            type="text"
            defaultValue="Rizki Pratama"
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, marginTop: 4 }}
          />
        </div>

        <div>
          <label style={{ fontSize: '0.82rem', fontWeight: 700 }}>Email (tidak bisa diubah)</label>
          <input
            type="email"
            disabled
            defaultValue="rizki@udacoding.id"
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, marginTop: 4, background: '#f8fafc', color: '#64748b' }}
          />
        </div>
      </div>

      {/* Pengingat Jadwal & Notifikasi Browser */}
      <div className="uda-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Pengingat Sebelum Jadwal Tayang</h3>
        <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
          Pilih berapa menit sebelum jam tayang aplikasi akan memunculkan alarm pengingat:
        </p>

        <div style={{ display: 'flex', gap: 10 }}>
          {[5, 15, 30, 60].map((mins) => (
            <button
              key={mins}
              onClick={() => {
                setReminderMinutes(mins);
                showToast(`Waktu pengingat diset ke ${mins} menit sebelum posting`);
              }}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: 8,
                border: `1px solid ${reminderMinutes === mins ? '#16a34a' : '#e2e8f0'}`,
                background: reminderMinutes === mins ? '#f0fdf4' : '#ffffff',
                color: reminderMinutes === mins ? '#16a34a' : '#0f172a',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              {mins} Menit
            </button>
          ))}
        </div>

        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Notifikasi Peramban (Browser)</div>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Status: {browserNotifEnabled ? 'Aktif (Diizinkan)' : 'Belum diizinkan'}
              </div>
            </div>
            <button className="btn-uda btn-uda-secondary btn-uda-sm" onClick={handleRequestNotif}>
              <Bell size={14} />
              <span>{browserNotifEnabled ? 'Periksa Izin' : 'Izinkan Notifikasi'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Logout */}
      <button
        className="btn-uda btn-uda-danger"
        style={{ width: 'fit-content' }}
        onClick={() => {
          showToast('Anda telah keluar.');
          router.push('/masuk');
        }}
      >
        <LogOut size={16} />
        <span>Keluar dari Akun</span>
      </button>
    </div>
  );
}
