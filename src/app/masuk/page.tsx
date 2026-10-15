"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { AlertCircle, Loader2, CheckCircle2, Sparkles } from 'lucide-react';

function MasukForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/app';

  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    router.push("/app");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(ellipse at top left, rgba(187, 247, 208, 0.45), transparent 42%), radial-gradient(ellipse at bottom right, rgba(219, 234, 254, 0.55), transparent 42%), #f8fafc",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 20px",
      }}
    >
      <div
        className="uda-card"
        style={{
          maxWidth: 440,
          width: "100%",
          padding: "36px 32px",
          border: "1px solid rgba(226, 232, 240, 0.9)",
          borderRadius: 22,
          background: "rgba(255, 255, 255, 0.96)",
          boxShadow: "0 24px 60px rgba(15, 23, 42, 0.08)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            marginBottom: 28,
          }}
        >
          <div
            className="logo-symbol"
            style={{ width: 34, height: 34, fontSize: "1.1rem" }}
          >
            U
          </div>
          <span
            style={{ fontWeight: 800, fontSize: "1.25rem", color: "#0f172a" }}
          >
            UdaPlanner
          </span>
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const result = await signIn(email, password);
      if (result.error) {
        setErrorMessage(result.error);
        setIsLoading(false);
        return;
      }

      // Berhasil masuk -> Munculkan Modal Pop-Up Loading ke Dashboard
      setIsLoading(false);
      setShowLoadingModal(true);

      // Transisi halus masuk ke dashboard setelah 1 detik
      setTimeout(() => {
        router.push(redirectPath);
        router.refresh();
      }, 1100);
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem saat mencoba masuk.');
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative' }}>
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
              Login Berhasil!
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.86rem', lineHeight: 1.5, marginBottom: 20 }}>
              Menyiapkan sesi kerja dan mengalihkan Anda ke dashboard...
            </p>

            {/* Loading Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#16a34a', fontSize: '0.82rem', fontWeight: 700 }}>
              <Loader2 size={16} className="animate-spin" />
              <span>Memuat Dashboard UdaPlanner...</span>
            </div>
          </div>
        </div>
      )}

        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: 800,
            color: "#0f172a",
            marginBottom: 8,
            textAlign: "center",
            letterSpacing: "-0.04em",
          }}
        >
          Masuk ke Akun
        </h1>
        <p
          style={{
            color: "#64748b",
            fontSize: "0.9rem",
            lineHeight: 1.7,
            marginBottom: 26,
            textAlign: "center",
          }}
        >
          Kelola rencana dan jadwal konten Anda kembali.
        </p>

        <form
          onSubmit={handleLogin}
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          <div>
            <label style={{ fontSize: "0.82rem", fontWeight: 700 }}>
              Email
      {/* Main Login Card */}
      <div className="uda-card" style={{ maxWidth: 440, width: '100%', padding: 36, boxShadow: '0 10px 30px rgba(0,0,0,0.06)' }}>
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
              className="login-input"
              required
              autoFocus
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                boxSizing: "border-box",
                width: "100%",
                padding: "12px 14px",
                border: "1px solid #cbd5e1",
                borderRadius: 10,
                marginTop: 6,
                outline: "none",
                background: "#ffffff",
                color: "#0f172a",
                fontSize: "0.9rem",
                transition: "border-color 0.2s ease, box-shadow 0.2s ease",
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
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <label style={{ fontSize: "0.82rem", fontWeight: 700 }}>
                Password
              </label>
              <Link
                href="/lupa-password"
                style={{
                  fontSize: "0.78rem",
                  color: "#16a34a",
                  textDecoration: "none",
                }}
              >
                Lupa password?
              </Link>
            </div>

            <div style={{ position: "relative", marginTop: 4 }}>
              <input
                className="login-input"
                type={showPassword ? "text" : "password"}
                required
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  boxSizing: "border-box",
                  width: "100%",
                  padding: "12px 44px 12px 12px",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  outline: "none",
                }}
              />

              <button
                type="button"
                aria-label={
                  showPassword ? "Sembunyikan password" : "Lihat password"
                }
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "transparent",
                  color: "#64748b",
                  cursor: "pointer",
                  padding: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {showPassword ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 3l18 18" />
                    <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                    <path d="M9.9 5.2A11 11 0 0 1 12 5c5 0 9 5 10 7a13 13 0 0 1-3 3.8" />
                    <path d="M6.6 6.6C4.2 8 2.7 10.1 2 12c1 2 5 7 10 7a10 10 0 0 0 4-.8" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
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
            className="btn-uda btn-uda-primary login-submit"
            style={{
              marginTop: 8,
              width: "100%",
              minHeight: 46,
              borderRadius: 10,
              fontSize: "0.95rem",
              fontWeight: 700,
              boxShadow: "0 6px 14px rgba(22, 163, 74, 0.18)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
          >
            Masuk →
          </button>
        </form>

        <div
          style={{
            marginTop: 26,
            paddingTop: 22,
            borderTop: "1px solid #f1f5f9",
            textAlign: "center",
            fontSize: "0.88rem",
            color: "#64748b",
            lineHeight: 1.7,
          }}
        >
          Belum punya akun?{" "}
          <Link
            href="/daftar"
            style={{
              color: "#16a34a",
              fontWeight: 800,
              textDecoration: "none",
            }}
          >
            Daftar gratis →
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
