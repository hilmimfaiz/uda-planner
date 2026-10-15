'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { AlertCircle, CheckCircle2, Loader2, MailCheck } from 'lucide-react';

export default function DaftarPage() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccessConfirmation, setIsSuccessConfirmation] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 6) {
      setErrorMessage('Kata sandi harus minimal 6 karakter.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await signUp(email, password, fullName);

      if (result.error) {
        setErrorMessage(result.error);
        setIsLoading(false);
        return;
      }

      if (result.requiresEmailConfirmation) {
        setIsSuccessConfirmation(true);
        setIsLoading(false);
      } else {
        // Langsung terautentikasi
        router.push('/app');
        router.refresh();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem saat mendaftar.');
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="uda-card" style={{ maxWidth: 440, width: '100%', padding: 36, boxShadow: '0 10px 30px rgba(0,0,0,0.06)' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div className="logo-symbol" style={{ width: 38, height: 38, fontSize: '1.2rem', borderRadius: 10 }}>U</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#0f172a', lineHeight: 1.1 }}>UdaPlanner</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Perencana Konten Media Sosial</div>
          </div>
        </div>

        {isSuccessConfirmation ? (
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
              <MailCheck size={32} />
            </div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
              Pendaftaran Berhasil!
            </h2>
            <p style={{ color: '#475569', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: 20 }}>
              Kami telah mengirim tautan konfirmasi ke <strong>{email}</strong>. Silakan periksa kotak masuk (atau folder spam) email Anda untuk mengaktifkan akun sebelum masuk.
            </p>
            <Link
              href="/masuk"
              className="btn-uda btn-uda-primary"
              style={{ display: 'inline-block', width: '100%', textAlign: 'center', textDecoration: 'none' }}
            >
              Ke Halaman Masuk
            </Link>
          </div>
        ) : (
          <>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>Daftar Akun Baru</h1>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: 20 }}>
              Daftarkan akun resmi Anda untuk mengelola jadwal konten media sosial.
            </p>

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
                  lineHeight: 1.45,
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2, color: '#dc2626' }} />
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>Pendaftaran Belum Berhasil</div>
                  <div>{errorMessage}</div>
                </div>
              </div>
            )}

            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Contoh: Muhammad Rizki"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    fontSize: '0.9rem',
                    outline: 'none',
                    background: isLoading ? '#f1f5f9' : '#ffffff',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Alamat Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    fontSize: '0.9rem',
                    outline: 'none',
                    background: isLoading ? '#f1f5f9' : '#ffffff',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Kata Sandi (Minimal 6 Karakter) *
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    fontSize: '0.9rem',
                    outline: 'none',
                    background: isLoading ? '#f1f5f9' : '#ffffff',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-uda btn-uda-primary"
                style={{
                  marginTop: 6,
                  height: 44,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.8 : 1,
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Mendaftarkan Akun...</span>
                  </>
                ) : (
                  'Daftar & Buat Akun'
                )}
              </button>
            </form>

            <div style={{ marginTop: 24, textAlign: 'center', fontSize: '0.84rem', color: '#64748b' }}>
              Sudah memiliki akun?{' '}
              <Link href="/masuk" style={{ color: '#16a34a', fontWeight: 700, textDecoration: 'none' }}>
                Masuk di Sini
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
