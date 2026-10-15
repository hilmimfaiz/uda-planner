"use client";

import React, { useState } from "react";
import { Package, Check, X, Pencil, Plus } from "lucide-react";

type Plan = {
  id: number;
  name: string;
  price: number;
  description: string;
  features: string[];
  active: boolean;
};

const initialPlans: Plan[] = [
  {
    id: 1,
    name: "Gratis",
    price: 0,
    description: "Untuk pengguna yang baru memulai.",
    features: ["3 postingan per bulan", "Kalender konten", "1 akun pengguna"],
    active: true,
  },
  {
    id: 2,
    name: "Pro",
    price: 49000,
    description: "Untuk kreator dan freelancer.",
    features: [
      "Postingan tanpa batas",
      "Analitik konten",
      "Penjadwalan postingan",
    ],
    active: true,
  },
  {
    id: 3,
    name: "Tim",
    price: 149000,
    description: "Untuk tim dan agensi kreatif.",
    features: ["Semua fitur Pro", "Kolaborasi tim", "Manajemen banyak akun"],
    active: true,
  },
];

export default function AdminPaketPage() {
  const [plans, setPlans] = useState(initialPlans);

  const togglePlan = (id: number) => {
    setPlans((current) =>
      current.map((plan) =>
        plan.id === id ? { ...plan, active: !plan.active } : plan,
      ),
    );
  };

  const formatPrice = (price: number) =>
    price === 0 ? "Gratis" : `Rp ${price.toLocaleString("id-ID")}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#0f172a" }}>
            Manajemen Paket
          </h1>
          <p style={{ color: "#64748b", marginTop: 6 }}>
            Kelola paket langganan dan fitur yang tersedia di UdaPlanner.
          </p>
        </div>
        <button
          className="btn-uda btn-uda-primary"
          onClick={() =>
            alert("Fitur tambah paket akan dibuat pada tahap berikutnya.")
          }
        >
          <Plus size={16} style={{ marginRight: 6, verticalAlign: "middle" }} />
          Tambah Paket
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 18,
        }}
      >
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="uda-card"
            style={{
              padding: 22,
              display: "flex",
              flexDirection: "column",
              gap: 18,
              border:
                plan.name === "Pro" ? "2px solid #2563eb" : "1px solid #e2e8f0",
              opacity: plan.active ? 1 : 0.65,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  padding: 10,
                  borderRadius: 10,
                  background: "#eff6ff",
                  color: "#2563eb",
                }}
              >
                <Package size={23} />
              </div>
              <span
                style={{
                  padding: "5px 10px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  background: plan.active ? "#dcfce7" : "#fee2e2",
                  color: plan.active ? "#166534" : "#991b1b",
                }}
              >
                {plan.active ? "Aktif" : "Nonaktif"}
              </span>
            </div>

            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>
                {plan.name}
              </h2>
              <p style={{ color: "#64748b", fontSize: 13, marginTop: 6 }}>
                {plan.description}
              </p>
            </div>

            <div>
              <span style={{ fontSize: 27, fontWeight: 800, color: "#0f172a" }}>
                {formatPrice(plan.price)}
              </span>
              {plan.price > 0 && (
                <span style={{ color: "#64748b", fontSize: 13 }}> / bulan</span>
              )}
            </div>

            <div
              style={{
                borderTop: "1px solid #e2e8f0",
                paddingTop: 16,
                flex: 1,
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
                Fitur paket
              </p>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {plan.features.map((feature) => (
                  <div
                    key={feature}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 9,
                      fontSize: 13,
                      color: "#475569",
                    }}
                  >
                    <Check size={16} color="#16a34a" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                className="btn-uda btn-uda-sm"
                onClick={() =>
                  alert("Fitur edit paket akan dibuat pada tahap berikutnya.")
                }
                style={{ flex: 1 }}
              >
                <Pencil
                  size={14}
                  style={{ marginRight: 5, verticalAlign: "middle" }}
                />
                Edit
              </button>
              <button
                className="btn-uda btn-uda-sm"
                onClick={() => togglePlan(plan.id)}
                style={{ flex: 1 }}
              >
                {plan.active ? (
                  <>
                    <X
                      size={14}
                      style={{ marginRight: 5, verticalAlign: "middle" }}
                    />{" "}
                    Nonaktifkan
                  </>
                ) : (
                  <>
                    <Check
                      size={14}
                      style={{ marginRight: 5, verticalAlign: "middle" }}
                    />{" "}
                    Aktifkan
                  </>
                )}
              </button>
'use client';

import React, { useState } from 'react';
import { Package, Edit2, Check, Save, RotateCcw } from 'lucide-react';

interface EditablePlan {
  code: 'free' | 'pro' | 'team';
  name: string;
  price: number;
  durationDays: number;
  maxBrands: number;
  maxMembers: number;
  maxPosts: number | null; // null = unlimited
  storageMb: number;
  maxFileMb: number;
  maxSnippets: number | null;
  allowVideo: boolean;
  allowGrid: boolean;
  allowExport: boolean;
  allowApproval: boolean;
  allowComments: boolean;
}

export default function AdminPaketPage() {
  const [plans, setPlans] = useState<EditablePlan[]>([
    {
      code: 'free',
      name: 'Gratis',
      price: 0,
      durationDays: 0,
      maxBrands: 1,
      maxMembers: 0,
      maxPosts: 30,
      storageMb: 200,
      maxFileMb: 10,
      maxSnippets: 5,
      allowVideo: false,
      allowGrid: false,
      allowExport: false,
      allowApproval: false,
      allowComments: false,
    },
    {
      code: 'pro',
      name: 'Pro',
      price: 49000,
      durationDays: 30,
      maxBrands: 5,
      maxMembers: 0,
      maxPosts: null,
      storageMb: 5120,
      maxFileMb: 50,
      maxSnippets: null,
      allowVideo: true,
      allowGrid: true,
      allowExport: true,
      allowApproval: false,
      allowComments: false,
    },
    {
      code: 'team',
      name: 'Tim Agensi',
      price: 149000,
      durationDays: 30,
      maxBrands: 20,
      maxMembers: 10,
      maxPosts: null,
      storageMb: 20480,
      maxFileMb: 50,
      maxSnippets: null,
      allowVideo: true,
      allowGrid: true,
      allowExport: true,
      allowApproval: true,
      allowComments: true,
    },
  ]);

  const [editingPlan, setEditingPlan] = useState<EditablePlan | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSavePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    setPlans((prev) =>
      prev.map((p) => (p.code === editingPlan.code ? editingPlan : p))
    );
    setEditingPlan(null);
    showToast(`Konfigurasi paket ${editingPlan.name} berhasil diperbarui!`);
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
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Konfigurasi Paket & Harga</h1>
        <p style={{ color: '#64748b', fontSize: '0.88rem' }}>
          Atur harga, kuota brand, batasan postingan, kapasitas storage, serta fitur yang diaktifkan untuk setiap paket langganan.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {plans.map((p) => (
          <div
            key={p.code}
            className="uda-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              borderTop: `4px solid ${p.code === 'team' ? '#7c3aed' : p.code === 'pro' ? '#16a34a' : '#94a3b8'}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{p.name}</h3>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Kode: {p.code}</div>
              </div>
              <button
                className="btn-uda btn-uda-secondary btn-uda-sm"
                onClick={() => setEditingPlan(p)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Edit2 size={13} />
                <span>Edit Paket</span>
              </button>
            </div>

            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>
                {p.price === 0 ? 'Gratis' : `Rp ${p.price.toLocaleString('id-ID')}`}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                {p.durationDays > 0 ? `Durasi ${p.durationDays} hari` : 'Tanpa batas waktu'}
              </div>
            </div>

            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.84rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Maksimal Brand:</span>
                <span style={{ fontWeight: 700 }}>{p.maxBrands} Brand</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Anggota Tim:</span>
                <span style={{ fontWeight: 700 }}>{p.maxMembers > 0 ? `${p.maxMembers} Anggota` : 'Solo (Hanya Pemilik)'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Postingan Terjadwal:</span>
                <span style={{ fontWeight: 700 }}>{p.maxPosts ? `${p.maxPosts} / bulan` : 'Tanpa Batas'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Kapasitas File:</span>
                <span style={{ fontWeight: 700 }}>{p.storageMb >= 1024 ? `${p.storageMb / 1024} GB` : `${p.storageMb} MB`}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Batas Ukuran per File:</span>
                <span style={{ fontWeight: 700 }}>{p.maxFileMb} MB</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Bank Konten:</span>
                <span style={{ fontWeight: 700 }}>{p.maxSnippets ? `${p.maxSnippets} item` : 'Tanpa Batas'}</span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.8rem' }}>
              <div style={{ fontWeight: 700, color: '#334155', marginBottom: 2 }}>Fitur Tambahan:</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {p.allowVideo && <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>Video</span>}
                {p.allowGrid && <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>Grid IG</span>}
                {p.allowExport && <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>Ekspor CSV/.ics</span>}
                {p.allowApproval && <span style={{ background: '#f5f3ff', color: '#7c3aed', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>Wajib Review</span>}
                {p.allowComments && <span style={{ background: '#f5f3ff', color: '#7c3aed', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>Komentar Tim</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          padding: 16,
          borderRadius: 10,
          background: "#eff6ff",
          color: "#1e40af",
          fontSize: 13,
        }}
      >
        Catatan: harga dan fitur di halaman ini adalah data demo. Tombol Edit
        dan Tambah Paket belum menyimpan perubahan.
      </div>
      {/* Modal Edit Paket */}
      {editingPlan && (
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
          <div className="uda-card" style={{ maxWidth: 520, width: '100%', padding: 28, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 4 }}>
              Edit Paket {editingPlan.name}
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.82rem', marginBottom: 18 }}>
              Perubahan kuota dan batasan akan langsung diterapkan bagi pengguna paket ini.
            </p>

            <form onSubmit={handleSavePlan} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Harga (Rupiah)</label>
                  <input
                    type="number"
                    value={editingPlan.price}
                    onChange={(e) => setEditingPlan({ ...editingPlan, price: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Durasi (Hari)</label>
                  <input
                    type="number"
                    value={editingPlan.durationDays}
                    onChange={(e) => setEditingPlan({ ...editingPlan, durationDays: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Maksimal Brand</label>
                  <input
                    type="number"
                    value={editingPlan.maxBrands}
                    onChange={(e) => setEditingPlan({ ...editingPlan, maxBrands: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Maksimal Anggota</label>
                  <input
                    type="number"
                    value={editingPlan.maxMembers}
                    onChange={(e) => setEditingPlan({ ...editingPlan, maxMembers: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Storage (MB)</label>
                  <input
                    type="number"
                    value={editingPlan.storageMb}
                    onChange={(e) => setEditingPlan({ ...editingPlan, storageMb: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Maksimal per File (MB)</label>
                  <input
                    type="number"
                    value={editingPlan.maxFileMb}
                    onChange={(e) => setEditingPlan({ ...editingPlan, maxFileMb: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6 }}
                  />
                </div>
              </div>

              {/* Toggles Fitur */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>Aktifkan Fitur:</div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.84rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editingPlan.allowVideo}
                    onChange={(e) => setEditingPlan({ ...editingPlan, allowVideo: e.target.checked })}
                  />
                  <span>Izinkan Upload Video</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.84rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editingPlan.allowGrid}
                    onChange={(e) => setEditingPlan({ ...editingPlan, allowGrid: e.target.checked })}
                  />
                  <span>Izinkan Pratinjau Grid Instagram</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.84rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editingPlan.allowExport}
                    onChange={(e) => setEditingPlan({ ...editingPlan, allowExport: e.target.checked })}
                  />
                  <span>Izinkan Ekspor Kalender (.ics & CSV)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.84rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editingPlan.allowApproval}
                    onChange={(e) => setEditingPlan({ ...editingPlan, allowApproval: e.target.checked })}
                  />
                  <span>Izinkan Alur "Wajib Review" (Persetujuan)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.84rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editingPlan.allowComments}
                    onChange={(e) => setEditingPlan({ ...editingPlan, allowComments: e.target.checked })}
                  />
                  <span>Izinkan Fitur Komentar & Diskusi Tim</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  className="btn-uda btn-uda-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setEditingPlan(null)}
                >
                  Batal
                </button>
                <button type="submit" className="btn-uda btn-uda-primary" style={{ flex: 1 }}>
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
