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
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
  Move,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { AdminService } from '@/services/admin.service';
import { resolvePaymentDuration } from '@/services/plan.service';
import { GuidedTour, TourStep } from '@/components/guided-tour';

const adminTourSteps: TourStep[] = [
  {
    targetId: 'tour-admin-header',
    title: 'Pusat Kontrol Administrator',
    description: 'Kelola ekosistem Uda-Planner: verifikasi pembayaran masuk pengguna, konfigurasi paket langganan, dan pantau pertumbuhan pengguna.',
    placement: 'bottom',
  },
  {
    targetId: 'tour-admin-stats',
    title: 'Kartu Metrik & Shortcut Cepat',
    description: 'Statistik real-time pengguna gratis/berbayar, total omset masuk bulan ini, serta shortcut verifikasi manual email dan bukti bayar.',
    placement: 'bottom',
  },
  {
    targetId: 'tour-admin-payments',
    title: 'Verifikasi Pembayaran Masuk',
    description: 'Contoh antrean pembayaran teratas: klik tombol Periksa Bukti untuk meninjau struk transfer bank dan menyetujui upgrade akun.',
    placement: 'bottom',
  },
];

export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeAdminTab, setActiveAdminTab] = useState<'ringkasan' | 'pembayaran' | 'pengguna' | 'paket' | 'pengaturan'>('ringkasan');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Realtime Admin Statistics State
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [allPayments, setAllPayments] = useState<any[]>([]);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isApproving, setIsApproving] = useState(false);

  const fetchDashboardStats = React.useCallback(async () => {
    try {
      const [paymentsData, usersData] = await Promise.all([
        AdminService.getPayments(),
        AdminService.getAdminUsers(),
      ]);
      if (paymentsData) {
        const cleanPayments = paymentsData.filter(
          (p) => !p.id?.startsWith('pay-') && p.user !== 'Budi Santoso' && p.user !== 'PT Muda Kreatif Indonesia' && p.user !== 'Sarah Rahmawati'
        );
        setAllPayments(cleanPayments);
        setPendingPayments(cleanPayments.filter((p) => p.status === 'pending'));
      }
      if (usersData) {
        setAdminUsers(usersData);
      }
    } catch (err) {
      console.warn('fetchDashboardStats error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('uda_admin_payments');
        if (raw) {
          const list = JSON.parse(raw);
          const cleaned = list.filter(
            (p: any) => !p.id?.startsWith('pay-') && p.user !== 'Budi Santoso' && p.user !== 'PT Muda Kreatif Indonesia' && p.user !== 'Sarah Rahmawati'
          );
          localStorage.setItem('uda_admin_payments', JSON.stringify(cleaned));
        }
      } catch (e) {}
    }

    fetchDashboardStats();

    const handleSync = () => {
      fetchDashboardStats();
    };

    window.addEventListener('uda_payment_submitted', handleSync);
    window.addEventListener('uda_payment_approved', handleSync);
    window.addEventListener('uda_payment_rejected', handleSync);
    window.addEventListener('uda_account_updated', handleSync);
    window.addEventListener('uda_user_registered', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('uda_payment_submitted', handleSync);
      window.removeEventListener('uda_payment_approved', handleSync);
      window.removeEventListener('uda_payment_rejected', handleSync);
      window.removeEventListener('uda_account_updated', handleSync);
      window.removeEventListener('uda_user_registered', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [fetchDashboardStats]);

  // Proof Modal
  const [selectedProof, setSelectedProof] = useState<any | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = React.useRef({ x: 0, y: 0 });
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleApprovePayment = async (id: string) => {
    if (isApproving) return;
    const item = pendingPayments.find((p) => p.id === id);
    if (!item || item.status === 'approved') return;

    setIsApproving(true);
    try {
      const targetPlan = item?.plan || 'pro';
      const dur = resolvePaymentDuration(
        (item as any)?.durationDays,
        (item as any)?.durationLabel,
        item?.amount,
        targetPlan
      );
      await AdminService.approvePayment(id, item?.userId, targetPlan, {
        email: item?.email,
        durationDays: dur.days,
      });
      setPendingPayments((prev) => prev.filter((p) => p.id !== id));
      setSelectedProof(null);
      showToast(`✅ Pembayaran disetujui! Pengguna ${item?.user || ''} otomatis ditingkatkan ke paket ${targetPlan.toUpperCase()} (${dur.label} / ${dur.days} Hari).`);
    } finally {
      setIsApproving(false);
    }
  };

  const handleRejectPayment = async (id: string) => {
    if (!rejectReason) {
      alert('Wajib mengisi alasan penolakan!');
      return;
    }
    await AdminService.rejectPayment(id, rejectReason);
    setPendingPayments(pendingPayments.filter((p) => p.id !== id));
    setSelectedProof(null);
    setShowRejectInput(false);
    showToast(`❌ Pembayaran ditolak. Alasan: ${rejectReason}`);
  };


  // Perhitungan Statistik Real-time & Sinkron
  const totalUsersCount = adminUsers.length || 0;
  const proUsersCount = adminUsers.filter((u) => u.plan === 'pro' && !u.isSuspended).length;
  const teamUsersCount = adminUsers.filter((u) => u.plan === 'team' && !u.isSuspended).length;
  const freeUsersCount = adminUsers.filter((u) => u.plan === 'free').length;
  const totalApprovedRevenue = allPayments
    .filter((p) => p.status === 'approved')
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const formattedRevenue = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(totalApprovedRevenue || 0);

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
      <div id="tour-admin-header">
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Ringkasan Operasional Admin</h1>
        <p style={{ color: '#64748b', fontSize: '0.88rem' }}>
          Pantau statistik pengguna secara realtime & sinkron, verifikasi bukti transfer, dan konfigurasi paket UdaPlanner.
        </p>
      </div>

      <div id="tour-admin-stats" className="admin-dashboard-stats-grid">
        <div
          className="uda-card admin-metrics-card"
          onClick={() => router.push('/admin/pengguna')}
          style={{ padding: 18, cursor: 'pointer', transition: 'all 0.15s ease' }}
          title="Klik untuk membuka Manajemen Pengguna"
        >
          <div style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 700 }}>TOTAL PENGGUNA TERDAFTAR</div>
          <div className="admin-metrics-number" style={{ fontSize: '1.7rem', fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
            {isLoading ? '...' : totalUsersCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600, marginTop: 4 }}>
            {isLoading ? 'Memuat data...' : `${freeUsersCount} akun gratis (free)`}
          </div>
        </div>

        <div
          className="uda-card admin-metrics-card"
          onClick={() => router.push('/admin/pengguna')}
          style={{ padding: 18, cursor: 'pointer', transition: 'all 0.15s ease' }}
          title="Klik untuk menyaring Pengguna Pro"
        >
          <div style={{ color: '#3b82f6', fontSize: '0.78rem', fontWeight: 700 }}>PENGGUNA PRO AKTIF</div>
          <div className="admin-metrics-number" style={{ fontSize: '1.7rem', fontWeight: 800, color: '#1d4ed8', marginTop: 4 }}>
            {isLoading ? '...' : proUsersCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4 }}>Rp 49.000 / 30 hari</div>
        </div>

        <div
          className="uda-card admin-metrics-card"
          onClick={() => router.push('/admin/pengguna')}
          style={{ padding: 18, cursor: 'pointer', transition: 'all 0.15s ease' }}
          title="Klik untuk menyaring Pengguna Tim"
        >
          <div style={{ color: '#8b5cf6', fontSize: '0.78rem', fontWeight: 700 }}>PENGGUNA TIM AKTIF</div>
          <div className="admin-metrics-number" style={{ fontSize: '1.7rem', fontWeight: 800, color: '#6d28d9', marginTop: 4 }}>
            {isLoading ? '...' : teamUsersCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4 }}>Rp 149.000 / 30 hari</div>
        </div>

        <div
          className="uda-card admin-metrics-card"
          onClick={() => router.push('/admin/pembayaran')}
          style={{ padding: 18, border: '1px solid #fde68a', background: '#fffbeb', cursor: 'pointer', transition: 'transform 0.15s' }}
        >
          <div style={{ color: '#b45309', fontSize: '0.78rem', fontWeight: 700 }}>MENUNGGU VERIFIKASI</div>
          <div className="admin-metrics-number" style={{ fontSize: '1.7rem', fontWeight: 800, color: '#d97706', marginTop: 4 }}>
            {isLoading ? '...' : pendingPayments.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: 600, marginTop: 4 }}>Klik untuk cek transfer →</div>
        </div>

        <div
          className="uda-card admin-metrics-card"
          onClick={() => router.push('/admin/verifikasi-email')}
          style={{ padding: 18, border: '1px solid #fed7aa', background: '#fff7ed', cursor: 'pointer', transition: 'transform 0.15s' }}
        >
          <div style={{ color: '#c2410c', fontSize: '0.78rem', fontWeight: 700 }}>EMAIL BELUM DIVERIFIKASI</div>
          <div className="admin-metrics-number" style={{ fontSize: '1.7rem', fontWeight: 800, color: '#ea580c', marginTop: 4 }}>
            {isLoading ? '...' : Math.max(0, adminUsers.filter((u) => u.isSuspended).length)}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#c2410c', fontWeight: 600, marginTop: 4 }}>Verifikasi akun manual →</div>
        </div>

        <div
          className="uda-card admin-metrics-card"
          onClick={() => router.push('/admin/pembayaran')}
          style={{ padding: 18, background: '#f0fdf4', border: '1px solid #bbf7d0', cursor: 'pointer' }}
          title="Total Pembayaran Berhasil Disetujui"
        >
          <div style={{ color: '#15803d', fontSize: '0.78rem', fontWeight: 700 }}>TOTAL PEMASUKAN DIVERIFIKASI</div>
          <div className="admin-metrics-number" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#166534', marginTop: 4 }}>
            {isLoading ? '...' : formattedRevenue}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600, marginTop: 4 }}>
            {isLoading ? 'Memuat data omset...' : `Dari ${allPayments.filter((p) => p.status === 'approved').length} transaksi berhasil`}
          </div>
        </div>
      </div>


      {/* Tabel Verifikasi Pembayaran Sesuai PRD Bab 8 */}
      <div className="uda-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
            Verifikasi Pembayaran Masuk {isLoading ? '' : `(${pendingPayments.length} Menunggu)`}
          </h3>
          <button
            className="btn-uda btn-uda-secondary btn-uda-sm"
            onClick={() => router.push('/admin/pembayaran')}
          >
            Buka Halaman Lengkap →
          </button>
        </div>

        {isLoading ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: '#64748b', fontSize: '0.88rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <Loader2 size={18} className="animate-spin" />
            <span>Memuat data verifikasi pembayaran...</span>
          </div>
        ) : pendingPayments.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: '0.88rem', fontStyle: 'italic' }}>
            Semua pembayaran transfer telah selesai diverifikasi.
          </p>
        ) : (
          <>
            {/* Tampilan Desktop Table */}
            <div className="admin-table-desktop" style={{ overflowX: 'auto' }}>
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
                  {pendingPayments.map((p, pIdx) => (
                    <tr key={p.id} id={pIdx === 0 ? 'tour-admin-payments' : undefined} style={{ borderBottom: '1px solid #f1f5f9' }}>
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
                          onClick={() => {
                            setSelectedProof(p);
                            setZoomLevel(1);
                          }}
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

            {/* Tampilan Mobile & Tablet Card List */}
            <div className="admin-cards-mobile">
              {pendingPayments.map((p) => (
                <div key={p.id} className="admin-mobile-card-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>{p.date}</span>
                    <span
                      style={{
                        fontWeight: 800,
                        fontSize: '0.74rem',
                        textTransform: 'uppercase',
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: p.plan === 'pro' ? '#f0fdf4' : '#f5f3ff',
                        color: p.plan === 'pro' ? '#16a34a' : '#7c3aed',
                        border: '1px solid currentColor',
                      }}
                    >
                      Paket {p.plan}
                    </span>
                  </div>

                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.94rem', color: '#0f172a' }}>{p.user}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>Bank: {p.bank}</div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTop: '1px dashed #e2e8f0' }}>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Nominal Transfer:</span>
                    <span style={{ fontWeight: 900, fontSize: '1rem', color: '#16a34a' }}>
                      Rp {p.amount.toLocaleString('id-ID')}
                    </span>
                  </div>

                  <button
                    className="btn-uda btn-uda-primary btn-uda-sm"
                    style={{ width: '100%', marginTop: 4, justifyContent: 'center', padding: '9px 12px' }}
                    onClick={() => {
                      setSelectedProof(p);
                      setZoomLevel(1);
                    }}
                  >
                    <Eye size={14} />
                    <span>Periksa Bukti Transfer</span>
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* MODAL PERIKSA BUKTI TRANSFER */}
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
              Periksa Bukti Pembayaran
            </h3>
            <div style={{ fontSize: '0.86rem', color: '#64748b', marginBottom: 14 }}>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>{selectedProof.user}</span> • Nominal:{' '}
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
                  setZoomLevel(1);
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
                    onClick={() => {
                      handleApprovePayment(selectedProof.id);
                      setZoomLevel(1);
                    }}
                  >
                    Setujui (Upgrade)
                  </button>
                </>
              ) : (
                <button
                  className="btn-uda btn-uda-danger"
                  style={{ flex: 1 }}
                  onClick={() => {
                    handleRejectPayment(selectedProof.id);
                    setZoomLevel(1);
                  }}
                >
                  Konfirmasi Tolak
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <GuidedTour steps={adminTourSteps} tourKey="uda_tour_admin" />
    </div>
  );
}
