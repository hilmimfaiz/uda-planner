'use client';

import React, { useState } from 'react';
import { Users, Search, Edit, ShieldAlert, ShieldCheck, RefreshCw, CheckCircle2 } from 'lucide-react';

interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  plan: 'free' | 'pro' | 'team';
  planUntil: string | null;
  brandsCount: number;
  storageMb: number;
  isSuspended: boolean;
  createdAt: string;
}

export default function AdminPenggunaPage() {
  const [users, setUsers] = useState<AdminUserItem[]>([
    {
      id: 'usr-1',
      name: 'Administrator UdaPlanner',
      email: 'admin@udaplanner.id',
      plan: 'team',
      planUntil: null,
      brandsCount: 5,
      storageMb: 120,
      isSuspended: false,
      createdAt: '10 Okt 2026',
    },
    {
      id: 'usr-2',
      name: 'Rizki Pratama',
      email: 'rizki@udacoding.id',
      plan: 'pro',
      planUntil: '12 Nov 2026',
      brandsCount: 3,
      storageMb: 450,
      isSuspended: false,
      createdAt: '11 Okt 2026',
    },
    {
      id: 'usr-3',
      name: 'Sarah Rahmawati',
      email: 'sarah@udaplanner.id',
      plan: 'free',
      planUntil: null,
      brandsCount: 1,
      storageMb: 45,
      isSuspended: false,
      createdAt: '12 Okt 2026',
    },
    {
      id: 'usr-4',
      name: 'Budi Santoso',
      email: 'budi@gmail.com',
      plan: 'free',
      planUntil: null,
      brandsCount: 1,
      storageMb: 15,
      isSuspended: false,
      createdAt: '13 Okt 2026',
    },
    {
      id: 'usr-5',
      name: 'Spam User Example',
      email: 'spam@botmail.com',
      plan: 'free',
      planUntil: null,
      brandsCount: 0,
      storageMb: 0,
      isSuspended: true,
      createdAt: '08 Okt 2026',
    },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);
  const [newPlan, setNewPlan] = useState<'free' | 'pro' | 'team'>('pro');
  const [durationDays, setDurationDays] = useState(30);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleUpdatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

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

    setSelectedUser(null);
    showToast(`Paket pengguna berhasil diubah menjadi ${newPlan.toUpperCase()}`);
  };

  const handleToggleSuspend = (id: string, currentStatus: boolean) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, isSuspended: !currentStatus } : u))
    );
    showToast(currentStatus ? 'Akun telah diaktifkan kembali.' : 'Akun berhasil dinonaktifkan (suspended).');
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
    </div>
  );
}
