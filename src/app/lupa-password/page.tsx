'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getSiteUrl } from '@/lib/site-url';
import {
  ArrowLeft,
  Mail,
  KeyRound,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
  Key,
} from 'lucide-react';

type Step = 'REQUEST_CODE' | 'VERIFY_CODE' | 'RESET_PASSWORD' | 'SUCCESS';

export default function LupaPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<Step>('REQUEST_CODE');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // 1. Kirim Kode Verifikasi ke Email
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    if (!supabase) {
      setErrorMessage('Konfigurasi Supabase tidak ditemukan.');
      return;
    }

    setIsLoading(true);

    try {
      const siteUrl = getSiteUrl();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${siteUrl}/atur-ulang-password`,
      });

      if (error) {
        if (error.message.includes('rate limit') || (error as any).status === 429) {
          setErrorMessage(
            'Batas pengiriman email Supabase tercapai (rate limit). Tunggu beberapa saat atau periksa inbox Anda.'
          );
        } else {
          setErrorMessage(error.message);
        }
        setIsLoading(false);
        return;
      }

      setInfoMessage(`Kode verifikasi telah dikirim ke ${email}. Silakan periksa kotak masuk atau spam email Anda.`);
      setStep('VERIFY_CODE');
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal mengirim kode verifikasi.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Verifikasi Kode OTP dari Email
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    if (!supabase) {
      setErrorMessage('Konfigurasi Supabase tidak ditemukan.');
      return;
    }

    if (!otpCode.trim()) {
      setErrorMessage('Silakan masukkan kode verifikasi yang Anda terima.');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: otpCode.trim(),
        type: 'recovery',
      });

      if (error) {
        setErrorMessage('Kode verifikasi salah atau telah kedaluwarsa. Silakan periksa kembali.');
        setIsLoading(false);
        return;
      }

      setInfoMessage('Kode verifikasi berhasil diterima! Silakan buat password baru Anda.');
      setStep('RESET_PASSWORD');
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal memverifikasi kode.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Simpan Password Baru
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    if (!supabase) {
      setErrorMessage('Konfigurasi Supabase tidak ditemukan.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('Password baru harus minimal 6 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Konfirmasi password tidak cocok.');
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

      setStep('SUCCESS');
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal memperbarui password baru.');
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
      {/* Background Decorative Rings */}
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
          {/* Top Banner Content */}
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
              <span>
                {step === 'REQUEST_CODE' && 'KEAMANAN & PEMULIHAN AKUN'}
                {step === 'VERIFY_CODE' && 'VERIFIKASI EMAIL KONTEN'}
                {step === 'RESET_PASSWORD' && 'PENGATURAN KATA SANDI BARU'}
                {step === 'SUCCESS' && 'PEMULIHAN BERHASIL'}
              </span>
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
              {step === 'REQUEST_CODE' && 'Kembalikan Akses Jadwal Konten Anda'}
              {step === 'VERIFY_CODE' && 'Periksa 6-Digit Kode di Email Anda'}
              {step === 'RESET_PASSWORD' && 'Lindungi Akun dengan Kata Sandi Baru'}
              {step === 'SUCCESS' && 'Akun Siap Digunakan Kembali!'}
            </h2>
          </div>

          {/* Middle Visual Illustration Graphic */}
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
              {step === 'REQUEST_CODE' && <Mail size={56} color="#064e3b" />}
              {step === 'VERIFY_CODE' && <KeyRound size={56} color="#ea580c" />}
              {step === 'RESET_PASSWORD' && <Lock size={56} color="#16a34a" />}
              {step === 'SUCCESS' && <CheckCircle2 size={56} color="#16a34a" />}

              {/* Floating micro-badge */}
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
            KOLOM KANAN: Form Pane (Step-by-step Card)
            ======================================================== */}
        <div className="auth-split-form-pane">
          {/* Header Brand Logo */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
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

            {/* Step Progress Pill Indicator */}
            {step !== 'SUCCESS' && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginTop: 6,
                  fontSize: '0.76rem',
                  fontWeight: 800,
                }}
              >
                <span
                  style={{
                    color: step === 'REQUEST_CODE' ? '#16a34a' : '#64748b',
                    padding: '2px 8px',
                    borderRadius: 6,
                    backgroundColor: step === 'REQUEST_CODE' ? '#f0fdf4' : 'transparent',
                    border: step === 'REQUEST_CODE' ? '1px solid #86efac' : 'none',
                  }}
                >
                  1. Masukkan Email
                </span>
                <span style={{ color: '#cbd5e1' }}>→</span>
                <span
                  style={{
                    color: step === 'VERIFY_CODE' ? '#ea580c' : '#64748b',
                    padding: '2px 8px',
                    borderRadius: 6,
                    backgroundColor: step === 'VERIFY_CODE' ? '#fff7ed' : 'transparent',
                    border: step === 'VERIFY_CODE' ? '1px solid #fdba74' : 'none',
                  }}
                >
                  2. Kode Verifikasi
                </span>
                <span style={{ color: '#cbd5e1' }}>→</span>
                <span
                  style={{
                    color: step === 'RESET_PASSWORD' ? '#064e3b' : '#64748b',
                    padding: '2px 8px',
                    borderRadius: 6,
                    backgroundColor: step === 'RESET_PASSWORD' ? '#f0fdf4' : 'transparent',
                    border: step === 'RESET_PASSWORD' ? '1px solid #86efac' : 'none',
                  }}
                >
                  3. Password Baru
                </span>
              </div>
            )}
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

          {/* Alert Info */}
          {infoMessage && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '10px 14px',
                backgroundColor: '#f0fdf4',
                border: '2px solid #0f172a',
                boxShadow: '2px 2px 0px #0f172a',
                borderRadius: 10,
                marginBottom: 16,
                color: '#166534',
                fontSize: '0.84rem',
                lineHeight: 1.45,
              }}
            >
              <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: 2, color: '#16a34a' }} />
              <span style={{ fontWeight: 600 }}>{infoMessage}</span>
            </div>
          )}

          {/* STEP 1: REQUEST CODE */}
          {step === 'REQUEST_CODE' && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <h1 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', marginBottom: 0 }}>
                  Lupa Kata Sandi?
                </h1>
              </div>

              <form onSubmit={handleSendCode} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: 5 }}>
                    Alamat Email Terdaftar
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="email"
                      required
                      autoFocus
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      style={{
                        width: '100%',
                        padding: '11px 14px 11px 42px',
                        border: '2px solid #0f172a',
                        borderRadius: 10,
                        boxShadow: '2px 2px 0px #0f172a',
                        fontSize: '0.92rem',
                        fontWeight: 600,
                        outline: 'none',
                        backgroundColor: isLoading ? '#f1f5f9' : '#ffffff',
                      }}
                    />
                    <Mail size={17} style={{ position: 'absolute', left: 14, top: 13, color: '#64748b' }} />
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
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Mengirim Kode...</span>
                    </>
                  ) : (
                    'Kirim Kode Verifikasi'
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
            </div>
          )}

          {/* STEP 2: VERIFY OTP CODE */}
          {step === 'VERIFY_CODE' && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <h1 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', marginBottom: email ? 4 : 0 }}>
                  Masukkan Kode Verifikasi
                </h1>
                {email && (
                  <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
                    Kode dikirim ke: <strong style={{ color: '#0f172a' }}>{email}</strong>
                  </div>
                )}
              </div>

              <form onSubmit={handleVerifyCode} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: 5 }}>
                    Kode Verifikasi / Token 6-Digit
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      required
                      autoFocus
                      placeholder="Contoh: 123456"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      disabled={isLoading}
                      style={{
                        width: '100%',
                        padding: '11px 14px 11px 42px',
                        border: '2px solid #0f172a',
                        borderRadius: 10,
                        boxShadow: '2px 2px 0px #0f172a',
                        fontSize: '1.1rem',
                        letterSpacing: '3px',
                        fontWeight: 800,
                        textAlign: 'center',
                        outline: 'none',
                        backgroundColor: isLoading ? '#f1f5f9' : '#ffffff',
                      }}
                    />
                    <KeyRound size={17} style={{ position: 'absolute', left: 14, top: 14, color: '#64748b' }} />
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 6, textAlign: 'center' }}>
                    Periksa folder kotak masuk atau spam email Anda.
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
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Memverifikasi Kode...</span>
                    </>
                  ) : (
                    'Verifikasi Kode'
                  )}
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => setStep('REQUEST_CODE')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    ← Ganti Email
                  </button>
                  <button
                    type="button"
                    onClick={handleSendCode}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#16a34a',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <RefreshCw size={13} />
                    <span>Kirim Ulang Kode</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 3: RESET PASSWORD */}
          {step === 'RESET_PASSWORD' && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <h1 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', marginBottom: 0 }}>
                  Buat Kata Sandi Baru
                </h1>
              </div>

              <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
                    'Simpan Password Baru'
                  )}
                </button>
              </form>
            </div>
          )}

          {/* STEP 4: SUCCESS CONFIRMATION */}
          {step === 'SUCCESS' && (
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
                Password Berhasil Diperbarui!
              </h2>

              <p style={{ color: '#475569', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: 24, maxWidth: 360, margin: '0 auto 24px' }}>
                Kata sandi baru akun Anda telah aktif. Silakan masuk kembali untuk mulai menyusun kalender dan jadwal konten Anda.
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
          )}
        </div>
      </div>
    </div>
  );
}
