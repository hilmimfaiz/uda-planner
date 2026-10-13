'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Users, CheckCircle2 } from 'lucide-react';

export default function UndanganAnggotaPage() {
  const params = useParams();
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="uda-card" style={{ maxWidth: 440, width: '100%', padding: 32, textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Users size={24} />
        </div>

        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
          Undangan Kolaborasi Tim
        </h1>

        <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: 24 }}>
          Kamu diundang ke brand <strong>UdaCoding Official</strong> sebagai <strong>Editor</strong> oleh <strong>Rizki Pratama</strong>.
        </p>

        {accepted ? (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <CheckCircle2 size={24} style={{ color: '#16a34a', margin: '0 auto 6px' }} />
            <div style={{ fontWeight: 800, color: '#15803d' }}>Undangan Diterima!</div>
            <p style={{ fontSize: '0.8rem', color: '#166534', marginTop: 4 }}>
              Brand sekarang telah muncul di akun Anda.
            </p>
            <button
              className="btn-uda btn-uda-primary"
              style={{ marginTop: 12, width: '100%' }}
              onClick={() => router.push('/app')}
            >
              Buka Dashboard Brand Sekarang
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              className="btn-uda btn-uda-primary"
              style={{ width: '100%' }}
              onClick={() => setAccepted(true)}
            >
              Terima Undangan
            </button>
            <button
              className="btn-uda btn-uda-secondary"
              style={{ width: '100%' }}
              onClick={() => router.push('/masuk')}
            >
              Masuk dengan Akun Lain
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
