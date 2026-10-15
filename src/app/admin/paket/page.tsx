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
    </div>
  );
}
