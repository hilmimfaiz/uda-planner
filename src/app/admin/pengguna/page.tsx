"use client";

import React, { useState } from "react";
import { Search, Users, ShieldCheck, UserCheck } from "lucide-react";

type UserData = {
  id: number;
  name: string;
  email: string;
  plan: string;
  status: "Aktif" | "Nonaktif";
};

const initialUsers: UserData[] = [
  {
    id: 1,
    name: "Budi Santoso",
    email: "budi@example.com",
    plan: "Pro",
    status: "Aktif",
  },
  {
    id: 2,
    name: "Agensi Kreatif Muda",
    email: "agensi@example.com",
    plan: "Tim",
    status: "Aktif",
  },
  {
    id: 3,
    name: "Siti Rahma",
    email: "siti@example.com",
    plan: "Gratis",
    status: "Aktif",
  },
  {
    id: 4,
    name: "Andi Pratama",
    email: "andi@example.com",
    plan: "Gratis",
    status: "Nonaktif",
  },
];

export default function AdminPenggunaPage() {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Semua");

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "Semua" || user.status === filter;
    return matchesSearch && matchesFilter;
  });

  const toggleStatus = (id: number) => {
    setUsers((current) =>
      current.map((user) =>
        user.id === id
          ? { ...user, status: user.status === "Aktif" ? "Nonaktif" : "Aktif" }
          : user,
      ),
    );
  };

  const stats = [
    {
      label: "Total Pengguna",
      value: users.length,
      icon: Users,
      color: "#2563eb",
    },
    {
      label: "Pengguna Aktif",
      value: users.filter((u) => u.status === "Aktif").length,
      icon: UserCheck,
      color: "#16a34a",
    },
    {
      label: "Paket Berbayar",
      value: users.filter((u) => u.plan !== "Gratis").length,
      icon: ShieldCheck,
      color: "#7c3aed",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#0f172a" }}>
          Manajemen Pengguna
        </h1>
        <p style={{ color: "#64748b", marginTop: 6 }}>
          Lihat dan kelola akun pengguna UdaPlanner.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 16,
        }}
      >
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="uda-card" style={{ padding: 20 }}>
              <Icon size={23} color={item.color} />
              <p style={{ color: "#64748b", fontSize: 13, marginTop: 12 }}>
                {item.label}
              </p>
              <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>
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
            marginBottom: 20,
          }}
        >
          <div style={{ position: "relative", flex: "1 1 240px" }}>
            <Search
              size={18}
              color="#64748b"
              style={{ position: "absolute", left: 12, top: 12 }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau email..."
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "11px 12px 11px 38px",
                border: "1px solid #e2e8f0",
                borderRadius: 9,
              }}
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              padding: 11,
              border: "1px solid #e2e8f0",
              borderRadius: 9,
              background: "white",
            }}
          >
            <option>Semua</option>
            <option>Aktif</option>
            <option>Nonaktif</option>
          </select>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
              fontSize: 14,
            }}
          >
            <thead>
              <tr style={{ background: "#f8fafc", color: "#64748b" }}>
                <th style={{ padding: 13 }}>Pengguna</th>
                <th style={{ padding: 13 }}>Paket</th>
                <th style={{ padding: 13 }}>Status</th>
                <th style={{ padding: 13 }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                  <td style={{ padding: 13 }}>
                    <div style={{ fontWeight: 700, color: "#0f172a" }}>
                      {user.name}
                    </div>
                    <div
                      style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}
                    >
                      {user.email}
                    </div>
                  </td>
                  <td style={{ padding: 13 }}>{user.plan}</td>
                  <td style={{ padding: 13 }}>
                    <span
                      style={{
                        padding: "5px 10px",
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 700,
                        background:
                          user.status === "Aktif" ? "#dcfce7" : "#fee2e2",
                        color: user.status === "Aktif" ? "#166534" : "#991b1b",
                      }}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td style={{ padding: 13 }}>
                    <button
                      className="btn-uda btn-uda-sm"
                      onClick={() => toggleStatus(user.id)}
                    >
                      {user.status === "Aktif" ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      padding: 24,
                      textAlign: "center",
                      color: "#64748b",
                    }}
                  >
                    Pengguna tidak ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p style={{ fontSize: 12, color: "#64748b", marginTop: 16 }}>
          Data pengguna masih berupa demo. Perubahan status belum tersimpan ke
          database.
        </p>
      </div>
    </div>
  );
}
