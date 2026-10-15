'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled app error caught by ErrorBoundary:', error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        className="uda-card"
        style={{
          maxWidth: 480,
          width: '100%',
          textAlign: 'center',
          padding: '40px 28px',
          borderRadius: 16,
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
          border: '1px solid #e2e8f0',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: '#fef2f2',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px',
          }}
        >
          <AlertTriangle size={28} />
        </div>

        <h1
          style={{
            fontSize: '1.35rem',
            fontWeight: 800,
            color: '#0f172a',
            marginBottom: 8,
            letterSpacing: '-0.02em',
          }}
        >
          Terjadi Kendala Memuat Halaman
        </h1>

        <p
          style={{
            color: '#64748b',
            fontSize: '0.88rem',
            lineHeight: 1.5,
            marginBottom: 24,
          }}
        >
          Halaman mengalami kendala saat memuat data. Silakan coba muat ulang atau kembali ke halaman beranda.
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <button
            className="btn-uda btn-uda-primary"
            onClick={() => reset()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
            }}
          >
            <RotateCcw size={15} />
            <span>Coba Lagi</span>
          </button>

          <Link
            href="/app"
            className="btn-uda btn-uda-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              textDecoration: 'none',
            }}
          >
            <Home size={15} />
            <span>Kembali ke Beranda</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
