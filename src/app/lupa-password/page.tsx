'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft,
  Mail,
  KeyRound,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
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
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());

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

      // Kode valid -> Lanjut ke ganti password
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

      // Berhasil reset password
      setStep('SUCCESS');
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal memperbarui password baru.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="uda-card" style={{ maxWidth: 460, width: '100%', padding: 36, boxShadow: '0 10px 30px rgba(0,0,0,0.06)' }}>
        {/* Header Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div className="logo-symbol" style={{ width: 38, height: 38, fontSize: '1.2rem', borderRadius: 10 }}>U</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#0f172a', lineHeight: 1.1 }}>UdaPlanner</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Pemulihan Kata Sandi</div>
          </div>
        </div>

        {/* Progress Step Indicator */}
        {step !== 'SUCCESS' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontSize: '0.78rem', color: '#64748b' }}>
            <span style={{ fontWeight: step === 'REQUEST_CODE' ? 800 : 600, color: step === 'REQUEST_CODE' ? '#16a34a' : '#94a3b8' }}>
              1. Email
            </span>
            <span>→</span>
            <span style={{ fontWeight: step === 'VERIFY_CODE' ? 800 : 600, color: step === 'VERIFY_CODE' ? '#16a34a' : '#94a3b8' }}>
              2. Kode Verifikasi
            </span>
            <span>→</span>
            <span style={{ fontWeight: step === 'RESET_PASSWORD' ? 800 : 600, color: step === 'RESET_PASSWORD' ? '#16a34a' : '#94a3b8' }}>
              3. Password Baru
            </span>
          </div>
        )}

        {/* Alert Error */}
        {errorMessage && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '12px 14px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 8,
              marginBottom: 18,
              color: '#991b1b',
              fontSize: '0.84rem',
              lineHeight: 1.4,
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2, color: '#dc2626' }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Alert Info */}
        {infoMessage && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '12px 14px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 8,
              marginBottom: 18,
              color: '#166534',
              fontSize: '0.84rem',
              lineHeight: 1.4,
            }}
          >
            <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: 2, color: '#16a34a' }} />
            <span>{infoMessage}</span>
          </div>
        )}

        {/* Step 1: Input Email & Request Code */}
        {step === 'REQUEST_CODE' && (
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
              Lupa Kata Sandi?
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: 20, lineHeight: 1.5 }}>
              Masukkan alamat email akun terdaftar Anda. Kami akan mengirimkan <strong>kode verifikasi</strong> untuk mengubah kata sandi baru.
            </p>

            <form onSubmit={handleSendCode} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Alamat Email Terdaftar *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    required
                    autoFocus
                    placeholder="nama@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 38px',
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                  <Mail size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-uda btn-uda-primary"
                style={{
                  height: 44,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontSize: '0.92rem',
                  fontWeight: 700,
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
            </form>
          </div>
        )}

        {/* Step 2: Input OTP Verification Code */}
        {step === 'VERIFY_CODE' && (
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
              Masukkan Kode Verifikasi
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: 20, lineHeight: 1.5 }}>
              Kami telah mengirimkan kode verifikasi ke email <strong>{email}</strong>. Masukkan kode tersebut di bawah ini:
            </p>

            <form onSubmit={handleVerifyCode} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Kode Verifikasi / Token *
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
                      padding: '10px 14px 10px 38px',
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      fontSize: '1rem',
                      letterSpacing: '2px',
                      fontWeight: 700,
                      outline: 'none',
                    }}
                  />
                  <KeyRound size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 4 }}>
                  Periksa folder kotak masuk atau folder spam email Anda.
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-uda btn-uda-primary"
                style={{
                  height: 44,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontSize: '0.92rem',
                  fontWeight: 700,
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
                  style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}
                >
                  Ganti Email
                </button>
                <button
                  type="button"
                  onClick={handleSendCode}
                  style={{ background: 'none', border: 'none', color: '#16a34a', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <RefreshCw size={12} />
                  <span>Kirim Ulang Kode</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 3: Input New Password */}
        {step === 'RESET_PASSWORD' && (
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
              Buat Password Baru
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: 20, lineHeight: 1.5 }}>
              Kode verifikasi Anda valid. Silakan tentukan kata sandi baru untuk akun <strong>{email}</strong>.
            </p>

            <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Kata Sandi Baru (Min. 6 Karakter) *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    required
                    autoFocus
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 38px',
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                  <Lock size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Ulangi Kata Sandi Baru *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 38px',
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                  <Lock size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-uda btn-uda-primary"
                style={{
                  height: 44,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontSize: '0.92rem',
                  fontWeight: 700,
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

        {/* Step 4: Success Message */}
        {step === 'SUCCESS' && (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: '#dcfce7',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <CheckCircle2 size={34} />
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
              Password Berhasil Diubah!
            </h2>
            <p style={{ color: '#475569', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: 24 }}>
              Kata sandi akun <strong>{email}</strong> telah berhasil diperbarui. Anda sekarang dapat masuk menggunakan kata sandi baru Anda.
            </p>
            <Link
              href="/masuk"
              className="btn-uda btn-uda-primary"
              style={{ display: 'inline-block', width: '100%', textAlign: 'center', textDecoration: 'none' }}
            >
              Masuk Sekarang
            </Link>
          </div>
        )}

        {/* Back to Login Link */}
        {step !== 'SUCCESS' && (
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <Link
              href="/masuk"
              style={{
                color: '#64748b',
                fontSize: '0.84rem',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 600,
              }}
            >
              <ArrowLeft size={14} />
              <span>Kembali ke halaman masuk</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
