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
  Volume2,
  Sparkles,
  FileText,
  CreditCard,
  Settings,
  ChevronRight,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { createClient } from '@/lib/supabase/client';
import { GuidedTour, TourStep } from '@/components/guided-tour';
import { playNotificationSound, playSuccessSound, playErrorSound } from '@/lib/audio-effects';
import { addAppNotification } from '@/lib/notification-manager';

const akunTourSteps: TourStep[] = [
  {
    targetId: 'tour-akun-header',
    title: 'Pusat Pengaturan Akun',
    description: 'Kelola identitas profil, waktu pengingat postingan, preferensi notifikasi, dan keamanan sesi akun Anda.',
    placement: 'bottom',
  },
  {
    targetId: 'tour-akun-profile',
    title: 'Profil & Foto Pengguna',
    description: 'Perbarui nama lengkap dan unggah foto profil Anda. Foto ini akan muncul pada kartu penugasan tim dan dashboard.',
    placement: 'bottom',
  },
  {
    targetId: 'tour-akun-notif',
    title: 'Pengingat Otomatis & Notifikasi',
    description: 'Atur jeda waktu alarm sebelum konten tayang (misal 15 menit sebelumnya) dan izinkan push notification browser agar tidak melewatkan jadwal.',
    placement: 'top',
  },
];

export default function AkunPenggunaPage() {
  const router = useRouter();
  const { user, profile, account, isAdmin, signOut, refreshUserData } = useAuth();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [reminderMinutes, setReminderMinutes] = useState<number>(15);
  const [browserNotifEnabled, setBrowserNotifEnabled] = useState(false);
  const [userRole, setUserRole] = useState<'Owner' | 'Reviewer' | 'Editor' | 'Viewer'>('Owner');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  useEffect(() => {
    // 1. Inisialisasi Nama & Waktu Pengingat
    if (typeof window !== 'undefined') {
      const storedMins = localStorage.getItem('uda_reminder_minutes');
      if (storedMins) {
        setReminderMinutes(Number(storedMins));
      } else if (profile?.reminder_minutes) {
        setReminderMinutes(profile.reminder_minutes);
      }
    }

    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || (user ? localStorage.getItem('uda_custom_phone_' + user.id) || '' : ''));
      if (profile.reminder_minutes && typeof window !== 'undefined' && !localStorage.getItem('uda_reminder_minutes')) {
        setReminderMinutes(profile.reminder_minutes);
      }
    } else if (user) {
      setFullName(user.user_metadata?.full_name || user.email?.split('@')[0] || '');
      setPhone(localStorage.getItem('uda_custom_phone_' + user.id) || user.phone || '');
    }

    // 2. Inisialisasi Role Pengguna di Sistem
    if (user) {
      try {
        const storedRole = localStorage.getItem('uda_system_role_' + user.id) as any;
        if (storedRole && ['Owner', 'Reviewer', 'Editor', 'Viewer'].includes(storedRole)) {
          setUserRole(storedRole);
        } else if (isAdmin) {
          setUserRole('Owner');
        } else if ((profile as any)?.role) {
          const r = String((profile as any).role).toLowerCase();
          if (r === 'reviewer') setUserRole('Reviewer');
          else if (r === 'editor') setUserRole('Editor');
          else if (r === 'viewer') setUserRole('Viewer');
          else setUserRole('Owner');
        } else {
          setUserRole('Owner');
        }
      } catch (e) {
        setUserRole('Owner');
      }
    }

    // 3. Status Notifikasi Browser Tetap Aktif saat Refresh
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const currentPerm = Notification.permission as string;
      if (currentPerm === 'granted') {
        setBrowserNotifEnabled(true);
        localStorage.setItem('uda_browser_notif_enabled', 'true');
      } else if (currentPerm === 'denied') {
        setBrowserNotifEnabled(false);
        localStorage.setItem('uda_browser_notif_enabled', 'false');
      } else {
        const savedPref = localStorage.getItem('uda_browser_notif_enabled');
        setBrowserNotifEnabled(savedPref === 'true');
      }
    }
  }, [profile, user, isAdmin]);

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
        try {
          if (finalAvatarUrl) {
            localStorage.setItem('uda_custom_avatar_' + user.id, finalAvatarUrl);
          }
        } catch (e) {}
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
        try {
          localStorage.removeItem('uda_custom_avatar_' + user.id);
        } catch (e) {}
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
    if (!user) return;
    setIsSaving(true);
    try {
      // 1. Simpan preferensi role, phone & reminder ke localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('uda_reminder_minutes', String(reminderMinutes));
        localStorage.setItem('uda_system_role_' + user.id, userRole);
        localStorage.setItem('uda_custom_phone_' + user.id, phone.trim());
        window.dispatchEvent(new CustomEvent('uda_reminder_changed', { detail: { minutes: reminderMinutes } }));
        window.dispatchEvent(new CustomEvent('uda_role_updated', { detail: { role: userRole } }));
      }

      // 2. Simpan ke database Supabase jika koneksi aktif
      if (supabase) {
        const { error } = await (supabase.from('profiles' as any) as any)
          .update({
            full_name: fullName.trim(),
            phone: phone.trim() || null,
            reminder_minutes: reminderMinutes,
            role: userRole === 'Owner' && isAdmin ? 'admin' : 'user',
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (error) {
          console.warn('Update profiles error, local state saved:', error.message);
        }
      }

      await refreshUserData();
      playSuccessSound();
      showToast('Profil dan Role sistem berhasil diperbarui!');
    } catch (err: any) {
      showToast('Gagal menyimpan profil.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestNotif = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          setBrowserNotifEnabled(true);
          localStorage.setItem('uda_browser_notif_enabled', 'true');
          playNotificationSound();
          try {
            new Notification('🔔 Notifikasi Peramban UdaPlanner Aktif!', {
              body: `Alarm pengingat tayang akan muncul otomatis ${reminderMinutes} menit sebelum jadwal postingan.`,
              icon: '/favicon.ico',
            });
          } catch (e) {}
          showToast('🔔 Notifikasi peramban browser diterapkan & tetap aktif!');
        } else {
          setBrowserNotifEnabled(false);
          localStorage.setItem('uda_browser_notif_enabled', 'false');
          playErrorSound();
          showToast('Izin notifikasi peramban ditolak.');
        }
      } catch (err) {
        setBrowserNotifEnabled(true);
        localStorage.setItem('uda_browser_notif_enabled', 'true');
        playNotificationSound();
        showToast('Izin notifikasi peramban diterapkan.');
      }
    } else {
      setBrowserNotifEnabled(true);
      localStorage.setItem('uda_browser_notif_enabled', 'true');
      playNotificationSound();
      showToast('Simulasi notifikasi peramban diaktifkan.');
    }
  };

  const handleTestSoundAndNotif = () => {
    playNotificationSound();
    addAppNotification({
      type: 'system',
      title: 'Alarm Pengingat Tayang (Uji Coba)',
      message: `🔔 Pengingat sinkron: Postingan Anda akan tayang dalam ${reminderMinutes} menit! Bunyi alarm berdering lancar.`,
      link: '/app/daftar',
      playSound: false,
    });

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`⏰ Alarm Pengingat UdaPlanner (${reminderMinutes} Menit Lagi)`, {
          body: `Uji coba sukses! Notifikasi browser dan suara sinkron dengan pilihan ${reminderMinutes} menit Anda.`,
          icon: '/favicon.ico',
        });
      } catch (e) {}
    }
    showToast(`🔊 Bunyi alarm & notifikasi ${reminderMinutes} menit berhasil diuji!`);
  };

  const handleLogout = async () => {
    showToast('Sedang keluar dari akun...');
    await signOut();
  };

  const initial = (fullName || user?.email || 'U').charAt(0).toUpperCase();

  const [localAvatar, setLocalAvatar] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      try {
        const stored = localStorage.getItem('uda_custom_avatar_' + user.id);
        if (stored) setLocalAvatar(stored);
      } catch (e) {}
    }
  }, [user]);

  const currentAvatarUrl = profile?.avatar_url || localAvatar;

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

      {/* Hidden File Input accessible by both desktop & mobile */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAvatarFileChange}
        accept="image/png, image/jpeg, image/jpg, image/webp"
        style={{ display: 'none' }}
      />

      {/* ================= DESKTOP VIEW ================= */}
      <div className="desktop-profile-layout">
        <div id="tour-akun-header">
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Pengaturan Akun & Profil</h1>
          <p style={{ color: '#64748b', fontSize: '0.88rem' }}>
            Kelola profil pengguna terdaftar, foto profil, preferensi waktu pengingat jadwal, dan keamanan sesi.
          </p>
        </div>

        {/* Profil User & Foto Profil */}
        <div id="tour-akun-profile" className="uda-card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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
              {currentAvatarUrl ? (
                <img
                  src={currentAvatarUrl}
                  alt={fullName}
                  onError={() => setLocalAvatar(null)}
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
                      <span>{currentAvatarUrl ? 'Ganti Foto' : 'Unggah Foto'}</span>
                    </>
                  )}
                </button>

                {currentAvatarUrl && (
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

          {/* Input Nama, Email & Nomor Handphone / WhatsApp */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 16 }}>
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

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Nomor WhatsApp / HP</span>
                <span style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: 800, background: '#dcfce7', padding: '1px 6px', borderRadius: 4 }}>
                  Undangan WA
                </span>
              </label>
              <input
                type="tel"
                placeholder="Contoh: 081234567890 / 62812..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: 8, marginTop: 5, outline: 'none', fontSize: '0.9rem' }}
              />
            </div>
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: -8 }}>
            💡 <strong>Nomor WhatsApp</strong> dapat digunakan oleh Brand Owner untuk mengundang Anda langsung melalui tautan WhatsApp.
          </div>

          {/* Kolom Status Role Pengguna di Sistem (Hanya tampil jika bukan Paket Pro) */}
          {account?.plan_code !== 'pro' && (
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
                <label style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>
                  Status Role di Sistem
                </label>
                <span
                  style={{
                    fontSize: '0.74rem',
                    color: userRole === 'Owner' ? '#16a34a' : userRole === 'Reviewer' ? '#7c3aed' : userRole === 'Editor' ? '#2563eb' : '#64748b',
                    fontWeight: 800,
                    background: userRole === 'Owner' ? '#f0fdf4' : userRole === 'Reviewer' ? '#f5f3ff' : userRole === 'Editor' ? '#eff6ff' : '#f1f5f9',
                    border: `1.5px solid ${userRole === 'Owner' ? '#86efac' : userRole === 'Reviewer' ? '#c4b5fd' : userRole === 'Editor' ? '#93c5fd' : '#cbd5e1'}`,
                    padding: '4px 12px',
                    borderRadius: 999,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Shield size={13} />
                  <span>Role Aktif: {userRole}</span>
                </span>
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '14px 16px',
                  marginTop: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>
                    {userRole === 'Owner' ? 'Owner (Pemilik Workspace Utama)' : `Anggota Tim: ${userRole}`}
                  </span>
                  <span style={{ fontSize: '0.72rem', background: '#e2e8f0', color: '#475569', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
                    Tersinkronisasi Real (Tetap)
                  </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                  {userRole === 'Owner'
                    ? 'Sebagai pemilik workspace, Anda memiliki kendali penuh atas sistem dan hak akses tidak dapat diturunkan. Anda dapat menetapkan status peran anggota kolaborator (Reviewer, Editor, Viewer) di menu Pengaturan Brand saat mengundang tim.'
                    : `Status peran Anda saat ini sebagai ${userRole} diatur oleh Pemilik Brand di pengaturan brand yang mengundang Anda.`}
                </p>
              </div>
            </div>
          )}

          <button
            className="btn-uda btn-uda-primary"
            style={{ width: 'fit-content', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}
            onClick={handleSaveProfile}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>Simpan Profil Pengguna</span>
          </button>
        </div>

        {/* Pengingat Jadwal & Notifikasi Browser */}
        <div id="tour-akun-notif" className="uda-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Pengingat Sebelum Jadwal Tayang</h3>
              <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 2 }}>
                Tentukan berapa menit sebelum postingan tayang alarm dering & notifikasi peramban dimunculkan:
              </p>
            </div>
            <button
              type="button"
              className="btn-uda btn-uda-secondary btn-uda-sm"
              onClick={handleTestSoundAndNotif}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              title="Dengarkan bunyi alarm pengingat sekarang"
            >
              <Volume2 size={14} style={{ color: '#16a34a' }} />
              <span>Uji Bunyi Alarm</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 110px), 1fr))', gap: 10 }}>
            {[5, 15, 30, 60].map((mins) => {
              const isSelected = reminderMinutes === mins;
              return (
                <button
                  key={mins}
                  type="button"
                  onClick={() => {
                    setReminderMinutes(mins);
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('uda_reminder_minutes', String(mins));
                      window.dispatchEvent(new CustomEvent('uda_reminder_changed', { detail: { minutes: mins } }));
                    }
                    playNotificationSound();
                    showToast(`🔔 Waktu alarm pengingat diset ke ${mins} menit sebelum jam tayang!`);
                  }}
                  style={{
                    padding: '12px 10px',
                    borderRadius: 10,
                    border: `2px solid ${isSelected ? '#16a34a' : '#e2e8f0'}`,
                    background: isSelected ? '#f0fdf4' : '#ffffff',
                    color: isSelected ? '#16a34a' : '#0f172a',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    textAlign: 'center',
                    boxShadow: isSelected ? '2px 2px 0px #16a34a' : 'none',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  <span>{mins} Menit</span>
                  <span style={{ fontSize: '0.68rem', fontWeight: 600, color: isSelected ? '#15803d' : '#94a3b8' }}>
                    {isSelected ? '✓ Dipilih' : 'sebelum tayang'}
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>
                  Notifikasi Peramban (Browser Push)
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 3 }}>
                  Status izin peramban otomatis dipertahankan bahkan saat halaman dimuat ulang (refresh).
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn-uda btn-uda-secondary btn-uda-sm"
                  onClick={handleRequestNotif}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Bell size={14} />
                  <span>{browserNotifEnabled ? 'Perbarui Izin' : 'Izinkan Notifikasi'}</span>
                </button>
              </div>
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
      </div>

      {/* ================= MOBILE & TABLET VIEW (Layout Ref Image 2) ================= */}
      <div className="mobile-profile-layout">
        {/* User Profile Card */}
        <div
          style={{
            background: '#ffffff',
            border: '2px solid #0f172a',
            borderRadius: 16,
            padding: '20px 18px',
            boxShadow: '3px 3px 0px #0f172a',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          {/* Circular Avatar */}
          <div style={{ position: 'relative', width: 68, height: 68, flexShrink: 0 }}>
            {currentAvatarUrl ? (
              <img
                src={currentAvatarUrl}
                alt={fullName}
                onError={() => setLocalAvatar(null)}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid #0f172a',
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
                  fontSize: '1.6rem',
                  fontWeight: 800,
                  border: '2px solid #0f172a',
                }}
              >
                {initial}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              title="Ganti Foto"
              style={{
                position: 'absolute',
                bottom: -2,
                right: -2,
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: '#0f172a',
                color: '#ffffff',
                border: '1.5px solid #ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              {isUploadingAvatar ? <Loader2 size={11} className="animate-spin" /> : <Camera size={11} />}
            </button>
          </div>

          {/* User Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {fullName || user?.user_metadata?.full_name || 'Pengguna UdaPlanner'}
            </div>
            <div style={{ fontSize: '0.82rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
              {user?.email || '-'}
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: '0.72rem', fontWeight: 800, background: '#f0fdf4', color: '#16a34a', border: '1.5px solid #86efac', padding: '2px 8px', borderRadius: 999 }}>
              <span>PAKET {account?.plan_code?.toUpperCase() || 'FREE'}</span>
              <span>•</span>
              <span>{userRole}</span>
            </div>
          </div>
        </div>

        {/* Menu Items List matching Image 2 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* 1. My Profile */}
          <button
            type="button"
            className="mobile-menu-item-row"
            onClick={() => setIsEditProfileModalOpen(true)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f8fafc', border: '1.5px solid #0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={18} />
              </div>
              <span>My Profile</span>
            </div>
            <ChevronRight size={18} color="#94a3b8" />
          </button>

          {/* 2. Settings */}
          <button
            type="button"
            className="mobile-menu-item-row"
            onClick={() => setIsSettingsModalOpen(true)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f8fafc', border: '1.5px solid #0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Settings size={18} />
              </div>
              <span>Settings</span>
            </div>
            <ChevronRight size={18} color="#94a3b8" />
          </button>

          {/* 3. Notifications */}
          <button
            type="button"
            className="mobile-menu-item-row"
            onClick={() => router.push('/app/notifikasi')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f8fafc', border: '1.5px solid #0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bell size={18} />
              </div>
              <span>Notifications</span>
            </div>
            <ChevronRight size={18} color="#94a3b8" />
          </button>

          {/* 4. Langganan */}
          <button
            type="button"
            className="mobile-menu-item-row"
            onClick={() => router.push('/app/langganan')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f8fafc', border: '1.5px solid #0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CreditCard size={18} />
              </div>
              <span>Langganan</span>
            </div>
            <ChevronRight size={18} color="#94a3b8" />
          </button>

          {/* Admin Panel Link (if admin) */}
          {isAdmin && (
            <button
              type="button"
              className="mobile-menu-item-row"
              onClick={() => router.push('/admin')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#dcfce7', border: '1.5px solid #16a34a', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shield size={18} />
                </div>
                <span>Admin Dashboard</span>
              </div>
              <ChevronRight size={18} color="#94a3b8" />
            </button>
          )}

          {/* 7. Logout */}
          <button
            type="button"
            className="mobile-menu-item-row"
            onClick={() => setShowLogoutModal(true)}
            style={{ color: '#dc2626', borderColor: '#dc2626', marginTop: 6 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fee2e2', border: '1.5px solid #dc2626', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LogOut size={18} />
              </div>
              <span style={{ fontWeight: 800 }}>Logout</span>
            </div>
            <ChevronRight size={18} color="#dc2626" />
          </button>
        </div>
      </div>

      {/* Modal 1: Edit Profile (Mobile & Tablet) */}
      {isEditProfileModalOpen && (
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
            padding: 16,
          }}
        >
          <div
            className="uda-card"
            style={{
              maxWidth: 480,
              width: '100%',
              padding: '24px 20px',
              borderRadius: 16,
              background: '#ffffff',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Edit Profil Saya
              </h3>
              <button
                type="button"
                onClick={() => setIsEditProfileModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} color="#64748b" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>Nama Lengkap</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #0f172a', borderRadius: 8, marginTop: 4, outline: 'none', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>Email Akun</label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, marginTop: 4, background: '#f8fafc', color: '#64748b', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>Nomor WhatsApp / HP</label>
                <input
                  type="tel"
                  placeholder="081234567890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #0f172a', borderRadius: 8, marginTop: 4, outline: 'none', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  className="btn-uda btn-uda-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setIsEditProfileModalOpen(false)}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="btn-uda btn-uda-primary"
                  style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  onClick={async () => {
                    await handleSaveProfile();
                    setIsEditProfileModalOpen(false);
                  }}
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>Simpan</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Settings (Mobile & Tablet) */}
      {isSettingsModalOpen && (
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
            padding: 16,
          }}
        >
          <div
            className="uda-card"
            style={{
              maxWidth: 480,
              width: '100%',
              padding: '24px 20px',
              borderRadius: 16,
              background: '#ffffff',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Pengaturan Pengingat & Notifikasi
              </h3>
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} color="#64748b" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                  Waktu Pengingat Sebelum Tayang
                </label>
                <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2, marginBottom: 10 }}>
                  Alarm berdering sebelum jadwal tayang:
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {[5, 15, 30, 60].map((mins) => {
                    const isSelected = reminderMinutes === mins;
                    return (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => {
                          setReminderMinutes(mins);
                          if (typeof window !== 'undefined') {
                            localStorage.setItem('uda_reminder_minutes', String(mins));
                            window.dispatchEvent(new CustomEvent('uda_reminder_changed', { detail: { minutes: mins } }));
                          }
                          playNotificationSound();
                          showToast(`🔔 Alarm diset ke ${mins} menit!`);
                        }}
                        style={{
                          padding: '10px 4px',
                          borderRadius: 8,
                          border: `2px solid ${isSelected ? '#16a34a' : '#0f172a'}`,
                          background: isSelected ? '#f0fdf4' : '#ffffff',
                          color: isSelected ? '#16a34a' : '#0f172a',
                          fontWeight: 800,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          boxShadow: isSelected ? '2px 2px 0px #16a34a' : 'none',
                        }}
                      >
                        {mins}m
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a' }}>Tes Bunyi Alarm</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Cek suara alarm pengingat</div>
                </div>
                <button
                  type="button"
                  className="btn-uda btn-uda-secondary btn-uda-sm"
                  onClick={handleTestSoundAndNotif}
                >
                  <Volume2 size={14} style={{ color: '#16a34a' }} />
                  <span>Uji Suara</span>
                </button>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a' }}>Browser Push</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{browserNotifEnabled ? 'Aktif' : 'Non-aktif'}</div>
                </div>
                <button
                  type="button"
                  className="btn-uda btn-uda-secondary btn-uda-sm"
                  onClick={handleRequestNotif}
                >
                  <Bell size={14} />
                  <span>{browserNotifEnabled ? 'Izin Aktif' : 'Aktifkan'}</span>
                </button>
              </div>

              <button
                type="button"
                className="btn-uda btn-uda-primary"
                onClick={() => setIsSettingsModalOpen(false)}
                style={{ marginTop: 8 }}
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

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

      <GuidedTour steps={akunTourSteps} tourKey="uda_tour_akun" />
    </div>
  );
}
