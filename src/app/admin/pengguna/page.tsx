'use client';

import React, { useState } from 'react';
import { Users, Search, Edit, ShieldAlert, ShieldCheck, RefreshCw, CheckCircle2, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { AdminService, AdminUserItem } from '@/services/admin.service';
import { useModal } from '@/contexts/modal-context';

export default function AdminPenggunaPage() {
  const { showSuccess, confirmAction } = useModal();
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);
  const [userToDelete, setUserToDelete] = useState<AdminUserItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newPlan, setNewPlan] = useState<'free' | 'pro' | 'team'>('pro');
  const [durationDays, setDurationDays] = useState(30);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  React.useEffect(() => {
    AdminService.getAdminUsers().then((data) => {
      if (data && data.length > 0) setUsers(data);
    });
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    await AdminService.updateUserPlan(selectedUser.userId || selectedUser.id, newPlan, durationDays);

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
          Kelola seluruh akun terdaftar, pantau paket langganan aktif, ubah masa aktif paket manual, atau nonaktifkan akun bermasalah.
        </p>
      </div>

      {/* Search Bar */}
      <div style={{ maxWidth: 400, position: 'relative' }}>
        <input
          type="text"
          placeholder="Cari nama atau email pengguna..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: '10px 14px 10px 38px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.88rem', outline: 'none' }}
        />
        <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
      </div>

      {/* Tabel Pengguna */}
      <div className="uda-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                <th style={{ padding: '14px 18px' }}>Pengguna</th>
                <th style={{ padding: '14px 18px' }}>Paket Aktif</th>
                <th style={{ padding: '14px 18px' }}>Masa Berlaku</th>
                <th style={{ padding: '14px 18px' }}>Brand</th>
                <th style={{ padding: '14px 18px' }}>Penyimpanan</th>
                <th style={{ padding: '14px 18px' }}>Status</th>
                <th style={{ padding: '14px 18px', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{u.name}</div>
                    <div style={{ fontSize: '0.76rem', color: '#64748b' }}>{u.email}</div>
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <span
                      style={{
                        fontWeight: 800,
                        fontSize: '0.74rem',
                        textTransform: 'uppercase',
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: u.plan === 'team' ? '#f5f3ff' : u.plan === 'pro' ? '#f0fdf4' : '#f1f5f9',
                        color: u.plan === 'team' ? '#7c3aed' : u.plan === 'pro' ? '#16a34a' : '#475569',
                      }}
                    >
                      {u.plan}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px', color: '#64748b' }}>
                    {u.planUntil ? `Sampai ${u.planUntil}` : 'Selamanya (Gratis)'}
                  </td>
                  <td style={{ padding: '14px 18px', fontWeight: 600 }}>{u.brandsCount} Akun</td>
                  <td style={{ padding: '14px 18px', color: '#64748b' }}>{u.storageMb} MB</td>
                  <td style={{ padding: '14px 18px' }}>
                    {u.isSuspended ? (
                      <span style={{ background: '#fef2f2', color: '#dc2626', padding: '3px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 }}>
                        Dinonaktifkan
                      </span>
                    ) : (
                      <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '3px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 }}>
                        Aktif
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button
                        className="btn-uda btn-uda-secondary btn-uda-sm"
                        onClick={() => {
                          setSelectedUser(u);
                          setNewPlan(u.plan);
                        }}
                        title="Ubah Paket Manual"
                      >
                        <Edit size={12} />
                        <span>Ubah Paket</span>
                      </button>
                      <button
                        onClick={() => handleToggleSuspend(u.id, u.isSuspended)}
                        style={{
                          background: 'none',
                          border: `1px solid ${u.isSuspended ? '#bbf7d0' : '#fecaca'}`,
                          color: u.isSuspended ? '#16a34a' : '#dc2626',
                          padding: '4px 8px',
                          borderRadius: 6,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {u.isSuspended ? 'Aktifkan' : 'Bekukan'}
                      </button>
                      <button
                        onClick={() => setUserToDelete(u)}
                        style={{
                          background: '#fff1f2',
                          border: '1.5px solid #f43f5e',
                          color: '#e11d48',
                          padding: '4px 8px',
                          borderRadius: 6,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                        title="Hapus Pengguna Secara Permanen"
                      >
                        <Trash2 size={12} />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
    </div>
  );
}
