'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import {
  AlertCircle,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ArrowRight,
  ArrowLeft,
  User,
  MailCheck,
} from 'lucide-react';
import { GoogleAuthButton } from '@/components/google-auth-button';
import { AuthIllustration } from '@/components/auth-illustration';

interface AuthSlidingCardProps {
  initialMode?: 'login' | 'register';
}

export function AuthSlidingCard({ initialMode = 'login' }: AuthSlidingCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams?.get('redirect') || '/app';
  const isVerified = searchParams?.get('verified') === 'true';

  const { user, isAdmin, signIn, signUp, signOut } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  // Form Login States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Form Register States
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [isRegLoading, setIsRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [isSuccessConfirmation, setIsSuccessConfirmation] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  // Handle URL synchronizing & browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        if (window.location.pathname.includes('/daftar')) {
          setMode('register');
        } else if (window.location.pathname.includes('/masuk')) {
          setMode('login');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Jika user tiba melalui tautan konfirmasi email (?verified=true)
  useEffect(() => {
    if (isVerified && typeof window !== 'undefined') {
      try {
        const keys = Object.keys(localStorage);
        keys.forEach((k) => {
          if (k.startsWith('uda_unverified_registration_')) {
            const target = k.replace('uda_unverified_registration_', '');
            localStorage.setItem(`uda_manually_verified_${target}`, 'true');
            localStorage.removeItem(k);
          }
        });
        window.dispatchEvent(new CustomEvent('uda_user_verified'));
        window.dispatchEvent(new Event('storage'));
      } catch (e) {}
    }
  }, [isVerified]);

  // Jika user sudah terautentikasi sebelumnya
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('logout') === 'true') {
        signOut();
        return;
      }
      if (urlParams.get('switch') === 'true') {
        return;
      }
    }

    if (user) {
      if (isAdmin) {
        router.push('/admin');
      } else {
        const needsOnboarding =
          user.user_metadata?.has_completed_onboarding !== true &&
          (typeof window !== 'undefined'
            ? localStorage.getItem('uda_profile_setup_done_' + user.id) !== 'true'
            : true);

        if (needsOnboarding) {
          router.push('/profil-awal');
        } else {
          router.push(redirectPath && redirectPath !== '/masuk' ? redirectPath : '/app');
        }
      }
    }
  }, [user, isAdmin, redirectPath, router, signOut]);

  // Fungsi pergantian mode dengan animasi halus dan perubahan URL aman
  const switchTo = (target: 'login' | 'register') => {
    setMode(target);
    setLoginError(null);
    setRegError(null);
    if (typeof window !== 'undefined') {
      const targetUrl = target === 'register' ? '/daftar' : '/masuk';
      window.history.pushState(null, '', targetUrl);
    }
  };

  // Submit Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!loginEmail || !loginPassword) {
      setLoginError('Silakan lengkapi email dan kata sandi Anda.');
      return;
    }

    setIsLoginLoading(true);

    try {
      const result = await signIn(loginEmail, loginPassword);
      if (result.error) {
        setLoginError(result.error);
        setIsLoginLoading(false);
        return;
      }

      const isTargetAdmin = !!result.isAdmin;
      setIsAdminLogin(isTargetAdmin);

      const targetDestination = isTargetAdmin
        ? '/admin'
        : result.needsOnboarding
        ? '/profil-awal'
        : redirectPath && redirectPath !== '/masuk'
        ? redirectPath
        : '/app';

      setIsLoginLoading(false);
      setShowLoadingModal(true);

      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.href = targetDestination;
        } else {
          router.push(targetDestination);
          router.refresh();
        }
      }, 700);
    } catch (err: any) {
      setLoginError(err.message || 'Terjadi kesalahan sistem saat mencoba masuk.');
      setIsLoginLoading(false);
    }
  };

  // Submit Register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    if (regPassword.length < 6) {
      setRegError('Kata sandi harus minimal 6 karakter demi keamanan akun Anda.');
      return;
    }

    setIsRegLoading(true);

    try {
      const result = await signUp(regEmail, regPassword, regFullName);

      if (result.error) {
        setRegError(result.error);
        setIsRegLoading(false);
        return;
      }

      setRegisteredEmail(regEmail);
      setIsSuccessConfirmation(true);
      setIsRegLoading(false);
    } catch (err: any) {
      setRegError(err.message || 'Terjadi kesalahan sistem saat mendaftar.');
      setIsRegLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        backgroundImage:
          'radial-gradient(circle at 15% 25%, rgba(6, 78, 59, 0.12) 0%, transparent 45%), radial-gradient(circle at 85% 75%, rgba(4, 61, 46, 0.08) 0%, transparent 45%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        position: 'relative',
      }}
    >
      {/* Modal Loading Sukses Login */}
      {showLoadingModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
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
              maxWidth: 390,
              width: '100%',
              padding: '36px 28px',
              textAlign: 'center',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              borderRadius: 20,
              backgroundColor: '#ffffff',
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                backgroundColor: '#dcfce7',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
                position: 'relative',
              }}
            >
              <CheckCircle2 size={34} />
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

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
              {isAdminLogin ? 'Sesi Admin Ditemukan!' : 'Login Berhasil!'}
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: 20 }}>
              {isAdminLogin
                ? 'Membuka panel manajemen administrator UdaPlanner...'
                : 'Menyiapkan kalender dan mengalihkan Anda ke dashboard...'}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#16a34a', fontSize: '0.84rem', fontWeight: 700 }}>
              <Loader2 size={16} className="animate-spin" />
              <span>Memuat Halaman...</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Sliding Card Container */}
      <div className={`auth-slider-root ${mode === 'register' ? 'mode-register' : 'mode-login'}`}>
        {/* Sliding Banner Desktop (Khusus Desktop Saja: Bergeser Kiri/Kanan dengan Mulus) */}
        <div className={`auth-sliding-banner ${mode === 'register' ? 'is-register' : ''}`}>
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            {/* Versi Ilustrasi Login (Workstation Kreator) */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                opacity: mode === 'login' ? 1 : 0,
                transform: mode === 'login' ? 'scale(1)' : 'scale(0.96)',
                transition: 'opacity 0.4s ease 0.1s, transform 0.4s ease 0.1s',
                pointerEvents: mode === 'login' ? 'auto' : 'none',
              }}
            >
              <AuthIllustration variant="login" />
            </div>

            {/* Versi Ilustrasi Register (Rocket Launch + IG 9-Grid) */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                opacity: mode === 'register' ? 1 : 0,
                transform: mode === 'register' ? 'scale(1)' : 'scale(0.96)',
                transition: 'opacity 0.4s ease 0.1s, transform 0.4s ease 0.1s',
                pointerEvents: mode === 'register' ? 'auto' : 'none',
              }}
            >
              <AuthIllustration variant="register" />
            </div>
          </div>
        </div>

        {/* ========================================================
            PANE FORM LOGIN (Di Kanan pada Desktop, Full di Mobile)
            ======================================================== */}
        <div className="auth-sliding-form-pane auth-pane-login">
          {/* Brand Logo & Name Center */}
          <div style={{ textAlign: 'center', marginBottom: 14 }}>
            <Link
              href="/"
              style={{
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 8,
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

            <h1
              style={{
                fontSize: 'clamp(1.45rem, 2.2vw, 1.75rem)',
                fontWeight: 900,
                color: '#0f172a',
                letterSpacing: '-0.02em',
                marginBottom: 4,
              }}
            >
              Welcome Back
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.86rem', fontWeight: 500 }}>
              Silakan masuk ke akun UdaPlanner Anda
            </p>
          </div>

          {/* Verified Success Alert */}
          {isVerified && (
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
                marginBottom: 14,
                color: '#166534',
                fontSize: '0.84rem',
                lineHeight: 1.45,
              }}
            >
              <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: 2, color: '#16a34a' }} />
              <div>
                <div style={{ fontWeight: 800 }}>Email Berhasil Diverifikasi!</div>
                <div style={{ fontSize: '0.8rem', color: '#15803d', marginTop: 2 }}>
                  Akun Anda telah aktif. Silakan masuk menggunakan email dan kata sandi Anda.
                </div>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {loginError && (
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
                marginBottom: 14,
                color: '#991b1b',
                fontSize: '0.84rem',
                lineHeight: 1.45,
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2, color: '#dc2626' }} />
              <span style={{ fontWeight: 600 }}>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            {/* Email Input */}
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: 5 }}>
                Email
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  required
                  autoFocus={mode === 'login'}
                  placeholder="name@example.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  disabled={isLoginLoading || showLoadingModal}
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 42px',
                    border: '2px solid #0f172a',
                    borderRadius: 10,
                    boxShadow: '2px 2px 0px #0f172a',
                    fontSize: '0.92rem',
                    fontWeight: 600,
                    outline: 'none',
                    backgroundColor: isLoginLoading ? '#f1f5f9' : '#ffffff',
                    transition: 'all 0.15s ease',
                  }}
                />
                <Mail size={17} style={{ position: 'absolute', left: 14, top: 12, color: '#64748b' }} />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: 5 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  disabled={isLoginLoading || showLoadingModal}
                  style={{
                    width: '100%',
                    padding: '10px 44px 10px 42px',
                    border: '2px solid #0f172a',
                    borderRadius: 10,
                    boxShadow: '2px 2px 0px #0f172a',
                    fontSize: '0.92rem',
                    fontWeight: 600,
                    outline: 'none',
                    backgroundColor: isLoginLoading ? '#f1f5f9' : '#ffffff',
                    transition: 'all 0.15s ease',
                  }}
                />
                <Lock size={17} style={{ position: 'absolute', left: 14, top: 12, color: '#64748b' }} />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: 10,
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title={showLoginPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                >
                  {showLoginPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>

              {/* Forgot Password Link */}
              <div style={{ textAlign: 'right', marginTop: 6 }}>
                <Link
                  href="/lupa-password"
                  style={{
                    fontSize: '0.8rem',
                    color: '#064e3b',
                    textDecoration: 'none',
                    fontWeight: 700,
                  }}
                >
                  Forgot Password?
                </Link>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoginLoading || showLoadingModal}
              className="btn-uda"
              style={{
                marginTop: 2,
                height: 45,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontSize: '0.96rem',
                fontWeight: 900,
                borderRadius: 10,
                border: '2.5px solid #0f172a',
                boxShadow: '4px 4px 0px #0f172a',
                backgroundColor: '#064e3b',
                color: '#ffffff',
                cursor: isLoginLoading || showLoadingModal ? 'not-allowed' : 'pointer',
              }}
            >
              {isLoginLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Memverifikasi Akun...</span>
                </>
              ) : (
                <>
                  <span>Login</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '14px 0 12px' }}>
            <div style={{ flex: 1, height: 1.5, backgroundColor: '#e2e8f0' }} />
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.02em' }}>
              or Login with
            </span>
            <div style={{ flex: 1, height: 1.5, backgroundColor: '#e2e8f0' }} />
          </div>

          {/* Google Auth Button */}
          <GoogleAuthButton
            mode="masuk"
            label="Google"
            onError={(msg) => setLoginError(msg)}
            disabled={isLoginLoading || showLoadingModal}
            style={{
              height: 42,
              border: '2px solid #0f172a',
              boxShadow: '2.5px 2.5px 0px #0f172a',
              borderRadius: 10,
              fontWeight: 800,
            }}
          />

          <div style={{ marginTop: 16, textAlign: 'center', fontSize: '0.86rem', color: '#64748b' }}>
            Belum memiliki akun?{' '}
            <button
              type="button"
              onClick={() => switchTo('register')}
              style={{
                background: 'none',
                border: 'none',
                color: '#064e3b',
                fontWeight: 900,
                cursor: 'pointer',
                padding: 0,
                fontFamily: 'inherit',
                fontSize: 'inherit',
                textDecoration: 'none',
              }}
            >
              Daftar Sekarang
            </button>
          </div>
        </div>

        {/* ========================================================
            PANE FORM REGISTER (Di Kiri pada Desktop, Full di Mobile)
            ======================================================== */}
        <div className="auth-sliding-form-pane auth-pane-register">
          {/* Brand Logo & Name Center */}
          <div style={{ textAlign: 'center', marginBottom: 14 }}>
            <Link
              href="/"
              style={{
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 8,
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

            <h1
              style={{
                fontSize: 'clamp(1.45rem, 2.2vw, 1.75rem)',
                fontWeight: 900,
                color: '#0f172a',
                letterSpacing: '-0.02em',
                marginBottom: 4,
              }}
            >
              Daftar Akun Baru
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.86rem', fontWeight: 500 }}>
              Mulai rencanakan konten dan kalender media sosial Anda
            </p>
          </div>

          {isSuccessConfirmation ? (
            /* Layar Konfirmasi Email */
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  backgroundColor: '#dcfce7',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  border: '2px solid #0f172a',
                  boxShadow: '3px 3px 0px #0f172a',
                }}
              >
                <MailCheck size={34} />
              </div>

              <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', marginBottom: 10, letterSpacing: '-0.02em' }}>
                Konfirmasi Email Terdaftar
              </h2>

              <p style={{ color: '#475569', fontSize: '0.86rem', lineHeight: 1.55, marginBottom: 12 }}>
                Kami telah mengirimkan tautan konfirmasi pendaftaran ke alamat email:
              </p>

              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '2px solid #0f172a',
                  boxShadow: '2px 2px 0px #0f172a',
                  borderRadius: 10,
                  padding: '10px 14px',
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                }}
              >
                <Mail size={17} style={{ color: '#16a34a', flexShrink: 0 }} />
                <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.92rem', wordBreak: 'break-all' }}>
                  {registeredEmail || regEmail}
                </span>
              </div>

              <p style={{ color: '#64748b', fontSize: '0.82rem', lineHeight: 1.55, marginBottom: 20 }}>
                Silakan periksa kotak masuk (inbox) atau folder spam pada email Anda, lalu klik tautan konfirmasi untuk mengaktifkan akun Anda sebelum masuk.
              </p>

              <button
                type="button"
                onClick={() => switchTo('login')}
                className="btn-uda"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  height: 45,
                  fontSize: '0.94rem',
                  fontWeight: 900,
                  borderRadius: 10,
                  width: '100%',
                  backgroundColor: '#4f46e5',
                  color: '#ffffff',
                  border: '2.5px solid #0f172a',
                  boxShadow: '4px 4px 0px #0f172a',
                  cursor: 'pointer',
                }}
              >
                <ArrowLeft size={16} />
                <span>Beralih ke Halaman Login</span>
              </button>
            </div>
          ) : (
            /* Formulir Pendaftaran */
            <>
              {regError && (
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
                    marginBottom: 14,
                    color: '#991b1b',
                    fontSize: '0.84rem',
                    lineHeight: 1.45,
                  }}
                >
                  <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2, color: '#dc2626' }} />
                  <div>
                    <div style={{ fontWeight: 800, marginBottom: 2 }}>Pendaftaran Belum Berhasil</div>
                    <div>{regError}</div>
                  </div>
                </div>
              )}

              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Full Name */}
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: 5 }}>
                    Nama Lengkap
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      required
                      autoFocus={mode === 'register'}
                      placeholder="Contoh: Muhammad Rizki"
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      disabled={isRegLoading}
                      style={{
                        width: '100%',
                        padding: '10px 14px 10px 42px',
                        border: '2px solid #0f172a',
                        borderRadius: 10,
                        boxShadow: '2px 2px 0px #0f172a',
                        fontSize: '0.92rem',
                        fontWeight: 600,
                        outline: 'none',
                        backgroundColor: isRegLoading ? '#f1f5f9' : '#ffffff',
                        transition: 'all 0.15s ease',
                      }}
                    />
                    <User size={17} style={{ position: 'absolute', left: 14, top: 12, color: '#64748b' }} />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: 5 }}>
                    Email
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      disabled={isRegLoading}
                      style={{
                        width: '100%',
                        padding: '10px 14px 10px 42px',
                        border: '2px solid #0f172a',
                        borderRadius: 10,
                        boxShadow: '2px 2px 0px #0f172a',
                        fontSize: '0.92rem',
                        fontWeight: 600,
                        outline: 'none',
                        backgroundColor: isRegLoading ? '#f1f5f9' : '#ffffff',
                        transition: 'all 0.15s ease',
                      }}
                    />
                    <Mail size={17} style={{ position: 'absolute', left: 14, top: 12, color: '#64748b' }} />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: 5 }}>
                    Password (Minimal 6 Karakter)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      disabled={isRegLoading}
                      style={{
                        width: '100%',
                        padding: '10px 44px 10px 42px',
                        border: '2px solid #0f172a',
                        borderRadius: 10,
                        boxShadow: '2px 2px 0px #0f172a',
                        fontSize: '0.92rem',
                        fontWeight: 600,
                        outline: 'none',
                        backgroundColor: isRegLoading ? '#f1f5f9' : '#ffffff',
                        transition: 'all 0.15s ease',
                      }}
                    />
                    <Lock size={17} style={{ position: 'absolute', left: 14, top: 12, color: '#64748b' }} />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      style={{
                        position: 'absolute',
                        right: 12,
                        top: 10,
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        padding: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title={showRegPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                    >
                      {showRegPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isRegLoading}
                  className="btn-uda"
                  style={{
                    marginTop: 2,
                    height: 45,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    fontSize: '0.96rem',
                    fontWeight: 900,
                    borderRadius: 10,
                    border: '2.5px solid #0f172a',
                    boxShadow: '4px 4px 0px #0f172a',
                    backgroundColor: '#064e3b',
                    color: '#ffffff',
                    cursor: isRegLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isRegLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Mendaftarkan Akun...</span>
                    </>
                  ) : (
                    <>
                      <span>Daftar Sekarang</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '14px 0 12px' }}>
                <div style={{ flex: 1, height: 1.5, backgroundColor: '#e2e8f0' }} />
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.02em' }}>
                  or Register with
                </span>
                <div style={{ flex: 1, height: 1.5, backgroundColor: '#e2e8f0' }} />
              </div>

              {/* Google Auth Button */}
              <GoogleAuthButton
                mode="daftar"
                label="Google"
                onError={(msg) => setRegError(msg)}
                disabled={isRegLoading}
                style={{
                  height: 42,
                  border: '2px solid #0f172a',
                  boxShadow: '2.5px 2.5px 0px #0f172a',
                  borderRadius: 10,
                  fontWeight: 800,
                }}
              />

              <div style={{ marginTop: 16, textAlign: 'center', fontSize: '0.86rem', color: '#64748b' }}>
                Sudah memiliki akun?{' '}
                <button
                  type="button"
                  onClick={() => switchTo('login')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#064e3b',
                    fontWeight: 900,
                    cursor: 'pointer',
                    padding: 0,
                    fontFamily: 'inherit',
                    fontSize: 'inherit',
                    textDecoration: 'none',
                  }}
                >
                  Masuk di Sini
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
