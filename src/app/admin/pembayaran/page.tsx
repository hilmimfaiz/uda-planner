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
    </div>
  );
}
