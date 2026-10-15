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
      </div>
    </div>
  );
}
