'use client';

import React, { useState, useEffect } from 'react';
import {
  Landmark,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Save,
  X,
  CreditCard,
  Copy,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { BankService, BankAccountItem } from '@/services/bank.service';
import { useModal } from '@/contexts/modal-context';

export default function AdminRekeningPage() {
  const { showSuccess, showError, confirmAction } = useModal();
  const [bankAccounts, setBankAccounts] = useState<BankAccountItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccountItem | null>(null);

  // Form State
  const [bankName, setBankName] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await BankService.getAllBankAccounts();
      setBankAccounts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingAccount(null);
    setBankName('');
    setBankCode('');
    setAccountNumber('');
    setAccountName('PT. Koding Teknologi Asia');
    setLogoUrl('');
    setIsActive(true);
    setSortOrder(bankAccounts.length + 1);
    setShowModal(true);
  };

  const openEditModal = (acc: BankAccountItem) => {
    setEditingAccount(acc);
    setBankName(acc.bankName);
    setBankCode(acc.bankCode);
    setAccountNumber(acc.accountNumber);
    setAccountName(acc.accountName);
    setLogoUrl(acc.logoUrl || '');
    setIsActive(acc.isActive);
    setSortOrder(acc.sortOrder);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName || !accountNumber || !accountName) {
      showError('Data Tidak Lengkap', 'Nama bank, nomor rekening, dan nama pemilik rekening wajib diisi.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingAccount) {
        await BankService.updateBankAccount(editingAccount.id, {
          bankName,
          bankCode: bankCode || bankName.toLowerCase().replace(/[^a-z0-9]/g, ''),
          accountNumber,
          accountName,
          logoUrl: logoUrl || null,
          isActive,
          sortOrder,
        });
        showSuccess('Rekening Diperbarui!', `Data rekening ${bankName} berhasil disimpan ke database.`);
      } else {
        await BankService.createBankAccount({
          bankName,
          bankCode: bankCode || bankName.toLowerCase().replace(/[^a-z0-9]/g, ''),
          accountNumber,
          accountName,
          logoUrl: logoUrl || null,
          isActive,
          sortOrder,
        });
        showSuccess('Rekening Ditambahkan!', `Rekening ${bankName} berhasil ditambahkan dan siap digunakan pengguna.`);
      }

      setShowModal(false);
      await loadData();
    } catch (err: any) {
      showError('Gagal Menyimpan Rekening', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (acc: BankAccountItem) => {
    await BankService.updateBankAccount(acc.id, { isActive: !acc.isActive });
    setBankAccounts((prev) =>
      prev.map((b) => (b.id === acc.id ? { ...b, isActive: !acc.isActive } : b))
    );
    showSuccess(
      'Status Rekening Diperbarui',
      `Rekening ${acc.bankName} sekarang berstatus ${!acc.isActive ? 'Aktif (dapat dipilih pengguna)' : 'Nonaktif'}.`
    );
  };

  const handleDelete = (acc: BankAccountItem) => {
    confirmAction({
      title: 'Hapus Rekening Bank?',
      message: `Apakah Anda yakin ingin menghapus rekening "${acc.bankName} - ${acc.accountNumber}"? Transaksi pembayaran lama yang telah selesai tidak akan terpengaruh.`,
      danger: true,
      confirmText: 'Ya, Hapus',
      onConfirm: async () => {
        await BankService.deleteBankAccount(acc.id);
        await loadData();
        showSuccess('Rekening Dihapus', `Rekening ${acc.bankName} berhasil dihapus.`);
      },
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header Halaman */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Landmark size={24} style={{ color: '#16a34a' }} />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>
              Pengelolaan Rekening Bank Transfer
            </h1>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.88rem' }}>
            Atur daftar rekening bank tujuan transfer pembayaran manual yang muncul di halaman upgrade langganan pengguna.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="btn-uda btn-uda-primary btn-uda-sm"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
        >
          <Plus size={16} />
          <span>Tambah Rekening Baru</span>
        </button>
      </div>

      {/* Grid Kartu Rekening Bank */}
      {isLoading ? (
        <div style={{ padding: '48px 24px', textAlign: 'center', color: '#64748b' }}>
          <Loader2 size={32} className="animate-spin" style={{ color: '#16a34a', margin: '0 auto 12px' }} />
          <div>Memuat data rekening bank...</div>
        </div>
      ) : bankAccounts.length === 0 ? (
        <div className="uda-card" style={{ padding: '48px 24px', textAlign: 'center', color: '#64748b' }}>
          <Landmark size={40} style={{ margin: '0 auto 12px', color: '#94a3b8' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
            Belum Ada Rekening Bank
          </h3>
          <p style={{ fontSize: '0.88rem', marginBottom: 20 }}>
            Tambahkan rekening bank resmi perusahaan untuk menerima transfer pembayaran paket dari pengguna.
          </p>
          <button onClick={openAddModal} className="btn-uda btn-uda-primary btn-uda-sm">
            <Plus size={16} />
            <span>Tambah Rekening Sekarang</span>
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
            gap: 20,
          }}
        >
          {bankAccounts.map((acc) => (
            <div
              key={acc.id}
              className="uda-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: 24,
                borderRadius: 18,
                border: acc.isActive ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                backgroundColor: acc.isActive ? '#ffffff' : '#f8fafc',
                boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
                opacity: acc.isActive ? 1 : 0.75,
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        backgroundColor: '#f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 6,
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      {acc.logoUrl ? (
                        <img
                          src={acc.logoUrl}
                          alt={acc.bankName}
                          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                          onError={(e) => {
                            (e.currentTarget as any).style.display = 'none';
                          }}
                        />
                      ) : (
                        <CreditCard size={22} style={{ color: '#64748b' }} />
                      )}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{acc.bankName}</h3>
                      <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Kode: {acc.bankCode}</div>
                    </div>
                  </div>

                  <span
                    className="status-pill"
                    style={{
                      backgroundColor: acc.isActive ? '#dcfce7' : '#f1f5f9',
                      color: acc.isActive ? '#15803d' : '#64748b',
                      fontSize: '0.72rem',
                    }}
                  >
                    {acc.isActive ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>

                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: '12px 14px',
                    marginBottom: 16,
                  }}
                >
                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Nomor Rekening:</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', letterSpacing: '0.04em', margin: '2px 0 6px' }}>
                    {acc.accountNumber}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#334155' }}>
                    Atas Nama: <strong>{acc.accountName}</strong>
                  </div>
                </div>

                <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 14 }}>
                  Urutan Tampilan: <strong>#{acc.sortOrder}</strong>
                </div>
              </div>

              {/* Tombol Aksi */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
                <button
                  onClick={() => handleToggleActive(acc)}
                  className="btn-uda btn-uda-secondary btn-uda-sm"
                  style={{ fontSize: '0.78rem', fontWeight: 700 }}
                >
                  {acc.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                </button>

                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => openEditModal(acc)}
                    className="btn-uda btn-uda-secondary btn-uda-sm"
                    style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 4 }}
                    title="Edit Rekening"
                  >
                    <Edit2 size={13} />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => handleDelete(acc)}
                    className="btn-uda btn-uda-sm"
                    style={{
                      fontSize: '0.78rem',
                      backgroundColor: '#fef2f2',
                      color: '#dc2626',
                      border: '1px solid #fecaca',
                    }}
                    title="Hapus Rekening"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL TAMBAH / EDIT REKENING */}
      {showModal && (
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
              maxWidth: 500,
              width: '100%',
              padding: 24,
              borderRadius: 20,
              backgroundColor: '#ffffff',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Landmark size={22} style={{ color: '#16a34a' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  {editingAccount ? 'Edit Rekening Bank' : 'Tambah Rekening Bank Baru'}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Nama Bank *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: BCA (Bank Central Asia)"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.88rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Nomor Rekening *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 8839210928"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.88rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Nama Pemilik Rekening (Atas Nama) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: PT. Koding Teknologi Asia"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.88rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                  URL Logo Bank (Opsional)
                </label>
                <input
                  type="url"
                  placeholder="https://.../bank-logo.svg"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.88rem', outline: 'none' }}
                />
              </div>

              <div className="admin-modal-grid-2col">
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Urutan Tampilan
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(parseInt(e.target.value) || 1)}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.88rem', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Status Rekening
                  </label>
                  <select
                    value={isActive ? 'true' : 'false'}
                    onChange={(e) => setIsActive(e.target.value === 'true')}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.88rem', outline: 'none', backgroundColor: '#ffffff' }}
                  >
                    <option value="true">Aktif (Tampil di Pembayaran)</option>
                    <option value="false">Nonaktif (Disembunyikan)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={isSaving}
                  className="btn-uda btn-uda-secondary"
                  style={{ fontWeight: 700, fontSize: '0.86rem', flex: '1 1 100px', justifyContent: 'center' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-uda btn-uda-primary"
                  style={{
                    fontWeight: 800,
                    fontSize: '0.86rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    flex: '1 1 160px',
                  }}
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>{editingAccount ? 'Simpan' : 'Tambah Rekening'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
