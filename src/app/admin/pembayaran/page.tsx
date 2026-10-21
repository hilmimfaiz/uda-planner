'use client';

import React, { useState } from 'react';
import {
  CreditCard,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ExternalLink,
  X,
  Move,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { AdminService, AdminPaymentItem } from '@/services/admin.service';
import { useModal } from '@/contexts/modal-context';

type PaymentItem = AdminPaymentItem;

export default function AdminPembayaranPage() {
  const { showSuccess, showError } = useModal();
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedProof, setSelectedProof] = useState<PaymentItem | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = React.useRef({ x: 0, y: 0 });
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - panOffset.x,
      y: e.clientY - panOffset.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setPanOffset({
      x: Math.round(e.clientX - dragStartRef.current.x),
      y: Math.round(e.clientY - dragStartRef.current.y),
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch (err) {}
    setIsDragging(false);
  };

  const nudge = (dx: number, dy: number) => {
    setPanOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
  };

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
                          setZoomLevel(1);
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
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 20,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedProof(null);
              setZoomLevel(1);
              setShowRejectInput(false);
            }
          }}
        >
          <div
            className="uda-card"
            style={{
              maxWidth: 620,
              width: '100%',
              padding: '24px 26px',
              maxHeight: '92vh',
              overflowY: 'auto',
              position: 'relative',
              borderRadius: 16,
              border: '2.5px solid #0f172a',
              boxShadow: '8px 8px 0px #0f172a',
              backgroundColor: '#ffffff',
            }}
          >
            {/* Tombol Tutup X di Kanan Atas */}
            <button
              type="button"
              onClick={() => {
                setSelectedProof(null);
                setZoomLevel(1);
                setShowRejectInput(false);
              }}
              style={{
                position: 'absolute',
                top: 18,
                right: 18,
                background: 'none',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                padding: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 6,
              }}
              title="Tutup Modal"
            >
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', marginBottom: 4 }}>
              Periksa Bukti Transfer
            </h3>
            <div style={{ fontSize: '0.86rem', color: '#64748b', marginBottom: 14 }}>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>{selectedProof.user}</span> ({selectedProof.email}) • Transfer:{' '}
              <strong style={{ color: '#16a34a', fontSize: '0.92rem' }}>Rp {selectedProof.amount.toLocaleString('id-ID')}</strong>
            </div>

            {/* Toolbar Kontrol Zoom */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#f8fafc',
                border: '2px solid #0f172a',
                borderRadius: '10px 10px 0 0',
                padding: '8px 12px',
                borderBottom: 'none',
                gap: 8,
              }}
            >
              {/* Tombol Zoom Out */}
              <button
                type="button"
                title="Perkecil Gambar (Zoom Out)"
                onClick={() => setZoomLevel((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
                disabled={zoomLevel <= 0.5}
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #0f172a',
                  boxShadow: '1.5px 1.5px 0px #0f172a',
                  borderRadius: 6,
                  padding: '4px 10px',
                  cursor: zoomLevel <= 0.5 ? 'not-allowed' : 'pointer',
                  opacity: zoomLevel <= 0.5 ? 0.45 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: '#0f172a',
                }}
              >
                <ZoomOut size={14} />
                <span>Zoom Out</span>
              </button>

              {/* Indikator Persentase Zoom */}
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 900,
                  color: '#0f172a',
                  padding: '3px 9px',
                  background: '#ffffff',
                  borderRadius: 6,
                  border: '1.5px solid #0f172a',
                  minWidth: 54,
                  textAlign: 'center',
                }}
              >
                {Math.round(zoomLevel * 100)}%
              </span>

              {/* Tombol Zoom In */}
              <button
                type="button"
                title="Perbesar Gambar (Zoom In)"
                onClick={() => setZoomLevel((z) => Math.min(3, +(z + 0.25).toFixed(2)))}
                disabled={zoomLevel >= 3}
                style={{
                  background: '#16a34a',
                  border: '1.5px solid #0f172a',
                  boxShadow: '1.5px 1.5px 0px #0f172a',
                  borderRadius: 6,
                  padding: '4px 10px',
                  cursor: zoomLevel >= 3 ? 'not-allowed' : 'pointer',
                  opacity: zoomLevel >= 3 ? 0.45 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: '#ffffff',
                }}
              >
                <ZoomIn size={14} />
                <span>Zoom In</span>
              </button>

              {/* Tombol Reset Zoom */}
              {(zoomLevel !== 1 || panOffset.x !== 0 || panOffset.y !== 0) && (
                <button
                  type="button"
                  title="Kembalikan ke Ukuran dan Posisi Semula"
                  onClick={() => {
                    setZoomLevel(1);
                    setPanOffset({ x: 0, y: 0 });
                  }}
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #0f172a',
                    borderRadius: 6,
                    padding: '4px 8px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    color: '#475569',
                  }}
                >
                  <RotateCcw size={12} />
                  <span>Reset</span>
                </button>
              )}
            </div>

            {/* Area Tampilan Gambar Interaktif (Bisa Digeser Bebas & Di-Zoom) */}
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{
                border: '2px solid #0f172a',
                borderRadius: '0 0 10px 10px',
                overflow: 'hidden',
                marginBottom: 16,
                height: 400,
                backgroundColor: '#020617',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                cursor: isDragging ? 'grabbing' : 'grab',
                userSelect: 'none',
                touchAction: 'none',
              }}
            >
              {/* Layer Gambar yang Digeser (Pan) dan Diperbesar (Zoom) */}
              <div
                style={{
                  transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0)`,
                  transition: isDragging ? 'none' : 'transform 0.12s ease-out',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                }}
              >
                <img
                  src={selectedProof.proof}
                  alt="Bukti Transfer"
                  style={{
                    transform: `scale(${zoomLevel})`,
                    transformOrigin: 'center center',
                    transition: 'transform 0.15s ease-out',
                    maxWidth: '90%',
                    maxHeight: 340,
                    objectFit: 'contain',
                    display: 'block',
                    borderRadius: 4,
                    userSelect: 'none',
                    pointerEvents: 'none',
                  }}
                  draggable={false}
                />
              </div>

              {/* Pad Tombol Geser Arah (D-Pad Navigasi Cepat) */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 12,
                  right: 12,
                  backgroundColor: 'rgba(15, 23, 42, 0.88)',
                  border: '1.5px solid #334155',
                  borderRadius: 10,
                  padding: 6,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(6px)',
                  zIndex: 10,
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', marginBottom: 2 }}>
                  Geser Gambar
                </div>
                {/* Tombol Atas */}
                <button
                  type="button"
                  title="Geser ke Atas"
                  onClick={(e) => {
                    e.stopPropagation();
                    nudge(0, 60);
                  }}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: '#1e293b',
                    border: '1px solid #475569',
                    color: '#f8fafc',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ArrowUp size={15} />
                </button>
                {/* Baris Kiri, Tengah, Kanan */}
                <div style={{ display: 'flex', gap: 3 }}>
                  <button
                    type="button"
                    title="Geser ke Kiri"
                    onClick={(e) => {
                      e.stopPropagation();
                      nudge(60, 0);
                    }}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: '#1e293b',
                      border: '1px solid #475569',
                      color: '#f8fafc',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ArrowLeft size={15} />
                  </button>
                  <button
                    type="button"
                    title="Kembalikan ke Posisi Tengah"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPanOffset({ x: 0, y: 0 });
                    }}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: '#16a34a',
                      border: '1px solid #0f172a',
                      color: '#ffffff',
                      cursor: 'pointer',
                      fontSize: '0.68rem',
                      fontWeight: 900,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    ●
                  </button>
                  <button
                    type="button"
                    title="Geser ke Kanan"
                    onClick={(e) => {
                      e.stopPropagation();
                      nudge(-60, 0);
                    }}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: '#1e293b',
                      border: '1px solid #475569',
                      color: '#f8fafc',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ArrowRight size={15} />
                  </button>
                </div>
                {/* Tombol Bawah */}
                <button
                  type="button"
                  title="Geser ke Bawah"
                  onClick={(e) => {
                    e.stopPropagation();
                    nudge(0, -60);
                  }}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: '#1e293b',
                    border: '1px solid #475569',
                    color: '#f8fafc',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ArrowDown size={15} />
                </button>
              </div>

              {/* Petunjuk Interaktif di Kiri Bawah */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 12,
                  left: 12,
                  backgroundColor: 'rgba(15, 23, 42, 0.8)',
                  color: '#e2e8f0',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: 6,
                  backdropFilter: 'blur(4px)',
                  border: '1px solid #334155',
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Move size={13} style={{ color: '#22c55e' }} />
                <span>Klik & Tahan Mouse untuk Menggeser</span>
              </div>
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
                  setZoomLevel(1);
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
                        onClick={() => {
                          handleApprove(selectedProof.id);
                          setZoomLevel(1);
                        }}
                      >
                        Setujui Paket
                      </button>
                    </>
                  ) : (
                    <button
                      className="btn-uda btn-uda-danger"
                      style={{ flex: 1 }}
                      onClick={() => {
                        handleReject(selectedProof.id);
                        setZoomLevel(1);
                      }}
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
