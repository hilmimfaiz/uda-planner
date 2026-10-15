'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  CreditCard,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  Shield,
  Eye,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeAdminTab, setActiveAdminTab] = useState<'ringkasan' | 'pembayaran' | 'pengguna' | 'paket' | 'pengaturan'>('ringkasan');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Demo Admin Payments State
  const [pendingPayments, setPendingPayments] = useState([
    {
      id: 'pay-1',
      user: 'Budi Santoso (budi@gmail.com)',
      plan: 'pro',
      amount: 49137,
      bank: 'BCA (A/N Budi Santoso)',
      proof: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
      status: 'pending',
      date: '13 Okt 2026 09.15',
    },
    {
      id: 'pay-2',
      user: 'Agensi Kreatif Muda (admin@muda.id)',
      plan: 'team',
      amount: 149452,
      bank: 'Mandiri (A/N PT Muda Kreatif)',
      proof: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
      status: 'pending',
      date: '13 Okt 2026 08.40',
    },
  ]);

  // Proof Modal
  const [selectedProof, setSelectedProof] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleApprovePayment = (id: string) => {
    setPendingPayments(pendingPayments.filter((p) => p.id !== id));
    setSelectedProof(null);
    showToast('✅ Pembayaran disetujui! Paket pengguna otomatis ditingkatkan.');
  };

  const handleRejectPayment = (id: string) => {
    if (!rejectReason) {
      alert('Wajib mengisi alasan penolakan!');
      return;
    }
    setPendingPayments(pendingPayments.filter((p) => p.id !== id));
    setSelectedProof(null);
    setShowRejectInput(false);
    showToast(`❌ Pembayaran ditolak. Alasan: ${rejectReason}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
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

      {/* Admin KPI Overview Cards */}
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Ringkasan Operasional Admin</h1>
        <p style={{ color: '#64748b', fontSize: '0.88rem' }}>
          Pantau statistik pengguna, verifikasi bukti transfer, dan konfigurasi paket UdaPlanner.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <div className="uda-card" style={{ padding: 18 }}>
          <div style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 700 }}>TOTAL PENGGUNA</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#0f172a', marginTop: 4 }}>142</div>
          <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600, marginTop: 4 }}>+12 minggu ini</div>
        </div>

        <div className="uda-card" style={{ padding: 18 }}>
          <div style={{ color: '#3b82f6', fontSize: '0.78rem', fontWeight: 700 }}>PENGGUNA PRO AKTIF</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#1d4ed8', marginTop: 4 }}>48</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4 }}>Rp 49.000 / 30 hari</div>
        </div>

        <div className="uda-card" style={{ padding: 18 }}>
          <div style={{ color: '#8b5cf6', fontSize: '0.78rem', fontWeight: 700 }}>PENGGUNA TIM AKTIF</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#6d28d9', marginTop: 4 }}>19</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4 }}>Rp 149.000 / 30 hari</div>
        </div>

        <div
          className="uda-card"
          onClick={() => router.push('/admin/pembayaran')}
          style={{ padding: 18, border: '1px solid #fde68a', background: '#fffbeb', cursor: 'pointer', transition: 'transform 0.15s' }}
        >
          <div style={{ color: '#b45309', fontSize: '0.78rem', fontWeight: 700 }}>MENUNGGU VERIFIKASI</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#d97706', marginTop: 4 }}>
            {pendingPayments.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: 600, marginTop: 4 }}>Klik untuk cek →</div>
        </div>

        <div className="uda-card" style={{ padding: 18, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <div style={{ color: '#15803d', fontSize: '0.78rem', fontWeight: 700 }}>PEMASUKAN BULAN INI</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#166534', marginTop: 4 }}>Rp 5.183.000</div>
          <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600, marginTop: 4 }}>Target: Rp 10.000.000</div>
        </div>
      </div>

      {/* Tabel Verifikasi Pembayaran Sesuai PRD Bab 8 */}
      <div className="uda-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
            Verifikasi Pembayaran Masuk ({pendingPayments.length} Menunggu)
          </h3>
          <button
            className="btn-uda btn-uda-secondary btn-uda-sm"
            onClick={() => router.push('/admin/pembayaran')}
          >
            Buka Halaman Pembayaran Lengkap →
          </button>
        </div>

        {pendingPayments.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: '0.88rem', fontStyle: 'italic' }}>
            Semua pembayaran transfer telah selesai diverifikasi.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', background: '#f8fafc' }}>
                  <th style={{ padding: '12px 16px' }}>Tanggal</th>
                  <th style={{ padding: '12px 16px' }}>Pengguna</th>
                  <th style={{ padding: '12px 16px' }}>Paket</th>
                  <th style={{ padding: '12px 16px' }}>Nominal Transfer</th>
                  <th style={{ padding: '12px 16px' }}>Rekening Pengirim</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pendingPayments.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 16px', color: '#64748b' }}>{p.date}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0f172a' }}>{p.user}</td>
                    <td style={{ padding: '14px 16px', textTransform: 'uppercase', fontWeight: 800, color: p.plan === 'pro' ? '#16a34a' : '#8b5cf6' }}>
                      {p.plan}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 800 }}>
                      Rp {p.amount.toLocaleString('id-ID')}
                    </td>
                    <td style={{ padding: '14px 16px' }}>{p.bank}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <button
                        className="btn-uda btn-uda-primary btn-uda-sm"
                        onClick={() => setSelectedProof(p)}
                      >
                        <Eye size={13} />
                        <span>Periksa Bukti</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL PERIKSA BUKTI TRANSFER */}
      {selectedProof && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 20,
          }}
        >
          <div className="uda-card" style={{ maxWidth: 500, width: '100%', padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 8 }}>Periksa Bukti Pembayaran</h3>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 16 }}>
              {selectedProof.user} • Nominal: <strong>Rp {selectedProof.amount.toLocaleString('id-ID')}</strong>
            </div>

            {/* Gambar Bukti Transfer (Bisa Diperbesar) */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
              <img
                src={selectedProof.proof}
                alt="Bukti Transfer"
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            </div>

            {showRejectInput ? (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#dc2626' }}>Alasan Penolakan (Wajib):</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Mutasi belum masuk / nominal tidak sesuai"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #fecaca', borderRadius: 8, marginTop: 4 }}
                />
              </div>
            ) : null}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn-uda btn-uda-secondary"
                style={{ flex: 1 }}
                onClick={() => {
                  setSelectedProof(null);
                  setShowRejectInput(false);
                }}
              >
                Batal
              </button>

              {!showRejectInput ? (
                <>
                  <button
                    className="btn-uda btn-uda-danger"
                    style={{ flex: 1 }}
                    onClick={() => setShowRejectInput(true)}
                  >
                    Tolak
                  </button>
                  <button
                    className="btn-uda btn-uda-primary"
                    style={{ flex: 1 }}
                    onClick={() => handleApprovePayment(selectedProof.id)}
                  >
                    Setujui (Upgrade)
                  </button>
                </>
              ) : (
                <button
                  className="btn-uda btn-uda-danger"
                  style={{ flex: 1 }}
                  onClick={() => handleRejectPayment(selectedProof.id)}
                >
                  Konfirmasi Tolak
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
