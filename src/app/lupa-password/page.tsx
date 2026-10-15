"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export default function LupaPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(ellipse at top left, rgba(187, 247, 208, 0.45), transparent 42%), radial-gradient(ellipse at bottom right, rgba(219, 234, 254, 0.55), transparent 42%), #f8fafc",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        className="uda-card"
        style={{
          maxWidth: 440,
          width: "100%",
          padding: 36,
          border: "1px solid rgba(226, 232, 240, 0.9)",
          borderRadius: 22,
          background: "rgba(255, 255, 255, 0.96)",
          boxShadow: "0 24px 60px rgba(15, 23, 42, 0.08)",
        }}
      >
        <h1
          style={{
            color: "#64748b",
            fontSize: "0.9rem",
            lineHeight: 1.8,
            marginBottom: 26,
          }}
        >
          Atur Ulang Password
        </h1>
        <p style={{ color: "#64748b", fontSize: "0.85rem", marginBottom: 20 }}>
          Masukkan alamat email Anda untuk menerima tautan pemulihan kata sandi.
        </p>

        {sent ? (
          <div
            style={{
              background: "linear-gradient(135deg, #f0fdf4, #ffffff)",
              border: "1px solid #bbf7d0",
              borderRadius: 16,
              padding: 24,
              textAlign: "center",
              boxShadow: "0 8px 24px rgba(22, 163, 74, 0.06)",
            }}
          >
            <CheckCircle2
              size={36}
              style={{
                color: "#16a34a",
                margin: "0 auto 12px",
              }}
            />

            <div
              style={{ fontWeight: 700, fontSize: "0.92rem", color: "#15803d" }}
            >
              Tautan Berhasil Dikirim!
            </div>
            <p style={{ fontSize: "0.82rem", color: "#166534", marginTop: 4 }}>
              Silakan periksa inbox email <strong>{email}</strong> untuk
              mengatur ulang password baru Anda.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            <div>
              <label style={{ fontSize: "0.82rem", fontWeight: 700 }}>
                Alamat Email
              </label>
              <input
                className="login-input"
                type="email"
                required
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  boxSizing: "border-box",
                  width: "100%",
                  padding: "12px 14px",
                  border: "1px solid #cbd5e1",
                  borderRadius: 10,
                  marginTop: 6,
                  outline: "none",
                  background: "#ffffff",
                  color: "#0f172a",
                  fontSize: "0.9rem",
                  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                }}
              />
            </div>

            <button
              type="submit"
              className="btn-uda btn-uda-primary login-submit"
              style={{
                width: "100%",
                minHeight: 46,
                marginTop: 4,
                borderRadius: 10,
                fontSize: "0.95rem",
                fontWeight: 700,
                boxShadow: "0 6px 14px rgba(22, 163, 74, 0.18)",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
              }}
            >
              Kirim Link Pemulihan →
            </button>
          </form>
        )}

        <div style={{ marginTop: 20, textAlign: "center" }}>
          <Link
            href="/masuk"
            style={{
              color: "#64748b",
              fontSize: "0.82rem",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <ArrowLeft size={14} />
            <span>Kembali ke halaman masuk</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
