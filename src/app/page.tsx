"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Kanban,
  Grid,
  ShieldCheck,
  ChevronDown,
  ArrowRight,
  Layers,
  FileText,
  Users,
  Sparkles,
} from "lucide-react";
import { DUMMY_PLANS } from "@/lib/dummy-data";

export default function LandingPage() {
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  const features = [
    {
      icon: CalendarIcon,
      title: "Satu Kalender Multi-Brand",
      desc: "Rencanakan konten untuk semua akun brand bisnis dan klien Anda di satu timeline kalender terpadu.",
    },
    {
      icon: Kanban,
      title: "Papan Status Kanban",
      desc: "Pantau status dari Ide, Draft, Menunggu Review, Siap Posting, hingga Sudah Posting secara teratur.",
    },
    {
      icon: Grid,
      title: "Pratinjau Grid Instagram",
      desc: "Simulasikan tampilan feed 3 kolom Instagram sebelum tayang agar estetika warna dan tema tetap rapi.",
    },
    {
      icon: FileText,
      title: "Bank Caption & Hashtag",
      desc: "Simpan template opening hook, CTA, dan kumpulan tag favorit yang bisa disalin dalam 1 klik cepat.",
    },
    {
      icon: Clock,
      title: "Pengingat Waktu Posting",
      desc: "Dapatkan alarm pengingat sebelum jadwal tayang, plus integrasi langsung ke Google Calendar & file .ics.",
    },
    {
      icon: Users,
      title: "Alur Kolaborasi & Review Tim",
      desc: "Bekerja bersama tim agensi dengan pembagian peran Owner, Editor, Reviewer, serta catatan revisi tertata.",
    },
  ];

  const steps = [
    {
      step: "01",
      title: "Susun Rencana & Tulis Konten",
      desc: "Pilih brand, tentukan pilar konten, tulis caption dengan penghitung karakter, dan sisipkan hashtag.",
    },
    {
      step: "02",
      title: "Atur Jadwal & Review Bersama",
      desc: "Tentukan tanggal dan jam di kalender. Jika perlu persetujuan, minta review klien atau atasan langsung di aplikasi.",
    },
    {
      step: "03",
      title: "Salin 1-Klik Saat Jam Posting Tiba",
      desc: 'Buka notifikasi pengingat, klik "Salin caption + hashtag", unduh file desain, lalu posting manual dengan praktis.',
    },
  ];

  const faqs = [
    {
      q: "Apakah UdaPlanner memposting otomatis ke media sosial?",
      a: "UdaPlanner berfokus pada perencanaan dan kolaborasi. Anda tetap memposting manual di aplikasi media sosial, namun caption, hashtag, dan desainnya sudah siap tinggal disalin dan diunduh dalam 1 klik tanpa repot.",
    },
    {
      q: "Bagaimana cara kerja pembayaran paket berlangganan?",
      a: "Pembayaran dilakukan lewat transfer bank manual (BCA/Mandiri) dengan kode unik 3 digit. Setelah upload bukti transfer, admin akan memverifikasi dan akun Anda langsung aktif.",
    },
    {
      q: "Apakah anggota tim yang saya undang harus membayar langganan?",
      a: "Tidak. Anggota tim menggunakan kuota paket dari pemilik brand yang mengundang. Tim Anda bisa langsung berkolaborasi gratis.",
    },
    {
      q: "Apa yang terjadi jika masa aktif paket Pro atau Tim saya berakhir?",
      a: "Semua data postingan Anda tetap tersimpan aman. Akun akan kembali ke batas paket Gratis dan brand melebihi kuota akan berstatus Terkunci (hanya-baca) sampai diperpanjang kembali.",
    },
  ];

  return (
    <div className="landing-page">
      {/* Top Navbar */}
      <nav className="landing-navbar">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            className="logo-symbol"
            style={{ width: 34, height: 34, fontSize: "1.1rem" }}
          >
            U
          </div>
          <span
            style={{
              fontWeight: 800,
              fontSize: "1.25rem",
              color: "#0f172a",
              letterSpacing: "-0.02em",
            }}
          >
            UdaPlanner
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            className="btn-uda btn-uda-secondary btn-uda-sm"
            onClick={() => router.push("/masuk")}
          >
            Masuk
          </button>
          <button
            className="btn-uda btn-uda-primary btn-uda-sm"
            onClick={() => router.push("/daftar")}
          >
            Coba Gratis
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header
        style={{
          padding: "70px 24px 50px",
          textAlign: "center",
          maxWidth: 960,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 14px",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: 999,
            fontSize: "0.82rem",
            fontWeight: 700,
            color: "#15803d",
            marginBottom: 20,
          }}
        >
          <Sparkles size={14} />
          <span>Aplikasi Perencana Konten Media Sosial UMKM & Agensi</span>
        </div>

        <h1 className="landing-hero-title">
          Rencanakan semua konten sosmedmu di{" "}
          <span className="landing-hero-highlight">satu kalender</span>
        </h1>

        <p className="landing-hero-description">
          Simpan ide caption, hashtag, dan desain di satu tempat. Atur jadwal
          tayang, pantau alur review tim, dan salin konten dengan 1-klik saat
          jam posting tiba.
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: 14 }}>
          <button
            className="btn-uda btn-uda-primary"
            style={{ padding: "12px 28px", fontSize: "1rem" }}
            onClick={() => router.push("/daftar")}
          >
            <span>Mulai Gratis Sekarang</span>
            <ArrowRight size={18} />
          </button>
          <button
            className="btn-uda btn-uda-secondary"
            style={{ padding: "12px 24px", fontSize: "1rem" }}
            onClick={() => router.push("/app")}
          >
            Lihat Demo Aplikasi
          </button>
        </div>

        {/* Mockup Kalender Interaktif (Dibuat dari komponen asli sesuai PRD Bab 8) */}
        <div
          className="uda-card landing-calendar"
          style={{
            marginTop: 48,
            padding: 18,
            textAlign: "left",
            boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
            border: "1px solid #cbd5e1",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: "#ef4444",
                }}
              />
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: "#f59e0b",
                }}
              />
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: "#10b981",
                }}
              />
              <span
                style={{
                  fontWeight: 700,
                  fontSize: "0.88rem",
                  marginLeft: 8,
                  color: "#334155",
                }}
              >
                Oktober 2026 — Kalender UdaCoding & Multi-Brand
              </span>
            </div>
            <span
              className="status-pill"
              style={{ background: "#f0fdf4", color: "#16a34a" }}
            >
              ✓ Mockup Interaktif
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 6,
              textAlign: "center",
            }}
          >
            {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((day) => (
              <div
                key={day}
                style={{
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  color: "#64748b",
                  padding: "4px 0",
                }}
              >
                {day}
              </div>
            ))}

            {Array.from({ length: 14 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 68,
                  borderRadius: 6,
                  border: "1px solid #e2e8f0",
                  padding: 4,
                  background: i === 3 ? "#f0fdf4" : "#ffffff",
                }}
              >
                <div
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    color: "#94a3b8",
                    textAlign: "right",
                  }}
                >
                  {i + 12}
                </div>
                {i === 1 && (
                  <div
                    style={{
                      background: "#16a34a18",
                      borderLeft: "3px solid #16a34a",
                      padding: 2,
                      borderRadius: 2,
                      fontSize: "0.62rem",
                      fontWeight: 700,
                      color: "#15803d",
                      textAlign: "left",
                    }}
                  >
                    Tips RLS Supabase
                  </div>
                )}
                {i === 3 && (
                  <div
                    style={{
                      background: "#3b82f618",
                      borderLeft: "3px solid #3b82f6",
                      padding: 2,
                      borderRadius: 2,
                      fontSize: "0.62rem",
                      fontWeight: 700,
                      color: "#1d4ed8",
                      textAlign: "left",
                    }}
                  >
                    Promo Magang
                  </div>
                )}
                {i === 6 && (
                  <div
                    style={{
                      background: "#f59e0b18",
                      borderLeft: "3px solid #f59e0b",
                      padding: 2,
                      borderRadius: 2,
                      fontSize: "0.62rem",
                      fontWeight: 700,
                      color: "#b45309",
                      textAlign: "left",
                    }}
                  >
                    Trivia Jumat
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Bagian Masalah -> Solusi */}
      <section
        style={{
          padding: "60px 24px",
          background: "#f8fafc",
          borderTop: "1px solid #e2e8f0",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <div style={{ maxWidth: 960, margin: "0 auto", textAlign: "center" }}>
          <h2
            style={{
              maxWidth: 850,
              margin: "0 auto 18px",
              fontSize: "clamp(1.8rem, 4vw, 2.75rem)",
              fontWeight: 800,
              lineHeight: 1.2,
              letterSpacing: "-0.035em",
              color: "#0f172a",
              textAlign: "center",
            }}
          >
            Ucapkan selamat tinggal pada rencana konten yang berantakan
          </h2>

          <p
            style={{
              color: "#64748b",
              fontSize: "1rem",
              maxWidth: 640,
              margin: "0 auto 40px",
            }}
          >
            Rencana di grup WhatsApp hilang? Catatan Google Sheets tercecer?
            Klien minta revisi bolak-balik? UdaPlanner merapikan alur kerja Anda
            dari ide hingga tayang.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(280px, 100%), 1fr))",
              gap: 24,
              textAlign: "left",
              alignItems: "stretch",
            }}
          >
            {features.map((f, i) => {
              const Icon = f.icon;

              return (
                <div
                  key={i}
                  className="uda-card"
                  style={{
                    height: "100%",
                    padding: 26,
                    border: "1px solid #e2e8f0",
                    borderRadius: 18,
                    background: "#ffffff",
                    boxShadow: "0 4px 16px rgba(15, 23, 42, 0.04)",
                    transition:
                      "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      background: "#f0fdf4",
                      color: "#16a34a",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 20,
                    }}
                  >
                    <Icon size={23} strokeWidth={1.8} />
                  </div>

                  <h3
                    style={{
                      fontSize: "1.08rem",
                      fontWeight: 750,
                      color: "#0f172a",
                      lineHeight: 1.45,
                      marginBottom: 10,
                    }}
                  >
                    {f.title}
                  </h3>

                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.92rem",
                      color: "#64748b",
                      lineHeight: 1.75,
                    }}
                  >
                    {f.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Cara Kerja 3 Langkah */}
      <section
        style={{
          padding: "70px 24px",
          maxWidth: 960,
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            fontSize: "2rem",
            fontWeight: 800,
            color: "#0f172a",
            marginBottom: 40,
          }}
        >
          Cara Kerja Mudah dalam 3 Langkah
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(280px, 100%), 1fr))",
            gap: 24,
            textAlign: "left",
          }}
        >
          {steps.map((s, i) => (
            <div
              key={i}
              className="uda-card"
              style={{ padding: 24, position: "relative" }}
            >
              <div
                style={{
                  fontSize: "2rem",
                  fontWeight: 800,
                  color: "#16a34a",
                  marginBottom: 8,
                }}
              >
                {s.step}
              </div>
              <h3
                style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: 8 }}
              >
                {s.title}
              </h3>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "#64748b",
                  lineHeight: 1.5,
                }}
              >
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Tabel Harga 3 Paket */}
      <section
        style={{
          padding: "60px 24px",
          background: "#f8fafc",
          borderTop: "1px solid #e2e8f0",
        }}
      >
        <div style={{ maxWidth: 960, margin: "0 auto", textAlign: "center" }}>
          <h2
            style={{
              fontSize: "2rem",
              fontWeight: 800,
              color: "#0f172a",
              marginBottom: 12,
            }}
          >
            Pilihan Paket Sesuai Kebutuhan Tim Anda
          </h2>
          <p
            style={{ color: "#64748b", fontSize: "0.95rem", marginBottom: 40 }}
          >
            Mulai gratis, upgrade kapan saja lewat transfer bank manual tanpa
            langganan kartu kredit otomatis.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 24,
              textAlign: "left",
            }}
          >
            {DUMMY_PLANS.map((plan) => (
              <div
                key={plan.code}
                className="uda-card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  height: "100%",
                  padding: 28,
                  border:
                    plan.code === "pro"
                      ? "2px solid #16a34a"
                      : "1px solid #e2e8f0",
                  borderRadius: 20,
                  background:
                    plan.code === "pro"
                      ? "linear-gradient(180deg, #f0fdf4 0%, #ffffff 38%)"
                      : "#ffffff",
                  boxShadow:
                    plan.code === "pro"
                      ? "0 12px 32px rgba(22, 163, 74, 0.10)"
                      : "0 4px 16px rgba(15, 23, 42, 0.04)",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                }}
              >
                <div>
                  {plan.code === "pro" && (
                    <span
                      style={{
                        display: "inline-block",
                        padding: "6px 12px",
                        marginBottom: 12,
                        borderRadius: 999,
                        background: "#dcfce7",
                        color: "#15803d",
                        fontSize: "0.75rem",
                        fontWeight: 800,
                      }}
                    >
                      Paling Populer
                    </span>
                  )}

                  <h3 style={{ fontSize: "1.25rem", fontWeight: 800 }}>
                    {plan.name}
                  </h3>
                  <div
                    style={{
                      fontSize: "1.8rem",
                      fontWeight: 800,
                      margin: "8px 0 16px",
                    }}
                  >
                    Rp {plan.price.toLocaleString("id-ID")}
                    <span
                      style={{
                        fontSize: "0.8rem",
                        fontWeight: 500,
                        color: "#64748b",
                      }}
                    >
                      {plan.price === 0 ? "" : " / 30 hari"}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      fontSize: "0.85rem",
                    }}
                  >
                    {plan.features.map((feat, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <CheckCircle2 size={16} style={{ color: "#16a34a" }} />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  className={`btn-uda ${plan.code === "pro" ? "btn-uda-primary" : "btn-uda-secondary"}`}
                  style={{ width: "100%", marginTop: 24 }}
                  onClick={() => router.push("/daftar")}
                >
                  Pilih Paket {plan.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section
        style={{ padding: "70px 24px", maxWidth: 760, margin: "0 auto" }}
      >
        <h2
          style={{
            fontSize: "1.8rem",
            fontWeight: 800,
            textAlign: "center",
            marginBottom: 32,
          }}
        >
          Pertanyaan yang Sering Diajukan (FAQ)
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {faqs.map((faq, i) => {
            const isOpen = openFaq === i;

            return (
              <div
                key={i}
                className="uda-card"
                style={{
                  padding: "20px 24px",
                  cursor: "pointer",
                  border: isOpen ? "1px solid #86efac" : "1px solid #e2e8f0",
                  borderRadius: 16,
                  background: isOpen ? "#f0fdf4" : "#ffffff",
                  boxShadow: isOpen
                    ? "0 6px 20px rgba(22, 163, 74, 0.06)"
                    : "0 3px 12px rgba(15, 23, 42, 0.03)",
                  transition:
                    "background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
                }}
                onClick={() => toggleFaq(i)}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  <h4
                    style={{
                      fontSize: "0.98rem",
                      fontWeight: 700,
                      color: "#0f172a",
                      lineHeight: 1.6,
                      margin: 0,
                    }}
                  >
                    {faq.q}
                  </h4>

                  <ChevronDown
                    size={18}
                    style={{
                      flexShrink: 0,
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s ease",
                      color: isOpen ? "#16a34a" : "#64748b",
                    }}
                  />
                </div>

                {isOpen && (
                  <p
                    style={{
                      fontSize: "0.9rem",
                      color: "#475569",
                      margin: "14px 0 0",
                      lineHeight: 1.8,
                    }}
                  >
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Ajakan Penutup */}
      
<footer
  style={{
    padding: "64px 24px 28px",
    background: "linear-gradient(135deg, #0f172a 0%, #172554 100%)",
    color: "#f8fafc",
    textAlign: "center",
    borderTop: "1px solid rgba(148, 163, 184, 0.15)",
  }}
>
  <div style={{ maxWidth: 720, margin: "0 auto" }}>
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 12px",
        marginBottom: 20,
        border: "1px solid rgba(134, 239, 172, 0.25)",
        borderRadius: 999,
        background: "rgba(22, 163, 74, 0.12)",
        color: "#86efac",
        fontSize: "0.8rem",
        fontWeight: 700,
      }}
    >
      <CheckCircle2 size={15} />
      Mulai gratis bersama UdaPlanner
    </div>

    <h2
      style={{
        maxWidth: 650,
        margin: "0 auto 16px",
        fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
        fontWeight: 800,
        lineHeight: 1.2,
        letterSpacing: "-0.04em",
      }}
    >
      Siap merapikan jadwal konten media sosial Anda?
    </h2>

    <p
      style={{
        maxWidth: 560,
        margin: "0 auto 28px",
        color: "#cbd5e1",
        fontSize: "0.98rem",
        lineHeight: 1.8,
      }}
    >
      Daftar gratis sekarang dan mulai rencanakan postingan pertama dalam
      hitungan menit.
    </p>

    <button
      className="btn-uda btn-uda-primary"
      style={{
        padding: "14px 28px",
        fontSize: "0.98rem",
        borderRadius: 12,
      }}
      onClick={() => router.push("/daftar")}
    >
      Daftar Akun Gratis Sekarang →
    </button>

    <div
      style={{
        height: 1,
        margin: "48px 0 22px",
        background: "rgba(148, 163, 184, 0.18)",
      }}
    />

    <div
      style={{
        display: "flex",
        justifyContent: "center",
        flexWrap: "wrap",
        gap: 8,
        color: "#94a3b8",
        fontSize: "0.78rem",
        lineHeight: 1.8,
      }}
    >
      <span>© 2026 PT UdaCoding Digital Indonesia.</span>
      <span>Hak Cipta Dilindungi.</span>
    </div>
  </div>
</footer>

    </div>
  );
}
