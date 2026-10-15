'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { AlertCircle, Loader2, CheckCircle2, Sparkles } from 'lucide-react';

function MasukForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/app';

  const { user, isAdmin, signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Jika user sudah terautentikasi dan membuka halaman /masuk
  React.useEffect(() => {
    if (user) {
      if (isAdmin) {
        router.push('/admin');
      } else {
        router.push(redirectPath && redirectPath !== '/masuk' ? redirectPath : '/app');
      }
    }
  }, [user, isAdmin, redirectPath, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const result = await signIn(email, password);
      if (result.error) {
        setErrorMessage(result.error);
        setIsLoading(false);
        return;
      }

      const isTargetAdmin = !!result.isAdmin;
      setIsAdminLogin(isTargetAdmin);

      // Jika akun admin, arahkan langsung ke Panel Admin (/admin), bukan dashboard user (/app)
      const targetDestination = isTargetAdmin
        ? '/admin'
        : (redirectPath && redirectPath !== '/masuk' ? redirectPath : '/app');

      setIsLoading(false);
      setShowLoadingModal(true);

      // Transisi halus masuk setelah 1 detik
      setTimeout(() => {
        router.push(targetDestination);
        router.refresh();
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem saat mencoba masuk.');
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px 12px', position: 'relative' }}>
      {/* Modal Pop-up Loading Masuk ke Dashboard */}
      {showLoadingModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
            animation: 'fadeIn 0.25s ease-out',
          }}
        >
          <div
            className="uda-card"
            style={{
              maxWidth: 380,
              width: '100%',
              padding: '36px 28px',
              textAlign: 'center',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              borderRadius: 16,
              background: '#ffffff',
            }}
          >
            {/* Animasi Ikon Sukses & Logo */}
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: '50%',
                background: '#dcfce7',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
                position: 'relative',
              }}
            >
              <CheckCircle2 size={36} />
              <div
                style={{
                  position: 'absolute',
                  inset: -4,
                  borderRadius: '50%',
                  border: '2px solid #16a34a',
                  borderTopColor: 'transparent',
                  animation: 'spin 1s linear infinite',
                }}
              />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
              {isAdminLogin ? 'Login Administrator Berhasil!' : 'Login Berhasil!'}
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.86rem', lineHeight: 1.5, marginBottom: 20 }}>
              {isAdminLogin
                ? 'Menyiapkan sesi Administrator dan mengalihkan Anda ke Panel Admin...'
                : 'Menyiapkan sesi kerja dan mengalihkan Anda ke dashboard...'}
            </p>

            {/* Loading Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#16a34a', fontSize: '0.82rem', fontWeight: 700 }}>
              <Loader2 size={16} className="animate-spin" />
              <span>{isAdminLogin ? 'Membuka Panel Admin UdaPlanner...' : 'Memuat Dashboard UdaPlanner...'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Login Card Responsif */}
      <div className="uda-card" style={{ maxWidth: 440, width: '100%', padding: 'clamp(22px, 5vw, 36px)', boxShadow: '0 10px 30px rgba(0,0,0,0.06)' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div className="logo-symbol" style={{ width: 38, height: 38, fontSize: '1.2rem', borderRadius: 10 }}>U</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#0f172a', lineHeight: 1.1 }}>UdaPlanner</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Perencana Konten Media Sosial</div>
          </div>
        </div>

        <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>Masuk ke Akun</h1>
        <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: 20 }}>
          Hanya akun terdaftar yang memiliki akses ke sistem UdaPlanner.
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
              lineHeight: 1.4,
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2, color: '#dc2626' }} />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
              Email Akun Terdaftar *
            </label>
            <input
              type="email"
              required
              autoFocus
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading || showLoadingModal}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>Kata Sandi *</label>
              <Link href="/lupa-password" style={{ fontSize: '0.78rem', color: '#16a34a', textDecoration: 'none', fontWeight: 600 }}>
                Lupa password?
              </Link>
            </div>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading || showLoadingModal}
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
            disabled={isLoading || showLoadingModal}
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
              cursor: isLoading || showLoadingModal ? 'not-allowed' : 'pointer',
              opacity: isLoading || showLoadingModal ? 0.8 : 1,
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Memverifikasi Akun...</span>
              </>
            ) : (
              'Masuk'
            )}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center', fontSize: '0.84rem', color: '#64748b' }}>
          Belum memiliki akun?{' '}
          <Link href="/daftar" style={{ color: '#16a34a', fontWeight: 700, textDecoration: 'none' }}>
            Daftar Sekarang
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function MasukPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: '#16a34a' }} />
      </div>
    }>
      <MasukForm />
    </Suspense>
  );
}
