'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  LogOut,
  Shield,
  KeyRound,
  User,
  CheckCircle2,
  Save,
  Loader2,
  Camera,
  Trash2,
  Upload,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { createClient } from '@/lib/supabase/client';

export default function AkunPenggunaPage() {
  const router = useRouter();
  const { user, profile, account, isAdmin, signOut, refreshUserData } = useAuth();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState('');
  const [reminderMinutes, setReminderMinutes] = useState<number>(15);
  const [browserNotifEnabled, setBrowserNotifEnabled] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setReminderMinutes(profile.reminder_minutes ?? 15);
    } else if (user) {
      setFullName(user.user_metadata?.full_name || user.email?.split('@')[0] || '');
    }
  }, [profile, user]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Helper untuk kompresi gambar ke base64 jika storage bucket belum aktif
  const compressImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
          } else {
            resolve(event.target?.result as string);
          }
        };
        img.onerror = () => reject(new Error('Gagal memproses gambar.'));
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // Upload atau Ubah Foto Profil
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !supabase) return;

    if (!file.type.startsWith('image/')) {
      showToast('Harap pilih file gambar (JPG, PNG, atau WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Ukuran gambar maksimal 5 MB.');
      return;
    }

    setIsUploadingAvatar(true);

    try {
      let finalAvatarUrl = '';

      // 1. Coba upload ke Supabase Storage bucket 'avatars'
      const fileExt = file.name.split('.').pop() || 'jpg';
      const filePath = `${user.id}/avatar_${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (!uploadError && uploadData) {
        const { data: publicUrlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);
        finalAvatarUrl = publicUrlData.publicUrl;
      } else {
        // 2. Fallback cerdas: Kompres gambar ke format Data URL jika bucket belum dibuat di Supabase
        finalAvatarUrl = await compressImageToBase64(file);
      }

      // 3. Simpan avatar_url ke tabel profiles
      const { error: updateError } = await (supabase.from('profiles' as any) as any)
        .update({
          avatar_url: finalAvatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) {
        showToast('Gagal menyimpan foto profil: ' + updateError.message);
      } else {
        await refreshUserData();
        showToast('Foto profil berhasil diperbarui!');
      }
    } catch (err: any) {
      showToast('Gagal mengunggah foto profil: ' + (err.message || ''));
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Hapus Foto Profil
  const handleRemoveAvatar = async () => {
    if (!user || !supabase) return;
    setIsUploadingAvatar(true);

    try {
      const { error } = await (supabase.from('profiles' as any) as any)
        .update({
          avatar_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        showToast('Gagal menghapus foto profil: ' + error.message);
      } else {
        await refreshUserData();
        showToast('Foto profil dihapus. Kembali menggunakan inisial.');
      }
    } catch (err: any) {
      showToast('Gagal menghapus foto profil.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user || !supabase) return;
    setIsSaving(true);
    try {
      const { error } = await (supabase.from('profiles' as any) as any)
        .update({
          full_name: fullName.trim(),
          reminder_minutes: reminderMinutes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        showToast('Gagal memperbarui profil: ' + error.message);
      } else {
        await refreshUserData();
        showToast('Profil berhasil disimpan.');
      }
    } catch (err: any) {
      showToast('Gagal menyimpan profil.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestNotif = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
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

  const handleLogout = async () => {
    showToast('Sedang keluar dari akun...');
    await signOut();
  };

  const initial = (fullName || user?.email || 'U').charAt(0).toUpperCase();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 840, width: '100%', margin: '0 auto' }}>
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
          Kelola profil pengguna terdaftar, foto profil, preferensi waktu pengingat jadwal, dan keamanan sesi.
        </p>
      </div>

      {/* Profil User & Foto Profil */}
      <div className="uda-card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Data Pengguna & Foto Profil</h3>
          <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: 6, fontWeight: 700, background: '#f0fdf4', color: '#16a34a' }}>
            PAKET {account?.plan_code?.toUpperCase() || 'FREE'}
          </span>
        </div>

        {/* Upload Foto Profil Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '16px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          {/* Avatar Container with upload overlay */}
          <div style={{ position: 'relative', width: 76, height: 76, flexShrink: 0 }}>
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={fullName}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid #16a34a',
                }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  background: '#16a34a',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.8rem',
                  fontWeight: 800,
                  border: '2px solid #15803d',
                }}
              >
                {initial}
              </div>
            )}

            {/* Quick Camera Icon Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              title="Ubah Foto Profil"
              style={{
                position: 'absolute',
                bottom: -2,
                right: -2,
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: '#0f172a',
                color: '#ffffff',
                border: '2px solid #ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
              }}
            >
              {isUploadingAvatar ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Camera size={13} />
              )}
            </button>
          </div>

          {/* Action Buttons for Avatar */}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0f172a', marginBottom: 2 }}>
              Foto Profil
            </div>
            <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 10 }}>
              Format didukung: JPG, PNG, atau WebP. Maksimal 5 MB.
            </p>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarFileChange}
              accept="image/png, image/jpeg, image/jpg, image/webp"
              style={{ display: 'none' }}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-uda btn-uda-secondary btn-uda-sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {isUploadingAvatar ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Mengunggah...</span>
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    <span>{profile?.avatar_url ? 'Ganti Foto' : 'Unggah Foto'}</span>
                  </>
                )}
              </button>

              {profile?.avatar_url && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={isUploadingAvatar}
                  style={{
                    background: 'none',
                    border: '1px solid #fee2e2',
                    color: '#dc2626',
                    borderRadius: 6,
                    padding: '6px 10px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Trash2 size={13} />
                  <span>Hapus</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Input Nama & Email Responsive Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 16 }}>
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>Nama Lengkap</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: 8, marginTop: 5, outline: 'none', fontSize: '0.9rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>Email Akun</label>
            <input
              type="email"
              disabled
              value={user?.email || ''}
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, marginTop: 5, background: '#f8fafc', color: '#64748b', fontSize: '0.9rem' }}
            />
          </div>
        </div>

        <button
          className="btn-uda btn-uda-primary"
          style={{ width: 'fit-content', display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={handleSaveProfile}
          disabled={isSaving}
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          <span>Simpan Perubahan Profil</span>
        </button>
      </div>

      {/* Pengingat Jadwal & Notifikasi Browser */}
      <div className="uda-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Pengingat Sebelum Jadwal Tayang</h3>
        <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
          Pilih berapa menit sebelum jam tayang aplikasi akan memunculkan alarm pengingat:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 110px), 1fr))', gap: 10 }}>
          {[5, 15, 30, 60].map((mins) => (
            <button
              key={mins}
              onClick={() => {
                setReminderMinutes(mins);
                showToast(`Waktu pengingat diset ke ${mins} menit sebelum posting`);
              }}
              style={{
                padding: '10px 8px',
                borderRadius: 8,
                border: `1px solid ${reminderMinutes === mins ? '#16a34a' : '#e2e8f0'}`,
                background: reminderMinutes === mins ? '#f0fdf4' : '#ffffff',
                color: reminderMinutes === mins ? '#16a34a' : '#0f172a',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              {mins} Menit
            </button>
          ))}
        </div>

        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Notifikasi Peramban (Browser)</div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>
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

      {/* Panel Admin Shortcut (jika admin) */}
      {isAdmin && (
        <div className="uda-card" style={{ borderLeft: '4px solid #16a34a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>Peran Administrator Aktif</div>
              <div style={{ fontSize: '0.82rem', color: '#64748b' }}>Anda memiliki hak istimewa untuk mengelola seluruh sistem.</div>
            </div>
            <button className="btn-uda btn-uda-secondary btn-uda-sm" onClick={() => router.push('/admin')}>
              <Shield size={14} style={{ color: '#16a34a' }} />
              <span>Buka Panel Admin</span>
            </button>
          </div>
        </div>
      )}

      {/* Logout Real */}
      <div className="uda-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, borderLeft: '4px solid #ef4444' }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>Keluar dari Akun</div>
          <div style={{ fontSize: '0.82rem', color: '#64748b' }}>Akhiri sesi login Anda saat ini dengan aman dari peramban ini.</div>
        </div>
        <button
          className="btn-uda btn-uda-danger"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          onClick={() => setShowLogoutModal(true)}
        >
          <LogOut size={16} />
          <span>Keluar dari Akun (Logout)</span>
        </button>
      </div>

      {/* Modal Pop-up Konfirmasi Logout */}
      {showLogoutModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div
            className="uda-card"
            style={{
              maxWidth: 400,
              width: '100%',
              padding: '30px 24px',
              textAlign: 'center',
              borderRadius: 16,
              background: '#ffffff',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div
              style={{
                width: 58,
                height: 58,
                borderRadius: '50%',
                background: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <LogOut size={26} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
              Konfirmasi Keluar Akun
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.86rem', lineHeight: 1.5, marginBottom: 24 }}>
              Apakah Anda yakin ingin keluar dari akun? Anda perlu memasukkan email dan kata sandi kembali untuk masuk ke UdaPlanner.
            </p>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn-uda btn-uda-secondary"
                style={{ flex: 1 }}
                onClick={() => setShowLogoutModal(false)}
                disabled={isLoggingOut}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn-uda btn-uda-danger"
                style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                onClick={async () => {
                  setIsLoggingOut(true);
                  await signOut();
                }}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Keluar...</span>
                  </>
                ) : (
                  <span>Ya, Keluar</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
