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
        minHeight: '50vh',
        width: '100%',
        color: '#16a34a',
        gap: 12,
      }}
    >
      <Shield size={28} style={{ color: '#16a34a' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', color: '#64748b', fontWeight: 600 }}>
        <Loader2 size={18} className="animate-spin" />
        <span>Memuat panel administrasi...</span>
      </div>
    </div>
  );
}
