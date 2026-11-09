import React from 'react';
import { Loader2, Shield } from 'lucide-react';

export default function AdminLoading() {
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
          width: 54,
          height: 54,
          borderRadius: '50%',
          background: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1.5px solid #0f172a',
          position: 'relative',
        }}
      >
        <Shield size={24} style={{ color: '#16a34a' }} />
        <div style={{ position: 'absolute', inset: -4 }}>
          <Loader2 size={62} className="animate-spin" style={{ color: '#16a34a', opacity: 0.7 }} />
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
          Memuat Panel Administrasi...
        </div>
        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>
          Mengambil data sistem dan sinkronisasi database
        </div>
      </div>
    </div>
  );
}
