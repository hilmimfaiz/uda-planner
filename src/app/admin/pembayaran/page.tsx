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
  Loader2,
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Filter,
} from 'lucide-react';
import { AdminService, AdminPaymentItem } from '@/services/admin.service';
import { resolvePaymentDuration } from '@/services/plan.service';
import { useModal } from '@/contexts/modal-context';
import { playSuccessSound } from '@/lib/audio-effects';

type PaymentItem = AdminPaymentItem;

export default function AdminPembayaranPage() {
  const { showSuccess, showError } = useModal();
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approvingPayment, setApprovingPayment] = useState<PaymentItem | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedProof, setSelectedProof] = useState<PaymentItem | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = React.useRef({ x: 0, y: 0 });
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Delete History Modal State
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [deleteDurationDays, setDeleteDurationDays] = useState<number | 'all'>(7);
  const [isDeletingHistory, setIsDeletingHistory] = useState<boolean>(false);

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
    } catch {}
    setIsDragging(false);
  };

  const nudge = (dx: number, dy: number) => {
    setPanOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
  };

  React.useEffect(() => {
    // 1. Tampilkan data cache lokal secara instan tanpa jeda loading
    const cached = AdminService.getCachedPayments();
    if (cached.length > 0) {
      setPayments(cached);
      setIsLoading(false);
    }

    const fetchPayments = () => {
      AdminService.getPayments()
        .then((data) => {
          if (data) {
            const cleanPayments = data.filter((p) => !AdminService.isDummyPayment(p));
            setPayments(cleanPayments);
          }
        })
        .finally(() => {
          setIsLoading(false);
        });
    };

    fetchPayments();

    const handleSync = () => {
      const latestCached = AdminService.getCachedPayments();
      if (latestCached.length > 0) {
        setPayments(latestCached);
      }
      fetchPayments();
    };

    window.addEventListener('uda_payment_submitted', handleSync);
    window.addEventListener('uda_payment_approved', handleSync);
    window.addEventListener('uda_payment_rejected', handleSync);
    window.addEventListener('uda_payment_deleted', handleSync);
    window.addEventListener('storage', handleSync);
    window.addEventListener('focus', handleSync);
    return () => {
      window.removeEventListener('uda_payment_submitted', handleSync);
      window.removeEventListener('uda_payment_approved', handleSync);
      window.removeEventListener('uda_payment_rejected', handleSync);
      window.removeEventListener('uda_payment_deleted', handleSync);
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('focus', handleSync);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleApprove = async (id: string) => {
    if (isProcessing) return;
    const target = payments.find((p) => p.id === id);
    if (!target || target.status === 'approved') return;

    setIsProcessing(true);
    setApprovingId(id);
    setApprovingPayment(target);
    try {
      const rawPlan = (target?.plan || 'pro').toLowerCase();
      const targetPlan: 'pro' | 'team' = rawPlan === 'team' ? 'team' : 'pro';
      const dur = resolvePaymentDuration(
        target?.durationDays,
        target?.durationLabel,
        target?.amount,
        targetPlan
      );

      const startTime = Date.now();
      await AdminService.approvePayment(id, target?.userId, targetPlan, {
        email: target?.email,
        durationDays: dur.days,
      });

      // Berikan durasi minimal ~750ms agar animasi putaran loading terlihat jelas dan responsif
      const elapsed = Date.now() - startTime;
      if (elapsed < 750) {
        await new Promise((r) => setTimeout(r, 750 - elapsed));
      }

      // Update state data lokal
      setPayments((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, status: 'approved', plan: targetPlan, durationDays: dur.days, durationLabel: dur.label } : p
        )
      );

      // Tutup modal periksa & popup loading
      setSelectedProof(null);
      setZoomLevel(1);
      setApprovingPayment(null);

      playSuccessSound();
      showSuccess(
        'Pembayaran Berhasil Disetujui!',
        `Bukti transfer dari ${target?.user} telah diverifikasi. Akun pengguna otomatis ditingkatkan ke paket ${targetPlan.toUpperCase()} (${dur.label} / ${dur.days} Hari).`
      );
    } catch (err: any) {
      setApprovingPayment(null);
      showError('Gagal Menyetujui Pembayaran', err?.message || 'Terjadi kesalahan sistem saat memproses persetujuan.');
    } finally {
      setIsProcessing(false);
      setApprovingId(null);
      setApprovingPayment(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) {
      showError('Alasan Penolakan Wajib Diisi', 'Silakan tuliskan alasan penolakan sebelum melanjutkan.');
      return;
    }
    const target = payments.find((p) => p.id === id);
    const reasonText = rejectReason.trim();

    setIsProcessing(true);
    setApprovingId(id);
    try {
      await AdminService.rejectPayment(id, reasonText);

      setPayments((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, status: 'rejected', reason: reasonText } : p
        )
      );
      setSelectedProof(null);
      setZoomLevel(1);
      setShowRejectInput(false);
      setRejectReason('');

      playSuccessSound();
      showSuccess(
        'Pembayaran Ditolak',
        `Pembayaran dari ${target?.user} telah ditolak dengan catatan: "${reasonText}".`
      );
    } catch (err: any) {
      showError('Gagal Menolak Pembayaran', err?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsProcessing(false);
      setApprovingId(null);
    }
  };

  const INDO_MONTHS: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, jun: 5,
    jul: 6, agu: 7, ags: 7, sep: 8, okt: 9, nov: 10, des: 11,
  };

  const getPaymentTimestamp = (p: PaymentItem): number => {
    const rawCreatedAt = (p as any).created_at;
    if (rawCreatedAt) {
      const t = new Date(rawCreatedAt).getTime();
      if (!isNaN(t)) return t;
    }
    if (p.date) {
      try {
        const match = p.date.match(/(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})/);
        if (match) {
          const d = parseInt(match[1], 10);
          const mStr = match[2].toLowerCase().slice(0, 3);
          const y = parseInt(match[3], 10);
          const m = INDO_MONTHS[mStr] ?? 0;
          return new Date(y, m, d).getTime();
        }
      } catch {}
    }
    return 0;
  };

  const getTargetPaymentsToDelete = (days: number | 'all'): PaymentItem[] => {
    if (days === 'all') {
      return payments;
    }
    const cutoff = Date.now() - days * 86400000;
    return payments.filter((p) => {
      const ts = getPaymentTimestamp(p);
      return ts > 0 && ts <= cutoff;
    });
  };

  const handleExportCSV = (itemsToExport: PaymentItem[] = filteredPayments) => {
    if (!itemsToExport || itemsToExport.length === 0) {
      showError('Tidak Ada Data', 'Tidak ada data pembayaran untuk diekspor ke CSV.');
      return;
    }

    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const headers = [
      'No',
      'ID Transaksi',
      'Tanggal Transaksi',
      'Nama Pengguna',
      'Email',
      'Paket Langganan',
      'Durasi',
      'Nominal Transfer (Rp)',
      'Bank Pengirim',
      'Status Verifikasi',
      'Catatan / Alasan',
    ];

    const rows = itemsToExport.map((p, idx) => [
      idx + 1,
      escapeCSV(p.id),
      escapeCSV(p.date),
      escapeCSV(p.user),
      escapeCSV(p.email),
      escapeCSV(p.plan ? `Paket ${p.plan.toUpperCase()}` : '-'),
      escapeCSV(p.durationLabel || `${p.durationDays || 30} Hari`),
      p.amount,
      escapeCSV(p.bank),
      escapeCSV(p.status === 'approved' ? 'Disetujui' : p.status === 'rejected' ? 'Ditolak' : 'Menunggu Verifikasi'),
      escapeCSV(p.reason || '-'),
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = `bukti-pembayaran-udaplanner-${new Date().toISOString().slice(0, 10)}.csv`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    playSuccessSound();
    showToast(`✅ Berhasil mengekspor ${itemsToExport.length} riwayat bukti pembayaran ke CSV!`);
  };

  const handleConfirmDeleteHistory = async () => {
    const targets = getTargetPaymentsToDelete(deleteDurationDays);
    if (targets.length === 0) {
      showError('Tidak Ada Data', 'Tidak ditemukan riwayat pembayaran yang cocok dengan kriteria durasi yang dipilih.');
      return;
    }

    setIsDeletingHistory(true);
    try {
      const ids = targets.map((t) => t.id);
      await AdminService.deletePayments(ids);

      const deleteSet = new Set(ids);
      setPayments((prev) => prev.filter((p) => !deleteSet.has(p.id)));

      setShowDeleteModal(false);
      playSuccessSound();
      showSuccess(
        'Riwayat Berhasil Dihapus',
        `Sebanyak ${targets.length} data riwayat pembayaran berhasil dibersihkan. Akun pengguna dan status langganan aktif tetap aman & tidak terpengaruh.`
      );
    } catch (err: any) {
      showError('Gagal Menghapus Riwayat', err?.message || 'Terjadi kesalahan sistem saat menghapus riwayat.');
    } finally {
      setIsDeletingHistory(false);
    }
  };

  const filteredPayments = payments.filter((p) => {
    if (filterTab === 'all') return true;
    return p.status === filterTab;
  });

  const totalItems = filteredPayments.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const paginatedPayments = filteredPayments.slice(startIndex, startIndex + itemsPerPage);

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

      {/* Tabs Filter & Action Toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: 12,
        }}
      >
        <style>{`
          @media (max-width: 1024px) {
            .pembayaran-tabs-desktop {
              display: none !important;
            }
            .pembayaran-dropdown-mobile {
              display: flex !important;
            }
          }
          @media (min-width: 1025px) {
            .pembayaran-tabs-desktop {
              display: flex !important;
            }
            .pembayaran-dropdown-mobile {
              display: none !important;
            }
          }
        `}</style>

        {/* Mode Desktop (> 1024px): Tab Buttons Horizontal */}
        <div className="pembayaran-tabs-desktop" style={{ display: 'flex', gap: 8, overflowX: 'auto', WebkitOverflowScrolling: 'touch', flexWrap: 'nowrap' }}>
          {[
            { id: 'pending', label: 'Menunggu Verifikasi', count: payments.filter((p) => p.status === 'pending').length },
            { id: 'approved', label: 'Disetujui', count: payments.filter((p) => p.status === 'approved').length },
            { id: 'rejected', label: 'Ditolak', count: payments.filter((p) => p.status === 'rejected').length },
            { id: 'all', label: 'Semua Riwayat', count: payments.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setFilterTab(tab.id as any);
                setCurrentPage(1);
              }}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: 'none',
                background: filterTab === tab.id ? '#0f172a' : '#f1f5f9',
                color: filterTab === tab.id ? '#ffffff' : '#475569',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                whiteSpace: 'nowrap',
                flexShrink: 0,
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

        {/* Khusus Tampilan Mode Mobile dan Tablet (<= 1024px): Filter digabung menjadi satu Kolom List (Dropdown) */}
        <div
          className="pembayaran-dropdown-mobile"
          style={{
            display: 'none',
            alignItems: 'center',
            gap: 8,
            width: '100%',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              padding: '6px 12px',
              backgroundColor: '#ffffff',
              border: '2px solid #0f172a',
              borderRadius: 8,
              boxShadow: '2.5px 2.5px 0px #0f172a',
            }}
          >
            <Filter size={16} style={{ color: '#0f172a', flexShrink: 0 }} />
            <label
              htmlFor="mobile-status-filter"
              style={{
                fontSize: '0.82rem',
                fontWeight: 800,
                color: '#0f172a',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              Filter Status:
            </label>
            <select
              id="mobile-status-filter"
              value={filterTab}
              onChange={(e) => {
                setFilterTab(e.target.value as any);
                setCurrentPage(1);
              }}
              style={{
                flex: 1,
                minWidth: 0,
                padding: '6px 10px',
                borderRadius: 6,
                border: '1.5px solid #0f172a',
                backgroundColor: '#f8fafc',
                color: '#0f172a',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="pending">
                Menunggu Verifikasi ({payments.filter((p) => p.status === 'pending').length})
              </option>
              <option value="approved">
                Disetujui ({payments.filter((p) => p.status === 'approved').length})
              </option>
              <option value="rejected">
                Ditolak ({payments.filter((p) => p.status === 'rejected').length})
              </option>
              <option value="all">
                Semua Riwayat ({payments.length})
              </option>
            </select>
          </div>
        </div>

        {/* Toolbar: Export CSV & Hapus Riwayat */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 'auto' }}>
          <button
            type="button"
            onClick={() => handleExportCSV(filteredPayments)}
            className="btn-uda btn-uda-secondary btn-uda-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.82rem', padding: '8px 14px' }}
            title="Download file CSV bukti pembayaran"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="btn-uda btn-uda-danger btn-uda-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.82rem', padding: '8px 14px' }}
            title="Hapus riwayat pembayaran berdasarkan durasi waktu"
          >
            <Trash2 size={14} />
            <span>Hapus Riwayat</span>
          </button>
        </div>
      </div>

      {/* Tabel Pembayaran */}
      <div className="uda-card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#64748b', fontSize: '0.88rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <Loader2 className="animate-spin" size={20} />
            <span>Memuat data transaksi pembayaran...</span>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: '0.88rem' }}>
            Tidak ada pembayaran pada kategori ini.
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="admin-table-desktop" style={{ overflowX: 'auto' }}>
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
                  {paginatedPayments.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 18px', color: '#64748b' }}>{p.date}</td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{p.user}</div>
                        <div style={{ fontSize: '0.76rem', color: '#64748b' }}>{p.email}</div>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
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
                          <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700 }}>
                            {p.durationLabel || `${p.durationDays || 30} Hari`}
                          </span>
                        </div>
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
                        <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
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
                          {p.status === 'pending' && (
                            <button
                              className="btn-uda btn-uda-primary btn-uda-sm"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                              disabled={isProcessing}
                              onClick={() => handleApprove(p.id)}
                            >
                              {isProcessing && approvingId === p.id ? (
                                <>
                                  <Loader2 size={13} className="animate-spin" />
                                  <span>Menyetujui...</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 size={13} />
                                  <span>Setujui</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile & Tablet Card List */}
            <div className="admin-cards-mobile" style={{ padding: 12 }}>
              {paginatedPayments.map((p) => (
                <div key={p.id} className="admin-mobile-card-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>{p.date}</span>
                    {p.status === 'pending' && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fffbeb', color: '#b45309', padding: '3px 8px', borderRadius: 6, fontSize: '0.74rem', fontWeight: 700, border: '1px solid #fde68a' }}>
                        <Clock size={12} /> Menunggu
                      </span>
                    )}
                    {p.status === 'approved' && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f0fdf4', color: '#16a34a', padding: '3px 8px', borderRadius: 6, fontSize: '0.74rem', fontWeight: 700, border: '1px solid #bbf7d0' }}>
                        <CheckCircle2 size={12} /> Disetujui
                      </span>
                    )}
                    {p.status === 'rejected' && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fef2f2', color: '#dc2626', padding: '3px 8px', borderRadius: 6, fontSize: '0.74rem', fontWeight: 700, border: '1px solid #fecaca' }}>
                        <XCircle size={12} /> Ditolak
                      </span>
                    )}
                  </div>

                  <div>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.94rem' }}>{p.user}</div>
                    <div style={{ fontSize: '0.76rem', color: '#64748b' }}>{p.email}</div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6, paddingTop: 6, borderTop: '1px dashed #e2e8f0' }}>
                    <div>
                      <span
                        style={{
                          fontWeight: 800,
                          fontSize: '0.72rem',
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
                      <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, marginLeft: 6 }}>
                        ({p.durationLabel || `${p.durationDays || 30} Hari`})
                      </span>
                    </div>
                    <div style={{ fontWeight: 900, fontSize: '1rem', color: '#16a34a' }}>
                      Rp {p.amount.toLocaleString('id-ID')}
                    </div>
                  </div>

                  <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                    Bank Pengirim: <strong style={{ color: '#0f172a' }}>{p.bank}</strong>
                  </div>

                  {p.reason && (
                    <div style={{ fontSize: '0.75rem', color: '#dc2626', background: '#fef2f2', padding: '6px 10px', borderRadius: 6, border: '1px solid #fecaca' }}>
                      Alasan: {p.reason}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <button
                      className="btn-uda btn-uda-secondary btn-uda-sm"
                      style={{ flex: 1, justifyContent: 'center', padding: '9px 12px' }}
                      onClick={() => {
                        setSelectedProof(p);
                        setZoomLevel(1);
                        setShowRejectInput(false);
                        setRejectReason('');
                      }}
                    >
                      <Eye size={14} />
                      <span>Periksa Bukti</span>
                    </button>
                    {p.status === 'pending' && (
                      <button
                        className="btn-uda btn-uda-primary btn-uda-sm"
                        style={{ flex: 1, justifyContent: 'center', padding: '9px 12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        disabled={isProcessing}
                        onClick={() => handleApprove(p.id)}
                      >
                        {isProcessing && approvingId === p.id ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>Menyetujui...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={14} />
                            <span>Setujui</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalItems > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 20px',
                  borderTop: '1.5px solid #e2e8f0',
                  backgroundColor: '#f8fafc',
                  flexWrap: 'wrap',
                  gap: 12,
                  fontSize: '0.84rem',
                  color: '#475569',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <span>
                    Menampilkan <strong>{totalItems === 0 ? 0 : startIndex + 1} - {Math.min(startIndex + itemsPerPage, totalItems)}</strong> dari <strong>{totalItems}</strong> data
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Baris per halaman:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 6,
                        border: '1.5px solid #0f172a',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: '#0f172a',
                        backgroundColor: '#ffffff',
                        cursor: 'pointer',
                        outline: 'none',
                      }}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safeCurrentPage === 1}
                    className="btn-uda btn-uda-secondary btn-uda-sm"
                    style={{
                      padding: '6px 12px',
                      cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer',
                      opacity: safeCurrentPage === 1 ? 0.45 : 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: '0.8rem',
                      fontWeight: 700,
                    }}
                  >
                    <ChevronLeft size={14} />
                    <span>Sebelumnya</span>
                  </button>

                  {/* Numbered Page Buttons */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((page) => {
                        if (totalPages <= 6) return true;
                        if (page === 1 || page === totalPages) return true;
                        return Math.abs(page - safeCurrentPage) <= 1;
                      })
                      .map((page, idx, arr) => {
                        const prevPage = arr[idx - 1];
                        const hasGap = prevPage && page - prevPage > 1;
                        return (
                          <React.Fragment key={page}>
                            {hasGap && <span style={{ padding: '4px 4px', color: '#94a3b8', fontSize: '0.8rem' }}>...</span>}
                            <button
                              type="button"
                              onClick={() => setCurrentPage(page)}
                              style={{
                                minWidth: 32,
                                height: 32,
                                padding: '0 8px',
                                borderRadius: 6,
                                border: '1.5px solid #0f172a',
                                background: safeCurrentPage === page ? '#0f172a' : '#ffffff',
                                color: safeCurrentPage === page ? '#ffffff' : '#0f172a',
                                fontWeight: 800,
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                boxShadow: safeCurrentPage === page ? '2px 2px 0px #0f172a' : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {page}
                            </button>
                          </React.Fragment>
                        );
                      })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safeCurrentPage === totalPages || totalPages === 0}
                    className="btn-uda btn-uda-secondary btn-uda-sm"
                    style={{
                      padding: '6px 12px',
                      cursor: safeCurrentPage === totalPages || totalPages === 0 ? 'not-allowed' : 'pointer',
                      opacity: safeCurrentPage === totalPages || totalPages === 0 ? 0.45 : 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: '0.8rem',
                      fontWeight: 700,
                    }}
                  >
                    <span>Selanjutnya</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
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
              <span style={{ fontWeight: 700, color: '#0f172a' }}>{selectedProof.user}</span> ({selectedProof.email}) • Paket:{' '}
              <strong style={{ color: selectedProof.plan === 'team' ? '#7c3aed' : '#16a34a', textTransform: 'uppercase' }}>{selectedProof.plan}</strong> • Transfer:{' '}
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

            {/* Area Tampilan Gambar Interaktif */}
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
                        style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                        disabled={isProcessing}
                        onClick={() => setShowRejectInput(true)}
                      >
                        Tolak
                      </button>
                      <button
                        className="btn-uda btn-uda-primary"
                        style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                        disabled={isProcessing}
                        onClick={() => {
                          handleApprove(selectedProof.id);
                        }}
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>Sedang Menyetujui...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={16} />
                            <span>Setujui Paket ({selectedProof.plan.toUpperCase()})</span>
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <button
                      className="btn-uda btn-uda-danger"
                      style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                      disabled={isProcessing}
                      onClick={() => {
                        handleReject(selectedProof.id);
                      }}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Menyimpan Penolakan...</span>
                        </>
                      ) : (
                        <span>Konfirmasi Tolak</span>
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* POP UP MODAL LOADING VERIFIKASI PAKET LANGGANAN */}
      {approvingPayment && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            padding: 20,
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 20,
              maxWidth: 440,
              width: '100%',
              padding: '36px 30px',
              border: '3px solid #0f172a',
              boxShadow: '8px 8px 0px #0f172a',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: 20,
              position: 'relative',
            }}
          >
            {/* Animasi Ikon Putar / Spinner */}
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: '#f0fdf4',
                border: '3px solid #16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(22, 163, 74, 0.25)',
                position: 'relative',
              }}
            >
              <Loader2
                size={44}
                className="animate-spin"
                style={{ color: '#16a34a', strokeWidth: 2.6 }}
              />
            </div>

            {/* Konten Judul & Pesan Verifikasi Paket Langganan */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                Verifikasi Paket Langganan
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.55, margin: 0 }}>
                Sedang memverifikasi pembayaran dan mengaktifkan{' '}
                <span
                  style={{
                    fontWeight: 800,
                    color: (approvingPayment.plan || '').toLowerCase() === 'team' ? '#7c3aed' : '#16a34a',
                    textTransform: 'uppercase',
                  }}
                >
                  Paket {approvingPayment.plan || 'PRO'}
                </span>{' '}
                untuk pengguna <strong style={{ color: '#0f172a' }}>{approvingPayment.user}</strong>.
              </p>
            </div>

            {/* Status Pill Loading */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 16px',
                borderRadius: 9999,
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#64748b',
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#16a34a',
                  display: 'inline-block',
                }}
              />
              <span>Mohon tunggu, sistem sedang memproses...</span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS RIWAYAT PEMBAYARAN */}
      {showDeleteModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: 20,
            animation: 'fadeIn 0.15s ease-out',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeletingHistory) {
              setShowDeleteModal(false);
            }
          }}
        >
          <div
            className="uda-card"
            style={{
              maxWidth: 520,
              width: '100%',
              padding: '28px 26px',
              maxHeight: '92vh',
              overflowY: 'auto',
              borderRadius: 18,
              border: '3px solid #0f172a',
              boxShadow: '8px 8px 0px #0f172a',
              backgroundColor: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
            }}
          >
            {/* Header Modal */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: '#fef2f2',
                  border: '2px solid #ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#dc2626',
                  flexShrink: 0,
                }}
              >
                <Trash2 size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: '0 0 4px 0' }}>
                  Hapus Riwayat Pembayaran
                </h3>
                <p style={{ fontSize: '0.84rem', color: '#64748b', margin: 0, lineHeight: 1.45 }}>
                  Pilih durasi usia data riwayat transaksi yang ingin dibersihkan dari daftar tabel pembayaran.
                </p>
              </div>
              <button
                type="button"
                disabled={isDeletingHistory}
                onClick={() => setShowDeleteModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: isDeletingHistory ? 'not-allowed' : 'pointer',
                  padding: 4,
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Pilihan Durasi Hapus */}
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: 8 }}>
                Pilih Kriteria Usia Riwayat yang Dihapus:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
                {[
                  { value: 1, label: '1 Hari Lalu', sub: '> 1 hari lalu' },
                  { value: 7, label: '7 Hari Lalu', sub: '> 7 hari lalu' },
                  { value: 14, label: '14 Hari Lalu', sub: '> 14 hari lalu' },
                  { value: 30, label: '30 Hari Lalu', sub: '> 30 hari lalu' },
                  { value: 60, label: '2 Bulan Lalu', sub: '> 60 hari lalu' },
                  { value: 365, label: '1 Tahun Lalu', sub: '> 1 tahun lalu' },
                  { value: 'all', label: 'Semua Riwayat', sub: 'Seluruh riwayat' },
                ].map((opt) => {
                  const isSelected = deleteDurationDays === opt.value;
                  const matchCount = getTargetPaymentsToDelete(opt.value as any).length;
                  return (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => setDeleteDurationDays(opt.value as any)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: isSelected ? '2px solid #0f172a' : '1.5px solid #cbd5e1',
                        background: isSelected ? '#f8fafc' : '#ffffff',
                        boxShadow: isSelected ? '3px 3px 0px #0f172a' : 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        transition: 'all 0.1s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.82rem', color: isSelected ? '#0f172a' : '#334155' }}>
                          {opt.label}
                        </span>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: 10,
                            background: isSelected ? '#0f172a' : '#f1f5f9',
                            color: isSelected ? '#ffffff' : '#64748b',
                          }}
                        >
                          {matchCount}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{opt.sub}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Info Jumlah Data Terpilih & Export CSV Shortcut */}
            {(() => {
              const targetList = getTargetPaymentsToDelete(deleteDurationDays);
              return (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    background: targetList.length > 0 ? '#fff7ed' : '#f1f5f9',
                    border: `1.5px solid ${targetList.length > 0 ? '#fdba74' : '#cbd5e1'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ fontSize: '0.84rem', color: targetList.length > 0 ? '#9a3412' : '#64748b', fontWeight: 600 }}>
                    {targetList.length > 0 ? (
                      <>Ditemukan <strong style={{ color: '#c2410c' }}>{targetList.length} data riwayat pembayaran</strong> siap dibersihkan.</>
                    ) : (
                      <>Tidak ada data riwayat pembayaran pada rentang durasi ini.</>
                    )}
                  </div>
                  {targetList.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleExportCSV(targetList)}
                      className="btn-uda btn-uda-secondary btn-uda-sm"
                      style={{ padding: '6px 12px', fontSize: '0.78rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                      title="Unduh salinan CSV bukti pembayaran data yang akan dihapus"
                    >
                      <Download size={13} />
                      <span>Export CSV Bukti</span>
                    </button>
                  )}
                </div>
              );
            })()}

            {/* Safety Notice: Pastikan yang dihapus HANYA riwayat saja */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 10,
                background: '#f0fdf4',
                border: '1.5px solid #86efac',
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
              }}
            >
              <ShieldCheck size={20} style={{ color: '#16a34a', flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: '0.78rem', color: '#166534', lineHeight: 1.45 }}>
                <strong>Jaminan Keamanan:</strong> Tindakan ini <u>hanya menghapus catatan riwayat transaksi</u> dari tabel pembayaran. Akun pengguna, masa aktif langganan, dan status paket Pro/Team <strong>tetap aman & tidak akan terhapus</strong>.
              </div>
            </div>

            {/* Tombol Aksi Modal */}
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button
                type="button"
                className="btn-uda btn-uda-secondary"
                style={{ flex: 1 }}
                disabled={isDeletingHistory}
                onClick={() => setShowDeleteModal(false)}
              >
                Batal
              </button>

              {(() => {
                const targetCount = getTargetPaymentsToDelete(deleteDurationDays).length;
                return (
                  <button
                    type="button"
                    className="btn-uda btn-uda-danger"
                    style={{ flex: 1.5, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    disabled={isDeletingHistory || targetCount === 0}
                    onClick={handleConfirmDeleteHistory}
                  >
                    {isDeletingHistory ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Sedang Menghapus...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 size={16} />
                        <span>Hapus ({targetCount} Data)</span>
                      </>
                    )}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
