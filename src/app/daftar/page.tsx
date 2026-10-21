'use client';

import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { AuthSlidingCard } from '@/components/auth-sliding-card';

export default function DaftarPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
          <div style={{ textAlign: 'center' }}>
            <Loader2 size={34} className="animate-spin" style={{ color: '#4f46e5', margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 800, color: '#0f172a' }}>Memuat Halaman Pendaftaran...</p>
          </div>
        </div>
      }
    >
      <AuthSlidingCard initialMode="register" />
    </Suspense>
  );
}
