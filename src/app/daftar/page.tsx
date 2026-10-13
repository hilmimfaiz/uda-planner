'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function DaftarPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate successful registration -> go to onboarding
    router.push('/app');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="uda-card" style={{ maxWidth: 440, width: '100%', padding: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div className="logo-symbol" style={{ width: 34, height: 34, fontSize: '1.1rem' }}>U</div>
          <span style={{ fontWeight: 800, fontSize: '1.25rem', color: '#0f172a' }}>UdaPlanner</span>
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>Daftar Akun Baru</h1>
        <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: 20 }}>
          Mulai merencanakan konten sosial media Anda secara gratis.
        </p>

        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700 }}>Nama Lengkap *</label>
            <input
              type="text"
              required
              placeholder="Rizki Pratama"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, marginTop: 4, outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700 }}>Email *</label>
            <input
              type="email"
              required
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, marginTop: 4, outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700 }}>Password *</label>
            <input
              type="password"
              required
              placeholder="Minimal 6 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, marginTop: 4, outline: 'none' }}
            />
          </div>

          <button type="submit" className="btn-uda btn-uda-primary" style={{ marginTop: 8 }}>
            Daftar & Mulai Gratis
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: '0.82rem', color: '#64748b' }}>
          Sudah punya akun?{' '}
          <Link href="/masuk" style={{ color: '#16a34a', fontWeight: 700, textDecoration: 'none' }}>
            Masuk di sini
          </Link>
        </div>
      </div>
    </div>
  );
}
