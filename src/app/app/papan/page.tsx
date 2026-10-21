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
} from "lucide-react";
import {
  DUMMY_POSTS,
  DUMMY_BRANDS,
  DUMMY_MEMBERS,
  DummyPost,
} from "@/lib/dummy-data";
import { POST_STATUSES } from "@/lib/platforms";
import { PostService } from "@/services/post.service";
import { GuidedTour, TourStep } from "@/components/guided-tour";

const papanTourSteps: TourStep[] = [
  {
    targetId: "tour-papan-header",
    title: "Papan Status Konten (Kanban)",
    description: "Pantau pipeline produksi konten tim Anda dari tahap pencetusan ide hingga konten berhasil dipublikasikan.",
    placement: "bottom",
  },
  {
    targetId: "tour-papan-board",
    title: "5 Tahap Alur Kerja",
    description: "Konten dikelompokkan ke dalam 5 status: Ide, Draft, Menunggu Review, Siap Posting, dan Sudah Posting. Setiap kolom menghitung total konten secara real-time.",
    placement: "bottom",
  },
  {
    targetId: "tour-papan-card",
    title: "Interaksi Kartu & Drag-and-Drop",
    description: "Tarik (drag) kartu postingan ke kolom lain untuk memindahkan status alur kerja seketika. Klik kartu untuk melihat atau mengedit detail lengkap.",
    placement: "right",
  },
];

export default function PapanKanbanPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<DummyPost[]>(DUMMY_POSTS);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  React.useEffect(() => {
    PostService.getPosts().then((data) => {
      if (data && data.length > 0) setPosts(data);
    });
  }, []);

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

  // Handle Drag & Drop Between Columns
  const handleDropToColumn = async (
    targetStatus: "ide" | "draft" | "review" | "siap" | "terposting",
    postId: string,
  ) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const brand = DUMMY_BRANDS.find((b) => b.id === post.brand_id);

    // Rule validation: jika brand require_approval dan dipindah langsung ke 'siap' dari draft
    if (
      brand?.require_approval &&
      targetStatus === "siap" &&
      post.status === "draft"
    ) {
      showToast(
        "⚠️ Brand ini wajib review! Ajukan review terlebih dahulu sebelum disetujui.",
      );
      return;
    }

    const postedAt =
      targetStatus === "terposting"
        ? new Date().toISOString()
        : post.posted_at;

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
    await PostService.updatePost(postId, {
      status: targetStatus,
      posted_at: postedAt,
    });
    showToast(`Status dipindahkan ke: ${POST_STATUSES[targetStatus].label}`);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
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
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a" }}>
            Papan Status (Kanban)
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.88rem" }}>
            Geser kartu antar kolom untuk memperbarui status dan alur
            persetujuan.
          </p>
        </div>
      </div>

      {/* 5 Kolom Kanban Responsif */}
      <div className="kanban-board-wrapper" style={{ position: "relative" }}>
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
        {columns.map((col) => {
          const colPosts = posts.filter((p) => p.status === col.id);
          return (
            <div
              key={col.id}
              className="kanban-board-column"
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
                    }}
                  />
                  <span>{col.title}</span>
                </div>
                <span
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
                {colPosts.map((post, postIdx) => {
                  const brand = DUMMY_BRANDS.find(
                    (b) => b.id === post.brand_id,
                  );
                  const assignee = DUMMY_MEMBERS.find(
                    (m) => m.id === post.assignee_id,
                  );
                  return (
                    <div
                      key={post.id}
                      id={col.id === "ide" && postIdx === 0 ? "tour-papan-card" : undefined}
                      draggable
                      onDragStart={(e) =>
                        e.dataTransfer.setData("text/plain", post.id)
                      }
                      onClick={() => router.push(`/app/postingan/${post.id}`)}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: 10,
                        padding: 12,
                        cursor: "grab",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      {/* Brand Chip & Waktu */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        {brand && (
                          <span
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
                        <span style={{ fontSize: "0.7rem", color: "#64748b" }}>
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
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <GuidedTour steps={papanTourSteps} tourKey="uda_tour_papan" />
    </div>
  );
}
