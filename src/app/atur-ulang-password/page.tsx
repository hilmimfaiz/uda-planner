'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export default function AturUlangPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!supabase) {
      setErrorMessage('Konfigurasi Supabase tidak ditemukan.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('Kata sandi baru harus minimal 6 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal mengatur ulang kata sandi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        position: 'relative',
      }}
    >
      {/* Background Decorative Glow */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%',
          maxWidth: 1200,
          height: 600,
          background: 'radial-gradient(ellipse at center, rgba(6, 78, 59, 0.12) 0%, rgba(4, 61, 46, 0.06) 50%, transparent 75%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Main Split Card (Matching Login Layout) */}
      <div className="auth-split-card">
        {/* ========================================================
            KOLOM KIRI: Banner Visual Retro (Khusus Desktop Saja)
            ======================================================== */}
        <div className="auth-split-banner">
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 14px',
                borderRadius: 999,
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                border: '1.5px solid rgba(255, 255, 255, 0.25)',
                color: '#ffffff',
                fontSize: '0.78rem',
                fontWeight: 800,
                marginBottom: 20,
              }}
            >
              <ShieldCheck size={15} style={{ color: '#4ade80' }} />
              <span>{isSuccess ? 'KATA SANDI DIPERBARUI' : 'ATUR ULANG KATA SANDI'}</span>
            </div>

            <h2
              style={{
                fontSize: 'clamp(1.6rem, 2.4vw, 2.1rem)',
                fontWeight: 900,
                color: '#ffffff',
                lineHeight: 1.25,
                letterSpacing: '-0.03em',
                marginBottom: 0,
              }}
            >
              {isSuccess ? 'Akun Anda Kembali Aman!' : 'Buat Kata Sandi Baru Anda'}
            </h2>
          </div>

          {/* Middle Visual Illustration */}
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              margin: '28px 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: 140,
                height: 140,
                borderRadius: 28,
                backgroundColor: '#ffffff',
                border: '3px solid #0f172a',
                boxShadow: '6px 6px 0px #0f172a',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              {isSuccess ? <CheckCircle2 size={56} color="#16a34a" /> : <Lock size={56} color="#064e3b" />}

              <div
                style={{
                  position: 'absolute',
                  bottom: -12,
                  right: -14,
                  backgroundColor: '#fef08a',
                  color: '#0f172a',
                  border: '2px solid #0f172a',
                  boxShadow: '2px 2px 0px #0f172a',
                  padding: '3px 10px',
                  borderRadius: 999,
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Sparkles size={11} color="#0f172a" />
                <span>UdaPlanner</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            KOLOM KANAN: Form Pane
            ======================================================== */}
        <div className="auth-split-form-pane">
          {/* Header Brand */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <Link
              href="/"
              style={{
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: '#16a34a',
                  color: '#ffffff',
                  border: '2px solid #0f172a',
                  boxShadow: '2px 2px 0px #0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '1.2rem',
                }}
              >
                U
              </div>
              <span style={{ fontWeight: 900, fontSize: '1.25rem', color: '#0f172a', letterSpacing: '-0.02em' }}>
                UdaPlanner
              </span>
            </Link>

            <h1 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', marginBottom: 0 }}>
              Atur Ulang Kata Sandi
            </h1>
          </div>

          {/* Alert Error */}
          {errorMessage && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '10px 14px',
                backgroundColor: '#fef2f2',
                border: '2px solid #0f172a',
                boxShadow: '2px 2px 0px #0f172a',
                borderRadius: 10,
                marginBottom: 16,
                color: '#991b1b',
                fontSize: '0.84rem',
                lineHeight: 1.45,
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2, color: '#dc2626' }} />
              <span style={{ fontWeight: 600 }}>{errorMessage}</span>
            </div>
          )}

          {isSuccess ? (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: '50%',
                  background: '#dcfce7',
                  border: '2.5px solid #0f172a',
                  boxShadow: '3.5px 3.5px 0px #0f172a',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 18px',
                }}
              >
                <CheckCircle2 size={38} />
              </div>

              <h2 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', marginBottom: 8 }}>
                Password Berhasil Diubah!
              </h2>

              <p style={{ color: '#475569', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: 24, maxWidth: 360, margin: '0 auto 24px' }}>
                Kata sandi baru akun Anda telah aktif. Silakan masuk kembali menggunakan kata sandi baru Anda.
              </p>

              <Link
                href="/masuk"
                className="btn-camply-forest"
                style={{
                  display: 'inline-flex',
                  width: '100%',
                  padding: '12px',
                  borderRadius: 10,
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  textDecoration: 'none',
                }}
              >
                Masuk Sekarang
              </Link>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Kata Sandi Baru */}
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: 5 }}>
                  Kata Sandi Baru (Min. 6 Karakter)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    autoFocus
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      padding: '11px 44px 11px 42px',
                      border: '2px solid #0f172a',
                      borderRadius: 10,
                      boxShadow: '2px 2px 0px #0f172a',
                      fontSize: '0.92rem',
                      fontWeight: 600,
                      outline: 'none',
                      backgroundColor: isLoading ? '#f1f5f9' : '#ffffff',
                    }}
                  />
                  <Lock size={17} style={{ position: 'absolute', left: 14, top: 13, color: '#64748b' }} />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: 11,
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      padding: 2,
                    }}
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Konfirmasi Kata Sandi */}
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: 5 }}>
                  Konfirmasi Kata Sandi Baru
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      padding: '11px 44px 11px 42px',
                      border: '2px solid #0f172a',
                      borderRadius: 10,
                      boxShadow: '2px 2px 0px #0f172a',
                      fontSize: '0.92rem',
                      fontWeight: 600,
                      outline: 'none',
                      backgroundColor: isLoading ? '#f1f5f9' : '#ffffff',
                    }}
                  />
                  <Lock size={17} style={{ position: 'absolute', left: 14, top: 13, color: '#64748b' }} />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: 11,
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      padding: 2,
                    }}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-camply-forest"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  borderRadius: 10,
                  marginTop: 6,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Menyimpan Password...</span>
                  </>
                ) : (
                  'Simpan Kata Sandi Baru'
                )}
              </button>

              <div style={{ textAlign: 'center', marginTop: 10 }}>
                <Link
                  href="/masuk"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    color: '#0f172a',
                    textDecoration: 'none',
                  }}
                >
                  <ArrowLeft size={16} />
                  <span>Kembali ke Halaman Masuk</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
