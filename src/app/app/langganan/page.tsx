'use client';

import React, { useState } from 'react';
import { CheckCircle2, Copy, UploadCloud, CreditCard, ShieldCheck, Clock } from 'lucide-react';
import { DUMMY_PLANS } from '@/lib/dummy-data';

export default function LanggananPage() {
  const [selectedPlanCode, setSelectedPlanCode] = useState<'pro' | 'team'>('pro');
  const [isPendingPayment, setIsPendingPayment] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [senderName, setSenderName] = useState('');
  const [senderBank, setSenderBank] = useState('BCA');

  const paymentCode = 137; // 3 digit unique code
  const selectedPlan = DUMMY_PLANS.find((p) => p.code === selectedPlanCode) || DUMMY_PLANS[1];
  const exactAmount = selectedPlan.price + paymentCode;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`📋 ${label} berhasil disalin!`);
  };

  const handleSubmitProof = (e: React.FormEvent) => {
    e.preventDefault();
    setIsPendingPayment(true);
    showToast('✅ Bukti pembayaran berhasil diunggah! Sedang menunggu verifikasi admin.');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 960 }}>
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

      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Paket Langganan & Billing</h1>
        <p style={{ color: '#64748b', fontSize: '0.88rem' }}>
          Tingkatkan kuota brand, buka pratinjau Grid Instagram, dan aktifkan alur review tim.
        </p>
      </div>

      {/* Status Paket Aktif */}
      <div className="uda-card" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldCheck size={24} style={{ color: '#16a34a' }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#15803d' }}>Paket Pro Aktif</div>
              <div style={{ fontSize: '0.82rem', color: '#166534' }}>
                Masa aktif berlaku sampai <strong>12 November 2026</strong> (Sisa 30 hari)
              </div>
            </div>
          </div>
          <span className="status-pill" style={{ background: '#dcfce7', color: '#15803d' }}>
            Langganan Aktif
          </span>
        </div>
      </div>

      {/* 3 Kartu Paket Sesuai PRD */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        {DUMMY_PLANS.map((plan) => {
          const isSelected = selectedPlanCode === plan.code;
          return (
            <div
              key={plan.code}
              className="uda-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                borderColor: plan.code === 'pro' ? '#16a34a' : '#e2e8f0',
                position: 'relative',
              }}
            >
              {plan.code === 'pro' && (
                <div
                  style={{
                    position: 'absolute',
                    top: -12,
                    right: 20,
                    background: '#16a34a',
                    color: 'white',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '3px 10px',
                    borderRadius: 999,
                  }}
                >
                  Paling Populer
                </div>
              )}

              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{plan.name}</h3>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: '8px 0 16px' }}>
                  Rp {plan.price.toLocaleString('id-ID')}
                  <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#64748b' }}>
                    {plan.price === 0 ? '' : ' / 30 hari'}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.82rem', color: '#334155' }}>
                  {plan.features.map((feat, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CheckCircle2 size={15} style={{ color: '#16a34a' }} />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 24 }}>
                {plan.code === 'free' ? (
                  <button className="btn-uda btn-uda-secondary" style={{ width: '100%' }} disabled>
                    Paket Dasar
                  </button>
                ) : (
                  <button
                    className={`btn-uda ${isSelected ? 'btn-uda-primary' : 'btn-uda-secondary'}`}
                    style={{ width: '100%' }}
                    onClick={() => setSelectedPlanCode(plan.code as any)}
                  >
                    {isSelected ? '✓ Paket Terpilih' : `Pilih Paket ${plan.name}`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Langkah Pembayaran Transfer Manual */}
      <div className="uda-card">
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: 14 }}>
          Instruksi Transfer Pembayaran (Paket {selectedPlan.name})
        </h3>

        {isPendingPayment ? (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: 20, textAlign: 'center' }}>
            <Clock size={32} style={{ color: '#d97706', margin: '0 auto 8px' }} />
            <h4 style={{ fontWeight: 800, fontSize: '1.05rem', color: '#b45309' }}>
              Pembayaranmu sedang diperiksa admin
            </h4>
            <p style={{ color: '#92400e', fontSize: '0.85rem', marginTop: 4 }}>
              Admin akan segera memverifikasi mutasi rekening Anda. Akun akan langsung ditingkatkan setelah disetujui.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            {/* Langkah 1 */}
            <div style={{ background: '#f8fafc', padding: 18, borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#16a34a', marginBottom: 8 }}>
                Langkah 1: Transfer Nominal Tepat
              </div>
              <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 12 }}>
                Transfer tepat dengan 3 digit kode unik agar sistem mendeteksi pembayaran Anda secara instan:
              </p>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 14 }}>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  Rp {selectedPlan.price.toLocaleString('id-ID').slice(0, -3)}
                  <strong style={{ color: '#16a34a' }}>{paymentCode}</strong>
                </span>
                <button
                  className="btn-uda btn-uda-secondary btn-uda-sm"
                  onClick={() => handleCopy(exactAmount.toString(), 'Nominal Transfer')}
                >
                  <Copy size={13} />
                  <span>Salin</span>
                </button>
              </div>

              <div style={{ fontSize: '0.82rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div>Bank Tujuan: <strong>Bank Central Asia (BCA)</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>No. Rekening: <strong>8720192837</strong></span>
                  <button
                    className="btn-uda btn-uda-secondary btn-uda-sm"
                    onClick={() => handleCopy('8720192837', 'Nomor Rekening BCA')}
                  >
                    Salin
                  </button>
                </div>
                <div>Atas Nama: <strong>PT UdaCoding Digital Indonesia</strong></div>
              </div>
            </div>

            {/* Langkah 2 */}
            <form onSubmit={handleSubmitProof} style={{ background: '#f8fafc', padding: 18, borderRadius: 10, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#16a34a' }}>
                Langkah 2: Konfirmasi Bukti Transfer
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700 }}>Nama Pengirim (sesuai rekening)</label>
                <input
                  type="text"
                  required
                  placeholder="Rizki Pratama"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, marginTop: 4 }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700 }}>Bank Pengirim</label>
                <input
                  type="text"
                  required
                  placeholder="BCA / Mandiri / BSI"
                  value={senderBank}
                  onChange={(e) => setSenderBank(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, marginTop: 4 }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700 }}>Unggah Foto Bukti Transfer</label>
                <input
                  type="file"
                  required
                  accept="image/*"
                  style={{ width: '100%', padding: '6px', fontSize: '0.82rem', marginTop: 4 }}
                />
              </div>

              <button type="submit" className="btn-uda btn-uda-primary" style={{ marginTop: 8 }}>
                Kirim Bukti Pembayaran
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
