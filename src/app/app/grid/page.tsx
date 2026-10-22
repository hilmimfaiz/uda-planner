"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Grid as GridIcon,
  Lock,
  Layers,
  Sparkles,
  ExternalLink,
  Image as ImageIcon,
} from "lucide-react";
import { DUMMY_POSTS, DUMMY_BRANDS, DummyPost, DummyBrand } from "@/lib/dummy-data";
import { POST_STATUSES } from "@/lib/platforms";
import { GuidedTour, TourStep } from "@/components/guided-tour";
import { PostService } from "@/services/post.service";
import { BrandService } from "@/services/brand.service";
import { useAuth } from "@/contexts/auth-context";

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
  const { user, account } = useAuth();
  const [brands, setBrands] = useState<DummyBrand[]>(DUMMY_BRANDS);
  const [posts, setPosts] = useState<DummyPost[]>(DUMMY_POSTS);
  const [selectedBrandId, setSelectedBrandId] = useState<string>("brand-1");
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "4:5">("1:1");

  const isFreePlan = !account || account.plan_code === 'free';

  React.useEffect(() => {
    BrandService.getBrands(user?.id).then((bList) => {
      setBrands(bList || []);
      if (bList && bList.length > 0) {
        setSelectedBrandId((prev) => (bList.some((b) => b.id === prev) ? prev : bList[0].id));
      }
    });

    const loadPosts = () => {
      PostService.getPosts({}, user?.id).then((data) => {
        if (data) setPosts(data);
      });
    };

    loadPosts();

    window.addEventListener("uda_post_updated", loadPosts);
    window.addEventListener("uda_post_created", loadPosts);
    window.addEventListener("uda_post_deleted", loadPosts);
    window.addEventListener("storage", loadPosts);
    window.addEventListener("focus", loadPosts);

    return () => {
      window.removeEventListener("uda_post_updated", loadPosts);
      window.removeEventListener("uda_post_created", loadPosts);
      window.removeEventListener("uda_post_deleted", loadPosts);
      window.removeEventListener("storage", loadPosts);
      window.removeEventListener("focus", loadPosts);
    };
  }, [user?.id]);

  const fallbackBrand: DummyBrand = {
    id: "no-brand",
    owner_id: "",
    name: "Belum Ada Brand",
    handle: "brand",
    platforms: ["instagram"],
    color: "#16a34a",
    avatar_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150",
    require_approval: false,
    is_archived: false,
    post_count_this_month: 0,
  };

  const activeBrand =
    brands.find((b) => b.id === selectedBrandId) || brands[0] || fallbackBrand;

  // Postingan IG untuk brand terpilih (urut jadwal terbaru di kiri atas)
  const igPosts = posts.filter(
    (p) =>
      p.brand_id === selectedBrandId &&
      (p.platforms.includes("instagram") ||
        activeBrand.platforms?.includes("instagram") ||
        p.platforms.length === 0)
  );

  // Jika Paket Gratis: Tampilkan Layar Terkunci Khusus Pro & Tim
  if (isFreePlan) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 860, margin: '0 auto', width: '100%' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
            Pratinjau Grid Instagram (Feed Simulator)
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.88rem' }}>
            Visualisasikan estetika susunan postingan feed sebelum resmi diterbitkan ke audiens.
          </p>
        </div>

        <div
          className="uda-card"
          style={{
            position: 'relative',
            overflow: 'hidden',
            padding: '48px 32px',
            textAlign: 'center',
            background: 'linear-gradient(145deg, #ffffff 0%, #f0fdf4 100%)',
            border: '1.5px solid #bbf7d0',
            boxShadow: '0 20px 35px -10px rgba(16, 185, 129, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Subtle background glow */}
          <div
            style={{
              position: 'absolute',
              top: '-30%',
              right: '-10%',
              width: 320,
              height: 320,
              background: 'radial-gradient(circle, rgba(22, 163, 74, 0.15) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          {/* Badge & Lock Icon */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 16px',
              borderRadius: 999,
              background: '#dcfce7',
              border: '1.5px solid #86efac',
              color: '#15803d',
              fontWeight: 800,
              fontSize: '0.8rem',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: 20,
            }}
          >
            <Lock size={15} />
            <span>Fitur Eksklusif Paket Pro & Tim</span>
          </div>

          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: '#16a34a',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 20px rgba(22, 163, 74, 0.3)',
              marginBottom: 18,
            }}
          >
            <GridIcon size={34} />
          </div>

          <h2 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', marginBottom: 10, maxWidth: 540 }}>
            Tingkatkan ke Pro atau Tim untuk Membuka Pratinjau Grid Instagram
          </h2>

          <p style={{ color: '#475569', fontSize: '0.92rem', lineHeight: 1.6, maxWidth: 580, marginBottom: 28 }}>
            Akun <strong>Paket Gratis</strong> saat ini tidak mencakup simulator feed 3 kolom. 
            Dapatkan pengalaman merancang tata letak feed Instagram yang rapi, profesional, dan harmonis dengan beralih ke <strong>Paket Pro</strong> atau <strong>Paket Tim</strong>.
          </p>

          {/* Benefit Cards Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
              gap: 14,
              width: '100%',
              maxWidth: 720,
              marginBottom: 32,
              textAlign: 'left',
            }}
          >
            <div style={{ background: '#ffffff', padding: '14px 16px', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: '0.88rem', color: '#0f172a', marginBottom: 4 }}>
                <Sparkles size={16} style={{ color: '#16a34a' }} />
                <span>Simulasi Grid 3x3</span>
              </div>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
                Susun 9-12 postingan terencana agar kombinasi warna dan pesan visual selaras.
              </p>
            </div>

            <div style={{ background: '#ffffff', padding: '14px 16px', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: '0.88rem', color: '#0f172a', marginBottom: 4 }}>
                <Layers size={16} style={{ color: '#16a34a' }} />
                <span>Rasio 1:1 & 4:5</span>
              </div>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
                Ganti format feed secara instan antara foto kotak klasik atau portrait modern.
              </p>
            </div>

            <div style={{ background: '#ffffff', padding: '14px 16px', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: '0.88rem', color: '#0f172a', marginBottom: 4 }}>
                <ExternalLink size={16} style={{ color: '#16a34a' }} />
                <span>Edit Cepat Sekali Klik</span>
              </div>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
                Klik langsung pada kotak postingan grid untuk mengubah jadwal dan caption.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => router.push('/app/langganan')}
              className="btn-uda btn-uda-primary"
              style={{
                padding: '12px 28px',
                fontSize: '0.95rem',
                fontWeight: 800,
                boxShadow: '0 8px 18px rgba(22, 163, 74, 0.35)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Sparkles size={18} />
              <span>Tingkatkan ke Pro atau Tim Sekarang</span>
            </button>
            <button
              onClick={() => router.push('/app/daftar')}
              className="btn-uda btn-uda-secondary"
              style={{ padding: '12px 20px', fontSize: '0.9rem', fontWeight: 700 }}
            >
              Lihat Daftar Postingan
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            {brands.map((b) => (
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
                    {post.media_url ? (
                      <img
                        src={post.media_url}
                        alt=""
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          transition: "transform 0.2s ease",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: 8,
                          textAlign: "center",
                          color: "#64748b",
                          background: "#0f172a",
                        }}
                      >
                        <ImageIcon size={20} style={{ color: "#94a3b8", marginBottom: 4 }} />
                        <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#f8fafc", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                          {post.title}
                        </span>
                      </div>
                    )}

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
                  {post.media_url ? (
                    <img
                      src={post.media_url}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        transition: "transform 0.2s ease",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 8,
                        textAlign: "center",
                        color: "#64748b",
                        background: "#0f172a",
                      }}
                    >
                      <ImageIcon size={20} style={{ color: "#94a3b8", marginBottom: 4 }} />
                      <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#f8fafc", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                        {post.title}
                      </span>
                    </div>
                  )}

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
