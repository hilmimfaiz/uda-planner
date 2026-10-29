'use client';

import React, { useState } from 'react';
import {
  Users,
  Search,
  Edit,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
  Eye,
  Phone,
  Calendar,
  HardDrive,
  Sparkles,
  Layers,
  FileText,
  User,
  MailCheck,
  MailWarning,
} from 'lucide-react';
import { AdminService, AdminUserItem } from '@/services/admin.service';
import { VerificationService } from '@/services/verification.service';
import { useModal } from '@/contexts/modal-context';

export default function AdminPenggunaPage() {
  const { showSuccess, confirmAction } = useModal();
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);
  const [detailUser, setDetailUser] = useState<AdminUserItem | null>(null);
  const [userToDelete, setUserToDelete] = useState<AdminUserItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newPlan, setNewPlan] = useState<'free' | 'pro' | 'team'>('pro');
  const [durationDays, setDurationDays] = useState(30);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Bulk Selection & Deletion State
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 6;

  const loadUsers = () => {
    AdminService.getAdminUsers().then((data) => {
      if (data) {
        const seen = new Set<string>();
        const unique = data.filter((u) => {
          const em = (u.email || '').toLowerCase().trim();
          if (!em || seen.has(em)) return false;
          seen.add(em);
          return true;
        });
        setUsers(unique);
        setDetailUser((current) => {
          if (!current) return null;
          const updated = unique.find(
            (u) =>
              u.id === current.id ||
              u.userId === current.userId ||
              (current.email && u.email?.toLowerCase() === current.email.toLowerCase())
          );
          return updated || current;
        });
      }
    });
  };

  React.useEffect(() => {
    loadUsers();

    const handleRealtimeUpdate = () => {
      loadUsers();
    };

    window.addEventListener('uda_user_registered', handleRealtimeUpdate);
    window.addEventListener('uda_user_verified', handleRealtimeUpdate);
    window.addEventListener('uda_account_updated', handleRealtimeUpdate);
    window.addEventListener('uda_payment_approved', handleRealtimeUpdate);
    window.addEventListener('storage', handleRealtimeUpdate);

    // Polling periodik ringan (30 detik) sebagai fallback sinkronisasi di latar belakang
    const interval = setInterval(() => {
      loadUsers();
    }, 30000);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDetailUser(null);
        setSelectedUser(null);
        setUserToDelete(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('uda_user_registered', handleRealtimeUpdate);
      window.removeEventListener('uda_user_verified', handleRealtimeUpdate);
      window.removeEventListener('uda_account_updated', handleRealtimeUpdate);
      window.removeEventListener('uda_payment_approved', handleRealtimeUpdate);
      window.removeEventListener('storage', handleRealtimeUpdate);
      window.removeEventListener('keydown', handleKeyDown);
      clearInterval(interval);
    };
  }, []);

  const handleManualVerifyUser = (u: AdminUserItem) => {
    confirmAction({
      title: 'Verifikasi Akun Email Manual?',
      message: `Apakah Anda ingin mengkonfirmasi dan memverifikasi akun "${u.name}" (${u.email}) secara manual? Pengguna dapat langsung login tanpa kendala verifikasi email masuk.`,
      confirmText: 'Ya, Verifikasi Akun',
      onConfirm: async () => {
        const targetId = u.userId || u.id;
        const targetEmail = u.email;

        try {
          await fetch('/api/admin/verify-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'manual_verify',
              userId: targetId,
              email: targetEmail,
              adminName: 'Administrator',
              note: 'Konfirmasi manual oleh Administrator dari Manajemen Pengguna',
            }),
          });
        } catch (apiErr) {
          console.warn('API verify-email error:', apiErr);
        }

        await VerificationService.manualVerifyEmail(
          targetId,
          targetEmail,
          'Administrator',
          'Konfirmasi manual oleh Administrator dari Manajemen Pengguna'
        );

        setUsers((prev) =>
          prev.map((item) => {
            const isMatch =
              item.id === u.id ||
              item.userId === u.userId ||
              (targetEmail && item.email?.toLowerCase() === targetEmail.toLowerCase());
            return isMatch
              ? { ...item, isEmailVerified: true, registrationStatus: 'verified' }
              : item;
          })
        );

        if (
          detailUser &&
          (detailUser.id === u.id ||
            detailUser.userId === u.userId ||
            (targetEmail && detailUser.email?.toLowerCase() === targetEmail.toLowerCase()))
        ) {
          setDetailUser((prev) =>
            prev ? { ...prev, isEmailVerified: true, registrationStatus: 'verified' } : null
          );
        }

        showSuccess(
          'Email Berhasil Terverifikasi!',
          `Akun "${u.name}" (${u.email}) kini berstatus TERVERIFIKASI dan dapat langsung masuk ke dashboard.`
        );
      },
    });
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    await AdminService.updateUserPlan(
      selectedUser.userId || selectedUser.id,
      newPlan,
      durationDays,
      { email: selectedUser.email }
    );

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === selectedUser.id) {
          const until =
            newPlan === 'free'
              ? null
              : new Date(Date.now() + durationDays * 86400000).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                });
          return {
            ...u,
            plan: newPlan,
            planUntil: until,
          };
        }
        return u;
      })
    );

    if (detailUser && detailUser.id === selectedUser.id) {
      setDetailUser((prev) =>
        prev
          ? {
              ...prev,
              plan: newPlan,
              planUntil:
                newPlan === 'free'
                  ? null
                  : new Date(Date.now() + durationDays * 86400000).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    }),
            }
          : null
      );
    }

    const userName = selectedUser.name;
    setSelectedUser(null);
    showSuccess(
      'Paket Pengguna Berhasil Diubah!',
      `Paket langganan untuk "${userName}" telah diperbarui menjadi ${newPlan.toUpperCase()} selama ${durationDays} hari.`
    );
  };

  const handleToggleSuspend = (id: string, currentStatus: boolean) => {
    const target = users.find((u) => u.id === id);
    confirmAction({
      title: currentStatus ? 'Aktifkan Akun Pengguna?' : 'Tangguhkan (Suspend) Akun?',
      message: currentStatus
        ? `Apakah Anda ingin mengaktifkan kembali akun "${target?.name}"?`
        : `Apakah Anda yakin ingin menangguhkan akun "${target?.name}"? Pengguna tidak akan dapat mengakses aplikasi.`,
      danger: !currentStatus,
      confirmText: currentStatus ? 'Ya, Aktifkan' : 'Ya, Tangguhkan',
      onConfirm: async () => {
        await AdminService.toggleUserSuspend(target?.userId || id, !currentStatus);
        setUsers((prev) =>
          prev.map((u) => (u.id === id ? { ...u, isSuspended: !currentStatus } : u))
        );
        if (detailUser && detailUser.id === id) {
          setDetailUser((prev) => (prev ? { ...prev, isSuspended: !currentStatus } : null));
        }
        showSuccess(
          'Status Akun Berhasil Diperbarui',
          currentStatus
            ? `Akun "${target?.name}" telah aktif kembali.`
            : `Akun "${target?.name}" telah berhasil dinonaktifkan.`
        );
      },
    });
  };

  const handleConfirmDeletePermanent = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);

    try {
      const targetId = userToDelete.userId || userToDelete.id;
      const targetName = userToDelete.name;
      const targetEmail = userToDelete.email;

      await AdminService.deleteUserPermanently(targetId, targetEmail);

      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id && u.userId !== userToDelete.userId));
      if (detailUser && (detailUser.id === userToDelete.id || detailUser.userId === userToDelete.userId)) {
        setDetailUser(null);
      }
      setUserToDelete(null);

      showSuccess(
        'Pengguna Berhasil Dihapus Permanen!',
        `Semua data akun "${targetName}" (${targetEmail}) telah dihapus secara permanen dari sistem. Email tersebut sekarang dapat didaftarkan kembali sebagai akun baru dari awal.`
      );
    } catch (err: any) {
      showToast('Gagal menghapus pengguna: ' + (err.message || 'Terjadi kesalahan'));
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

  // Checkbox Selection Logic
  const isAllPageSelected =
    paginatedUsers.length > 0 && paginatedUsers.every((u) => selectedUserIds.includes(u.id));
  const isSomePageSelected =
    paginatedUsers.some((u) => selectedUserIds.includes(u.id)) && !isAllPageSelected;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const pageIds = paginatedUsers.map((u) => u.id);
      setSelectedUserIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    } else {
      const pageIdSet = new Set(paginatedUsers.map((u) => u.id));
      setSelectedUserIds((prev) => prev.filter((id) => !pageIdSet.has(id)));
    }
  };

  const handleToggleSelectUser = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedUserIds.length === 0) return;
    setIsBulkDeleting(true);

    try {
      const usersToDeleteList = users.filter((u) => selectedUserIds.includes(u.id));
      const count = usersToDeleteList.length;

      await AdminService.deleteMultipleUsersPermanently(
        usersToDeleteList.map((u) => ({ id: u.id, userId: u.userId, email: u.email }))
      );

      const deletedIdSet = new Set(selectedUserIds);
      setUsers((prev) =>
        prev.filter((u) => !deletedIdSet.has(u.id) && (!u.userId || !deletedIdSet.has(u.userId)))
      );

      if (
        detailUser &&
        (deletedIdSet.has(detailUser.id) || (detailUser.userId && deletedIdSet.has(detailUser.userId)))
      ) {
        setDetailUser(null);
      }

      setSelectedUserIds([]);
      setShowBulkDeleteModal(false);

      showSuccess(
        `${count} Pengguna Berhasil Dihapus Permanen!`,
        `Sebanyak ${count} akun pengguna yang dipilih telah dihapus secara permanen dari sistem UdaPlanner.`
      );
    } catch (err: any) {
      showToast('Gagal menghapus beberapa pengguna: ' + (err.message || 'Terjadi kesalahan'));
    } finally {
      setIsBulkDeleting(false);
    }
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

      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Manajemen Pengguna</h1>
        <p style={{ color: '#64748b', fontSize: '0.88rem' }}>
          Kelola seluruh akun terdaftar, pantau paket langganan aktif, sinkronisasi brand & kapasitas penyimpanan, serta klik pengguna untuk melihat pop-up profil detail lengkap.
        </p>
      </div>

      {/* Search Bar & Total Counter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ maxWidth: 380, width: '100%', position: 'relative' }}>
          <input
            type="text"
            placeholder="Cari nama atau email pengguna..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            style={{ width: '100%', padding: '10px 14px 10px 38px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.88rem', outline: 'none' }}
          />
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
        </div>

        <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
          Total Terdaftar: <strong style={{ color: '#0f172a' }}>{users.length} Pengguna</strong>
        </div>
      </div>

      {/* Floating Action Bar untuk Pilihan Massal (Checkbox) */}
      {selectedUserIds.length > 0 && (
        <div
          style={{
            background: '#fff1f2',
            border: '2px solid #f43f5e',
            borderRadius: 12,
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            boxShadow: '0 4px 16px rgba(244, 63, 94, 0.18)',
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                background: '#e11d48',
                color: '#ffffff',
                minWidth: 30,
                height: 30,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '0.84rem',
                boxShadow: '0 2px 5px rgba(225, 29, 72, 0.4)',
              }}
            >
              {selectedUserIds.length}
            </div>
            <div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#9f1239' }}>
                {selectedUserIds.length} Pengguna Terpilih
              </div>
              <div style={{ fontSize: '0.78rem', color: '#be123c' }}>
                Gunakan tombol hapus di samping untuk menghapus seluruh akun terpilih secara massal.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                const allFilteredIds = filteredUsers.map((u) => u.id);
                setSelectedUserIds(allFilteredIds);
              }}
              style={{
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                color: '#334155',
                padding: '7px 12px',
                borderRadius: 8,
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              title="Pilih seluruh pengguna dari hasil pencarian"
            >
              Pilih Semua ({filteredUsers.length})
            </button>

            <button
              type="button"
              onClick={() => setSelectedUserIds([])}
              style={{
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                color: '#475569',
                padding: '7px 12px',
                borderRadius: 8,
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Batal Pilih
            </button>

            <button
              type="button"
              onClick={() => setShowBulkDeleteModal(true)}
              style={{
                background: '#dc2626',
                color: '#ffffff',
                border: '2px solid #0f172a',
                boxShadow: '3px 3px 0px #0f172a',
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: '0.84rem',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Trash2 size={15} />
              <span>Hapus {selectedUserIds.length} Pengguna</span>
            </button>
          </div>
        </div>
      )}

      {/* Tabel Pengguna */}
      <div className="uda-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                <th style={{ width: 44, padding: '14px 14px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={isAllPageSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isSomePageSelected;
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    title="Pilih semua di halaman ini"
                    style={{ width: 17, height: 17, cursor: 'pointer', accentColor: '#e11d48' }}
                  />
                </th>
                <th style={{ padding: '14px 18px' }}>Pengguna (Klik Nama / Email)</th>
                <th style={{ padding: '14px 18px' }}>Verifikasi Email</th>
                <th style={{ padding: '14px 18px' }}>Role Sistem</th>
                <th style={{ padding: '14px 18px' }}>Paket Aktif</th>
                <th style={{ padding: '14px 18px' }}>Penyimpanan</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '32px 18px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                    Tidak ada pengguna yang cocok dengan pencarian &quot;{searchQuery}&quot;.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u) => {
                  const initial = (u.name || u.email || 'U').charAt(0).toUpperCase();
                  const isChecked = selectedUserIds.includes(u.id);
                  return (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.12s ease',
                        background: isChecked ? '#fff1f2' : undefined,
                      }}
                      className="hover:bg-slate-50"
                    >
                      <td style={{ width: 44, padding: '14px 14px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelectUser(u.id)}
                          title={`Pilih ${u.name}`}
                          style={{ width: 17, height: 17, cursor: 'pointer', accentColor: '#e11d48' }}
                        />
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <div
                          onClick={() => setDetailUser(u)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            cursor: 'pointer',
                          }}
                          title="Klik untuk melihat detail profil pengguna"
                        >
                          {/* Foto Profil / Avatar */}
                          <div
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: '50%',
                              overflow: 'hidden',
                              background: '#16a34a',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.95rem',
                              flexShrink: 0,
                              border: '1.5px solid #cbd5e1',
                            }}
                          >
                            {u.avatarUrl ? (
                              <img
                                src={u.avatarUrl}
                                alt={u.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              <span>{initial}</span>
                            )}
                          </div>

                          <div>
                            <div
                              style={{
                                fontWeight: 800,
                                color: '#0f172a',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                              }}
                            >
                              <span style={{ borderBottom: '1px dashed #94a3b8' }}>{u.name}</span>
                              <Eye size={12} style={{ color: '#16a34a' }} />
                            </div>
                            <div style={{ fontSize: '0.76rem', color: '#64748b' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        {u.isEmailVerified ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              background: '#f0fdf4',
                              color: '#16a34a',
                              border: '1px solid #bbf7d0',
                              padding: '3px 8px',
                              borderRadius: 6,
                              fontSize: '0.74rem',
                              fontWeight: 700,
                            }}
                          >
                            <CheckCircle2 size={12} />
                            <span>Terverifikasi</span>
                          </span>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                background: '#fffbeb',
                                color: '#b45309',
                                border: '1px solid #fde68a',
                                padding: '3px 8px',
                                borderRadius: 6,
                                fontSize: '0.74rem',
                                fontWeight: 700,
                              }}
                            >
                              <AlertTriangle size={12} />
                              <span>Belum Terverifikasi</span>
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleManualVerifyUser(u);
                              }}
                              style={{
                                background: '#ecfdf5',
                                border: '1.5px solid #10b981',
                                color: '#047857',
                                padding: '3px 8px',
                                borderRadius: 6,
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                              title="Konfirmasi Verifikasi Email Manual"
                            >
                              <MailCheck size={11} />
                              <span>Verifikasi</span>
                            </button>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        {u.role === 'Admin' || u.role === 'admin' ? (
                          <span
                            style={{
                              fontSize: '0.74rem',
                              fontWeight: 800,
                              padding: '4px 10px',
                              borderRadius: 6,
                              background: '#fef2f2',
                              color: '#dc2626',
                              border: '1.5px solid #f87171',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                            }}
                          >
                            <ShieldAlert size={12} />
                            <span>Admin</span>
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: 6,
                              background:
                                u.role === 'Owner'
                                  ? '#f0fdf4'
                                  : u.role === 'Reviewer'
                                  ? '#f5f3ff'
                                  : u.role === 'Editor'
                                  ? '#eff6ff'
                                  : '#f1f5f9',
                              color:
                                u.role === 'Owner'
                                  ? '#16a34a'
                                  : u.role === 'Reviewer'
                                  ? '#7c3aed'
                                  : u.role === 'Editor'
                                  ? '#2563eb'
                                  : '#475569',
                              border: '1px solid currentColor',
                            }}
                          >
                            {u.role || 'Owner'}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        {u.role === 'Admin' || u.role === 'admin' || u.plan === 'admin' ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <span
                              style={{
                                fontWeight: 800,
                                fontSize: '0.76rem',
                                letterSpacing: '0.02em',
                                padding: '4px 10px',
                                borderRadius: 8,
                                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                                color: '#38bdf8',
                                border: '1.5px solid #38bdf8',
                                boxShadow: '0 2px 6px rgba(56, 189, 248, 0.25)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                              }}
                            >
                              <ShieldCheck size={13} style={{ color: '#38bdf8' }} />
                              <span>Akses Sistem (Admin)</span>
                            </span>
                          </div>
                        ) : (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <span
                              style={{
                                fontWeight: 900,
                                fontSize: '0.76rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                                padding: '4px 10px',
                                borderRadius: 8,
                                background:
                                  u.plan === 'team'
                                    ? 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)'
                                    : u.plan === 'pro'
                                    ? 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)'
                                    : '#f1f5f9',
                                color:
                                  u.plan === 'team'
                                    ? '#6d28d9'
                                    : u.plan === 'pro'
                                    ? '#15803d'
                                    : '#475569',
                                border: `1.5px solid ${
                                  u.plan === 'team'
                                    ? '#c4b5fd'
                                    : u.plan === 'pro'
                                    ? '#86efac'
                                    : '#cbd5e1'
                                }`,
                                boxShadow:
                                  u.plan === 'team'
                                    ? '0 2px 6px rgba(124, 58, 237, 0.15)'
                                    : u.plan === 'pro'
                                    ? '0 2px 6px rgba(22, 163, 74, 0.15)'
                                    : 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                              }}
                            >
                              <span
                                style={{
                                  width: 7,
                                  height: 7,
                                  borderRadius: '50%',
                                  background:
                                    u.plan === 'team'
                                      ? '#7c3aed'
                                      : u.plan === 'pro'
                                      ? '#16a34a'
                                      : '#94a3b8',
                                  boxShadow:
                                    u.plan !== 'free'
                                      ? `0 0 6px ${u.plan === 'team' ? '#7c3aed' : '#16a34a'}`
                                      : 'none',
                                }}
                              />
                              <span>{u.plan}</span>
                            </span>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 18px', color: '#475569', fontWeight: 600 }}>
                        {u.storageMb} MB
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginasi Manajemen Pengguna */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 18px',
            background: '#ffffff',
            borderTop: '1px solid #e2e8f0',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Menampilkan{' '}
            <strong style={{ color: '#0f172a' }}>
              {filteredUsers.length === 0 ? 0 : startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredUsers.length)}
            </strong>{' '}
            dari <strong style={{ color: '#0f172a' }}>{filteredUsers.length}</strong> pengguna
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '6px 12px',
                borderRadius: 6,
                border: '1.5px solid #cbd5e1',
                background: safePage <= 1 ? '#f8fafc' : '#ffffff',
                color: safePage <= 1 ? '#94a3b8' : '#0f172a',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: safePage <= 1 ? 'not-allowed' : 'pointer',
              }}
            >
              <ChevronLeft size={14} />
              <span>Sebelumnya</span>
            </button>

            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pg) => {
              const isActive = pg === safePage;
              return (
                <button
                  key={pg}
                  type="button"
                  onClick={() => setCurrentPage(pg)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    border: `1.5px solid ${isActive ? '#16a34a' : '#cbd5e1'}`,
                    background: isActive ? '#16a34a' : '#ffffff',
                    color: isActive ? '#ffffff' : '#0f172a',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: isActive ? '2px 2px 0px #0f172a' : 'none',
                  }}
                >
                  {pg}
                </button>
              );
            })}

            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '6px 12px',
                borderRadius: 6,
                border: '1.5px solid #cbd5e1',
                background: safePage >= totalPages ? '#f8fafc' : '#ffffff',
                color: safePage >= totalPages ? '#94a3b8' : '#0f172a',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: safePage >= totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              <span>Selanjutnya</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>


      {/* Modal Ubah Paket */}
      {selectedUser && (
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
          <div className="uda-card" style={{ maxWidth: 440, width: '100%', padding: 24 }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 4 }}>Ubah Paket Pengguna</h3>
            <p style={{ color: '#64748b', fontSize: '0.82rem', marginBottom: 18 }}>
              {selectedUser.name} ({selectedUser.email})
            </p>

            <form onSubmit={handleUpdatePlan} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Pilih Paket Baru
                </label>
                <select
                  value={newPlan}
                  onChange={(e) => setNewPlan(e.target.value as any)}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, outline: 'none' }}
                >
                  <option value="free">Gratis (Free)</option>
                  <option value="pro">Pro (Rp 49.000 / 30 hari)</option>
                  <option value="team">Tim Agensi (Rp 149.000 / 30 hari)</option>
                </select>
              </div>

              {newPlan !== 'free' && (
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Tambahan Durasi Aktif (Hari)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={durationDays}
                    onChange={(e) => setDurationDays(Number(e.target.value))}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, outline: 'none' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  className="btn-uda btn-uda-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setSelectedUser(null)}
                >
                  Batal
                </button>
                <button type="submit" className="btn-uda btn-uda-primary" style={{ flex: 1 }}>
                  Simpan Paket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Hapus Pengguna Secara Permanen */}
      {userToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: 20,
          }}
        >
          <div
            className="uda-card"
            style={{
              maxWidth: 480,
              width: '100%',
              padding: 26,
              border: '2.5px solid #0f172a',
              boxShadow: '8px 8px 0px #0f172a',
              background: '#ffffff',
            }}
          >
            {/* Header Modal */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: '#fee2e2',
                  border: '2px solid #ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#dc2626',
                  flexShrink: 0,
                  boxShadow: '2px 2px 0px #0f172a',
                }}
              >
                <AlertTriangle size={24} />
              </div>
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    background: '#fee2e2',
                    color: '#b91c1c',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 999,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    marginBottom: 2,
                    border: '1px solid #f87171',
                  }}
                >
                  Tindakan Permanen
                </span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                  Hapus Pengguna Secara Permanen?
                </h3>
              </div>
            </div>

            {/* Kotak Info Pengguna */}
            <div
              style={{
                background: '#f8fafc',
                border: '1.5px solid #cbd5e1',
                borderRadius: 8,
                padding: '12px 14px',
                marginBottom: 16,
                fontSize: '0.84rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Nama:</span>
                <span style={{ color: '#0f172a', fontWeight: 800 }}>{userToDelete.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Email:</span>
                <span style={{ color: '#0f172a', fontWeight: 800 }}>{userToDelete.email}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Paket Saat Ini:</span>
                <span style={{ color: '#16a34a', fontWeight: 800, textTransform: 'uppercase' }}>{userToDelete.plan}</span>
              </div>
            </div>

            {/* Peringatan & Aturan Pendaftaran Kembali */}
            <div
              style={{
                background: '#fff1f2',
                border: '1.5px solid #fecdd3',
                borderRadius: 8,
                padding: '12px 14px',
                marginBottom: 20,
                fontSize: '0.82rem',
                lineHeight: 1.5,
                color: '#9f1239',
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: 4 }}>⚠️ Konsekuensi Penghapusan:</div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>Semua profil, postingan kalender, dan brand pengguna ini akan dihapus permanen.</li>
                <li>
                  <strong>Pendaftaran Kembali:</strong> Email <u>{userToDelete.email}</u> dapat didaftarkan kembali di masa depan, dan statusnya akan <strong>murni menjadi pengguna baru</strong> (wajib melengkapi profil awal dan mengikuti pengenalan sistem).
                </li>
              </ul>
            </div>

            {/* Tombol Aksi */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn-uda btn-uda-secondary"
                style={{ flex: 1, height: 42 }}
                disabled={isDeleting}
                onClick={() => setUserToDelete(null)}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn-uda"
                disabled={isDeleting}
                onClick={handleConfirmDeletePermanent}
                style={{
                  flex: 1.4,
                  height: 42,
                  background: '#dc2626',
                  color: '#ffffff',
                  border: '2px solid #0f172a',
                  boxShadow: '3px 3px 0px #0f172a',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  opacity: isDeleting ? 0.7 : 1,
                }}
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    <span>Ya, Hapus Permanen</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Hapus Massal Pengguna (Bulk Delete) */}
      {showBulkDeleteModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: 20,
          }}
        >
          <div
            className="uda-card"
            style={{
              maxWidth: 520,
              width: '100%',
              padding: 26,
              border: '2.5px solid #0f172a',
              boxShadow: '8px 8px 0px #0f172a',
              background: '#ffffff',
            }}
          >
            {/* Header Modal */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 12,
                  background: '#fee2e2',
                  border: '2px solid #ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#dc2626',
                  flexShrink: 0,
                  boxShadow: '2px 2px 0px #0f172a',
                }}
              >
                <Trash2 size={24} />
              </div>
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    background: '#fee2e2',
                    color: '#b91c1c',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 999,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    marginBottom: 2,
                    border: '1px solid #f87171',
                  }}
                >
                  Penghapusan Massal
                </span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                  Hapus {selectedUserIds.length} Pengguna Permanen?
                </h3>
              </div>
            </div>

            {/* List Pengguna Terpilih */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b', marginBottom: 6 }}>
                Daftar akun yang akan dihapus ({selectedUserIds.length} akun):
              </div>
              <div
                style={{
                  maxHeight: 180,
                  overflowY: 'auto',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: 10,
                  padding: '8px 12px',
                  background: '#f8fafc',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                {users
                  .filter((u) => selectedUserIds.includes(u.id))
                  .map((u) => (
                    <div
                      key={u.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 8px',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: 6,
                        fontSize: '0.82rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            background: '#16a34a',
                            color: '#ffffff',
                            fontWeight: 800,
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {(u.name || u.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, color: '#0f172a' }}>{u.name}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{u.email}</div>
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: '#f1f5f9',
                          color: '#475569',
                        }}
                      >
                        {u.plan}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Peringatan & Aturan Pendaftaran Kembali */}
            <div
              style={{
                background: '#fff1f2',
                border: '1.5px solid #fecdd3',
                borderRadius: 8,
                padding: '12px 14px',
                marginBottom: 20,
                fontSize: '0.82rem',
                lineHeight: 1.5,
                color: '#9f1239',
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: 4 }}>⚠️ Konsekuensi Penghapusan Massal:</div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>Semua profil, postingan kalender, dan brand dari <strong>{selectedUserIds.length} pengguna</strong> ini akan dihapus permanen.</li>
                <li>Tindakan ini tidak dapat dibatalkan (irreversible).</li>
                <li>Email mereka dapat didaftarkan kembali sebagai akun baru di masa mendatang jika diinginkan.</li>
              </ul>
            </div>

            {/* Tombol Aksi */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn-uda btn-uda-secondary"
                style={{ flex: 1, height: 42 }}
                disabled={isBulkDeleting}
                onClick={() => setShowBulkDeleteModal(false)}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn-uda"
                disabled={isBulkDeleting}
                onClick={handleConfirmBulkDelete}
                style={{
                  flex: 1.5,
                  height: 42,
                  background: '#dc2626',
                  color: '#ffffff',
                  border: '2px solid #0f172a',
                  boxShadow: '3px 3px 0px #0f172a',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: isBulkDeleting ? 'not-allowed' : 'pointer',
                  opacity: isBulkDeleting ? 0.7 : 1,
                }}
              >
                {isBulkDeleting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Menghapus {selectedUserIds.length} Akun...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    <span>Ya, Hapus {selectedUserIds.length} Pengguna</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pop-up Detail Profil Pengguna Lengkap */}
      {detailUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 105,
            padding: 20,
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setDetailUser(null);
          }}
        >
          <div
            className="uda-card"
            style={{
              maxWidth: 540,
              width: '100%',
              maxHeight: 'min(90vh, 720px)',
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
              borderRadius: 16,
              background: '#ffffff',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '2.5px solid #0f172a',
            }}
          >
            {/* Header Banner */}
            <div
              style={{
                height: 90,
                background: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #10b981 100%)',
                position: 'relative',
                padding: '12px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <div style={{ color: '#ffffff', fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Detail Akun Pengguna
              </div>
              <button
                type="button"
                onClick={() => setDetailUser(null)}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.3)',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Profile Info & Avatar */}
            <div style={{ padding: '0 24px 24px', marginTop: -42, position: 'relative', overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                {/* Large Avatar */}
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: '#16a34a',
                    color: '#ffffff',
                    border: '4px solid #ffffff',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    fontWeight: 800,
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  {detailUser.avatarUrl ? (
                    <img
                      src={detailUser.avatarUrl}
                      alt={detailUser.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span>{(detailUser.name || 'U').charAt(0).toUpperCase()}</span>
                  )}
                </div>

                {/* Status Badges */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      padding: '4px 10px',
                      borderRadius: 999,
                      background:
                        detailUser.role === 'Admin' || detailUser.role === 'admin' || detailUser.plan === 'admin' || detailUser.email?.toLowerCase().startsWith('admin')
                          ? '#fef2f2'
                          : detailUser.role === 'Owner'
                          ? '#f0fdf4'
                          : detailUser.role === 'Reviewer'
                          ? '#f5f3ff'
                          : detailUser.role === 'Editor'
                          ? '#eff6ff'
                          : '#f1f5f9',
                      color:
                        detailUser.role === 'Admin' || detailUser.role === 'admin' || detailUser.plan === 'admin' || detailUser.email?.toLowerCase().startsWith('admin')
                          ? '#dc2626'
                          : detailUser.role === 'Owner'
                          ? '#16a34a'
                          : detailUser.role === 'Reviewer'
                          ? '#7c3aed'
                          : detailUser.role === 'Editor'
                          ? '#2563eb'
                          : '#475569',
                      border: '1.5px solid currentColor',
                    }}
                  >
                    Role: {detailUser.role === 'Admin' || detailUser.role === 'admin' || detailUser.plan === 'admin' || detailUser.email?.toLowerCase().startsWith('admin') ? 'Admin' : (detailUser.role || 'Member')}
                  </span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      padding: '4px 10px',
                      borderRadius: 999,
                      background: detailUser.isSuspended ? '#fee2e2' : '#dcfce7',
                      color: detailUser.isSuspended ? '#dc2626' : '#166534',
                      border: `1.5px solid ${detailUser.isSuspended ? '#f87171' : '#86efac'}`,
                    }}
                  >
                    {detailUser.isSuspended ? '● Ditangguhkan' : '● Akun Aktif'}
                  </span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      padding: '4px 10px',
                      borderRadius: 999,
                      background: detailUser.isEmailVerified ? '#dcfce7' : '#fef3c7',
                      color: detailUser.isEmailVerified ? '#166534' : '#92400e',
                      border: `1.5px solid ${detailUser.isEmailVerified ? '#86efac' : '#fcd34d'}`,
                    }}
                  >
                    {detailUser.isEmailVerified ? '● Email Terverifikasi' : '● Belum Verifikasi'}
                  </span>
                </div>
              </div>

              {/* User Names */}
              <div style={{ marginTop: 12 }}>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.2 }}>
                  {detailUser.name}
                </h2>
                <div style={{ color: '#64748b', fontSize: '0.86rem', marginTop: 2 }}>
                  {detailUser.email}
                </div>
              </div>

              {/* Status Verifikasi Email Banner */}
              <div
                style={{
                  marginTop: 14,
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: detailUser.isEmailVerified ? '#f0fdf4' : '#fffbeb',
                  border: `1.5px solid ${detailUser.isEmailVerified ? '#bbf7d0' : '#fde68a'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {detailUser.isEmailVerified ? (
                    <CheckCircle2 size={20} style={{ color: '#16a34a', flexShrink: 0 }} />
                  ) : (
                    <AlertTriangle size={20} style={{ color: '#d97706', flexShrink: 0 }} />
                  )}
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: detailUser.isEmailVerified ? '#166534' : '#92400e' }}>
                      {detailUser.isEmailVerified ? 'Email Terverifikasi' : 'Email Belum Terverifikasi (Pendaftaran Email)'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: detailUser.isEmailVerified ? '#15803d' : '#b45309' }}>
                      {detailUser.isEmailVerified
                        ? 'Pengguna memiliki akses penuh dan status email telah aktif.'
                        : 'Jika pengguna terkendala menerima pesan email konfirmasi, Admin dapat memverifikasi akun ini secara manual.'}
                    </div>
                  </div>
                </div>

                {!detailUser.isEmailVerified && (
                  <button
                    type="button"
                    onClick={() => handleManualVerifyUser(detailUser)}
                    style={{
                      background: '#059669',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 8,
                      padding: '7px 14px',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: '0 2px 6px rgba(5,150,105,0.3)',
                    }}
                  >
                    <MailCheck size={14} />
                    <span>Verifikasi Manual Sekarang</span>
                  </button>
                )}
              </div>

              {/* Grid 4 Metric Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 12,
                  marginTop: 18,
                  marginBottom: 18,
                }}
              >
                {/* Paket Aktif / Hak Akses Sistem */}
                <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                    {detailUser.role === 'Admin' || detailUser.role === 'admin' || detailUser.plan === 'admin' || detailUser.email?.toLowerCase().startsWith('admin')
                      ? 'Hak Akses Sistem'
                      : 'Paket Langganan'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                    {detailUser.role === 'Admin' || detailUser.role === 'admin' || detailUser.plan === 'admin' || detailUser.email?.toLowerCase().startsWith('admin') ? (
                      <>
                        <span
                          style={{
                            fontSize: '0.9rem',
                            fontWeight: 900,
                            color: '#dc2626',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <ShieldCheck size={15} />
                          Akses Admin (Penuh)
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          (Pengelola Sistem — Tanpa Paket)
                        </span>
                      </>
                    ) : (
                      <>
                        <span
                          style={{
                            fontSize: '0.9rem',
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            color: detailUser.plan === 'team' ? '#7c3aed' : detailUser.plan === 'pro' ? '#16a34a' : '#0f172a',
                          }}
                        >
                          {detailUser.plan}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          ({detailUser.planUntil ? `Hingga ${detailUser.planUntil}` : 'Masa Aktif Selamanya'})
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Brand Terpasang */}
                <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                    Brand Terpasang
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Layers size={14} style={{ color: '#16a34a' }} />
                    <span>{detailUser.brandsCount} Akun Brand</span>
                  </div>
                </div>

                {/* Penyimpanan Digunakan */}
                <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                    Kapasitas Penyimpanan
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <HardDrive size={14} style={{ color: '#2563eb' }} />
                    <span>{detailUser.storageMb} MB Digunakan</span>
                  </div>
                </div>

                {/* Total Postingan */}
                <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                    Konten Dijadwalkan
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FileText size={14} style={{ color: '#f59e0b' }} />
                    <span>{detailUser.postsCount ?? 0} Postingan Dibuat</span>
                  </div>
                </div>
              </div>

              {/* Info Tambahan Kontak & Terdaftar */}
              <div
                style={{
                  background: '#f1f5f9',
                  borderRadius: 10,
                  padding: '10px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.78rem',
                  color: '#475569',
                  marginBottom: 20,
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Phone size={13} style={{ color: '#64748b' }} />
                  <span>Kontak: <strong>{detailUser.phone || '-'}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={13} style={{ color: '#64748b' }} />
                  <span>Bergabung: <strong>{detailUser.createdAt}</strong></span>
                </div>
              </div>

              {/* Tombol Aksi Admin */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {!(detailUser.role === 'Admin' || detailUser.role === 'admin' || detailUser.plan === 'admin' || detailUser.email?.toLowerCase().startsWith('admin')) && (
                  <button
                    type="button"
                    className="btn-uda btn-uda-primary"
                    style={{ flex: 1, minWidth: 120, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    onClick={() => {
                      setSelectedUser(detailUser);
                      setNewPlan(detailUser.plan === 'admin' ? 'pro' : detailUser.plan);
                    }}
                  >
                    <Edit size={14} />
                    <span>Ubah Paket</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleToggleSuspend(detailUser.id, detailUser.isSuspended)}
                  style={{
                    flex: 1,
                    minWidth: 130,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '10px 14px',
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    border: `1.5px solid ${detailUser.isSuspended ? '#16a34a' : '#ef4444'}`,
                    background: detailUser.isSuspended ? '#f0fdf4' : '#fff1f2',
                    color: detailUser.isSuspended ? '#16a34a' : '#dc2626',
                    cursor: 'pointer',
                  }}
                >
                  {detailUser.isSuspended ? 'Aktifkan Akun' : 'Bekukan Akun'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const u = detailUser;
                    setDetailUser(null);
                    setUserToDelete(u);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '10px 14px',
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    border: '1.5px solid #fecaca',
                    background: '#fff1f2',
                    color: '#e11d48',
                    cursor: 'pointer',
                  }}
                  title="Hapus Akun Pengguna"
                >
                  <Trash2 size={14} />
                  <span>Hapus</span>
                </button>

                <button
                  type="button"
                  className="btn-uda btn-uda-secondary"
                  onClick={() => setDetailUser(null)}
                  style={{ padding: '0 18px' }}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

