import React from 'react';
import { Loader2 } from 'lucide-react';

export default function GlobalLoading() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        width: '100%',
        gap: 16,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: '#f0fdf4',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1.5px solid #86efac',
        }}
      >
        <Loader2 size={32} className="animate-spin" style={{ color: '#16a34a' }} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
          Memuat UdaPlanner...
        </h3>
        <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0 0' }}>
          Menyiapkan data dan antarmuka aplikasi
        </p>
      </div>
    </div>
  );
}
