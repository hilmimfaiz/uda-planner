"use client";

import React, { useState } from "react";
import { CreditCard, Clock, CheckCircle2, XCircle } from "lucide-react";

type Payment = {
  id: string;
  user: string;
  plan: string;
  amount: number;
  bank: string;
  date: string;
  status: "Menunggu" | "Disetujui" | "Ditolak";
};

const initialPayments: Payment[] = [
  {
    id: "PAY-001",
    user: "Budi Santoso",
    plan: "Pro",
    amount: 49000,
    bank: "BCA",
    date: "13 Okt 2026",
    status: "Menunggu",
  },
  {
    id: "PAY-002",
    user: "Agensi Kreatif Muda",
    plan: "Tim",
    amount: 149000,
    bank: "Mandiri",
    date: "13 Okt 2026",
    status: "Menunggu",
  },
];

export default function AdminPembayaranPage() {
  const [payments, setPayments] = useState(initialPayments);
  const [filter, setFilter] = useState("Semua");

  const updateStatus = (id: string, status: Payment["status"]) => {
    setPayments((current) =>
      current.map((payment) =>
        payment.id === id ? { ...payment, status } : payment,
      ),
    );
  };

  const filteredPayments =
    filter === "Semua"
      ? payments
      : payments.filter((payment) => payment.status === filter);

  const money = (amount: number) => `Rp ${amount.toLocaleString("id-ID")}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#0f172a" }}>
          Manajemen Pembayaran
        </h1>
        <p style={{ color: "#64748b", marginTop: 6 }}>
          Periksa dan kelola status pembayaran pengguna UdaPlanner.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
        }}
      >
        {[
          {
            label: "Total Transaksi",
            value: payments.length,
            icon: CreditCard,
            color: "#2563eb",
          },
          {
            label: "Menunggu",
            value: payments.filter((p) => p.status === "Menunggu").length,
            icon: Clock,
            color: "#d97706",
          },
          {
            label: "Disetujui",
            value: payments.filter((p) => p.status === "Disetujui").length,
            icon: CheckCircle2,
            color: "#16a34a",
          },
          {
            label: "Ditolak",
            value: payments.filter((p) => p.status === "Ditolak").length,
            icon: XCircle,
            color: "#dc2626",
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.label} className="uda-card" style={{ padding: 18 }}>
              <Icon size={22} color={item.color} />
              <div
                style={{ color: "#64748b", fontSize: "0.82rem", marginTop: 12 }}
              >
                {item.label}
              </div>
              <div
                style={{ fontSize: "1.7rem", fontWeight: 800, marginTop: 4 }}
              >
                {item.value}
              </div>
            </div>
          );
        })}
      </div>

      <div className="uda-card" style={{ padding: 20 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 18,
          }}
        >
          <h2 style={{ fontSize: "1.1rem", fontWeight: 800 }}>
            Daftar Transaksi
          </h2>

          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            style={{
              padding: "9px 12px",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              background: "#fff",
            }}
          >
            <option>Semua</option>
            <option>Menunggu</option>
            <option>Disetujui</option>
            <option>Ditolak</option>
          </select>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
              fontSize: "0.88rem",
            }}
          >
            <thead>
              <tr style={{ background: "#f8fafc", color: "#64748b" }}>
                <th style={{ padding: 12 }}>ID / Tanggal</th>
                <th style={{ padding: 12 }}>Pengguna</th>
                <th style={{ padding: 12 }}>Paket</th>
                <th style={{ padding: 12 }}>Nominal</th>
                <th style={{ padding: 12 }}>Status</th>
                <th style={{ padding: 12 }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((payment) => (
                <tr key={payment.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                  <td style={{ padding: 12 }}>
                    <div style={{ fontWeight: 700 }}>{payment.id}</div>
                    <div style={{ color: "#64748b", fontSize: "0.78rem" }}>
                      {payment.date}
                    </div>
                  </td>
                  <td style={{ padding: 12 }}>{payment.user}</td>
                  <td style={{ padding: 12 }}>{payment.plan}</td>
                  <td style={{ padding: 12, fontWeight: 700 }}>
                    {money(payment.amount)}
                  </td>
                  <td style={{ padding: 12 }}>
                    <span
                      style={{
                        padding: "5px 9px",
                        borderRadius: 20,
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        background:
                          payment.status === "Disetujui"
                            ? "#dcfce7"
                            : payment.status === "Ditolak"
                              ? "#fee2e2"
                              : "#fef3c7",
                        color:
                          payment.status === "Disetujui"
                            ? "#166534"
                            : payment.status === "Ditolak"
                              ? "#991b1b"
                              : "#92400e",
                      }}
                    >
                      {payment.status}
                    </span>
                  </td>
                  <td style={{ padding: 12 }}>
                    {payment.status === "Menunggu" ? (
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          className="btn-uda btn-uda-primary btn-uda-sm"
                          onClick={() => updateStatus(payment.id, "Disetujui")}
                        >
                          Setujui
                        </button>
                        <button
                          className="btn-uda btn-uda-danger btn-uda-sm"
                          onClick={() => updateStatus(payment.id, "Ditolak")}
                        >
                          Tolak
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                        Selesai
                      </span>
                    )}
                  </td>
                </tr>
              ))}

              {filteredPayments.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      padding: 24,
                      textAlign: "center",
                      color: "#64748b",
                    }}
                  >
                    Tidak ada transaksi pada status ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 16 }}>
          Data saat ini adalah data demo untuk pengujian tampilan dan interaksi.
          Perubahan status belum tersimpan ke database.
        </p>
      </div>
'use client';

import React, { useState } from 'react';
import { CreditCard, Eye, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';

interface PaymentItem {
  id: string;
  user: string;
  email: string;
  plan: 'pro' | 'team';
  amount: number;
  bank: string;
  proof: string;
  status: 'pending' | 'approved' | 'rejected';
  date: string;
  reason?: string;
}

export default function AdminPembayaranPage() {
  const [payments, setPayments] = useState<PaymentItem[]>([
    {
      id: 'pay-1',
      user: 'Budi Santoso',
      email: 'budi@gmail.com',
      plan: 'pro',
      amount: 49137,
      bank: 'BCA — 8839210928 A/N Budi Santoso',
      proof: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
      status: 'pending',
      date: '14 Okt 2026, 09.15 WIB',
    },
    {
      id: 'pay-2',
      user: 'PT Muda Kreatif Indonesia',
      email: 'admin@muda.id',
      plan: 'team',
      amount: 149452,
      bank: 'Bank Mandiri — 1280019283 A/N PT Muda Kreatif',
      proof: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
      status: 'pending',
      date: '14 Okt 2026, 08.40 WIB',
    },
    {
      id: 'pay-3',
      user: 'Sarah Rahmawati',
      email: 'sarah@udaplanner.id',
      plan: 'pro',
      amount: 49721,
      bank: 'BCA — 5271928311 A/N Sarah Rahmawati',
      proof: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
      status: 'approved',
      date: '12 Okt 2026, 14.10 WIB',
    },
  ]);

  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedProof, setSelectedProof] = useState<PaymentItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleApprove = (id: string) => {
    setPayments((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'approved' } : p))
    );
    setSelectedProof(null);
    showToast('Pembayaran disetujui! Paket pengguna otomatis ditingkatkan.');
  };

  const handleReject = (id: string) => {
    if (!rejectReason.trim()) {
      alert('Alasan penolakan wajib diisi!');
      return;
    }
    setPayments((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, status: 'rejected', reason: rejectReason.trim() } : p
      )
    );
    setSelectedProof(null);
    setShowRejectInput(false);
    setRejectReason('');
    showToast('Pembayaran telah ditolak dengan catatan alasan.');
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
