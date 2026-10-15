"use client";

import React, { useState } from "react";
import { Settings, UserRound, Bell, ShieldCheck, Save } from "lucide-react";

export default function AdminPengaturanPage() {
  const [adminName, setAdminName] = useState("Administrator");
  const [email, setEmail] = useState("admin@udaplanner.com");
  const [notifications, setNotifications] = useState(true);
  const [paymentNotifications, setPaymentNotifications] = useState(true);
  const [message, setMessage] = useState("");

  const handleSave = () => {
    setMessage("Pengaturan berhasil diperbarui pada tampilan demo.");
    setTimeout(() => setMessage(""), 3000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#0f172a" }}>
          Pengaturan Admin
        </h1>
        <p style={{ color: "#64748b", marginTop: 6 }}>
          Kelola profil administrator dan preferensi aplikasi UdaPlanner.
        </p>
      </div>

      <div className="uda-card" style={{ padding: 22 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 22,
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
            <UserRound size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 800 }}>
              Profil Administrator
            </h2>
            <p style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
              Informasi dasar akun administrator.
            </p>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 18,
          }}
        >
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Nama administrator
            <input
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              style={{
                padding: 12,
                border: "1px solid #e2e8f0",
                borderRadius: 9,
                fontSize: 14,
              }}
            />
          </label>

          <label
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Email administrator
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                padding: 12,
                border: "1px solid #e2e8f0",
                borderRadius: 9,
                fontSize: 14,
              }}
            />
          </label>
        </div>
      </div>

      <div className="uda-card" style={{ padding: 22 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 22,
          }}
        >
          <div
            style={{
              padding: 10,
              borderRadius: 10,
              background: "#fef3c7",
              color: "#b45309",
            }}
          >
            <Bell size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 800 }}>
              Preferensi Notifikasi
            </h2>
            <p style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
              Atur notifikasi yang ingin ditampilkan.
            </p>
          </div>
        </div>

        {[
          {
            title: "Notifikasi aplikasi",
            description: "Menerima informasi dan pembaruan aplikasi.",
            value: notifications,
            setter: setNotifications,
          },
          {
            title: "Notifikasi pembayaran",
            description: "Mendapatkan pemberitahuan terkait pembayaran.",
            value: paymentNotifications,
            setter: setPaymentNotifications,
          },
        ].map((item) => (
          <div
            key={item.title}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              padding: "16px 0",
              borderTop: "1px solid #e2e8f0",
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{item.title}</div>
              <div style={{ color: "#64748b", fontSize: 13, marginTop: 5 }}>
                {item.description}
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={item.value}
              onClick={() => item.setter(!item.value)}
              style={{
                flexShrink: 0,
                width: 48,
                height: 27,
                border: "none",
                borderRadius: 20,
                padding: 3,
                cursor: "pointer",
                background: item.value ? "#2563eb" : "#cbd5e1",
                display: "flex",
                justifyContent: item.value ? "flex-end" : "flex-start",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  width: 21,
                  height: 21,
                  borderRadius: "50%",
                  background: "white",
                }}
              />
            </button>
          </div>
        ))}
      </div>

      <div className="uda-card" style={{ padding: 22 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              padding: 10,
              borderRadius: 10,
              background: "#dcfce7",
              color: "#15803d",
            }}
          >
            <ShieldCheck size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 800 }}>
              Informasi Aplikasi
            </h2>
            <p style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
              Detail dasar platform UdaPlanner.
            </p>
          </div>
        </div>

        {[
          ["Nama aplikasi", "UdaPlanner"],
          ["Panel", "Administrator"],
          ["Versi tampilan", "1.0.0"],
        ].map(([label, value]) => (
          <div
            key={label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              padding: "13px 0",
              borderTop: "1px solid #e2e8f0",
              fontSize: 14,
            }}
          >
            <span style={{ color: "#64748b" }}>{label}</span>
            <span style={{ fontWeight: 700 }}>{value}</span>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <button className="btn-uda btn-uda-primary" onClick={handleSave}>
          <Save size={16} style={{ marginRight: 7, verticalAlign: "middle" }} />
          Simpan Pengaturan
        </button>
        {message && (
          <span
            role="status"
            style={{ color: "#15803d", fontSize: 13, fontWeight: 600 }}
          >
            {message}
          </span>
        )}
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
        Catatan: tombol simpan saat ini hanya menampilkan konfirmasi demo. Data
        belum disimpan secara permanen dan akan kembali seperti semula setelah
        halaman dimuat ulang.
'use client';

import React, { useState } from 'react';
import { Settings, Save, CheckCircle2, MessageSquare, CreditCard } from 'lucide-react';

export default function AdminPengaturanPage() {
  const [bankName, setBankName] = useState('BCA (Bank Central Asia)');
  const [accountNumber, setAccountNumber] = useState('8839210928');
  const [accountName, setAccountName] = useState('PT UdaCoding Digital Indonesia');
  const [adminWhatsapp, setAdminWhatsapp] = useState('6281234567890');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Pengaturan rekening & kontak WhatsApp admin berhasil disimpan!');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 640 }}>
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
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Pengaturan Aplikasi & Rekening</h1>
        <p style={{ color: '#64748b', fontSize: '0.88rem' }}>
          Data rekening tujuan transfer manual dan kontak WhatsApp resmi admin yang akan ditampilkan ke pengguna saat upgrade paket.
        </p>
      </div>

      <div className="uda-card" style={{ padding: 28 }}>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
            <CreditCard size={18} style={{ color: '#16a34a' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Rekening Bank Penerima Pembayaran</h3>
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
              Nama Bank Penerima *
            </label>
            <input
              type="text"
              required
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="Contoh: BCA / Mandiri / BNI"
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: 8, outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
              Nomor Rekening Penerima *
            </label>
            <input
              type="text"
              required
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="Contoh: 8839210928"
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: 8, outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
              Atas Nama Rekening *
            </label>
            <input
              type="text"
              required
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="Contoh: PT UdaCoding Digital Indonesia"
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: 8, outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 14, paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
            <MessageSquare size={18} style={{ color: '#16a34a' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Kontak Bantuan WhatsApp</h3>
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
              Nomor WhatsApp Admin (Format 62...) *
            </label>
            <input
              type="text"
              required
              value={adminWhatsapp}
              onChange={(e) => setAdminWhatsapp(e.target.value)}
              placeholder="Contoh: 6281234567890"
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: 8, outline: 'none' }}
            />
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
              Nomor ini digunakan untuk tombol "Hubungi Admin" jika akun pengguna terkunci atau butuh konfirmasi manual.
            </div>
          </div>

          <button
            type="submit"
            className="btn-uda btn-uda-primary"
            style={{ marginTop: 8, width: 'fit-content', display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <Save size={16} />
            <span>Simpan Pengaturan</span>
          </button>
        </form>
      </div>
    </div>
  );
}
