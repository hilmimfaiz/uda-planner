"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function MasukPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    router.push("/app");
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
        padding: "32px 20px",
      }}
    >
      <div
        className="uda-card"
        style={{
          maxWidth: 440,
          width: "100%",
          padding: "36px 32px",
          border: "1px solid rgba(226, 232, 240, 0.9)",
          borderRadius: 22,
          background: "rgba(255, 255, 255, 0.96)",
          boxShadow: "0 24px 60px rgba(15, 23, 42, 0.08)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            marginBottom: 28,
          }}
        >
          <div
            className="logo-symbol"
            style={{ width: 34, height: 34, fontSize: "1.1rem" }}
          >
            U
          </div>
          <span
            style={{ fontWeight: 800, fontSize: "1.25rem", color: "#0f172a" }}
          >
            UdaPlanner
          </span>
        </div>

        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: 800,
            color: "#0f172a",
            marginBottom: 8,
            textAlign: "center",
            letterSpacing: "-0.04em",
          }}
        >
          Masuk ke Akun
        </h1>
        <p
          style={{
            color: "#64748b",
            fontSize: "0.9rem",
            lineHeight: 1.7,
            marginBottom: 26,
            textAlign: "center",
          }}
        >
          Kelola rencana dan jadwal konten Anda kembali.
        </p>

        <form
          onSubmit={handleLogin}
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          <div>
            <label style={{ fontSize: "0.82rem", fontWeight: 700 }}>
              Email
            </label>
            <input
              className="login-input"
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

          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <label style={{ fontSize: "0.82rem", fontWeight: 700 }}>
                Password
              </label>
              <Link
                href="/lupa-password"
                style={{
                  fontSize: "0.78rem",
                  color: "#16a34a",
                  textDecoration: "none",
                }}
              >
                Lupa password?
              </Link>
            </div>

            <div style={{ position: "relative", marginTop: 4 }}>
              <input
                className="login-input"
                type={showPassword ? "text" : "password"}
                required
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  boxSizing: "border-box",
                  width: "100%",
                  padding: "12px 44px 12px 12px",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  outline: "none",
                }}
              />

              <button
                type="button"
                aria-label={
                  showPassword ? "Sembunyikan password" : "Lihat password"
                }
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "transparent",
                  color: "#64748b",
                  cursor: "pointer",
                  padding: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {showPassword ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 3l18 18" />
                    <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                    <path d="M9.9 5.2A11 11 0 0 1 12 5c5 0 9 5 10 7a13 13 0 0 1-3 3.8" />
                    <path d="M6.6 6.6C4.2 8 2.7 10.1 2 12c1 2 5 7 10 7a10 10 0 0 0 4-.8" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-uda btn-uda-primary login-submit"
            style={{
              marginTop: 8,
              width: "100%",
              minHeight: 46,
              borderRadius: 10,
              fontSize: "0.95rem",
              fontWeight: 700,
              boxShadow: "0 6px 14px rgba(22, 163, 74, 0.18)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
          >
            Masuk →
          </button>
        </form>

        <div
          style={{
            marginTop: 26,
            paddingTop: 22,
            borderTop: "1px solid #f1f5f9",
            textAlign: "center",
            fontSize: "0.88rem",
            color: "#64748b",
            lineHeight: 1.7,
          }}
        >
          Belum punya akun?{" "}
          <Link
            href="/daftar"
            style={{
              color: "#16a34a",
              fontWeight: 800,
              textDecoration: "none",
            }}
          >
            Daftar gratis →
          </Link>
        </div>
      </div>
    </div>
  );
}
