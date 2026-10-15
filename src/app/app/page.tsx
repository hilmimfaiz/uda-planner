"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar as CalendarIcon,
  Clock,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Plus,
  Copy,
  Instagram,
  ShieldAlert,
} from "lucide-react";
import {
  DUMMY_POSTS,
  DUMMY_BRANDS,
  DUMMY_PILLARS,
  DummyPost,
} from "@/lib/dummy-data";
import { POST_STATUSES, PLATFORMS } from "@/lib/platforms";
import { useAuth } from "@/contexts/auth-context";
import { PostService } from "@/services/post.service";

export default function BerandaPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<DummyPost[]>(DUMMY_POSTS);

  // Ambil nama pengguna yang sedang login secara dinamis
  const rawName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    (user?.email ? user.email.split('@')[0] : 'Pengguna');
  const displayName = rawName.trim().split(' ')[0] || rawName;

  // Real-time clock & Greeting sinkron jam berjalan
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    PostService.getPosts().then((data) => {
      if (data && data.length > 0) setPosts(data);
    });
    setCurrentTime(new Date());
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Ucapan salam sinkron jam (Pagi: 04:00-10:59, Siang: 11:00-14:59, Sore: 15:00-17:59, Malam: 18:00-03:59)
  const currentHour = currentTime.getHours();
  let greetingText = "Selamat Pagi";
  if (currentHour >= 4 && currentHour < 11) {
    greetingText = "Selamat Pagi";
  } else if (currentHour >= 11 && currentHour < 15) {
    greetingText = "Selamat Siang";
  } else if (currentHour >= 15 && currentHour < 18) {
    greetingText = "Selamat Sore";
  } else {
    greetingText = "Selamat Malam";
  }

  // Hari, Tanggal, Bulan, Tahun format Indonesia
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  };
  const todayDateString = currentTime.toLocaleDateString("id-ID", dateOptions);

  // Jam, Menit, Detik berjalan (format 24 jam)
  const timeString = currentTime
    .toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
    .replace(/\./g, ":");

  // Jadwal Hari Ini
  const todayDateStr = currentTime.toDateString();
  const todayPosts = posts.filter(
    (p) =>
      p.scheduled_at &&
      new Date(p.scheduled_at).toDateString() === todayDateStr,
  );

  // Postingan Terlewat (Jadwal sudah lewat tapi status bukan 'terposting')
  const missedPosts = posts.filter(
    (p) =>
      p.scheduled_at &&
      new Date(p.scheduled_at) < currentTime &&
      p.status !== "terposting",
  );

  // Menunggu Review
  const reviewPosts = posts.filter((p) => p.status === "review");

  // Ringkasan Postingan per Status
  const statusCounts = {
    ide: posts.filter((p) => p.status === "ide").length,
    draft: posts.filter((p) => p.status === "draft").length,
    review: posts.filter((p) => p.status === "review").length,
    siap: posts.filter((p) => p.status === "siap").length,
    terposting: posts.filter((p) => p.status === "terposting").length,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Sapaan & Tanggal Hari Ini */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          padding: "24px",
          marginBottom: 24,
          borderRadius: 18,
          border: "1px solid #e2e8f0",
          background: "linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)",
          boxShadow: "0 4px 18px rgba(15, 23, 42, 0.04)",
        }}
      >
        <div>
          <h1
            suppressHydrationWarning
            style={{
              fontSize: "1.65rem",
              fontWeight: 800,
              color: "#0f172a",
              letterSpacing: "-0.02em",
            }}
          >
            {greetingText}, {displayName}
          </h1>
          <div
            suppressHydrationWarning
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 6,
              color: "#64748b",
              fontSize: "0.9rem",
            }}
          >
            <span>Hari ini {todayDateString}</span>
            <span style={{ color: "#cbd5e1" }}>•</span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontWeight: 600,
                color: "#0284c7",
                backgroundColor: "#e0f2fe",
                padding: "2px 8px",
                borderRadius: 6,
                fontVariantNumeric: "tabular-nums",
                fontSize: "0.85rem",
              }}
            >
              <Clock size={13} />
              {timeString} WIB
            </span>
            <span style={{ color: "#cbd5e1" }}>•</span>
            <span>Kelola rencana konten Anda dengan tenang.</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            className="btn-uda btn-uda-secondary btn-uda-sm"
            onClick={() => router.push("/app/kalender")}
          >
            <CalendarIcon size={15} />
            <span>Lihat Kalender</span>
          </button>
        </div>
      </div>

      {/* Grid: Terlewat & Jadwal Hari Ini Responsif */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
          gap: 20,
        }}
      >
        {/* Kartu Terlewat (Hanya muncul jika ada) */}
        {missedPosts.length > 0 && (
          <div
            className="uda-card"
            style={{
              border: "1px solid #fecaca",
              background: "linear-gradient(145deg, #fff5f5 0%, #ffffff 100%)",
              borderRadius: 16,
              padding: 20,
              boxShadow: "0 4px 14px rgba(220, 38, 38, 0.04)",
              transition: "box-shadow 0.2s ease",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: "#dc2626",
                  fontWeight: 700,
                  fontSize: "1rem",
                }}
              >
                <AlertCircle size={20} />
                <span>Terlewat ({missedPosts.length} postingan)</span>
              </div>
              <span
                className="status-pill"
                style={{ background: "#fee2e2", color: "#b91c1c" }}
              >
                Perlu Tindakan
              </span>
            </div>

            <p
              style={{
                fontSize: "0.82rem",
                color: "#7f1d1d",
                marginBottom: 14,
              }}
            >
              Postingan di bawah ini telah melewati jadwal tayang tetapi belum
              ditandai sudah posting:
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {missedPosts.map((post) => {
                const brand = DUMMY_BRANDS.find((b) => b.id === post.brand_id);
                return (
                  <div
                    key={post.id}
                    style={{
                      background: "#ffffff",
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: "1px solid #fecaca",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          marginBottom: 4,
                        }}
                      >
                        {brand && (
                          <span
                            style={{
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              padding: "2px 6px",
                              borderRadius: 4,
                              background: `${brand.color}18`,
                              color: brand.color,
                            }}
                          >
                            {brand.name}
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: "0.75rem",
                            color: "#dc2626",
                            fontWeight: 600,
                          }}
                        >
                          {post.scheduled_at
                            ? new Date(post.scheduled_at).toLocaleTimeString(
                                "id-ID",
                                { hour: "2-digit", minute: "2-digit" },
                              )
                            : ""}
                        </span>
                      </div>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: "0.88rem",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {post.title}
                      </div>
                    </div>
                    <button
                      className="btn-uda btn-uda-secondary btn-uda-sm"
                      onClick={() => router.push(`/app/postingan/${post.id}`)}
                    >
                      Buka
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Kartu Jadwal Hari Ini */}
        <div
          className="uda-card"
          style={{
            border: "1px solid #dbeafe",
            borderRadius: 16,
            padding: 20,
            background: "linear-gradient(145deg, #ffffff 0%, #f8fbff 100%)",
            boxShadow: "0 4px 16px rgba(37, 99, 235, 0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontWeight: 700,
                fontSize: "1rem",
                color: "#0f172a",
              }}
            >
              <Clock size={19} style={{ color: "#16a34a" }} />
              <span>Jadwal Hari Ini</span>
            </div>
            <span
              className="status-pill"
              style={{ background: "#f0fdf4", color: "#15803d" }}
            >
              {todayPosts.length} Konten
            </span>
          </div>

          {todayPosts.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "24px 12px",
                color: "#64748b",
              }}
            >
              <p style={{ fontSize: "0.88rem" }}>
                Belum ada postingan untuk hari ini.
              </p>
              <button
                className="btn-uda btn-uda-primary btn-uda-sm"
                style={{ marginTop: 12 }}
                onClick={() => router.push("/app/postingan/baru")}
              >
                + Buat Jadwal Sekarang
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {todayPosts.map((post) => {
                const brand = DUMMY_BRANDS.find((b) => b.id === post.brand_id);
                const statusMeta = POST_STATUSES[post.status];
                return (
                  <div
                    key={post.id}
                    style={{
                      background: "#f8fafc",
                      padding: 12,
                      borderRadius: 10,
                      border: "1px solid #e2e8f0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          marginBottom: 4,
                        }}
                      >
                        {brand && (
                          <span
                            style={{
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              padding: "2px 6px",
                              borderRadius: 4,
                              background: `${brand.color}18`,
                              color: brand.color,
                            }}
                          >
                            {brand.name}
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            color: "#0f172a",
                          }}
                        >
                          Pukul{" "}
                          {post.scheduled_at
                            ? new Date(post.scheduled_at).toLocaleTimeString(
                                "id-ID",
                                { hour: "2-digit", minute: "2-digit" },
                              )
                            : "-"}
                        </span>
                      </div>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: "0.88rem",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {post.title}
                      </div>
                    </div>

                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <span
                        className="status-pill"
                        style={{
                          backgroundColor: statusMeta.bg,
                          color: statusMeta.text,
                        }}
                      >
                        {statusMeta.label}
                      </span>
                      <button
                        className="btn-uda btn-uda-secondary btn-uda-sm"
                        onClick={() => router.push(`/app/postingan/${post.id}`)}
                      >
                        Buka
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Kartu Menunggu Review Kamu */}
        <div
          className="uda-card"
          style={{
            border: "1px solid #fde68a",
            borderRadius: 16,
            padding: 20,
            background: "linear-gradient(145deg, #fffbeb 0%, #ffffff 100%)",
            boxShadow: "0 4px 16px rgba(245, 158, 11, 0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontWeight: 700,
                fontSize: "1rem",
                color: "#0f172a",
              }}
            >
              <ShieldAlert size={19} style={{ color: "#f59e0b" }} />
              <span>Menunggu Review Kamu</span>
            </div>
            <span
              className="status-pill"
              style={{ background: "#fffbeb", color: "#b45309" }}
            >
              {reviewPosts.length} Menunggu
            </span>
          </div>

          {reviewPosts.length === 0 ? (
            <p style={{ color: "#64748b", fontSize: "0.85rem" }}>
              Tidak ada postingan yang menunggu persetujuan saat ini.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {reviewPosts.map((post) => (
                <div
                  key={post.id}
                  style={{
                    background: "#fffbeb",
                    border: "1px solid #fde68a",
                    padding: 12,
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>
                      {post.title}
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#b45309",
                        marginTop: 3,
                      }}
                    >
                      Diajukan oleh Editor • {post.notes || "Siap ditinjau"}
                    </div>
                  </div>
                  <button
                    className="btn-uda btn-uda-secondary btn-uda-sm"
                    onClick={() => router.push(`/app/postingan/${post.id}`)}
                  >
                    Tinjau
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ringkasan Bulan Ini & Kuota Paket */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: 20,
        }}
      ></div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: 20,
        }}
      >
        {/* Ringkasan Bulan Ini */}

        <div
          className="uda-card"
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 16,
            padding: 20,
            background: "linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)",
            boxShadow: "0 4px 16px rgba(15, 23, 42, 0.04)",
          }}
        >
          <h3
            style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: 14 }}
          >
            Ringkasan Postingan Bulan Ini
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 10,
              textAlign: "center",
            }}
          >
            <div
              style={{
                background: "#f8fafc",
                padding: "12px 6px",
                borderRadius: 8,
              }}
            >
              <div
                style={{
                  fontSize: "1.4rem",
                  fontWeight: 800,
                  color: "#94a3b8",
                }}
              >
                {statusCounts.ide}
              </div>
              <div
                style={{
                  fontSize: "0.72rem",
                  color: "#64748b",
                  fontWeight: 600,
                }}
              >
                Ide
              </div>
            </div>
            <div
              style={{
                background: "#eff6ff",
                padding: "12px 6px",
                borderRadius: 8,
              }}
            >
              <div
                style={{
                  fontSize: "1.4rem",
                  fontWeight: 800,
                  color: "#3b82f6",
                }}
              >
                {statusCounts.draft}
              </div>
              <div
                style={{
                  fontSize: "0.72rem",
                  color: "#1d4ed8",
                  fontWeight: 600,
                }}
              >
                Draft
              </div>
            </div>
            <div
              style={{
                background: "#fffbeb",
                padding: "12px 6px",
                borderRadius: 8,
              }}
            >
              <div
                style={{
                  fontSize: "1.4rem",
                  fontWeight: 800,
                  color: "#f59e0b",
                }}
              >
                {statusCounts.review}
              </div>
              <div
                style={{
                  fontSize: "0.72rem",
                  color: "#b45309",
                  fontWeight: 600,
                }}
              >
                Review
              </div>
            </div>
            <div
              style={{
                background: "#f0fdf4",
                padding: "12px 6px",
                borderRadius: 8,
              }}
            >
              <div
                style={{
                  fontSize: "1.4rem",
                  fontWeight: 800,
                  color: "#16a34a",
                }}
              >
                {statusCounts.siap}
              </div>
              <div
                style={{
                  fontSize: "0.72rem",
                  color: "#15803d",
                  fontWeight: 600,
                }}
              >
                Siap
              </div>
            </div>
            <div
              style={{
                background: "#f8fafc",
                padding: "12px 6px",
                borderRadius: 8,
              }}
            >
              <div
                style={{
                  fontSize: "1.4rem",
                  fontWeight: 800,
                  color: "#475569",
                }}
              >
                {statusCounts.terposting}
              </div>
              <div
                style={{
                  fontSize: "0.72rem",
                  color: "#334155",
                  fontWeight: 600,
                }}
              >
                Tayang
              </div>
            </div>
          </div>
        </div>

        {/* Kuota Paket Progress Bar */}
        <div
          className="uda-card"
          style={{
            border: "1px solid #d1fae5",
            borderRadius: 16,
            padding: 20,
            background: "linear-gradient(145deg, #ffffff 0%, #f0fdf4 100%)",
            boxShadow: "0 4px 16px rgba(22, 163, 74, 0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <div>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700 }}>
                Pemakaian Kuota Akun
              </h3>
              <div
                style={{
                  fontSize: "0.78rem",
                  color: "#16a34a",
                  fontWeight: 600,
                }}
              >
                Paket Pro Aktif (s/d 12 Nov 2026)
              </div>
            </div>
            <button
              className="btn-uda btn-uda-secondary btn-uda-sm"
              onClick={() => router.push("/app/langganan")}
            >
              Upgrade
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Brand Quota */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                <span>Jumlah Brand Aktif</span>
                <span>3 dari 5 brand</span>
              </div>
              <div
                style={{
                  height: 7,
                  borderRadius: 4,
                  background: "#e2e8f0",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: "60%",
                    height: "100%",
                    background: "#16a34a",
                  }}
                />
              </div>
            </div>

            {/* Post Quota */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                <span>Jadwal Postingan Bulan Ini</span>
                <span>25 post (Tanpa Batas di Pro)</span>
              </div>
              <div
                style={{
                  height: 7,
                  borderRadius: 4,
                  background: "#e2e8f0",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: "25%",
                    height: "100%",
                    background: "#3b82f6",
                  }}
                />
              </div>
            </div>

            {/* Storage Quota */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                <span>Penyimpanan Desain</span>
                <span>650 MB dari 5 GB</span>
              </div>
              <div
                style={{
                  height: 7,
                  borderRadius: 4,
                  background: "#e2e8f0",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: "13%",
                    height: "100%",
                    background: "#8b5cf6",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
