"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Grid as GridIcon,
  Lock,
  Layers,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { DUMMY_POSTS, DUMMY_BRANDS } from "@/lib/dummy-data";
import { POST_STATUSES } from "@/lib/platforms";
import { GuidedTour, TourStep } from "@/components/guided-tour";

const gridTourSteps: TourStep[] = [
  {
    targetId: "tour-grid-header",
    title: "Simulator Grid Instagram (3x3 Feed)",
    description: "Visualisasikan bagaimana postingan yang direncanakan akan tersusun di feed Instagram brand Anda secara estetis sebelum dipublikasikan.",
    placement: "bottom",
  },
  {
    targetId: "tour-grid-controls",
    title: "Pilih Brand & Rasio Aspek",
    description: "Ganti brand yang ingin ditinjau dan ubah rasio tampilan antara format klasik 1:1 (Kotak) atau 4:5 (Portrait vertikal modern).",
    placement: "bottom",
  },
  {
    targetId: "tour-grid-feed",
    title: "Kanvas Visual Interaktif (3 Grid Teratas)",
    description: "Pratinjau susunan 3 postingan teratas feed Anda. Klik foto mana saja untuk langsung membuka dan mengedit detail caption serta jadwal tayangnya.",
    placement: "bottom",
  },
];

export default function GridInstagramPage() {
  const router = useRouter();
  const [selectedBrandId, setSelectedBrandId] = useState<string>("brand-1");
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "4:5">("1:1");
  const [isFreePlan, setIsFreePlan] = useState<boolean>(false); // toggle demo preview

  const activeBrand =
    DUMMY_BRANDS.find((b) => b.id === selectedBrandId) || DUMMY_BRANDS[0];

  // Postingan IG untuk brand terpilih (urut jadwal terbaru di kiri atas)
  const igPosts = DUMMY_POSTS.filter(
    (p) => p.brand_id === selectedBrandId && p.platforms.includes("instagram"),
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div
        id="tour-grid-header"
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
            Pratinjau Grid Instagram (Feed Simulator)
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.88rem" }}>
            Lihat visual estetika kerapihan susunan feed 3 kolom sebelum konten
            resmi dipublikasikan.
          </p>
        </div>

        {/* Controls: Brand Selector, Ratio, and Plan Simulator */}
        <div
          id="tour-grid-controls"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <select
            className="brand-dropdown-select"
            value={selectedBrandId}
            onChange={(e) => setSelectedBrandId(e.target.value)}
          >
            {DUMMY_BRANDS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} (@{b.handle})
              </option>
            ))}
          </select>

          {/* Rasio: 1:1 atau 4:5 */}
          <div
            style={{
              display: "flex",
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              padding: 3,
            }}
          >
            <button
              onClick={() => setAspectRatio("1:1")}
              style={{
                padding: "4px 10px",
                border: "none",
                borderRadius: 6,
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                background: aspectRatio === "1:1" ? "#16a34a" : "transparent",
                color: aspectRatio === "1:1" ? "white" : "#64748b",
              }}
            >
              1:1 Kotak
            </button>
            <button
              onClick={() => setAspectRatio("4:5")}
              style={{
                padding: "4px 10px",
                border: "none",
                borderRadius: 6,
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                background: aspectRatio === "4:5" ? "#16a34a" : "transparent",
                color: aspectRatio === "4:5" ? "white" : "#64748b",
              }}
            >
              4:5 Portrait
            </button>
          </div>
        </div>
      </div>

      {/* Grid Container */}
      <div
        style={{
          width: "100%",
          maxWidth: 960,
          margin: "0 auto",
          minWidth: 0,
          boxSizing: "border-box",
        }}
      >
        {/* Profile Mockup */}
        <div
          className="uda-card"
          style={{
            marginBottom: 16,
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >
          <img
            src={activeBrand.avatar_url}
            alt=""
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              objectFit: "cover",
              border: "2px solid #e2e8f0",
            }}
          />
          <div>
            <div style={{ fontWeight: 800, fontSize: "1.1rem" }}>
              @{activeBrand.handle}
            </div>
            <div
              style={{ fontSize: "0.82rem", color: "#64748b", marginTop: 2 }}
            >
              {activeBrand.name} • {igPosts.length} Postingan Direncanakan
            </div>
          </div>
        </div>

        {/* 3-Column Instagram Feed */}
        <div style={{ position: "relative" }}>
          {isFreePlan && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(255, 255, 255, 0.75)",
                backdropFilter: "blur(8px)",
                zIndex: 20,
                borderRadius: 14,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: 24,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "#fee2e2",
                  color: "#dc2626",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                <Lock size={24} />
              </div>
              <h3
                style={{
                  fontSize: "1.2rem",
                  fontWeight: 800,
                  color: "#0f172a",
                }}
              >
                Fitur Khusus Paket Pro & Tim
              </h3>
              <p
                style={{
                  color: "#64748b",
                  fontSize: "0.88rem",
                  maxWidth: 360,
                  margin: "8px 0 16px",
                }}
              >
                Pratinjau visual susunan grid feed Instagram tersedia untuk
                pelanggan paket Pro dan Tim.
              </p>
              <button
                className="btn-uda btn-uda-primary"
                onClick={() => router.push("/app/langganan")}
              >
                Upgrade ke Pro (Rp 49.000)
              </button>
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 4,
              borderRadius: 14,
              overflow: "hidden",
              background: "#0f172a",
              padding: 4,
            }}
          >
            {/* Baris 3 Grid Pertama (Target Spotlight Panduan) */}
            <div
              id="tour-grid-feed"
              style={{
                gridColumn: "1 / -1",
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 4,
              }}
            >
              {igPosts.slice(0, 3).map((post) => {
                const statusMeta = POST_STATUSES[post.status];
                return (
                  <div
                    key={post.id}
                    onClick={() => router.push(`/app/postingan/${post.id}`)}
                    style={{
                      position: "relative",
                      aspectRatio: aspectRatio === "1:1" ? "1 / 1" : "4 / 5",
                      cursor: "pointer",
                      overflow: "hidden",
                      background: "#1e293b",
                    }}
                  >
                    <img
                      src={
                        post.media_url ||
                        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400"
                      }
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        transition: "transform 0.2s ease",
                      }}
                    />

                    {/* Icon Carousel or Reels */}
                    {post.content_type === "carousel" && (
                      <div
                        style={{
                          position: "absolute",
                          top: 6,
                          right: 6,
                          color: "white",
                          background: "rgba(0,0,0,0.5)",
                          padding: 4,
                          borderRadius: 4,
                        }}
                      >
                        <Layers size={13} />
                      </div>
                    )}

                    {/* Status Badge jika belum tayang */}
                    {post.status !== "terposting" && (
                      <div
                        style={{
                          position: "absolute",
                          bottom: 6,
                          left: 6,
                          fontSize: "0.62rem",
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: "rgba(15, 23, 42, 0.85)",
                          color: statusMeta.color,
                          display: "flex",
                          alignItems: "center",
                          gap: 3,
                        }}
                      >
                        <span
                          style={{
                            width: 4,
                            height: 4,
                            borderRadius: "50%",
                            backgroundColor: statusMeta.color,
                          }}
                        />
                        <span>{statusMeta.label}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Sisa Grid Postingan Berikutnya */}
            {igPosts.slice(3).map((post) => {
              const statusMeta = POST_STATUSES[post.status];
              return (
                <div
                  key={post.id}
                  onClick={() => router.push(`/app/postingan/${post.id}`)}
                  style={{
                    position: "relative",
                    aspectRatio: aspectRatio === "1:1" ? "1 / 1" : "4 / 5",
                    cursor: "pointer",
                    overflow: "hidden",
                    background: "#1e293b",
                  }}
                >
                  <img
                    src={
                      post.media_url ||
                      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400"
                    }
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      transition: "transform 0.2s ease",
                    }}
                  />

                  {/* Icon Carousel or Reels */}
                  {post.content_type === "carousel" && (
                    <div
                      style={{
                        position: "absolute",
                        top: 6,
                        right: 6,
                        color: "white",
                        background: "rgba(0,0,0,0.5)",
                        padding: 4,
                        borderRadius: 4,
                      }}
                    >
                      <Layers size={13} />
                    </div>
                  )}

                  {/* Status Badge jika belum tayang */}
                  {post.status !== "terposting" && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: 6,
                        left: 6,
                        fontSize: "0.62rem",
                        fontWeight: 700,
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: "rgba(15, 23, 42, 0.85)",
                        color: statusMeta.color,
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                      }}
                    >
                      <span
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: "50%",
                          backgroundColor: statusMeta.color,
                        }}
                      />
                      <span>{statusMeta.label}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <GuidedTour steps={gridTourSteps} tourKey="uda_tour_grid" />
    </div>
  );
}
