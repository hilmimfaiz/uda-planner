"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar as CalendarIcon,
  Clock,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Plus,
  Copy,
  Instagram,
  Sparkles,
  Layers,
  ArrowRight,
  Loader2,
  Check,
  CalendarDays,
  Filter,
} from "lucide-react";
import { PostService } from "@/services/post.service";
import { BrandService } from "@/services/brand.service";
import { DummyPost, DummyBrand } from "@/lib/dummy-data";
import { useAuth } from "@/contexts/auth-context";
import { GuidedTour, TourStep } from "@/components/guided-tour";

export default function BerandaPage() {
  const router = useRouter();
  const { user, profile } = useAuth();

  // State Jadwal & Tanggal
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [posts, setPosts] = useState<DummyPost[]>([]);
  const [brands, setBrands] = useState<DummyBrand[]>([]);
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  // Greeting & Nama User
  const rawName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    (user?.email ? user.email.split("@")[0] : "Kreator");
  const displayName = rawName.trim().split(" ")[0] || rawName;

  const [localAvatar, setLocalAvatar] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      try {
        const stored = localStorage.getItem("uda_custom_avatar_" + user.id);
        if (stored) setLocalAvatar(stored);
      } catch (e) {}
    }
  }, [user]);

  const currentAvatarUrl = profile?.avatar_url || localAvatar;

  // Real-time clock sinkron
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Memuat data brand & jadwal hari ini
  const loadPostsForDate = async (
    targetDate: Date,
    brandId: string = "all",
  ) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const filters = brandId !== "all" ? { brandId } : {};
      const data = await PostService.getPostsForDate(targetDate, filters);
      setPosts(data || []);
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal memuat jadwal dari server.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    BrandService.getBrands(user?.id).then((bList) => {
      if (bList && bList.length > 0) setBrands(bList);
    });
    loadPostsForDate(selectedDate, selectedBrandFilter);
  }, [user?.id, selectedBrandFilter]);

  const handleDateChange = (newDate: Date) => {
    setSelectedDate(newDate);
    loadPostsForDate(newDate, selectedBrandFilter);
  };

  // Helper salam waktu
  const currentHour = currentTime ? currentTime.getHours() : 9;
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

  // Format tanggal Indonesia
  const isToday = selectedDate.toDateString() === new Date().toDateString();
  const isYesterday =
    selectedDate.toDateString() ===
    new Date(Date.now() - 86400000).toDateString();
  const isTomorrow =
    selectedDate.toDateString() ===
    new Date(Date.now() + 86400000).toDateString();

  const formattedDateTitle = selectedDate.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const timeString = currentTime
    ? currentTime
        .toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
        .replace(/\./g, ":")
    : "--:--:--";

  const handleCopyCaption = (post: DummyPost) => {
    const textToCopy = `${post.caption}\n\n${post.hashtags}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(post.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Langkah-Langkah Panduan Interaktif Dashboard (Guided Tour)
  const dashboardTourSteps: TourStep[] = [
    {
      targetId: "tour-welcome",
      title: "Selamat Datang di UdaPlanner!",
      description:
        "Platform perencana konten media sosial terintegrasi. Mari kenali fitur-fitur utama dashboard Anda dalam beberapa langkah singkat.",
      placement: "bottom",
    },
    {
      targetId: "tour-nav",
      title: "Pilihan Brand & Navigasi",
      description:
        "Filter jadwal berdasarkan akun brand tertentu atau kelola semua brand bisnis Anda dalam satu ruang kerja terpadu.",
      placement: "bottom",
      actionHint: "Gunakan dropdown brand untuk memfokuskan jadwal.",
    },
    {
      targetId: "tour-summary",
      title: "Ringkasan Jadwal Hari Ini",
      description:
        "Pantau jumlah postingan yang siap tayang hari ini, yang masih dalam tahap draft atau review, dan yang telah terposting.",
      placement: "bottom",
    },
    {
      targetId: "tour-today-schedule",
      title: "Fokus Jadwal Hari Ini",
      description:
        "Dashboard UdaPlanner secara default hanya menampilkan jadwal hari ini secara rapi. Anda juga dapat berpindah ke hari kemarin, besok, atau memilih tanggal tertentu.",
      placement: "top",
    },
    {
      targetId: "tour-actions",
      title: "Tombol Aksi Cepat",
      description:
        "Buat rencana konten baru, lihat kalender visual bulanan, atau salin caption dan hashtag dengan 1-klik siap posting.",
      placement: "bottom",
    },
    {
      title: "Panduan Selesai!",
      description:
        'Anda siap menggunakan UdaPlanner! Tombol "Lihat Panduan Lagi" tersedia di pojok kiri bawah jika Anda ingin mengulang panduan ini kapan saja.',
      placement: "center",
    },
  ];

  return (
    <div
      className="uda-dashboard"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 24,
        maxWidth: 1080,
        width: "100%",
        margin: "0 auto",
      }}
    >
      {/* GUIDED TOUR KOMPONEN */}
      <GuidedTour
        steps={dashboardTourSteps}
        tourKey="uda_guided_tour_dashboard"
      />

      {/* Sapaan Header & Waktu Live (ID: tour-welcome) */}
      <div
        id="tour-welcome"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          padding: "24px 28px",
          borderRadius: 20,
          border: "1px solid #e2e8f0",
          background: "linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)",
          boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "3px 10px",
              backgroundColor: "#dcfce7",
              color: "#15803d",
              borderRadius: 999,
              fontSize: "0.76rem",
              fontWeight: 800,
              marginBottom: 8,
            }}
          >
            <Sparkles size={13} />
            <span>Fokus Harian Anda</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {currentAvatarUrl ? (
              <img
                src={currentAvatarUrl}
                alt={displayName}
                onError={() => setLocalAvatar(null)}
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "2.5px solid #0f172a",
                  boxShadow: "3px 3px 0px #0f172a",
                  flexShrink: 0,
                }}
              />
            ) : (
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: "50%",
                  backgroundColor: "#16a34a",
                  color: "#ffffff",
                  border: "2.5px solid #0f172a",
                  boxShadow: "3px 3px 0px #0f172a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  fontSize: "1.4rem",
                  flexShrink: 0,
                }}
              >
                {(displayName || "U").charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1
                style={{
                  fontSize: "clamp(1.4rem, 3.5vw, 1.8rem)",
                  fontWeight: 900,
                  color: "#0f172a",
                  letterSpacing: "-0.025em",
                  margin: 0,
                }}
              >
                {greetingText}, {displayName}
              </h1>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 8,
                  marginTop: 6,
                  color: "#64748b",
                  fontSize: "0.88rem",
                }}
              >
                <span>
                  Hari ini{" "}
                  {new Date().toLocaleDateString("id-ID", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <span style={{ color: "#cbd5e1" }}>•</span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontWeight: 700,
                    color: "#15803d",
                    backgroundColor: "#ffffff",
                    padding: "2px 8px",
                    borderRadius: 6,
                    border: "1px solid #bbf7d0",
                    fontVariantNumeric: "tabular-nums",
                    fontSize: "0.84rem",
                  }}
                >
                  <Clock size={13} />
                  {timeString} WIB
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tombol Aksi Utama (ID: tour-actions) */}
        <div
          id="tour-actions"
          style={{ display: "flex", alignItems: "center", gap: 10 }}
        >
          <button
            className="btn-uda btn-uda-secondary btn-uda-sm"
            onClick={() => router.push("/app/kalender")}
            style={{
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <CalendarIcon size={16} />
            <span>Buka Kalender</span>
          </button>
          <button
            className="btn-uda btn-uda-primary btn-uda-sm"
            onClick={() => router.push("/app/kalender")}
            style={{
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 4px 12px rgba(22, 163, 74, 0.25)",
            }}
          >
            <Plus size={16} />
            <span>Rencanakan Konten</span>
          </button>
        </div>
      </div>

      {/* Baris Navigasi Brand & Tanggal (ID: tour-nav & tour-summary) */}
      <div
        id="tour-nav"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 14,
          padding: "16px 20px",
          backgroundColor: "#ffffff",
          borderRadius: 12,
          border: "2.5px solid #0f172a",
          boxShadow: "4px 4px 0px #0f172a",
        }}
      >
        {/* Brand Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontSize: "0.82rem",
              fontWeight: 700,
              color: "inherit",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Filter size={15} />
            <span>Filter Brand:</span>
          </span>
          <select
            value={selectedBrandFilter}
            onChange={(e) => setSelectedBrandFilter(e.target.value)}
            style={{
              padding: "7px 12px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              fontSize: "0.86rem",
              fontWeight: 600,
              color: "#0f172a",
              outline: "none",
              backgroundColor: "#f8fafc",
            }}
          >
            <option value="all">Semua Brand Terdaftar</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date Selector Tabs */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            onClick={() => handleDateChange(new Date(Date.now() - 86400000))}
            aria-pressed={isYesterday}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: "1px solid",
              borderColor: isYesterday ? "#16a34a" : "currentColor",
              backgroundColor: isYesterday ? "#16a34a" : "transparent",
              color: isYesterday ? "#ffffff" : "inherit",
              fontSize: "0.82rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Kemarin
          </button>

          <button
            onClick={() => handleDateChange(new Date())}
            aria-pressed={isToday}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: "1px solid",
              borderColor: isToday ? "#16a34a" : "currentColor",
              backgroundColor: isToday ? "#16a34a" : "transparent",
              color: isToday ? "#ffffff" : "inherit",
              fontSize: "0.82rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Hari Ini
          </button>

          <button
            onClick={() => handleDateChange(new Date(Date.now() + 86400000))}
            aria-pressed={isTomorrow}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: "1px solid",
              borderColor: isTomorrow ? "#16a34a" : "currentColor",
              backgroundColor: isTomorrow ? "#16a34a" : "transparent",
              color: isTomorrow ? "#ffffff" : "inherit",
              fontSize: "0.82rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Besok
          </button>

          {/* Native Date Picker */}
          <div
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            <input
              type="date"
              value={selectedDate.toISOString().split("T")[0]}
              onChange={(e) => {
                if (e.target.value) handleDateChange(new Date(e.target.value));
              }}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                fontSize: "0.82rem",
                color: "#334155",
                outline: "none",
                cursor: "pointer",
                backgroundColor: "#ffffff",
              }}
              title="Pilih tanggal jadwal lainnya"
            />
          </div>
        </div>
      </div>

      {/* Summary Metrics (ID: tour-summary) */}
      <div
        id="tour-summary"
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
          gap: 16,
        }}
      >
        <div
          className="uda-card"
          style={{ padding: "16px 20px", borderLeft: "4px solid #16a34a" }}
        >
          <div
            style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 700 }}
          >
            Total Jadwal Hari Ini
          </div>
          <div
            style={{
              fontSize: "1.6rem",
              fontWeight: 900,
              color: "#0f172a",
              margin: "4px 0 2px",
            }}
          >
            {posts.length} Postingan
          </div>
          <div style={{ fontSize: "0.74rem", color: "#16a34a" }}>
            {isToday ? "Tanggal Hari Ini" : formattedDateTitle}
          </div>
        </div>

        <div
          className="uda-card"
          style={{ padding: "16px 20px", borderLeft: "4px solid #0284c7" }}
        >
          <div
            style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 700 }}
          >
            Siap Tayang
          </div>
          <div
            style={{
              fontSize: "1.6rem",
              fontWeight: 900,
              color: "#0284c7",
              margin: "4px 0 2px",
            }}
          >
            {posts.filter((p) => p.status === "siap").length}
          </div>
          <div style={{ fontSize: "0.74rem", color: "#64748b" }}>
            Caption & desain sudah final
          </div>
        </div>

        <div
          className="uda-card"
          style={{ padding: "16px 20px", borderLeft: "4px solid #f59e0b" }}
        >
          <div
            style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 700 }}
          >
            Menunggu Review / Draft
          </div>
          <div
            style={{
              fontSize: "1.6rem",
              fontWeight: 900,
              color: "#f59e0b",
              margin: "4px 0 2px",
            }}
          >
            {
              posts.filter((p) => p.status === "draft" || p.status === "review")
                .length
            }
          </div>
          <div style={{ fontSize: "0.74rem", color: "#64748b" }}>
            Perlu pengecekan sebelum tayang
          </div>
        </div>

        <div
          className="uda-card"
          style={{ padding: "16px 20px", borderLeft: "4px solid #475569" }}
        >
          <div
            style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 700 }}
          >
            Sudah Terposting
          </div>
          <div
            style={{
              fontSize: "1.6rem",
              fontWeight: 900,
              color: "#475569",
              margin: "4px 0 2px",
            }}
          >
            {posts.filter((p) => p.status === "terposting").length}
          </div>
          <div style={{ fontSize: "0.74rem", color: "#16a34a" }}>
            Berhasil dipublikasikan
          </div>
        </div>
      </div>

      {/* DAFTAR JADWAL HARI INI (ID: tour-today-schedule) */}
      <div
        id="tour-today-schedule"
        className="uda-card"
        style={{
          padding: 24,
          borderRadius: 20,
          border: "1px solid #dbeafe",
          boxShadow: "0 4px 20px rgba(37, 99, 235, 0.04)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <CalendarDays size={20} style={{ color: "#0284c7" }} />
              <h2
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 900,
                  color: "#0f172a",
                }}
              >
                {isToday
                  ? "Jadwal Konten Hari Ini"
                  : `Jadwal Konten: ${formattedDateTitle}`}
              </h2>
            </div>
            <p style={{ color: "#64748b", fontSize: "0.84rem", marginTop: 4 }}>
              {isToday
                ? `Menampilkan seluruh jadwal tayang untuk hari ini (${formattedDateTitle}).`
                : `Menampilkan arsip jadwal untuk ${formattedDateTitle}.`}
            </p>
          </div>

          <span
            className="status-pill"
            style={{
              backgroundColor: isToday ? "#dcfce7" : "#f1f5f9",
              color: isToday ? "#15803d" : "#475569",
              fontWeight: 800,
            }}
          >
            {isToday ? "Hari Ini (WIB)" : "Jadwal Tanggal Lain"}
          </span>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div
            style={{
              padding: "48px 24px",
              textAlign: "center",
              color: "#64748b",
            }}
          >
            <Loader2
              size={32}
              className="animate-spin"
              style={{ color: "#16a34a", margin: "0 auto 12px" }}
            />
            <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>
              Memuat data jadwal hari ini...
            </div>
          </div>
        )}

        {/* Error State */}
        {errorMessage && !isLoading && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "16px 20px",
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 12,
              color: "#991b1b",
              fontSize: "0.88rem",
            }}
          >
            <AlertCircle size={20} style={{ color: "#dc2626" }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* EMPTY STATE INFORMATIF */}
        {!isLoading && !errorMessage && posts.length === 0 && (
          <div
            style={{
              padding: "48px 24px",
              textAlign: "center",
              backgroundColor: "#f8fafc",
              borderRadius: 16,
              border: "1px dashed #cbd5e1",
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                backgroundColor: "#e2e8f0",
                color: "#64748b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <CalendarIcon size={28} />
            </div>

            <h3
              style={{
                fontSize: "1.15rem",
                fontWeight: 800,
                color: "#0f172a",
                marginBottom: 6,
              }}
            >
              {isToday
                ? "Belum Ada Jadwal Konten untuk Hari Ini"
                : `Tidak Ada Jadwal Konten pada ${formattedDateTitle}`}
            </h3>

            <p
              style={{
                color: "#64748b",
                fontSize: "0.88rem",
                maxWidth: 480,
                margin: "0 auto 24px",
                lineHeight: 1.6,
              }}
            >
              {isToday
                ? "Gunakan waktu luang Anda untuk menyusun ide konten baru, mengatur kalender, atau menyiapkan bank caption favorit."
                : "Tidak ada postingan yang dijadwalkan pada tanggal ini."}
            </p>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <button
                className="btn-uda btn-uda-primary btn-uda-sm"
                onClick={() => router.push("/app/kalender")}
                style={{ fontWeight: 700, padding: "10px 20px" }}
              >
                <Plus size={16} />
                <span>Rencanakan Konten Sekarang</span>
              </button>
              <button
                className="btn-uda btn-uda-secondary btn-uda-sm"
                onClick={() => handleDateChange(new Date())}
                style={{ fontWeight: 700 }}
              >
                Kembali ke Hari Ini
              </button>
            </div>
          </div>
        )}

        {/* DAFTAR POSTINGAN HARI INI */}
        {!isLoading && !errorMessage && posts.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {posts.map((post) => {
              const brand = brands.find((b) => b.id === post.brand_id);
              const postTime = post.scheduled_at
                ? new Date(post.scheduled_at).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }) + " WIB"
                : "Jam Belum Diatur";

              const statusColor =
                post.status === "siap"
                  ? { bg: "#dcfce7", text: "#15803d", label: "Siap Posting" }
                  : post.status === "draft"
                    ? { bg: "#e0f2fe", text: "#0284c7", label: "Draft" }
                    : post.status === "review"
                      ? { bg: "#fef3c7", text: "#b45309", label: "Review" }
                      : post.status === "terposting"
                        ? {
                            bg: "#f1f5f9",
                            text: "#475569",
                            label: "Sudah Posting",
                          }
                        : { bg: "#f1f5f9", text: "#64748b", label: "Ide" };

              return (
                <div
                  key={post.id}
                  style={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 14,
                    padding: "16px 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 16,
                    transition: "all 0.2s ease",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
                  }}
                >
                  {/* Kolom Kiri: Waktu, Brand, Judul */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      minWidth: 260,
                      flex: 1,
                    }}
                  >
                    {/* Waktu Badge */}
                    <div
                      style={{
                        padding: "8px 12px",
                        borderRadius: 10,
                        backgroundColor: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        textAlign: "center",
                        minWidth: 80,
                      }}
                    >
                      <Clock
                        size={14}
                        style={{ color: "#0284c7", margin: "0 auto 2px" }}
                      />
                      <div
                        style={{
                          fontSize: "0.82rem",
                          fontWeight: 800,
                          color: "#0f172a",
                        }}
                      >
                        {postTime}
                      </div>
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 4,
                          flexWrap: "wrap",
                        }}
                      >
                        {brand && (
                          <span
                            style={{
                              fontSize: "0.72rem",
                              fontWeight: 800,
                              padding: "2px 8px",
                              borderRadius: 6,
                              backgroundColor: `${brand.color}15`,
                              color: brand.color,
                            }}
                          >
                            {brand.name}
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 6,
                            backgroundColor: statusColor.bg,
                            color: statusColor.text,
                          }}
                        >
                          {statusColor.label}
                        </span>
                        <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                          Format: {post.content_type.toUpperCase()}
                        </span>
                      </div>

                      <h4
                        style={{
                          fontSize: "0.98rem",
                          fontWeight: 800,
                          color: "#0f172a",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: 480,
                        }}
                      >
                        {post.title}
                      </h4>
                      {post.caption && (
                        <p
                          style={{
                            fontSize: "0.82rem",
                            color: "#64748b",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: 520,
                            marginTop: 2,
                          }}
                        >
                          {post.caption}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Kolom Kanan: Tombol Salin 1-Klik & Buka */}
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <button
                      onClick={() => handleCopyCaption(post)}
                      className="btn-uda btn-uda-secondary btn-uda-sm"
                      style={{
                        height: 38,
                        padding: "0 12px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        backgroundColor:
                          copiedId === post.id ? "#16a34a" : "#f8fafc",
                        color: copiedId === post.id ? "#ffffff" : "#334155",
                      }}
                      title="Salin caption dan kumpulan hashtag ke clipboard"
                    >
                      {copiedId === post.id ? (
                        <Check size={14} />
                      ) : (
                        <Copy size={14} />
                      )}
                      <span>
                        {copiedId === post.id ? "Tersalin!" : "Salin Caption"}
                      </span>
                    </button>

                    <button
                      onClick={() => router.push(`/app/postingan/${post.id}`)}
                      className="btn-uda btn-uda-primary btn-uda-sm"
                      style={{
                        height: 38,
                        padding: "0 14px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: "0.82rem",
                        fontWeight: 700,
                      }}
                    >
                      <span>Buka</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
