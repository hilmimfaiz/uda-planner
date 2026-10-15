"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  RotateCcw,
  Clock,
  Instagram,
  CheckCircle2,
  Calendar as CalendarIcon,
  Filter,
} from "lucide-react";
import {
  DUMMY_POSTS,
  DUMMY_BRANDS,
  DUMMY_PILLARS,
  DummyPost,
} from "@/lib/dummy-data";
import { POST_STATUSES } from "@/lib/platforms";

export default function KalenderPage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<"bulan" | "minggu" | "agenda">(
    "bulan",
  );
  const [posts, setPosts] = useState<DummyPost[]>(DUMMY_POSTS);
  const [filterBrand, setFilterBrand] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [undoPostState, setUndoPostState] = useState<{
    id: string;
    oldDate: string | null;
  } | null>(null);

  // Filtered posts
  const filteredPosts = posts.filter((p) => {
    if (filterBrand !== "all" && p.brand_id !== filterBrand) return false;
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    return true;
  });

  const unscheduledPosts = filteredPosts.filter((p) => !p.scheduled_at);
  const scheduledPosts = filteredPosts.filter((p) => p.scheduled_at);

  // Month Grid Calculation
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  const calendarDays = [];
  // Days from previous month
  for (let i = firstDay - 1; i >= 0; i--) {
    calendarDays.push({
      date: new Date(year, month - 1, prevMonthLastDay - i),
      isCurrentMonth: false,
    });
  }
  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({
      date: new Date(year, month, i),
      isCurrentMonth: true,
    });
  }
  // Next month filling
  const totalSlots = calendarDays.length > 35 ? 42 : 35;
  const remaining = totalSlots - calendarDays.length;
  for (let i = 1; i <= remaining; i++) {
    calendarDays.push({
      date: new Date(year, month + 1, i),
      isCurrentMonth: false,
    });
  }

  // Handle Drag & Drop / Move Schedule
  const handleDropToDate = (targetDate: Date, postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const oldDate = post.scheduled_at;
    const newScheduled = new Date(targetDate);
    newScheduled.setHours(14, 0, 0, 0); // Default jam 14.00

    setPosts(
      posts.map((p) =>
        p.id === postId
          ? { ...p, scheduled_at: newScheduled.toISOString() }
          : p,
      ),
    );

    setUndoPostState({ id: postId, oldDate });
    const formatted = newScheduled.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    setToastMessage(`Jadwal dipindah ke ${formatted} 14.00`);

    setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  };

  // Undo Action
  const handleUndo = () => {
    if (!undoPostState) return;
    setPosts(
      posts.map((p) =>
        p.id === undoPostState.id
          ? { ...p, scheduled_at: undoPostState.oldDate }
          : p,
      ),
    );
    setToastMessage("Perubahan jadwal berhasil diurungkan.");
    setUndoPostState(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Toast Notifikasi dengan tombol Urungkan */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: "#0f172a",
            color: "#f8fafc",
            padding: "12px 18px",
            borderRadius: 10,
            boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            gap: 14,
            zIndex: 9999,
            fontSize: "0.88rem",
            fontWeight: 600,
          }}
        >
          <span>{toastMessage}</span>
          {undoPostState && (
            <button
              onClick={handleUndo}
              style={{
                background: "#16a34a",
                color: "white",
                border: "none",
                padding: "4px 10px",
                borderRadius: 6,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <RotateCcw size={13} />
              <span>Urungkan</span>
            </button>
          )}
        </div>
      )}

      {/* Header & Controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 14,
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a" }}>
            Kalender Konten
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.88rem" }}>
            Geser postingan untuk memindahkan tanggal dan jam tayang secara
            instan.
          </p>
        </div>

        {/* View Switcher: Bulan, Minggu, Agenda */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "#ffffff",
            padding: 4,
            borderRadius: 8,
            border: "1px solid #e2e8f0",
          }}
        >
          {(["bulan", "minggu", "agenda"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: "none",
                fontSize: "0.82rem",
                fontWeight: 600,
                textTransform: "capitalize",
                cursor: "pointer",
                background: viewMode === mode ? "#16a34a" : "transparent",
                color: viewMode === mode ? "#ffffff" : "#64748b",
              }}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Month Navigator & Filters */}

      <div
        className="uda-card"
        style={{
          padding: "16px 18px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          boxSizing: "border-box",
          borderRadius: 14,
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          boxShadow: "0 2px 8px rgba(15, 23, 42, 0.03)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            className="btn-uda btn-uda-secondary btn-uda-sm"
            onClick={() => {
              const prev = new Date(currentDate);
              prev.setMonth(prev.getMonth() - 1);
              setCurrentDate(prev);
            }}
          >
            <ChevronLeft size={16} />
          </button>
          <h2
            style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}
          >
            {currentDate.toLocaleDateString("id-ID", {
              month: "long",
              year: "numeric",
            })}
          </h2>
          <button
            className="btn-uda btn-uda-secondary btn-uda-sm"
            onClick={() => {
              const next = new Date(currentDate);
              next.setMonth(next.getMonth() + 1);
              setCurrentDate(next);
            }}
          >
            <ChevronRight size={16} />
          </button>
          <button
            className="btn-uda btn-uda-secondary btn-uda-sm"
            onClick={() => setCurrentDate(new Date())}
          >
            Hari Ini
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <select
            className="brand-dropdown-select"
            value={filterBrand}
            onChange={(e) => setFilterBrand(e.target.value)}
          >
            <option value="all">Semua Brand</option>
            {DUMMY_BRANDS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <select
            className="brand-dropdown-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Semua Status</option>
            <option value="ide">Ide</option>
            <option value="draft">Draft</option>
            <option value="review">Menunggu Review</option>
            <option value="siap">Siap Posting</option>
            <option value="terposting">Sudah Posting</option>
          </select>
        </div>
      </div>

      {/* Layout Kalender + Kolom "Belum Dijadwalkan" */}

      <div
        className="calendar-layout"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(220px, 260px)",
          gap: 16,
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          alignItems: "start",
        }}
      >
        {/* Main Grid Kalender */}
        <div
          className="uda-card"
          style={{
            padding: 12,
            minWidth: 0,
            width: "100%",
            maxWidth: "100%",
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          {viewMode === "agenda" ? (
            /* Mode Agenda (Daftar per hari) */
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {scheduledPosts.map((post) => {
                const brand = DUMMY_BRANDS.find((b) => b.id === post.brand_id);
                const statusMeta = POST_STATUSES[post.status];
                return (
                  <div
                    key={post.id}
                    style={{
                      padding: 14,
                      borderRadius: 10,
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "0.78rem",
                          color: "#64748b",
                          fontWeight: 600,
                        }}
                      >
                        {post.scheduled_at
                          ? new Date(post.scheduled_at).toLocaleDateString(
                              "id-ID",
                              {
                                weekday: "long",
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )
                          : ""}
                      </div>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: "0.92rem",
                          marginTop: 3,
                        }}
                      >
                        {post.title}
                      </div>
                      {brand && (
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: brand.color,
                            fontWeight: 700,
                            marginTop: 2,
                          }}
                        >
                          {brand.name}
                        </div>
                      )}
                    </div>
                    <span
                      className="status-pill"
                      style={{
                        background: statusMeta.bg,
                        color: statusMeta.text,
                      }}
                    >
                      {statusMeta.label}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Mode Bulan Grid 7 Kolom */
            <div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7,  minmax(0, 1fr))",
                  gap: 6,
                  marginBottom: 8,
                  textAlign: "center",
                }}
              >
                {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((d) => (
                  <div
                    key={d}
                    style={{
                      fontWeight: 700,
                      fontSize: "0.78rem",
                      color: "#64748b",
                      padding: "6px 0",
                    }}
                  >
                    {d}
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7,  minmax(0, 1fr))",
                  gap: 6,
                }}
              >
                {calendarDays.map((cell, idx) => {
                  const cellDateStr = cell.date.toDateString();
                  const isToday = cellDateStr === new Date().toDateString();
                  const cellPosts = scheduledPosts.filter(
                    (p) =>
                      p.scheduled_at &&
                      new Date(p.scheduled_at).toDateString() === cellDateStr,
                  );

                  return (
                    <div
                      key={idx}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const postId = e.dataTransfer.getData("text/plain");
                        if (postId) handleDropToDate(cell.date, postId);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDate(new Date(cell.date));
                      }}
                      style={{
                        minWidth: 0,
                        minHeight: "clamp(72px, 10vw, 110px)",
                        background: isToday
                          ? "#f0fdf4"
                          : cell.isCurrentMonth
                            ? "#ffffff"
                            : "#f8fafc",
                        border: isToday
                          ? "1px solid #16a34a"
                          : "1px solid #e2e8f0",
                        borderRadius: 8,
                        padding: "4px 3px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                        cursor: "pointer",
                        opacity: cell.isCurrentMonth ? 1 : 0.45,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          color: isToday ? "#16a34a" : "#64748b",
                          alignSelf: "flex-end",
                        }}
                      >
                        {cell.date.getDate()}
                      </div>

                      {cellPosts.map((post) => {
                        const brand = DUMMY_BRANDS.find(
                          (b) => b.id === post.brand_id,
                        );
                        const statusMeta = POST_STATUSES[post.status];
                        return (
                          <div
                            key={post.id}
                            draggable
                            onDragStart={(e) => {
                              e.stopPropagation();
                              e.dataTransfer.setData("text/plain", post.id);
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/app/postingan/${post.id}`);
                            }}
                            style={{
                              width: "100%",
                              minWidth: 0,
                              boxSizing: "border-box",
                              background: "#ffffff",
                              border: `1px solid ${brand ? brand.color + "44" : "#e2e8f0"}`,
                              borderLeft: `3px solid ${brand ? brand.color : "#16a34a"}`,
                              borderRadius: 5,
                              padding: "4px 2px",
                              fontSize: "0.65rem",
                              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                              cursor: "grab",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <span
                                style={{
                                  width: 5,
                                  height: 5,
                                  borderRadius: "50%",
                                  backgroundColor: statusMeta.color,
                                }}
                              />
                              <span
                                style={{
                                  fontWeight: 700,
                                  fontSize: "0.68rem",
                                  color: "#0f172a",
                                }}
                              >
                                {post.scheduled_at
                                  ? new Date(
                                      post.scheduled_at,
                                    ).toLocaleTimeString("id-ID", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : ""}
                              </span>
                            </div>
                            <div
                              style={{
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                color: "#334155",
                                marginTop: 1,
                              }}
                            >
                              {post.title}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {selectedDate && (
          <div
            className="uda-card"
            style={{
              marginTop: 16,
              padding: 16,
              minWidth: 0,
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            <h3 style={{ margin: "0 0 8px", fontSize: "1rem" }}>
              Agenda Tanggal Terpilih
            </h3>

            <p style={{ color: "#64748b", fontSize: "0.85rem" }}>
              {selectedDate.toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>

            <button
              onClick={() =>
                router.push(
                  `/app/postingan/baru?date=${selectedDate.toISOString()}`,
                )
              }
              style={{
                padding: "9px 12px",
                border: "none",
                borderRadius: 8,
                background: "#16a34a",
                color: "#fff",
                cursor: "pointer",
                marginRight: 8,
              }}
            >
              + Buat Postingan
            </button>

            <button
              onClick={() => setSelectedDate(null)}
              style={{
                padding: "9px 12px",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                background: "#fff",
                cursor: "pointer",
              }}
            >
              Tutup
            </button>

            <div style={{ marginTop: 14 }}>
              {scheduledPosts.filter(
                (post) =>
                  post.scheduled_at &&
                  new Date(post.scheduled_at).toDateString() ===
                    selectedDate.toDateString(),
              ).length === 0 ? (
                <p style={{ color: "#64748b" }}>
                  Belum ada postingan terjadwal pada tanggal ini.
                </p>
              ) : (
                scheduledPosts
                  .filter(
                    (post) =>
                      post.scheduled_at &&
                      new Date(post.scheduled_at).toDateString() ===
                        selectedDate.toDateString(),
                  )
                  .map((post) => (
                    <div
                      key={post.id}
                      onClick={() => router.push(`/app/postingan/${post.id}`)}
                      style={{
                        padding: 12,
                        marginBottom: 8,
                        border: "1px solid #e2e8f0",
                        borderRadius: 8,
                        cursor: "pointer",
                        overflowWrap: "anywhere",
                      }}
                    >
                      <strong>{post.title}</strong>
                      <p style={{ margin: "5px 0 0", color: "#64748b" }}>
                        {post.scheduled_at
                          ? new Date(post.scheduled_at).toLocaleTimeString(
                              "id-ID",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )
                          : ""}
                      </p>
                    </div>
                  ))
              )}
            </div>
          </div>
        )}

        {/* Kotak "Belum Dijadwalkan" di Samping (Desktop) */}
        <div
          className="uda-card"
          style={{ padding: 16, height: "fit-content" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <h3
              style={{ fontSize: "0.92rem", fontWeight: 700, color: "#0f172a" }}
            >
              Belum Dijadwalkan
            </h3>
            <span
              className="status-pill"
              style={{ background: "#f1f5f9", color: "#475569" }}
            >
              {unscheduledPosts.length}
            </span>
          </div>

          <p
            style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: 12 }}
          >
            Tarik (drag) kartu ini langsung ke tanggal kalender untuk
            menjadwalkan:
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              maxHeight: 450,
              overflowY: "auto",
            }}
          >
            {unscheduledPosts.length === 0 ? (
              <p
                style={{
                  fontSize: "0.78rem",
                  color: "#94a3b8",
                  fontStyle: "italic",
                }}
              >
                Semua postingan sudah memiliki tanggal jadwal.
              </p>
            ) : (
              unscheduledPosts.map((post) => {
                const brand = DUMMY_BRANDS.find((b) => b.id === post.brand_id);
                return (
                  <div
                    key={post.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", post.id);
                    }}
                    onClick={() => router.push(`/app/postingan/${post.id}`)}
                    style={{
                      padding: 10,
                      borderRadius: 8,
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      cursor: "grab",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        marginBottom: 3,
                      }}
                    >
                      {brand && (
                        <span
                          style={{
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            color: brand.color,
                          }}
                        >
                          {brand.name}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: "0.82rem",
                        color: "#0f172a",
                      }}
                    >
                      {post.title}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
