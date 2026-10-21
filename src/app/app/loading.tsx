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
        minHeight: '50vh',
        width: '100%',
        color: '#16a34a',
        gap: 12,
      }}
    >
      <Loader2 size={28} className="animate-spin" />
      <span style={{ fontSize: '0.88rem', color: '#64748b', fontWeight: 600 }}>
        Memuat halaman UdaPlanner...
      </span>
    </div>
  );
}
