'use client';

import React, { useState, useEffect } from 'react';
import {
  MailCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  Send,
  Loader2,
  Clock,
  History,
  X,
  UserCheck,
  AlertCircle,
  FileText,
} from 'lucide-react';
import {
  VerificationService,
  VerifiableUser,
  VerificationStats,
  VerificationAuditLog,
} from '@/services/verification.service';
import { useModal } from '@/contexts/modal-context';

export default function AdminVerifikasiEmailPage() {
  const { showSuccess, showError } = useModal();

  const [users, setUsers] = useState<VerifiableUser[]>([]);
  const [stats, setStats] = useState<VerificationStats>({
    totalUsers: 0,
    unverifiedEmailCount: 0,
    verifiedEmailCount: 0,
    failedDeliveryCount: 0,
    manualVerifiedCount: 0,
    pendingRegistrationCount: 0,
  });
  const [logs, setLogs] = useState<VerificationAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Tabs
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unverified' | 'failed' | 'verified'>('unverified');
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Modal Verifikasi Manual
  const [targetUserToVerify, setTargetUserToVerify] = useState<VerifiableUser | null>(null);
  const [verifyNote, setVerifyNote] = useState('Verifikasi manual oleh admin (SMTP Limit)');
  const [isSubmittingVerify, setIsSubmittingVerify] = useState(false);

  // Loading state per user untuk tombol kirim ulang
  const [resendingUserId, setResendingUserId] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [uList, sData, lList] = await Promise.all([
        VerificationService.getVerifiableUsers(),
        VerificationService.getVerificationStats(),
        VerificationService.getAuditLogs(),
      ]);
      setUsers(uList);
      setStats(sData);
      setLogs(lList);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleManualVerifyConfirm = async () => {
    if (!targetUserToVerify) return;
    setIsSubmittingVerify(true);

    try {
      const success = await VerificationService.manualVerifyEmail(
        targetUserToVerify.userId,
        'admin-001',
        'Administrator',
        verifyNote
      );

      if (success) {
        showSuccess(
          'Email Berhasil Diverifikasi Manual!',
          `Alamat email ${targetUserToVerify.email} milik "${targetUserToVerify.name}" telah aktif dan terverifikasi di sistem database tanpa hambatan SMTP.`
        );
        setTargetUserToVerify(null);
        setVerifyNote('Verifikasi manual oleh admin (SMTP Limit)');
        await loadData();
      } else {
        showError('Gagal Memverifikasi', 'Terjadi kendala saat memperbarui status di database.');
      }
    } catch (err: any) {
      showError('Terjadi Kesalahan', err.message);
    } finally {
      setIsSubmittingVerify(false);
    }
  };

  const handleResendEmail = async (user: VerifiableUser) => {
    setResendingUserId(user.userId);
    try {
      const result = await VerificationService.resendVerificationEmail(
        user.userId,
        'admin-001',
        'Administrator'
      );

      if (result.success) {
        showSuccess('Email Terkirim', result.message);
      } else {
        showError('Pengiriman SMTP Gagal', result.message);
      }
      await loadData();
    } catch (err: any) {
      showError('Gagal Kirim Ulang', err.message);
    } finally {
      setResendingUserId(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchSearch) return false;

    if (activeFilter === 'unverified') return !u.isEmailVerified;
    if (activeFilter === 'failed') return u.emailDeliveryStatus === 'failed';
    if (activeFilter === 'verified') return u.isEmailVerified;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header Halaman */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <MailCheck size={24} style={{ color: '#16a34a' }} />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>
              Verifikasi Email Pengguna
            </h1>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.88rem' }}>
            Bypass verifikasi manual saat kuota pengiriman email SMTP gratis Supabase habis (error <em>email rate limit exceeded</em>).
          </p>
        </div>

        <button
          onClick={() => setShowHistoryModal(true)}
          className="btn-uda btn-uda-secondary btn-uda-sm"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
        >
          <History size={15} />
          <span>Riwayat Audit Verifikasi ({logs.length})</span>
        </button>
      </div>

      {/* Ringkasan Statistik */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
          gap: 16,
        }}
      >
        <div className="uda-card" style={{ padding: '18px 20px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>Belum Terverifikasi</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 900, color: '#b45309', margin: '4px 0 2px' }}>
            {stats.unverifiedEmailCount}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#b45309' }}>Perlu penanganan admin</div>
        </div>

        <div className="uda-card" style={{ padding: '18px 20px', borderLeft: '4px solid #dc2626' }}>
          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>Email Gagal Terkirim</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 900, color: '#dc2626', margin: '4px 0 2px' }}>
            {stats.failedDeliveryCount}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#dc2626' }}>Terkendala kuota SMTP</div>
        </div>

        <div className="uda-card" style={{ padding: '18px 20px', borderLeft: '4px solid #16a34a' }}>
          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>Email Terverifikasi</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 900, color: '#15803d', margin: '4px 0 2px' }}>
            {stats.verifiedEmailCount}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#16a34a' }}>Akun aktif sepenuhnya</div>
        </div>

        <div className="uda-card" style={{ padding: '18px 20px', borderLeft: '4px solid #0284c7' }}>
          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>Verifikasi Manual Admin</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 900, color: '#0284c7', margin: '4px 0 2px' }}>
            {stats.manualVerifiedCount}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#0284c7' }}>Bypass berhasil tersimpan</div>
        </div>
      </div>

      {/* Tabs Filter & Pencarian */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { id: 'unverified', label: 'Belum Terverifikasi', count: stats.unverifiedEmailCount },
            { id: 'failed', label: 'Gagal Kirim SMTP', count: stats.failedDeliveryCount },
            { id: 'verified', label: 'Terverifikasi', count: stats.verifiedEmailCount },
            { id: 'all', label: 'Semua Pengguna', count: stats.totalUsers },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: activeFilter === tab.id ? '#0f172a' : '#f1f5f9',
                color: activeFilter === tab.id ? '#ffffff' : '#475569',
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
                  padding: '2px 7px',
                  borderRadius: 999,
                  backgroundColor: activeFilter === tab.id ? '#334155' : '#e2e8f0',
                  color: activeFilter === tab.id ? '#f8fafc' : '#475569',
                }}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div style={{ minWidth: 280, position: 'relative' }}>
          <input
            type="text"
            placeholder="Cari nama atau email pengguna..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 14px 9px 38px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: '0.86rem',
              outline: 'none',
              backgroundColor: '#ffffff',
            }}
          />
          <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />
        </div>
      </div>

      {/* Tabel Data Verifikasi Email */}
      <div className="uda-card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: '#64748b' }}>
            <Loader2 size={32} className="animate-spin" style={{ color: '#16a34a', margin: '0 auto 12px' }} />
            <div>Memuat data pengguna...</div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: '#64748b' }}>
            Tidak ada pengguna pada kategori ini.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                  <th style={{ padding: '14px 18px' }}>Pengguna</th>
                  <th style={{ padding: '14px 18px' }}>Tanggal Daftar</th>
                  <th style={{ padding: '14px 18px' }}>Status Verifikasi Email</th>
                  <th style={{ padding: '14px 18px' }}>Status Pengiriman SMTP</th>
                  <th style={{ padding: '14px 18px', textAlign: 'right' }}>Aksi Admin</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const isVerified = u.isEmailVerified;
                  const isFailedSmtp = u.emailDeliveryStatus === 'failed';

                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>{u.name}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{u.email}</div>
                      </td>

                      <td style={{ padding: '14px 18px', color: '#64748b', fontSize: '0.82rem' }}>
                        {u.registeredAt}
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        {isVerified ? (
                          <span
                            className="status-pill"
                            style={{ backgroundColor: '#dcfce7', color: '#15803d', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            <CheckCircle2 size={13} />
                            <span>Terverifikasi</span>
                          </span>
                        ) : (
                          <span
                            className="status-pill"
                            style={{ backgroundColor: '#fef3c7', color: '#b45309', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            <Clock size={13} />
                            <span>Belum Terverifikasi</span>
                          </span>
                        )}
                        {u.emailVerifiedAt && (
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 4 }}>
                            {u.emailVerifiedAt}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        {isFailedSmtp ? (
                          <span
                            className="status-pill"
                            style={{ backgroundColor: '#fee2e2', color: '#b91c1c', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            title={u.notes || 'SMTP Rate Limit Exceeded'}
                          >
                            <AlertTriangle size={13} />
                            <span>Email Gagal Dikirim (SMTP)</span>
                          </span>
                        ) : u.emailDeliveryStatus === 'delivered' ? (
                          <span
                            className="status-pill"
                            style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}
                          >
                            Terkirim Normal
                          </span>
                        ) : (
                          <span
                            className="status-pill"
                            style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}
                          >
                            Menunggu Pengiriman
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          {/* Tombol Kirim Ulang Email */}
                          <button
                            onClick={() => handleResendEmail(u)}
                            disabled={resendingUserId === u.userId}
                            className="btn-uda btn-uda-secondary btn-uda-sm"
                            style={{
                              fontSize: '0.78rem',
                              padding: '5px 10px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                            title="Kirim Ulang Email Konfirmasi"
                          >
                            {resendingUserId === u.userId ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Send size={13} />
                            )}
                            <span>Kirim Ulang</span>
                          </button>

                          {/* Tombol Verifikasi Manual */}
                          {!isVerified ? (
                            <button
                              onClick={() => setTargetUserToVerify(u)}
                              className="btn-uda btn-uda-primary btn-uda-sm"
                              style={{
                                fontSize: '0.78rem',
                                padding: '5px 12px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)',
                              }}
                            >
                              <ShieldCheck size={14} />
                              <span>Verifikasi Manual</span>
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.76rem', color: '#16a34a', fontWeight: 700, paddingRight: 6 }}>
                              ✓ Selesai
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL KONFIRMASI VERIFIKASI MANUAL */}
      {targetUserToVerify && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div
            className="uda-card"
            style={{
              maxWidth: 480,
              width: '100%',
              padding: 28,
              borderRadius: 18,
              backgroundColor: '#ffffff',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  backgroundColor: '#dcfce7',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  Konfirmasi Verifikasi Email Manual
                </h3>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Bypass SMTP — Tandai email langsung terverifikasi
                </div>
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '14px 16px',
                marginBottom: 18,
                fontSize: '0.86rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#64748b' }}>Nama Pengguna:</span>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>{targetUserToVerify.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#64748b' }}>Alamat Email:</span>
                <span style={{ fontWeight: 700, color: '#0284c7' }}>{targetUserToVerify.email}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Terdaftar Pada:</span>
                <span style={{ color: '#475569' }}>{targetUserToVerify.registeredAt}</span>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '12px 14px',
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: 10,
                color: '#92400e',
                fontSize: '0.82rem',
                lineHeight: 1.5,
                marginBottom: 18,
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1, color: '#b45309' }} />
              <span>
                Tindakan ini akan langsung mengaktifkan status verifikasi email di database pengguna. Pengguna dapat langsung masuk ke dashboard tanpa memerlukan klik tautan email konfirmasi.
              </span>
            </div>

            <div style={{ marginBottom: 22 }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
                Catatan Verifikasi (Tercatat di Riwayat Audit)
              </label>
              <input
                type="text"
                value={verifyNote}
                onChange={(e) => setVerifyNote(e.target.value)}
                placeholder="Misal: Dikonfirmasi via WhatsApp resmi"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                  fontSize: '0.86rem',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setTargetUserToVerify(null)}
                disabled={isSubmittingVerify}
                className="btn-uda btn-uda-secondary"
                style={{ fontWeight: 700, fontSize: '0.86rem' }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleManualVerifyConfirm}
                disabled={isSubmittingVerify}
                className="btn-uda btn-uda-primary"
                style={{
                  fontWeight: 800,
                  fontSize: '0.86rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {isSubmittingVerify ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Menyimpan ke DB...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Konfirmasi Verifikasi</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RIWAYAT AUDIT VERIFIKASI */}
      {showHistoryModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div
            className="uda-card"
            style={{
              maxWidth: 680,
              width: '100%',
              padding: 24,
              borderRadius: 18,
              backgroundColor: '#ffffff',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <History size={20} style={{ color: '#0284c7' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  Riwayat Audit Tindakan Verifikasi
                </h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, paddingRight: 4, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {logs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 0', color: '#64748b' }}>
                  Belum ada riwayat tindakan verifikasi.
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 10,
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      fontSize: '0.84rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 800, color: '#0f172a' }}>
                        {log.userName} ({log.userEmail})
                      </span>
                      <span style={{ fontSize: '0.74rem', color: '#64748b' }}>{log.createdAt}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          padding: '2px 6px',
                          borderRadius: 4,
                          backgroundColor: log.verificationType === 'email_manual' ? '#dcfce7' : '#e0f2fe',
                          color: log.verificationType === 'email_manual' ? '#15803d' : '#0284c7',
                        }}
                      >
                        {log.verificationType === 'email_manual' ? 'Verifikasi Manual' : 'Kirim Ulang Email'}
                      </span>
                      <span style={{ color: '#64748b' }}>
                        Oleh: <strong>{log.adminName}</strong>
                      </span>
                    </div>

                    {log.note && (
                      <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: 4 }}>
                        Catatan: <em>"{log.note}"</em>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
