"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Eye, EyeOff } from "lucide-react";

export default function DaftarPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate successful registration -> go to onboarding
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
        padding: 20,
      }}
    >
      <div
        className="uda-card"
        style={{
          maxWidth: 440,
          width: "100%",
          padding: 32,
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
            fontSize: "1.65rem",
            fontWeight: 800,
            color: "#0f172a",
            marginBottom: 10,
            letterSpacing: "-0.04em",
            textAlign: "center",
          }}
        >
          Daftar Akun Baru
        </h1>

        <p
          style={{
            color: "#64748b",
            fontSize: "0.9rem",
            lineHeight: 1.8,
            marginBottom: 26,
            textAlign: "center",
          }}
        >
          Mulai merencanakan konten sosial media Anda secara gratis.
        </p>

        <form
          onSubmit={handleRegister}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <div>
            <label style={{ fontSize: "0.82rem", fontWeight: 700 }}>
              Nama Lengkap *
            </label>

            <input
              type="text"
              required
              placeholder="Rizki Pratama"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="login-input"
              style={{
                boxSizing: "border-box",
                width: "100%",
                padding: "12px 14px",
                border: "1px solid #cbd5e1",
                borderRadius: 10,
                marginTop: 4,
                outline: "none",
                background: "#ffffff",
                color: "#0f172a",
                fontSize: "0.9rem",
                transition: "border-color 0.2s ease, box-shadow 0.2s ease",
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: "0.82rem", fontWeight: 700 }}>
              Email *
            </label>

            <input
              type="email"
              required
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="login-input"
              style={{
                boxSizing: "border-box",
                width: "100%",
                padding: "12px 14px",
                border: "1px solid #cbd5e1",
                borderRadius: 10,
                marginTop: 4,
                outline: "none",
                background: "#ffffff",
                color: "#0f172a",
                fontSize: "0.9rem",
                transition: "border-color 0.2s ease, box-shadow 0.2s ease",
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: "0.82rem", fontWeight: 700 }}>
              Password *
            </label>

            <div style={{ position: "relative", marginTop: 6 }}>
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                placeholder="Minimal 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-input"
                style={{
                  boxSizing: "border-box",
                  width: "100%",
                  padding: "12px 100px 12px 14px",
                  border: "1px solid #cbd5e1",
                  borderRadius: 10,
                  outline: "none",
                  background: "#ffffff",
                  color: "#0f172a",
                  fontSize: "0.9rem",
                  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                }}
              />

              <button
                type="button"
                onClick={() => setShowPassword((previous) => !previous)}
                aria-label={
                  showPassword ? "Sembunyikan password" : "Lihat password"
                }
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "transparent",
                  color: "#16a34a",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        </form>

        <button
          type="submit"
          className="btn-uda btn-uda-primary login-submit"
          style={{
            marginTop: 20,
            width: "100%",
            minHeight: 46,
            borderRadius: 10,
            fontSize: "0.95rem",
            fontWeight: 700,
            boxShadow: "0 6px 14px rgba(22, 163, 74, 0.18)",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
          }}
        >
          Daftar & Mulai Gratis →
        </button>

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
          Sudah punya akun?{" "}
          <Link
            href="/masuk"
            style={{
              color: "#16a34a",
              fontWeight: 700,
              textDecoration: "none",
              transition: "color 0.2s ease",
            }}
          >
            Masuk di sini →
          </Link>
        </div>
      </div>
    </div>
  );
}
