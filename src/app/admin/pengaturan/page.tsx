'use client';

import React, { useState } from 'react';
import { Settings, Save, CheckCircle2, MessageSquare, CreditCard } from 'lucide-react';

export default function AdminPengaturanPage() {
  const [bankName, setBankName] = useState('BCA (Bank Central Asia)');
  const [accountNumber, setAccountNumber] = useState('8839210928');
  const [accountName, setAccountName] = useState('PT UdaCoding Digital Indonesia');
  const [adminWhatsapp, setAdminWhatsapp] = useState('6281234567890');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Pengaturan rekening & kontak WhatsApp admin berhasil disimpan!');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 640 }}>
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: '#0f172a',
            color: '#f8fafc',
            padding: '12px 18px',
            borderRadius: 10,
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            zIndex: 9999,
            fontSize: '0.88rem',
            fontWeight: 600,
          }}
        >
          {toastMessage}
        </div>
      )}

      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Pengaturan Aplikasi & Rekening</h1>
        <p style={{ color: '#64748b', fontSize: '0.88rem' }}>
          Data rekening tujuan transfer manual dan kontak WhatsApp resmi admin yang akan ditampilkan ke pengguna saat upgrade paket.
        </p>
      </div>

      <div className="uda-card" style={{ padding: 28 }}>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
            <CreditCard size={18} style={{ color: '#16a34a' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Rekening Bank Penerima Pembayaran</h3>
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
              Nama Bank Penerima *
            </label>
            <input
              type="text"
              required
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="Contoh: BCA / Mandiri / BNI"
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: 8, outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
              Nomor Rekening Penerima *
            </label>
            <input
              type="text"
              required
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="Contoh: 8839210928"
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: 8, outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
              Atas Nama Rekening *
            </label>
            <input
              type="text"
              required
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="Contoh: PT UdaCoding Digital Indonesia"
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: 8, outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 14, paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
            <MessageSquare size={18} style={{ color: '#16a34a' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Kontak Bantuan WhatsApp</h3>
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
              Nomor WhatsApp Admin (Format 62...) *
            </label>
            <input
              type="text"
              required
              value={adminWhatsapp}
              onChange={(e) => setAdminWhatsapp(e.target.value)}
              placeholder="Contoh: 6281234567890"
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: 8, outline: 'none' }}
            />
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
              Nomor ini digunakan untuk tombol "Hubungi Admin" jika akun pengguna terkunci atau butuh konfirmasi manual.
            </div>
          </div>

          <button
            type="submit"
            className="btn-uda btn-uda-primary"
            style={{ marginTop: 8, width: 'fit-content', display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <Save size={16} />
            <span>Simpan Pengaturan</span>
          </button>
        </form>
      </div>
    </div>
  );
}
