import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        textAlign: 'center',
      }}
    >
      <div className="uda-card" style={{ maxWidth: 460, width: '100%', padding: 40 }}>
        <div style={{ fontSize: '4rem', fontWeight: 800, color: '#16a34a', lineHeight: 1 }}>404</div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '14px 0 8px' }}>
          Halaman Tidak Ditemukan
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: 24 }}>
          Halaman yang Anda tuju mungkin telah dipindahkan, dihapus, atau tautan yang dimasukkan salah.
        </p>
        <Link href="/app" className="btn-uda btn-uda-primary" style={{ textDecoration: 'none' }}>
          Kembali ke Beranda UdaPlanner
        </Link>
      </div>
    </div>
  );
}
