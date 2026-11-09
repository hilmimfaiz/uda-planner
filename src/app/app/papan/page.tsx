"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  Clock,
  Instagram,
  CheckCircle2,
  AlertCircle,
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import {
  DUMMY_POSTS,
  DUMMY_BRANDS,
  DUMMY_MEMBERS,
  DummyPost,
  DummyBrand,
} from "@/lib/dummy-data";
import { POST_STATUSES } from "@/lib/platforms";
import { PostService } from "@/services/post.service";
import { BrandService } from "@/services/brand.service";
import { useAuth } from "@/contexts/auth-context";
import { GuidedTour, TourStep } from "@/components/guided-tour";
import {
  playSuccessSound,
  playErrorSound,
  playNotificationSound,
} from "@/lib/audio-effects";
import { addAppNotification } from "@/lib/notification-manager";

const papanTourSteps: TourStep[] = [
  {
    targetId: "tour-papan-header",
    title: "Papan Status Konten (Kanban)",
    description:
      "Pantau pipeline produksi konten tim Anda dari tahap pencetusan ide hingga konten berhasil dipublikasikan.",
    placement: "bottom",
  },
  {
    targetId: "tour-papan-board",
    title: "5 Tahap Alur Kerja",
    description:
      "Konten dikelompokkan ke dalam 5 status: Ide, Draft, Menunggu Review, Siap Posting, dan Sudah Posting. Setiap kolom menghitung total konten secara real-time.",
    placement: "bottom",
  },
  {
    targetId: "tour-papan-card",
    title: "Interaksi Kartu & Drag-and-Drop",
    description:
      "Tarik (drag) kartu postingan ke kolom lain untuk memindahkan status alur kerja seketika. Klik kartu untuk melihat atau mengedit detail lengkap.",
    placement: "right",
  },
];

export default function PapanKanbanPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [brands, setBrands] = useState<DummyBrand[]>(() => {
    try {
      const cached = BrandService.getCachedBrands();
      return cached.length > 0 ? cached : DUMMY_BRANDS;
    } catch {
      return DUMMY_BRANDS;
    }
  });
  const [posts, setPosts] = useState<DummyPost[]>(() => {
    try {
      const cached = PostService.getCachedPosts();
      return cached.length > 0 ? cached : DUMMY_POSTS;
    } catch {
      return DUMMY_POSTS;
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBrandId, setSelectedBrandId] = useState<string>("all");
  const [userRolesByBrand, setUserRolesByBrand] = useState<
    Record<string, "owner" | "editor" | "reviewer" | "viewer" | null>
  >({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState<number>(3);
  const [pageByColumn, setPageByColumn] = useState<Record<string, number>>({
    ide: 1,
    draft: 1,
    review: 1,
    siap: 1,
    terposting: 1,
  });

  type ColId = "ide" | "draft" | "review" | "siap" | "terposting";
  const [activeStatus, setActiveStatus] = useState<ColId>("ide");
  const [isMobile, setIsMobile] = useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const resetPages = () =>
    setPageByColumn({ ide: 1, draft: 1, review: 1, siap: 1, terposting: 1 });

  React.useEffect(() => {
    let isMounted = true;

    const loadBrandsAndRoles = async () => {
      try {
        const bList = await BrandService.getBrands(user?.id);
        if (!isMounted) return;
        const list = bList || [];
        setBrands(list);

        // Fetch roles in parallel to prevent sequential waterfall lag
        const rolePromises = list.map(async (b) => {
          const role = await BrandService.getUserBrandRole(b.id, user?.id);
          return [b.id, role] as const;
        });
        const resolvedRoles = await Promise.all(rolePromises);
        if (!isMounted) return;

        const rolesMap: Record<string, "owner" | "editor" | "reviewer" | "viewer" | null> = {};
        resolvedRoles.forEach(([bId, role]) => {
          rolesMap[bId] = role;
        });
        setUserRolesByBrand(rolesMap);
      } catch (e) {}
    };

    const loadPosts = async () => {
      try {
        const data = await PostService.getPosts({}, user?.id);
        if (isMounted && data) setPosts(data);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadBrandsAndRoles();
    loadPosts();

    const handleDataChange = () => {
      loadBrandsAndRoles();
      loadPosts();
    };

    window.addEventListener("uda_post_updated", loadPosts);
    window.addEventListener("uda_post_created", loadPosts);
    window.addEventListener("uda_post_deleted", loadPosts);
    window.addEventListener("uda_team_updated", handleDataChange);
    window.addEventListener("storage", handleDataChange);

    return () => {
      isMounted = false;
      window.removeEventListener("uda_post_updated", loadPosts);
      window.removeEventListener("uda_post_created", loadPosts);
      window.removeEventListener("uda_post_deleted", loadPosts);
      window.removeEventListener("uda_team_updated", handleDataChange);
      window.removeEventListener("storage", handleDataChange);
    };
  }, [user?.id]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const columns: Array<{
    id: "ide" | "draft" | "review" | "siap" | "terposting";
    title: string;
    color: string;
  }> = [
    { id: "ide", title: "Ide", color: "#94A3B8" },
    { id: "draft", title: "Draft", color: "#3B82F6" },
    { id: "review", title: "Menunggu Review", color: "#F59E0B" },
    { id: "siap", title: "Siap Posting", color: "#16A34A" },
    { id: "terposting", title: "Sudah Posting", color: "#475569" },
  ];

  // Role pengguna untuk brand yang sedang difilter
  const currentFilteredRole =
    selectedBrandId !== "all" ? userRolesByBrand[selectedBrandId] : null;

  const filteredPosts =
    selectedBrandId === "all"
      ? posts
      : posts.filter((p) => p.brand_id === selectedBrandId);

  // Handle Drag & Drop Between Columns dengan Validasi Role Tim
  const handleDropToColumn = async (
    targetStatus: "ide" | "draft" | "review" | "siap" | "terposting",
    postId: string,
  ) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    if (post.status === targetStatus) return;

    const brand = brands.find((b) => b.id === post.brand_id);
    const userRole =
      userRolesByBrand[post.brand_id] ??
      (await BrandService.getUserBrandRole(post.brand_id, user?.id));

    if (!userRole) {
      playErrorSound();
      showToast(
        "⛔ Akses ditolak: Anda tidak memiliki akses ke brand postingan ini.",
      );
      return;
    }

    // 1. Role: Viewer (Hanya Read-Only, Tidak Ada Aksi Geser Apapun)
    if (userRole === "viewer") {
      playErrorSound();
      showToast(
        "👁️ Mode Viewer (Lihat Saja): Anda hanya memiliki akses melihat dan tidak dapat melakukan aksi geser apapun di kanban.",
      );
      return;
    }

    // 2. Role: Reviewer
    // Reviewer memiliki hak penuh untuk menyetujui postingan ke 'Siap Posting' dan mempublikasikan ke 'Sudah Posting'.
    // Serta dapat mengembalikan postingan ke 'Draft' atau 'Menunggu Review' jika butuh perbaikan.
    if (userRole === "reviewer") {
      if (targetStatus === "siap") {
        // Diizinkan: Menyetujui postingan ke 'Siap Posting'
      } else if (targetStatus === "terposting") {
        // Diizinkan: Mempublikasikan postingan ke 'Sudah Posting'
      } else if (targetStatus === "draft" || targetStatus === "review") {
        // Diizinkan: Mengembalikan alur kerja untuk revisi
      } else {
        playErrorSound();
        showToast(
          "⚠️ Peran Reviewer: Anda dapat menyetujui postingan ke 'Siap Posting' atau mempublikasikan ke 'Sudah Posting'.",
        );
        return;
      }
    }

    // 3. Role: Editor
    // Aturan:
    // - Hanya bisa bergeser antara Ide, Draft, dan Menunggu Review.
    // - Jika status awal kartu sudah 'siap' (selesai direview & disetujui Reviewer/Owner), maka Editor BISA geser ke 'terposting' (Sudah Posting).
    // - Editor TIDAK BISA memindahkan kartu ke 'siap' (karena persetujuan review hanya wewenang Reviewer atau Owner).
    // - Editor TIDAK BISA langsung loncat ke 'terposting' jika status belum 'siap'.
    if (userRole === "editor") {
      if (post.status === "siap") {
        if (targetStatus === "terposting") {
          // Diizinkan: Editor mempublikasikan postingan yang sudah disetujui Reviewer
        } else if (targetStatus === "draft" || targetStatus === "review") {
          // Diizinkan: Mengembalikan ke alur pengerjaan jika memerlukan revisi
        } else {
          playErrorSound();
          showToast(
            "⚠️ Peran Editor: Dari 'Siap Posting', Anda dapat memindahkannya ke 'Sudah Posting' atau mengembalikannya ke draft alur kerja.",
          );
          return;
        }
      } else {
        // Status awal belum 'siap' (misal: ide, draft, review)
        if (targetStatus === "siap") {
          playErrorSound();
          showToast(
            "⚠️ Peran Editor: Menyetujui postingan ke 'Siap Posting' hanya dapat dilakukan oleh Reviewer atau Owner setelah proses review.",
          );
          return;
        }
        if (targetStatus === "terposting") {
          playErrorSound();
          showToast(
            "⚠️ Peran Editor: Postingan harus disetujui (Siap Posting) oleh Reviewer terlebih dahulu sebelum dapat dipindahkan ke 'Sudah Posting'.",
          );
          return;
        }
        // Perpindahan antar 'ide', 'draft', dan 'review' diizinkan untuk Editor
      }
    }

    // 4. Role: Owner (Akses Penuh Tanpa Batasan)

    const postedAt =
      targetStatus === "terposting" ? new Date().toISOString() : post.posted_at;

    const updated = posts.map((p) => {
      if (p.id === postId) {
        return {
          ...p,
          status: targetStatus,
          posted_at: postedAt,
        };
      }
      return p;
    });

    setPosts(updated);
    try {
      await PostService.updatePost(
        postId,
        {
          status: targetStatus,
          posted_at: postedAt,
        },
        user?.id,
      );
    } catch (err: any) {
      playErrorSound();
      showToast(`⛔ ${err.message || "Gagal memperbarui status"}`);
      PostService.getPosts({}, user?.id).then((data) => {
        if (data) setPosts(data);
      });
      return;
    }

    // Notifikasi sistem dan toast kustom sesuai perubahan
    let notifMsg = `Status dipindahkan ke: ${POST_STATUSES[targetStatus].label}`;
    if (userRole === "reviewer" && targetStatus === "siap") {
      notifMsg = `✅ Review Selesai: Postingan disetujui dan dipindahkan ke 'Siap Posting'.`;
    } else if (targetStatus === "terposting") {
      notifMsg = `🚀 Konten Dipublikasikan: Postingan berhasil dipindahkan ke 'Sudah Posting'.`;
    } else if (targetStatus === "review") {
      notifMsg = `📬 Menunggu Review: Postingan diajukan untuk ditinjau oleh Reviewer.`;
    } else {
      notifMsg = `✅ Status Diperbarui: Postingan dipindahkan ke '${POST_STATUSES[targetStatus].label}'.`;
    }

    addAppNotification({
      type:
        targetStatus === "review"
          ? "review_request"
          : targetStatus === "siap"
            ? "review_approved"
            : "status_change",
      title: `Status: ${POST_STATUSES[targetStatus].label}`,
      message: `Postingan "${post.title}" dipindahkan ke kolom "${POST_STATUSES[targetStatus].label}".`,
      link: `/app/postingan/${post.id}`,
    });

    playNotificationSound();
    showToast(notifMsg);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {toastMessage && (
        <div
          className="kanban-toast"
          style={{
            background: "#0f172a",
            color: "#f8fafc",
            padding: "12px 18px",
            borderRadius: 10,
            boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
            zIndex: 9999,
            fontSize: "0.88rem",
            fontWeight: 600,
          }}
        >
          {toastMessage}
        </div>
      )}

      <div
        id="tour-papan-header"
        className="kanban-page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
              Papan Status (Kanban)
            </h1>
            {isLoading && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: '0.75rem',
                  color: '#16a34a',
                  fontWeight: 700,
                  background: '#f0fdf4',
                  padding: '3px 10px',
                  borderRadius: 999,
                  border: '1px solid #bbf7d0',
                }}
              >
                <Loader2 size={13} className="animate-spin" />
                <span>Memuat...</span>
              </div>
            )}
          </div>
          <p style={{ color: "#64748b", fontSize: "0.88rem", marginTop: 4 }}>
            Geser kartu antar kolom untuk memperbarui status dan alur
            persetujuan.
          </p>
        </div>

        {/* Filter Brand & Pengaturan Konten per Kolom */}
        <div className="kanban-filter-bar">
          <div className="kanban-filter-field">
            <label htmlFor="kanban-filter-brand">Filter Brand:</label>
            <select
              id="kanban-filter-brand"
              className="kanban-select"
              value={selectedBrandId}
              onChange={(e) => {
                setSelectedBrandId(e.target.value);
                resetPages();
              }}
            >
              <option value="all">Semua Brand ({brands.length})</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {selectedBrandId !== "all" && currentFilteredRole && (
            <div
              className="kanban-role-badge"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 10px",
                borderRadius: 8,
                fontSize: "0.78rem",
                fontWeight: 800,
                border: "1.5px solid",
                borderColor:
                  currentFilteredRole === "owner"
                    ? "#8b5cf6"
                    : currentFilteredRole === "reviewer"
                      ? "#f59e0b"
                      : currentFilteredRole === "editor"
                        ? "#10b981"
                        : "#94a3b8",
                backgroundColor:
                  currentFilteredRole === "owner"
                    ? "#f5f3ff"
                    : currentFilteredRole === "reviewer"
                      ? "#fffbeb"
                      : currentFilteredRole === "editor"
                        ? "#ecfdf5"
                        : "#f1f5f9",
                color:
                  currentFilteredRole === "owner"
                    ? "#6d28d9"
                    : currentFilteredRole === "reviewer"
                      ? "#b45309"
                      : currentFilteredRole === "editor"
                        ? "#047857"
                        : "#475569",
              }}
              title={`Peran Anda pada brand ini: ${currentFilteredRole.toUpperCase()}`}
            >
              <span>
                {currentFilteredRole === "owner" && "👑 Owner"}
                {currentFilteredRole === "reviewer" && "🛡️ Reviewer"}
                {currentFilteredRole === "editor" && "✏️ Editor"}
                {currentFilteredRole === "viewer" && "👁️ Viewer (Read-Only)"}
              </span>
            </div>
          )}

          <div className="kanban-filter-field">
            <label htmlFor="kanban-per-page">Konten per kolom:</label>
            <select
              id="kanban-per-page"
              className="kanban-select"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                resetPages();
              }}
            >
              <option value={3}>3 per halaman</option>
              <option value={4}>4 per halaman</option>
              <option value={5}>5 per halaman</option>
              <option value={10}>10 per halaman</option>
            </select>
          </div>
        </div>
      </div>

      {/* Banner informasi jika user berperan sebagai Viewer pada brand yang dipilih */}
      {selectedBrandId !== "all" && currentFilteredRole === "viewer" && (
        <div
          style={{
            background: "#f8fafc",
            border: "1.5px dashed #cbd5e1",
            borderRadius: 10,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: "0.84rem",
            color: "#475569",
            fontWeight: 600,
          }}
        >
          <span style={{ fontSize: "1.1rem" }}>👁️</span>
          <span>
            <strong>Mode Akses Lihat Saja (Viewer):</strong> Anda dapat memantau
            alur status kanban brand ini dalam mode Read-Only. Pemindahan kartu
            alur kerja hanya dapat dilakukan oleh Editor, Reviewer, atau Owner.
          </span>
        </div>
      )}

      {/* Tab status (khusus HP) */}
      {isMobile && (
        <div className="kanban-tabs" role="tablist">
          {columns.map((col) => {
            const count = filteredPosts.filter(
              (p) => p.status === col.id,
            ).length;
            return (
              <button
                key={col.id}
                type="button"
                role="tab"
                aria-selected={activeStatus === col.id}
                className={`kanban-tab ${activeStatus === col.id ? "active" : ""}`}
                onClick={() => setActiveStatus(col.id)}
              >
                <span className="dot" style={{ background: col.color }} />
                {col.title}
                <span className="count">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 5 Kolom Kanban Responsif */}
      <div className="kanban-board-wrapper" style={{ position: "relative" }}>
        {isLoading && posts.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 14, width: '100%' }}>
            <Loader2 size={38} className="animate-spin" style={{ color: '#16a34a' }} />
            <span style={{ fontSize: '0.92rem', color: '#64748b', fontWeight: 600 }}>Memuat papan status konten...</span>
          </div>
        ) : (
          <>
            {/* Target Spotlight Khusus Bagian Atas 5 Kolom (Hanya Header Status, Tidak Sampai Bawah) */}
            <div
              id="tour-papan-board"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 56,
                pointerEvents: "none",
              }}
            />
            {columns.map((col, idx) => {
          if (isMobile && col.id !== activeStatus) return null;
          const isRow1 = idx < 3; // 0 (ide), 1 (draft), 2 (review) -> Baris Atas 3 Kolom
          const colPosts = filteredPosts.filter((p) => p.status === col.id);
          const totalPages = Math.max(
            1,
            Math.ceil(colPosts.length / itemsPerPage),
          );
          const currentPage = pageByColumn[col.id] || 1;
          const safeCurrentPage = Math.min(currentPage, totalPages);
          const paginatedPosts = colPosts.slice(
            (safeCurrentPage - 1) * itemsPerPage,
            safeCurrentPage * itemsPerPage,
          );

          return (
            <div
              key={col.id}
              className={`kanban-board-column ${isRow1 ? "kanban-col-row1" : "kanban-col-row2"}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const postId = e.dataTransfer.getData("text/plain");
                if (postId) handleDropToColumn(col.id, postId);
              }}
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: 12,
                minHeight: 520,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {/* Header Kolom */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingBottom: 8,
                  borderBottom: `2px solid ${col.color}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontWeight: 700,
                    fontSize: "0.88rem",
                    color: "#0f172a",
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: col.color,
                      flexShrink: 0,
                    }}
                  />
                  <span className="kanban-col-header-title">{col.title}</span>
                </div>
                <span
                  className="kanban-col-header-badge"
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    background: "#e2e8f0",
                    padding: "2px 7px",
                    borderRadius: 999,
                    color: "#475569",
                  }}
                >
                  {colPosts.length}
                </span>
              </div>

              {/* Daftar Kartu */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  flex: 1,
                }}
              >
                {colPosts.length === 0 ? (
                  <div
                    className="kanban-empty-placeholder"
                    style={{
                      textAlign: "center",
                      padding: "36px 12px",
                      color: "#94a3b8",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      border: "1.5px dashed #cbd5e1",
                      borderRadius: 8,
                      background: "#ffffff",
                    }}
                  >
                    Belum ada konten
                  </div>
                ) : (
                  paginatedPosts.map((post, postIdx) => {
                    const brand = brands.find((b) => b.id === post.brand_id);
                    const assignee = DUMMY_MEMBERS.find(
                      (m) => m.id === post.assignee_id,
                    );
                    const postRole = userRolesByBrand[post.brand_id];
                    const isViewer = postRole === "viewer";
                    const isDraggable = !isViewer;

                    const cardTooltip = isViewer
                      ? "Mode Viewer: Hanya dapat melihat postingan (Read-Only)"
                      : postRole === "reviewer"
                        ? "Peran Reviewer: Geser ke 'Siap Posting' untuk menyetujui atau ke 'Sudah Posting' untuk mempublikasikan"
                        : undefined;

                    return (
                      <div
                        key={post.id}
                        id={
                          col.id === "ide" &&
                          postIdx === 0 &&
                          safeCurrentPage === 1
                            ? "tour-papan-card"
                            : undefined
                        }
                        className="kanban-card-item"
                        draggable={isDraggable}
                        onDragStart={(e) => {
                          if (!isDraggable) {
                            e.preventDefault();
                            playErrorSound();
                            showToast(
                              "👁️ Mode Viewer (Lihat Saja): Anda hanya memiliki akses melihat (Read-Only).",
                            );
                            return;
                          }
                          e.dataTransfer.setData("text/plain", post.id);
                        }}
                        onClick={() => router.push(`/app/postingan/${post.id}`)}
                        title={cardTooltip}
                        style={{
                          background: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: 10,
                          padding: 12,
                          cursor: isDraggable ? "grab" : "pointer",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                          opacity: isViewer ? 0.95 : 1,
                        }}
                      >
                        {/* Brand Chip, Badge Viewer & Waktu */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              flexWrap: "wrap",
                            }}
                          >
                            {brand && (
                              <span
                                className="kanban-card-brand-chip"
                                style={{
                                  fontSize: "0.68rem",
                                  fontWeight: 700,
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  background: `${brand.color}15`,
                                  color: brand.color,
                                }}
                              >
                                {brand.name}
                              </span>
                            )}
                            {isViewer && (
                              <span
                                style={{
                                  fontSize: "0.68rem",
                                  fontWeight: 700,
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  background: "#f1f5f9",
                                  color: "#64748b",
                                  border: "1px solid #e2e8f0",
                                }}
                              >
                                👁️ Read-Only
                              </span>
                            )}
                          </div>
                          <span
                            style={{
                              fontSize: "0.7rem",
                              color: "#64748b",
                              flexShrink: 0,
                            }}
                          >
                            {post.scheduled_at
                              ? new Date(post.scheduled_at).toLocaleDateString(
                                  "id-ID",
                                  { day: "numeric", month: "short" },
                                )
                              : "Belum dijadwalkan"}
                          </span>
                        </div>

                        {/* Judul */}
                        <div
                          className="kanban-card-title"
                          style={{
                            fontWeight: 700,
                            fontSize: "0.85rem",
                            color: "#0f172a",
                            lineHeight: 1.3,
                          }}
                        >
                          {post.title}
                        </div>

                        {/* Footer: Assignee & Comments */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginTop: 4,
                            paddingTop: 6,
                            borderTop: "1px solid #f1f5f9",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            {assignee ? (
                              <img
                                src={assignee.avatar}
                                alt=""
                                style={{
                                  width: 22,
                                  height: 22,
                                  borderRadius: "50%",
                                  objectFit: "cover",
                                }}
                              />
                            ) : (
                              <span
                                style={{ fontSize: "0.7rem", color: "#94a3b8" }}
                              >
                                Unassigned
                              </span>
                            )}
                            <span
                              style={{
                                fontSize: "0.7rem",
                                textTransform: "uppercase",
                                color: "#64748b",
                                fontWeight: 600,
                              }}
                            >
                              {post.content_type}
                            </span>
                          </div>

                          {post.comments_count > 0 && (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 3,
                                fontSize: "0.72rem",
                                color: "#64748b",
                              }}
                            >
                              <MessageSquare size={12} />
                              <span>{post.comments_count}</span>
                            </div>
                          )}
                        </div>

                        {isMobile && !isViewer && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <span
                              style={{
                                fontSize: "0.78rem",
                                fontWeight: 700,
                                color: "#64748b",
                                whiteSpace: "nowrap",
                              }}
                            >
                              Pindah ke:
                            </span>
                            <select
                              className="kanban-select kanban-move-select"
                              value={post.status}
                              onChange={(e) =>
                                handleDropToColumn(
                                  e.target.value as ColId,
                                  post.id,
                                )
                              }
                            >
                              {columns.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.title}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Kontrol Paginasi Tiap Kolom */}
              {colPosts.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingTop: 8,
                    marginTop: "auto",
                    borderTop: "1.5px dashed #e2e8f0",
                  }}
                >
                  <button
                    type="button"
                    disabled={safeCurrentPage <= 1}
                    onClick={() =>
                      setPageByColumn((prev) => ({
                        ...prev,
                        [col.id]: Math.max(1, safeCurrentPage - 1),
                      }))
                    }
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 26,
                      height: 26,
                      borderRadius: 6,
                      border: "1.5px solid #0f172a",
                      backgroundColor:
                        safeCurrentPage <= 1 ? "#f1f5f9" : "#ffffff",
                      color: safeCurrentPage <= 1 ? "#94a3b8" : "#0f172a",
                      boxShadow:
                        safeCurrentPage <= 1
                          ? "none"
                          : "1.5px 1.5px 0px #0f172a",
                      cursor: safeCurrentPage <= 1 ? "not-allowed" : "pointer",
                      transition: "all 0.15s ease",
                    }}
                    title="Halaman sebelumnya"
                  >
                    <ChevronLeft size={14} />
                  </button>

                  <span
                    style={{
                      fontSize: "0.74rem",
                      fontWeight: 700,
                      color: "#0f172a",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <span>
                      Hlm {safeCurrentPage}/{totalPages}
                    </span>
                    <span style={{ color: "#94a3b8", fontWeight: 600 }}>
                      ({colPosts.length})
                    </span>
                  </span>

                  <button
                    type="button"
                    disabled={safeCurrentPage >= totalPages}
                    onClick={() =>
                      setPageByColumn((prev) => ({
                        ...prev,
                        [col.id]: Math.min(totalPages, safeCurrentPage + 1),
                      }))
                    }
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 26,
                      height: 26,
                      borderRadius: 6,
                      border: "1.5px solid #0f172a",
                      backgroundColor:
                        safeCurrentPage >= totalPages ? "#f1f5f9" : "#ffffff",
                      color:
                        safeCurrentPage >= totalPages ? "#94a3b8" : "#0f172a",
                      boxShadow:
                        safeCurrentPage >= totalPages
                          ? "none"
                          : "1.5px 1.5px 0px #0f172a",
                      cursor:
                        safeCurrentPage >= totalPages
                          ? "not-allowed"
                          : "pointer",
                      transition: "all 0.15s ease",
                    }}
                    title="Halaman berikutnya"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
          </>
        )}
      </div>

      <GuidedTour steps={papanTourSteps} tourKey="uda_tour_papan" />
    </div>
  );
}
