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
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
} from "lucide-react";
import { DUMMY_BRANDS, DummyPost, DummyBrand } from "@/lib/dummy-data";
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
    description: "Pratinjau susunan 3 postingan teratas feed Anda (termasuk slide foto Carousel). Klik foto mana saja untuk membuka detailnya.",
    placement: "bottom",
  },
];

export default function GridInstagramPage() {
  const router = useRouter();
  const { user, account } = useAuth();
  const [brands, setBrands] = useState<DummyBrand[]>(() => {
    try {
      const cached = BrandService.getCachedBrands();
      return cached.length > 0 ? cached : DUMMY_BRANDS;
    } catch {
      return DUMMY_BRANDS;
    }
  });
  const [posts, setPosts] = useState<DummyPost[]>(() => PostService.getCachedPosts());
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBrandId, setSelectedBrandId] = useState<string>("brand-1");
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "4:5">("1:1");
  const [userRole, setUserRole] = useState<'owner' | 'editor' | 'reviewer' | 'viewer' | null>(null);
  const [slideIndices, setSlideIndices] = useState<Record<string, number>>({});

  React.useEffect(() => {
    let isMounted = true;

    BrandService.getBrands(user?.id).then((bList) => {
      if (!isMounted) return;
      setBrands(bList || []);
      if (bList && bList.length > 0) {
        const activeBrandId = typeof window !== 'undefined' ? localStorage.getItem('uda_active_brand_id') : null;
        const targetId = (activeBrandId && bList.some((b) => b.id === activeBrandId)) ? activeBrandId : bList[0].id;
        setSelectedBrandId(targetId);
        BrandService.getUserBrandRole(targetId, user?.id).then((r) => {
          if (isMounted) setUserRole(r);
        });
      }
    });

    const loadPosts = async () => {
      try {
        const cached = PostService.getCachedPosts();
        if (isMounted && cached.length > 0) setPosts(cached);
        const data = await PostService.getPosts({}, user?.id);
        if (isMounted && data) setPosts(data);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadPosts();

    window.addEventListener("uda_post_updated", loadPosts);
    window.addEventListener("uda_post_created", loadPosts);
    window.addEventListener("uda_post_deleted", loadPosts);
    window.addEventListener("storage", loadPosts);

    return () => {
      isMounted = false;
      window.removeEventListener("uda_post_updated", loadPosts);
      window.removeEventListener("uda_post_created", loadPosts);
      window.removeEventListener("uda_post_deleted", loadPosts);
      window.removeEventListener("storage", loadPosts);
    };
  }, [user?.id]);

  React.useEffect(() => {
    if (selectedBrandId && user?.id) {
      BrandService.getUserBrandRole(selectedBrandId, user?.id).then((r) => setUserRole(r));
    }
  }, [selectedBrandId, user?.id]);

  const isTeamMember = React.useMemo(() => {
    if (userRole && ['editor', 'reviewer', 'viewer'].includes(userRole)) {
      return true;
    }
    if (account?.plan_code === 'team') {
      return true;
    }
    if (typeof window !== 'undefined') {
      try {
        const uId = user?.id;
        const uEmail = user?.email?.toLowerCase();

        if (uId && localStorage.getItem('uda_team_membership_' + uId)) {
          return true;
        }

        if (uId) {
          const sysRole = localStorage.getItem('uda_system_role_' + uId);
          if (sysRole && ['Editor', 'Reviewer', 'Viewer'].includes(sysRole)) {
            return true;
          }
        }

        if (selectedBrandId) {
          const rawM = localStorage.getItem('uda_brand_members_' + selectedBrandId);
          if (rawM) {
            const mList = JSON.parse(rawM);
            const found = mList.find(
              (m: any) =>
                (uId && (m.id === uId || m.user_id === uId)) ||
                (uEmail && m.email?.toLowerCase() === uEmail)
            );
            if (found && found.role && found.role !== 'owner') {
              return true;
            }
          }
        }

        if (brands && brands.length > 0) {
          for (const b of brands) {
            const rawM = localStorage.getItem('uda_brand_members_' + b.id);
            if (rawM) {
              const mList = JSON.parse(rawM);
              const found = mList.find(
                (m: any) =>
                  (uId && (m.id === uId || m.user_id === uId)) ||
                  (uEmail && m.email?.toLowerCase() === uEmail)
              );
              if (found && found.role && found.role !== 'owner') {
                return true;
              }
            }
          }
        }

        const rawInv = localStorage.getItem('uda_brand_invitations');
        if (rawInv) {
          const invList = JSON.parse(rawInv);
          const foundInv = invList.find(
            (inv: any) =>
              inv.status === 'accepted' &&
              ((uEmail && inv.target_email?.toLowerCase() === uEmail) ||
                (uId && inv.target_user_id === uId))
          );
          if (foundInv) return true;
        }
      } catch (err) {}
    }
    return false;
  }, [userRole, account?.plan_code, user?.id, user?.email, selectedBrandId, brands]);

  const isFreePlan = !account || account.plan_code === 'free';
  const isLocked = isFreePlan && !isTeamMember;

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

  const igPosts = posts.filter(
    (p) =>
      p.brand_id === selectedBrandId &&
      (p.platforms.includes("instagram") ||
        activeBrand.platforms?.includes("instagram") ||
        p.platforms.length === 0)
  );

  // Helper komponen tiap kotak Grid Instagram (mendukung slide Carousel langsung di dalam Grid)
  const renderGridTile = (post: DummyPost) => {
    const statusMeta = POST_STATUSES[post.status] || POST_STATUSES.draft;
    const mediaList: string[] =
      Array.isArray(post.media_urls) && post.media_urls.length > 0
        ? post.media_urls.filter((u) => typeof u === "string" && u.trim().length > 0)
        : post.media_url && post.media_url.trim().length > 0
        ? [post.media_url.trim()]
        : [];

    const currentIdx = mediaList.length > 0
      ? Math.min(slideIndices[post.id] || 0, mediaList.length - 1)
      : 0;
    const activeImage = mediaList[currentIdx] || "";
    const isCarouselPost = post.content_type === "carousel" || mediaList.length > 1;

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
        {activeImage ? (
          <img
            src={activeImage}
            alt={post.title}
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
            <span
              style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                color: "#f8fafc",
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {post.title}
            </span>
          </div>
        )}

        {/* Badge Carousel + Jumlah Slide di Pojok Kanan Atas */}
        {isCarouselPost && (
          <div
            style={{
              position: "absolute",
              top: 6,
              right: 6,
              color: "white",
              background: "rgba(15, 23, 42, 0.78)",
              padding: "3px 7px",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: "0.64rem",
              fontWeight: 800,
              backdropFilter: "blur(4px)",
            }}
          >
            <Layers size={12} />
            {mediaList.length > 1 && <span>{currentIdx + 1}/{mediaList.length}</span>}
          </div>
        )}

        {/* Navigasi Geser Slide Carousel Langsung di Grid IG jika foto > 1 */}
        {mediaList.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSlideIndices((prev) => ({
                  ...prev,
                  [post.id]: currentIdx > 0 ? currentIdx - 1 : mediaList.length - 1,
                }));
              }}
              style={{
                position: "absolute",
                left: 6,
                top: "50%",
                transform: "translateY(-50%)",
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.88)",
                color: "#0f172a",
                border: "1px solid #0f172a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                padding: 0,
                zIndex: 4,
              }}
              title="Slide Sebelumnya"
            >
              <ChevronLeft size={14} />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSlideIndices((prev) => ({
                  ...prev,
                  [post.id]: currentIdx < mediaList.length - 1 ? currentIdx + 1 : 0,
                }));
              }}
              style={{
                position: "absolute",
                right: 6,
                top: "50%",
                transform: "translateY(-50%)",
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.88)",
                color: "#0f172a",
                border: "1px solid #0f172a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                padding: 0,
                zIndex: 4,
              }}
              title="Slide Berikutnya"
            >
              <ChevronRight size={14} />
            </button>

            {/* Indikator Titik Slide di Bawah */}
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "absolute",
                bottom: 6,
                right: 6,
                display: "flex",
                alignItems: "center",
                gap: 4,
                background: "rgba(15, 23, 42, 0.65)",
                padding: "3px 6px",
                borderRadius: 999,
                zIndex: 4,
              }}
            >
              {mediaList.map((_, dIdx) => (
                <span
                  key={dIdx}
                  onClick={() =>
                    setSlideIndices((prev) => ({
                      ...prev,
                      [post.id]: dIdx,
                    }))
                  }
                  style={{
                    width: dIdx === currentIdx ? 10 : 5,
                    height: 5,
                    borderRadius: 999,
                    background: dIdx === currentIdx ? "#22c55e" : "rgba(255,255,255,0.65)",
                    transition: "all 0.15s ease",
                  }}
                />
              ))}
            </div>
          </>
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
  };

  if (isLocked) {
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
              Pratinjau Grid Instagram (Feed Simulator)
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
            Lihat visual estetika kerapihan susunan feed 3 kolom sebelum konten
            resmi dipublikasikan.
          </p>
        </div>

        {/* Controls: Brand Selector, Ratio (Hanya tampil jika sudah ada brand) */}
        {brands.length > 0 && (
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
        )}
      </div>

      {/* Jika Belum Memiliki Brand Apapun */}
      {brands.length === 0 ? (
        <div
          className="uda-card"
          style={{
            maxWidth: 580,
            margin: "40px auto",
            padding: "48px 24px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            backgroundColor: "#ffffff",
          }}
        >
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: "50%",
              background: "#f0fdf4",
              border: "2px solid #86efac",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#16a34a",
              boxShadow: "0 4px 14px rgba(22, 163, 74, 0.15)",
            }}
          >
            <GridIcon size={32} />
          </div>

          <div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>
              Belum Memiliki Brand Apapun
            </h3>
            <p style={{ color: "#64748b", fontSize: "0.9rem", maxWidth: 440, margin: "0 auto", lineHeight: 1.6 }}>
              Anda belum menambahkan akun brand media sosial. Silakan buat brand terlebih dahulu agar dapat melihat pratinjau simulator susunan feed Instagram.
            </p>
          </div>

          <button
            onClick={() => router.push('/app/brand')}
            className="btn-uda btn-uda-primary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 24px",
              fontWeight: 800,
              fontSize: "0.92rem",
              marginTop: 4,
            }}
          >
            <Plus size={18} />
            <span>Buat Brand Baru</span>
          </button>
        </div>
      ) : (
        /* Grid Container */
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
              {/* Baris 3 Grid Pertama */}
              <div
                id="tour-grid-feed"
                style={{
                  gridColumn: "1 / -1",
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 4,
                }}
              >
                {igPosts.slice(0, 3).map((post) => renderGridTile(post))}
              </div>

              {/* Sisa Grid Postingan Berikutnya */}
              {igPosts.slice(3).map((post) => renderGridTile(post))}
            </div>
          </div>
        </div>
      )}

      <GuidedTour steps={gridTourSteps} tourKey="uda_tour_grid" />
    </div>
  );
}
