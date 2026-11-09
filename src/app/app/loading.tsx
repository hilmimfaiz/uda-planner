import React from 'react';
import { Loader2 } from 'lucide-react';

export default function AppLoading() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '65vh',
        width: '100%',
        gap: 16,
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: '#f0fdf4',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1.5px solid #86efac',
          boxShadow: '0 4px 12px rgba(22, 163, 74, 0.1)',
        }}
      >
        <Loader2 size={30} className="animate-spin" style={{ color: '#16a34a' }} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0f172a' }}>
          Memuat Halaman...
        </div>
        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>
          Sedang menyiapkan data postingan dan brand Anda
        </div>
      </div>
    </div>
  );
}
