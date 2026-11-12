'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Save,
  MessageSquare,
  Loader2,
  Landmark,
  ArrowRight,
  ExternalLink,
  PhoneCall,
  CheckCircle2,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  User,
  Shield,
} from 'lucide-react';
import { AdminService } from '@/services/admin.service';
import { useModal } from '@/contexts/modal-context';
import { useAuth } from '@/contexts/auth-context';

export default function AdminPengaturanPage() {
  const { showSuccess, showError } = useModal();
  const { user, profile, refreshUserData } = useAuth();

  // State Kontak WhatsApp
  const [adminWhatsapp, setAdminWhatsapp] = useState('6281234567890');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSavingWhatsapp, setIsSavingWhatsapp] = useState(false);

  // State Nama Lengkap Admin
  const [adminFullName, setAdminFullName] = useState('Administrator UdaPlanner');
  const [isSavingName, setIsSavingName] = useState(false);

  // State Ubah Password Admin
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  useEffect(() => {
    AdminService.getAppSettings().then((data) => {
      if (data && data.adminWhatsapp) {
        setAdminWhatsapp(data.adminWhatsapp);
      }
    });

    try {
      const customName = localStorage.getItem('uda_admin_full_name');
      if (customName && customName.trim()) {
        setAdminFullName(customName.trim());
      } else if (profile?.full_name?.trim()) {
        setAdminFullName(profile.full_name.trim());
      } else if (user?.user_metadata?.full_name?.trim()) {
        setAdminFullName(user.user_metadata.full_name.trim());
      } else {
        const stored = localStorage.getItem('uda_auth_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.user_metadata?.full_name?.trim()) {
            setAdminFullName(parsed.user_metadata.full_name.trim());
          }
        }
      }
    } catch (e) {}
  }, [user, profile]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveAdminName = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = adminFullName.trim();
    if (!cleanName || cleanName.length < 2) {
      showError('Nama Lengkap Tidak Valid', 'Nama lengkap minimal 2 karakter.');
      return;
    }

    setIsSavingName(true);
    try {
      // 1. Simpan langsung ke localStorage agar sinkron seketika di seluruh halaman
      try {
        localStorage.setItem('uda_admin_full_name', cleanName);
        const stored = localStorage.getItem('uda_auth_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.user_metadata = {
            ...(parsed.user_metadata || {}),
            full_name: cleanName,
          };
          localStorage.setItem('uda_auth_user', JSON.stringify(parsed));
        }
        const storedProf = localStorage.getItem('uda_auth_profile');
        if (storedProf) {
          const parsedProf = JSON.parse(storedProf);
          parsedProf.full_name = cleanName;
          localStorage.setItem('uda_auth_profile', JSON.stringify(parsedProf));
        }

        // Perbarui juga di daftar pengguna admin (uda_admin_users)
        const rawUsers = localStorage.getItem('uda_admin_users');
        if (rawUsers) {
          const uList = JSON.parse(rawUsers);
          const updatedUList = uList.map((u: any) => {
            const em = (u.email || '').toLowerCase().trim();
            if (em === 'admin@udaplanner.id' || em.startsWith('admin@') || u.role === 'admin' || u.role === 'Admin') {
              return { ...u, name: cleanName };
            }
            return u;
          });
          localStorage.setItem('uda_admin_users', JSON.stringify(updatedUList));
        }
      } catch (e) {}

      // 2. Dispatch custom event agar header admin dan auth context langsung sinkron seketika
      window.dispatchEvent(new CustomEvent('uda_account_updated', { detail: { full_name: cleanName, name: cleanName } }));
      window.dispatchEvent(new CustomEvent('uda_profile_updated', { detail: { full_name: cleanName, name: cleanName } }));
      window.dispatchEvent(new Event('storage'));

      // 3. Panggil API server untuk persistensi database Supabase
      const res = await fetch('/api/admin/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: cleanName,
          email: user?.email || 'admin@udaplanner.id',
          userId: user?.id,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showError('Gagal Menyimpan Nama', data.error || 'Terjadi kesalahan sistem.');
        return;
      }

      if (refreshUserData) {
        refreshUserData().catch(() => {});
      }

      showSuccess(
        'Nama Lengkap Berhasil Disimpan!',
        `Nama lengkap administrator telah berhasil diperbarui menjadi "${cleanName}".`
      );
      showToast('Nama lengkap berhasil diperbarui');
    } catch (err: any) {
      showError('Gagal Menyimpan Nama', err.message || 'Coba lagi beberapa saat.');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleSaveWhatsapp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNumber = adminWhatsapp.trim().replace(/[^0-9]/g, '');

    if (!cleanNumber || cleanNumber.length < 9) {
      showError(
        'Nomor WhatsApp Tidak Valid',
        'Silakan masukkan nomor WhatsApp yang valid dengan format internasional (contoh: 6281234567890).'
      );
      return;
    }

    setIsSavingWhatsapp(true);
    try {
      await AdminService.updateAppSettings({
        adminWhatsapp: cleanNumber,
      });
      showSuccess(
        'Pengaturan WhatsApp Berhasil Disimpan!',
        `Nomor WhatsApp resmi admin (${cleanNumber}) telah aktif dan otomatis tersinkronisasi ke seluruh tombol bantuan WhatsApp pengguna.`
      );
    } catch (err: any) {
      showError('Gagal Menyimpan Pengaturan', err.message || 'Coba lagi beberapa saat.');
    } finally {
      setIsSavingWhatsapp(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError('Silakan masukkan kata sandi Anda saat ini.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Kata sandi baru minimal harus 6 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Konfirmasi kata sandi baru tidak sesuai dengan kata sandi baru.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user?.email || 'admin@udaplanner.id',
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const errorMsg = data.error || 'Gagal mengubah kata sandi.';
        setPasswordError(errorMsg);
        showError('Gagal Mengubah Kata Sandi', errorMsg);
        return;
      }

      // Berhasil
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess('Kata sandi administrator berhasil diperbarui.');

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('uda_admin_custom_password', newPassword);
          if (user?.email) {
            localStorage.setItem(`uda_admin_password_${user.email.toLowerCase()}`, newPassword);
          }
        } catch (e) {}
      }

      showSuccess(
        'Kata Sandi Berhasil Diperbarui!',
        'Kata sandi akun Administrator Anda telah berhasil diubah. Silakan gunakan kata sandi baru ini saat masuk ke panel admin berikutnya.'
      );
      showToast('Kata sandi berhasil diperbarui');
    } catch (err: any) {
      const msg = err.message || 'Terjadi kesalahan sistem saat memperbarui kata sandi.';
      setPasswordError(msg);
      showError('Gagal Mengubah Kata Sandi', msg);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const cleanTestNumber = adminWhatsapp.replace(/[^0-9]/g, '');

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
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Pengaturan & Profil Admin</h1>
        <p style={{ color: '#64748b', fontSize: '0.88rem' }}>
          Kelola nama lengkap administrator, kata sandi akun, dan kontak resmi bantuan WhatsApp pengguna.
        </p>
      </div>

      {/* Info Banner Pengelolaan Rekening Bank Transfer */}
      <div
        className="uda-card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 14,
          padding: '16px 20px',
          backgroundColor: '#f8fafc',
          border: '2px solid #0f172a',
          boxShadow: '3px 3px 0px #0f172a',
          borderRadius: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              backgroundColor: '#ecfdf5',
              border: '1.5px solid #10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669',
              flexShrink: 0,
            }}
          >
            <Landmark size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>
              Pengelolaan Rekening Bank Transfer
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Pengaturan nomor rekening bank tujuan transfer manual kini dipusatkan secara mandiri pada menu Rekening Bank.
            </div>
          </div>
        </div>

        <Link
          href="/admin/rekening"
          className="btn-uda btn-uda-secondary btn-uda-sm"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontWeight: 800,
            fontSize: '0.82rem',
            textDecoration: 'none',
          }}
        >
          <span>Buka Rekening Bank</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* Card 1: Profil & Nama Lengkap Administrator */}
      <div className="uda-card" style={{ padding: '24px 22px' }}>
        <form onSubmit={handleSaveAdminName} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: '#f8fafc',
                border: '1.5px solid #0f172a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0f172a',
              }}
            >
              <User size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Profil & Nama Lengkap Admin
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
                Kelola identitas nama lengkap akun Administrator yang ditampilkan di panel admin dan dapat dilihat oleh sesama admin.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            {/* Input Nama Lengkap */}
            <div>
              <label
                htmlFor="input-admin-name"
                style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: 6 }}
              >
                Nama Lengkap Administrator *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="input-admin-name"
                  type="text"
                  required
                  value={adminFullName}
                  onChange={(e) => setAdminFullName(e.target.value)}
                  placeholder="Contoh: Administrator UdaPlanner"
                  style={{
                    width: '100%',
                    padding: '11px 14px 11px 40px',
                    border: '2px solid #0f172a',
                    borderRadius: 8,
                    boxShadow: '2px 2px 0px #0f172a',
                    outline: 'none',
                    fontSize: '0.94rem',
                    fontWeight: 700,
                    backgroundColor: '#ffffff',
                  }}
                />
                <User size={17} style={{ position: 'absolute', left: 14, top: 13, color: '#64748b' }} />
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: 5 }}>
                Nama ini akan tersimpan ke database profil dan tampil di salam dashboard serta daftar detail admin.
              </div>
            </div>

            {/* Email Admin (Read Only) */}
            <div>
              <label
                htmlFor="input-admin-email"
                style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: 6 }}
              >
                Alamat Email Administrator
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="input-admin-email"
                  type="text"
                  disabled
                  value={user?.email || 'admin@udaplanner.id'}
                  style={{
                    width: '100%',
                    padding: '11px 14px 11px 40px',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: 8,
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    fontSize: '0.94rem',
                    fontWeight: 700,
                    cursor: 'not-allowed',
                  }}
                />
                <Shield size={17} style={{ position: 'absolute', left: 14, top: 13, color: '#64748b' }} />
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: 5 }}>
                Akun terdaftar dengan hak akses Administrator sistem UdaPlanner.
              </div>
            </div>
          </div>

          <div style={{ paddingTop: 4 }}>
            <button
              type="submit"
              disabled={isSavingName}
              className="btn-uda btn-uda-primary"
              style={{
                width: '100%',
                maxWidth: 240,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontWeight: 800,
                height: 44,
              }}
            >
              {isSavingName ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>{isSavingName ? 'Menyimpan...' : 'Simpan Nama Lengkap'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Card 2: Ubah Kata Sandi Admin */}
      <div className="uda-card" style={{ padding: '24px 22px' }}>
        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: '#eff6ff',
                border: '1.5px solid #93c5fd',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb',
              }}
            >
              <KeyRound size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Ubah Kata Sandi Admin
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
                Perbarui kata sandi login Administrator untuk menjaga keamanan akses panel admin UdaPlanner.
              </p>
            </div>
          </div>

          {passwordError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                backgroundColor: '#fef2f2',
                border: '1.5px solid #fca5a5',
                borderRadius: 8,
                color: '#b91c1c',
                fontSize: '0.84rem',
                fontWeight: 600,
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{passwordError}</span>
            </div>
          )}

          {passwordSuccess && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                backgroundColor: '#f0fdf4',
                border: '1.5px solid #86efac',
                borderRadius: 8,
                color: '#15803d',
                fontSize: '0.84rem',
                fontWeight: 600,
              }}
            >
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {/* Kata Sandi Lama */}
          <div>
            <label
              htmlFor="input-current-password"
              style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: 6 }}
            >
              Kata Sandi Saat Ini *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="input-current-password"
                type={showCurrentPassword ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setPasswordError(null);
                }}
                placeholder="Masukkan kata sandi saat ini"
                style={{
                  width: '100%',
                  padding: '11px 40px 11px 40px',
                  border: '2px solid #0f172a',
                  borderRadius: 8,
                  boxShadow: '2px 2px 0px #0f172a',
                  outline: 'none',
                  fontSize: '0.94rem',
                  fontWeight: 600,
                  backgroundColor: '#ffffff',
                }}
              />
              <Lock size={17} style={{ position: 'absolute', left: 14, top: 13, color: '#64748b' }} />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: 11,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="Toggle password visibility"
              >
                {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: 5 }}>
              Default kata sandi akun admin bawaan sistem adalah <strong>admin123</strong> (jika belum pernah diubah sebelumnya).
            </div>
          </div>

          {/* Grid Kata Sandi Baru & Konfirmasi */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            {/* Kata Sandi Baru */}
            <div>
              <label
                htmlFor="input-new-password"
                style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: 6 }}
              >
                Kata Sandi Baru *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="input-new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setPasswordError(null);
                  }}
                  placeholder="Minimal 6 karakter"
                  style={{
                    width: '100%',
                    padding: '11px 40px 11px 40px',
                    border: '2px solid #0f172a',
                    borderRadius: 8,
                    boxShadow: '2px 2px 0px #0f172a',
                    outline: 'none',
                    fontSize: '0.94rem',
                    fontWeight: 600,
                    backgroundColor: '#ffffff',
                  }}
                />
                <KeyRound size={17} style={{ position: 'absolute', left: 14, top: 13, color: '#64748b' }} />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: 11,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748b',
                    padding: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  aria-label="Toggle password visibility"
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Konfirmasi Kata Sandi Baru */}
            <div>
              <label
                htmlFor="input-confirm-password"
                style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: 6 }}
              >
                Konfirmasi Kata Sandi Baru *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="input-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setPasswordError(null);
                  }}
                  placeholder="Ulangi kata sandi baru"
                  style={{
                    width: '100%',
                    padding: '11px 40px 11px 40px',
                    border: '2px solid #0f172a',
                    borderRadius: 8,
                    boxShadow: '2px 2px 0px #0f172a',
                    outline: 'none',
                    fontSize: '0.94rem',
                    fontWeight: 600,
                    backgroundColor: '#ffffff',
                  }}
                />
                <ShieldCheck size={17} style={{ position: 'absolute', left: 14, top: 13, color: '#64748b' }} />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: 11,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748b',
                    padding: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  aria-label="Toggle password visibility"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          <div style={{ paddingTop: 6 }}>
            <button
              type="submit"
              disabled={isUpdatingPassword}
              className="btn-uda btn-uda-primary"
              style={{
                width: '100%',
                maxWidth: 240,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontWeight: 800,
                height: 44,
              }}
            >
              {isUpdatingPassword ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>{isUpdatingPassword ? 'Memperbarui...' : 'Perbarui Kata Sandi'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Card 3: Formulir Kontak WhatsApp Admin */}
      <div className="uda-card" style={{ padding: '24px 22px' }}>
        <form onSubmit={handleSaveWhatsapp} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: '#f0fdf4',
                border: '1.5px solid #86efac',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#16a34a',
              }}
            >
              <MessageSquare size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Kontak Bantuan WhatsApp Admin
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
                Nomor ini akan otomatis tersinkronisasi ke widget WhatsApp melayang dan tombol bantuan seluruh pengguna.
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="input-admin-wa"
              style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: 6 }}
            >
              Nomor WhatsApp Admin (Format 62...) *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="input-admin-wa"
                type="text"
                required
                value={adminWhatsapp}
                onChange={(e) => setAdminWhatsapp(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="Contoh: 6281234567890"
                style={{
                  width: '100%',
                  padding: '11px 14px 11px 40px',
                  border: '2px solid #0f172a',
                  borderRadius: 8,
                  boxShadow: '2px 2px 0px #0f172a',
                  outline: 'none',
                  fontSize: '0.94rem',
                  fontWeight: 700,
                  backgroundColor: '#ffffff',
                }}
              />
              <PhoneCall size={17} style={{ position: 'absolute', left: 14, top: 13, color: '#64748b' }} />
            </div>
            <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: 6, lineHeight: 1.45 }}>
              Pastikan memasukkan nomor dengan kode negara (contoh <strong>62812...</strong> tanpa tanda + atau spasi). Nomor ini digunakan untuk tombol &quot;Hubungi Admin&quot; pada status langganan dan floating button WhatsApp.
            </div>
          </div>

          {/* Quick Preview Test WhatsApp */}
          {cleanTestNumber.length >= 9 && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                backgroundColor: '#f0fdf4',
                border: '1.5px solid #86efac',
                borderRadius: 8,
                fontSize: '0.8rem',
                color: '#166534',
                fontWeight: 700,
                width: 'fit-content',
              }}
            >
              <CheckCircle2 size={15} style={{ color: '#16a34a' }} />
              <span>Pratinjau link WhatsApp: <strong>wa.me/{cleanTestNumber}</strong></span>
              <a
                href={`https://wa.me/${cleanTestNumber}?text=${encodeURIComponent('Halo Admin UdaPlanner, ini pesan uji coba sinkronisasi kontak.')}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: '#047857',
                  textDecoration: 'underline',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  marginLeft: 6,
                }}
              >
                <span>Uji Buka</span>
                <ExternalLink size={12} />
              </a>
            </div>
          )}

          <div style={{ paddingTop: 8 }}>
            <button
              type="submit"
              disabled={isSavingWhatsapp}
              className="btn-uda btn-uda-primary"
              style={{
                width: '100%',
                maxWidth: 260,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontWeight: 800,
                height: 44,
              }}
            >
              {isSavingWhatsapp ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>{isSavingWhatsapp ? 'Menyimpan...' : 'Simpan Nomor WhatsApp'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
