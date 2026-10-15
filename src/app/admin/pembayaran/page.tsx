'use client';

import React, { useState } from 'react';
import { CreditCard, Eye, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { AdminService, AdminPaymentItem } from '@/services/admin.service';
import { useModal } from '@/contexts/modal-context';

type PaymentItem = AdminPaymentItem;

export default function AdminPembayaranPage() {
  const { showSuccess, showError } = useModal();
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedProof, setSelectedProof] = useState<PaymentItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  React.useEffect(() => {
    AdminService.getPayments().then((data) => {
      if (data && data.length > 0) setPayments(data);
    });
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleApprove = async (id: string) => {
    const target = payments.find((p) => p.id === id);
    await AdminService.approvePayment(id, target?.userId, target?.plan || 'pro');
    setPayments((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'approved' } : p))
    );
    setSelectedProof(null);
    showSuccess(
      'Pembayaran Berhasil Disetujui!',
      `Bukti transfer dari ${target?.user} telah diverifikasi. Akun pengguna otomatis ditingkatkan ke paket ${target?.plan.toUpperCase()}.`
    );
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) {
      showError('Alasan Penolakan Wajib Diisi', 'Silakan tuliskan alasan penolakan sebelum melanjutkan.');
      return;
    }
    const target = payments.find((p) => p.id === id);
    await AdminService.rejectPayment(id, rejectReason.trim());
    setPayments((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, status: 'rejected', reason: rejectReason.trim() } : p
      )
    );
    setSelectedProof(null);
    setShowRejectInput(false);
    setRejectReason('');
    showSuccess(
      'Pembayaran Ditolak',
      `Pembayaran dari ${target?.user} telah ditolak dengan catatan: "${rejectReason.trim()}".`
    );
  };

  const filteredPayments = payments.filter((p) => {
    if (filterTab === 'all') return true;
    return p.status === filterTab;
  });

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

      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Verifikasi Pembayaran</h1>
        <p style={{ color: '#64748b', fontSize: '0.88rem' }}>
          Periksa bukti transfer manual pengguna, cocokkan nominal kode unik dengan mutasi rekening bank, dan lakukan persetujuan paket.
        </p>
      </div>

      {/* Tabs Filter */}
      <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
        {[
          { id: 'pending', label: 'Menunggu Verifikasi', count: payments.filter((p) => p.status === 'pending').length },
          { id: 'approved', label: 'Disetujui', count: payments.filter((p) => p.status === 'approved').length },
          { id: 'rejected', label: 'Ditolak', count: payments.filter((p) => p.status === 'rejected').length },
          { id: 'all', label: 'Semua Riwayat', count: payments.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterTab(tab.id as any)}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: filterTab === tab.id ? '#0f172a' : '#f1f5f9',
              color: filterTab === tab.id ? '#ffffff' : '#475569',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>{tab.label}</span>
            <span
              style={{
                fontSize: '0.72rem',
                padding: '1px 6px',
                borderRadius: 10,
                background: filterTab === tab.id ? '#334155' : '#e2e8f0',
                color: filterTab === tab.id ? '#f8fafc' : '#475569',
              }}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tabel Pembayaran */}
      <div className="uda-card" style={{ padding: 0, overflow: 'hidden' }}>
        {filteredPayments.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: '0.88rem' }}>
            Tidak ada pembayaran pada kategori ini.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                  <th style={{ padding: '14px 18px' }}>Tanggal</th>
                  <th style={{ padding: '14px 18px' }}>Pengguna</th>
                  <th style={{ padding: '14px 18px' }}>Paket</th>
                  <th style={{ padding: '14px 18px' }}>Nominal (Kode Unik)</th>
                  <th style={{ padding: '14px 18px' }}>Rekening Pengirim</th>
                  <th style={{ padding: '14px 18px' }}>Status</th>
                  <th style={{ padding: '14px 18px', textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 18px', color: '#64748b' }}>{p.date}</td>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{p.user}</div>
                      <div style={{ fontSize: '0.76rem', color: '#64748b' }}>{p.email}</div>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span
                        style={{
                          fontWeight: 800,
                          fontSize: '0.75rem',
                          textTransform: 'uppercase',
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: p.plan === 'pro' ? '#f0fdf4' : '#f5f3ff',
                          color: p.plan === 'pro' ? '#16a34a' : '#7c3aed',
                        }}
                      >
                        Paket {p.plan}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px', fontWeight: 800, color: '#0f172a' }}>
                      Rp {p.amount.toLocaleString('id-ID')}
                    </td>
                    <td style={{ padding: '14px 18px', color: '#475569', fontSize: '0.8rem' }}>{p.bank}</td>
                    <td style={{ padding: '14px 18px' }}>
                      {p.status === 'pending' && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fffbeb', color: '#b45309', padding: '3px 8px', borderRadius: 6, fontSize: '0.76rem', fontWeight: 700 }}>
                          <Clock size={12} />
                          Menunggu
                        </span>
                      )}
                      {p.status === 'approved' && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f0fdf4', color: '#16a34a', padding: '3px 8px', borderRadius: 6, fontSize: '0.76rem', fontWeight: 700 }}>
                          <CheckCircle2 size={12} />
                          Disetujui
                        </span>
                      )}
                      {p.status === 'rejected' && (
                        <div>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fef2f2', color: '#dc2626', padding: '3px 8px', borderRadius: 6, fontSize: '0.76rem', fontWeight: 700 }}>
                            <XCircle size={12} />
                            Ditolak
                          </span>
                          {p.reason && (
                            <div style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: 2 }}>{p.reason}</div>
                          )}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <button
                        className="btn-uda btn-uda-secondary btn-uda-sm"
                        onClick={() => {
                          setSelectedProof(p);
                          setShowRejectInput(false);
                          setRejectReason('');
                        }}
                      >
                        <Eye size={13} />
                        <span>Periksa</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Periksa Bukti */}
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
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 6 }}>Periksa Bukti Transfer</h3>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 14 }}>
              {selectedProof.user} ({selectedProof.email}) • Transfer: <strong>Rp {selectedProof.amount.toLocaleString('id-ID')}</strong>
            </div>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
              <img
                src={selectedProof.proof}
                alt="Bukti Transfer"
                style={{ width: '100%', maxHeight: 320, objectFit: 'contain', background: '#0f172a', display: 'block' }}
              />
            </div>

            {showRejectInput && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#dc2626' }}>
                  Alasan Penolakan (Wajib Diisi):
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Contoh: Mutasi bank belum masuk / nominal tidak pas"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #fca5a5', borderRadius: 8, marginTop: 4, outline: 'none' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn-uda btn-uda-secondary"
                style={{ flex: 1 }}
                onClick={() => {
                  setSelectedProof(null);
                  setShowRejectInput(false);
                }}
              >
                Tutup
              </button>

              {selectedProof.status === 'pending' && (
                <>
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
                        onClick={() => handleApprove(selectedProof.id)}
                      >
                        Setujui Paket
                      </button>
                    </>
                  ) : (
                    <button
                      className="btn-uda btn-uda-danger"
                      style={{ flex: 1 }}
                      onClick={() => handleReject(selectedProof.id)}
                    >
                      Konfirmasi Tolak
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
