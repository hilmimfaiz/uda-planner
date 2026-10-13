'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function LupaPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="uda-card" style={{ maxWidth: 440, width: '100%', padding: 32 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>Atur Ulang Password</h1>
        <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: 20 }}>
          Masukkan alamat email Anda untuk menerima tautan pemulihan kata sandi.
        </p>

        {sent ? (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 16, textAlign: 'center' }}>
            <CheckCircle2 size={28} style={{ color: '#16a34a', margin: '0 auto 8px' }} />
            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#15803d' }}>Tautan Berhasil Dikirim!</div>
            <p style={{ fontSize: '0.82rem', color: '#166534', marginTop: 4 }}>
              Silakan periksa inbox email <strong>{email}</strong> untuk mengatur ulang password baru Anda.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700 }}>Alamat Email</label>
              <input
                type="email"
                required
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, marginTop: 4, outline: 'none' }}
              />
            </div>

            <button type="submit" className="btn-uda btn-uda-primary">
              Kirim Link Pemulihan
            </button>
          </form>
        )}

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <Link href="/masuk" style={{ color: '#64748b', fontSize: '0.82rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeft size={14} />
            <span>Kembali ke halaman masuk</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
