'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';

interface GoogleAuthButtonProps {
  mode: 'masuk' | 'daftar';
  onError?: (errorMessage: string) => void;
  disabled?: boolean;
  label?: string;
  style?: React.CSSProperties;
}

export function GoogleAuthButton({
  mode,
  onError,
  disabled,
  label,
  style,
}: GoogleAuthButtonProps) {
  const { signInWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    try {
      try {
        if (mode === 'masuk') {
          localStorage.removeItem('uda_google_auth_pending');
          localStorage.removeItem('uda_needs_profile_setup');
          localStorage.setItem('uda_google_auth_mode', 'masuk');
        } else {
          localStorage.setItem('uda_google_auth_mode', 'daftar');
          // Untuk mode daftar, siapkan status awal namun biarkan sistem auth memverifikasi apakah akun sudah ada
          localStorage.setItem('uda_google_auth_pending', 'true');
        }
      } catch (e) {}

      // Alihkan ke /profil-awal: jika akun sudah pernah onboarding, otomatis langsung diteruskan ke /app.
      // Jika akun baru, pengguna akan langsung melihat form lengkapi profil & pemilihan paket.
      const targetPath = '/profil-awal';
      const result = await signInWithGoogle(targetPath);
      if (result.error) {
        if (onError) onError(result.error);
        setIsLoading(false);
      }
      // Jika berhasil, browser otomatis diarahkan oleh Supabase ke halaman login Google
    } catch (err: any) {
      if (onError) {
        onError(err.message || 'Terjadi kesalahan saat menghubungkan ke akun Google.');
      }
      setIsLoading(false);
    }
  };

  const buttonText =
    label || (mode === 'masuk' ? 'Masuk dengan Akun Google' : 'Daftar dengan Akun Google');

  return (
    <button
      type="button"
      onClick={handleGoogleAuth}
      disabled={disabled || isLoading}
      className="btn-google-auth btn-uda"
      style={{
        width: '100%',
        height: 46,
        backgroundColor: '#ffffff',
        color: '#0f172a',
        border: '2px solid #0f172a',
        boxShadow: '3px 3px 0px #0f172a',
        borderRadius: 10,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        fontSize: '0.92rem',
        fontWeight: 800,
        cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s ease',
        ...style,
      }}
    >
      {isLoading ? (
        <>
          <Loader2 size={18} className="animate-spin" style={{ color: '#16a34a' }} />
          <span>Menghubungkan ke Google...</span>
        </>
      ) : (
        <>
          {/* Official Google 4-Color Icon */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            style={{ flexShrink: 0 }}
          >
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.27 21.44 7.34 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.27 2.56 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span>{buttonText}</span>
        </>
      )}
    </button>
  );
}
