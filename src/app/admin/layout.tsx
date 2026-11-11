"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Shield,
  LayoutDashboard,
  CreditCard,
  Users,
  Package,
  Settings,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  LogOut,
  MailCheck,
  Landmark,
  Layers,
  X,
  Clock,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, account, isLoading, isAdmin, signOut } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [adminFullName, setAdminFullName] = useState<string>('Administrator');

  // Live Timer Jam Waktu Header (Update tiap 1 detik)
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sinkronisasi Nama Lengkap Admin dari Profile / Auth / Event Realtime
  useEffect(() => {
    const resolveAdminName = () => {
      if (profile?.full_name?.trim()) return profile.full_name.trim();
      if (user?.user_metadata?.full_name?.trim()) return user.user_metadata.full_name.trim();
      try {
        const rawProf = localStorage.getItem('uda_auth_profile');
        if (rawProf) {
          const p = JSON.parse(rawProf);
          if (p?.full_name?.trim()) return p.full_name.trim();
        }
        const rawUser = localStorage.getItem('uda_auth_user');
        if (rawUser) {
          const u = JSON.parse(rawUser);
          if (u?.user_metadata?.full_name?.trim()) return u.user_metadata.full_name.trim();
        }
      } catch {}
      if (user?.email) {
        if (user.email.toLowerCase() === 'admin@udaplanner.id' || user.email.toLowerCase() === 'admin@udaplanner.com') {
          return 'Administrator UdaPlanner';
        }
        return user.email.split('@')[0];
      }
      return 'Administrator';
    };

    setAdminFullName(resolveAdminName());

    const handleUpdate = (e?: any) => {
      if (e?.detail?.full_name) {
        setAdminFullName(e.detail.full_name);
      } else {
        setAdminFullName(resolveAdminName());
      }
    };

    window.addEventListener('uda_account_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('uda_account_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [profile, user]);

  // Format Ucapan Salam Waktu (Pagi / Siang / Sore / Malam)
  const currentHour = currentTime ? currentTime.getHours() : new Date().getHours();
  let greetingText = 'Selamat Pagi';
  if (currentHour >= 4 && currentHour < 11) {
    greetingText = 'Selamat Pagi';
  } else if (currentHour >= 11 && currentHour < 15) {
    greetingText = 'Selamat Siang';
  } else if (currentHour >= 15 && currentHour < 18) {
    greetingText = 'Selamat Sore';
  } else {
    greetingText = 'Selamat Malam';
  }

  // Format Jam Waktu Realtime
  const timeString = currentTime
    ? currentTime
        .toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
        .replace(/\./g, ':')
    : '--:--:--';

  useEffect(() => {
    setShowMobileMenu(false);
  }, [pathname]);

  const getMobileAdminTitle = () => {
    if (pathname === '/admin') return 'Admin Dashboard';
    if (pathname === '/admin/verifikasi-email') return 'Verifikasi Email';
    if (pathname === '/admin/pembayaran') return 'Pembayaran Masuk';
    if (pathname === '/admin/rekening') return 'Rekening Bank';
    if (pathname === '/admin/pengguna') return 'Kelola Pengguna';
    if (pathname === '/admin/paket') return 'Paket & Durasi';
    if (pathname === '/admin/pengaturan') return 'Pengaturan';
    return 'Admin Panel';
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem("uda_sidebar_collapsed");
      if (saved === "true") {
        setIsCollapsed(true);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("uda_sidebar_collapsed", String(next));
      } catch (e) {
        // ignore
      }
      return next;
    });
  };

  // Guard: cek login
  useEffect(() => {
    if (!isLoading && !user) {
      router.push(`/masuk?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, user, pathname, router]);

  const adminNav = [
    { name: "Ringkasan", href: "/admin", icon: LayoutDashboard },
    {
      name: "Verifikasi Email",
      href: "/admin/verifikasi-email",
      icon: MailCheck,
    },
    { name: "Pembayaran", href: "/admin/pembayaran", icon: CreditCard },
    { name: "Rekening Bank", href: "/admin/rekening", icon: Landmark },
    { name: "Pengguna", href: "/admin/pengguna", icon: Users },
    { name: "Paket & Durasi", href: "/admin/paket", icon: Package },
    { name: "Pengaturan", href: "/admin/pengaturan", icon: Settings },
  ];

  // Hanya tampilkan loader singkat jika user/account benar-benar belum teridentifikasi sama sekali
  if (isLoading && !user && !account) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f172a",
          color: "#f8fafc",
          gap: 12,
        }}
      >
        <Shield size={36} style={{ color: "#16a34a" }} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: "0.9rem",
          }}
        >
          <Loader2 size={18} className="animate-spin" />
          <span>Memverifikasi Hak Akses Administrator...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const userEmail = (user?.email || '').toLowerCase().trim();
  const effectiveIsAdmin =
    isAdmin ||
    userEmail === 'admin@udaplanner.id' ||
    userEmail === 'admin@udaplanner.com' ||
    userEmail === 'admin@udacoding.id' ||
    userEmail.startsWith('admin@') ||
    account?.role === 'admin';

  // Jika bukan admin, tolak akses dan tampilkan tombol kembali ke aplikasi pengguna
  if (!effectiveIsAdmin) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          padding: 24,
        }}
      >
        <div
          className="uda-card"
          style={{ maxWidth: 480, textAlign: "center", padding: 36 }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "#fef2f2",
              color: "#dc2626",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <AlertTriangle size={28} />
          </div>
          <h2
            style={{
              fontSize: "1.3rem",
              fontWeight: 800,
              color: "#0f172a",
              marginBottom: 8,
            }}
          >
            Akses Khusus Administrator
          </h2>
          <p
            style={{
              color: "#64748b",
              fontSize: "0.88rem",
              lineHeight: 1.5,
              marginBottom: 24,
            }}
          >
            Akun Anda (<strong>{user?.email || "Akun Anda"}</strong>) terdaftar
            sebagai Pengguna Standar. Halaman ini hanya dapat diakses oleh
            Administrator Sistem UdaPlanner.
          </p>
          <button
            className="btn-uda btn-uda-primary"
            onClick={() => router.push("/app")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              margin: "0 auto",
            }}
          >
            <ArrowLeft size={16} />
            <span>Kembali ke Halaman Aplikasi</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* Sidebar Admin Gelap (#0F172A) Sesuai PRD Bab 8 */}
      <aside
        className={`app-sidebar sidebar-admin ${isCollapsed ? "collapsed" : ""}`}
      >
        <div className="sidebar-brand-header">
          <div className="sidebar-brand-info">
            <div
              className="logo-symbol"
              style={{ background: "#16a34a" }}
              title="Admin UdaPlanner"
            >
              <Shield size={20} />
            </div>
            <div className="sidebar-brand-text">
              <div className="logo-text-title">Admin UdaPlanner</div>
              <div className="logo-text-sub">Panel Pengelola Sistem</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {adminNav.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item-btn ${isActive ? "active" : ""}`}
                title={item.name}
              >
                <Icon size={18} style={{ color: "#ffffff" }} />
                <span style={{ color: "#ffffff" }}>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-admin-bottom">
          {/* Tombol Logout Admin di Sidebar */}
          <button
            className="nav-item-btn"
            onClick={() => setShowLogoutModal(true)}
            style={{ color: "#ef4444" }}
            title="Keluar dari Akun Admin"
          >
            <LogOut size={16} />
            <span>Keluar</span>
          </button>

          {/* Tombol Expand/Collapse Baris Bawah */}
          <button
            className="sidebar-collapse-row-btn"
            onClick={toggleSidebar}
            title={isCollapsed ? "Perluas Sidebar" : "Perkecil Sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight size={16} />
            ) : (
              <ChevronLeft size={16} />
            )}
            <span>{isCollapsed ? "" : "Perkecil Menu"}</span>
          </button>
        </div>
      </aside>

      {/* Admin Content Area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          minHeight: "100vh",
          background: "#f8fafc",
        }}
      >
        {/* Desktop Header */}
        <header
          className="admin-header topbar-desktop-view"
          style={{
            height: 68,
            minHeight: 68,
            maxHeight: 68,
            boxSizing: "border-box",
            background: "#ffffff",
            borderBottom: "2.5px solid #0f172a",
            padding: "0 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              overflow: "hidden",
            }}
          >
            <div
              className="mobile-app-header-brand"
              style={{ alignItems: "center", gap: 7, flexShrink: 0 }}
            >
              <div
                className="logo-symbol"
                style={{
                  width: 30,
                  height: 30,
                  fontSize: "0.85rem",
                  background: "#16a34a",
                  flexShrink: 0,
                }}
              >
                <Shield size={16} />
              </div>
              <span
                style={{
                  fontWeight: 900,
                  fontSize: "0.94rem",
                  color: "#0f172a",
                }}
              >
                Admin
              </span>
            </div>
            {/* Lencana Status Admin */}
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 900,
                background: "#dcfce7",
                color: "#166534",
                border: "1.5px solid #0f172a",
                boxShadow: "1.5px 1.5px 0px #0f172a",
                padding: "3px 8px",
                borderRadius: 6,
                flexShrink: 0,
              }}
            >
              ADMIN
            </span>

            {/* Ucapan Salam dan Nama Lengkap Profil Admin */}
            <span
              style={{
                fontSize: "0.94rem",
                fontWeight: 800,
                color: "#0f172a",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {greetingText}, <strong style={{ color: "#16a34a" }}>{adminFullName}</strong>
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexShrink: 0,
            }}
          >
            {/* Jam Waktu Header Realtime */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "6px 12px",
                borderRadius: 8,
                background: "#f8fafc",
                border: "1.5px solid #0f172a",
                boxShadow: "2px 2px 0px #0f172a",
                color: "#0f172a",
                fontSize: "0.84rem",
                fontWeight: 800,
                fontVariantNumeric: "tabular-nums",
              }}
              title="Waktu Sistem (WIB)"
            >
              <Clock size={15} style={{ color: "#16a34a" }} />
              <span>{timeString} WIB</span>
            </div>

            <button
              className="btn-uda btn-uda-secondary btn-uda-sm"
              onClick={() => setShowLogoutModal(true)}
              style={{
                color: "#ef4444",
                borderColor: "#fecaca",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
              title="Keluar dari Panel Admin"
            >
              <LogOut size={14} />
              <span>Keluar</span>
            </button>
          </div>
        </header>

        {/* Mobile App Bar (< 991px) */}
        <header className="topbar-mobile-app-bar admin-mobile-topbar">
          <div className="mobile-app-bar-left">
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                color: '#ffffff',
                fontSize: '0.82rem',
              }}
            >
              U
            </div>
          </div>

          <div className="mobile-app-bar-center">
            <div className="mobile-app-bar-title">{getMobileAdminTitle()}</div>
          </div>

          <div className="mobile-app-bar-right" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#15803d',
                background: '#f0fdf4',
                padding: '3px 7px',
                borderRadius: 6,
                border: '1px solid #bbf7d0',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontVariantNumeric: 'tabular-nums',
              }}
              title="Waktu Sistem (WIB)"
            >
              <Clock size={11} />
              <span>{timeString.slice(0, 5)}</span>
            </span>
            <button
              type="button"
              className="mobile-bar-icon-btn"
              onClick={() => setShowMobileMenu(true)}
              title="Menu Panel Admin"
              aria-label="Menu Panel Admin"
            >
              <Layers size={18} />
            </button>
          </div>
        </header>

        {/* Content Body Responsif */}
        <main className="admin-content-body">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (< 991px) */}
      <nav className="mobile-bottom-nav admin-mobile-bottom-nav">
        <Link
          href="/admin"
          className={`mobile-nav-item ${pathname === '/admin' ? 'active' : ''}`}
        >
          <LayoutDashboard size={18} />
          <span>Ringkasan</span>
        </Link>
        <Link
          href="/admin/pengguna"
          className={`mobile-nav-item ${pathname === '/admin/pengguna' ? 'active' : ''}`}
        >
          <Users size={18} />
          <span>Pengguna</span>
        </Link>
        <Link
          href="/admin/pembayaran"
          className={`mobile-nav-item ${pathname === '/admin/pembayaran' ? 'active' : ''}`}
        >
          <CreditCard size={18} />
          <span>Bayar</span>
        </Link>
        <Link
          href="/admin/verifikasi-email"
          className={`mobile-nav-item ${pathname === '/admin/verifikasi-email' ? 'active' : ''}`}
        >
          <MailCheck size={18} />
          <span>Verifikasi</span>
        </Link>
        <button
          type="button"
          className={`mobile-nav-item ${showMobileMenu ? 'active' : ''}`}
          onClick={() => setShowMobileMenu(true)}
        >
          <Layers size={18} />
          <span>Menu</span>
        </button>
      </nav>

      {/* Admin Mobile App Drawer / Menu Sheet */}
      {showMobileMenu && (
        <div
          className="mobile-drawer-overlay"
          onClick={() => setShowMobileMenu(false)}
        >
          <div
            className="mobile-drawer-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mobile-drawer-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: '#16a34a',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1rem',
                    border: '1.5px solid #0f172a',
                  }}
                >
                  <Shield size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.94rem', color: '#0f172a', lineHeight: 1.2 }}>
                    {greetingText}, {adminFullName}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <span>{user?.email || 'Administrator'}</span>
                    <span>•</span>
                    <span style={{ color: '#16a34a', fontWeight: 700 }}>{timeString} WIB</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowMobileMenu(false)}
                style={{
                  background: '#f1f5f9',
                  border: '1.5px solid #0f172a',
                  borderRadius: 8,
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#0f172a',
                }}
                aria-label="Tutup Menu"
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
              Panel Kontrol Administrator
            </div>

            <div className="mobile-drawer-grid">
              {adminNav.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`mobile-drawer-item ${isActive ? 'active' : ''}`}
                    onClick={() => setShowMobileMenu(false)}
                  >
                    <Icon size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
              <button
                type="button"
                className="mobile-drawer-item"
                onClick={() => {
                  setShowMobileMenu(false);
                  setShowLogoutModal(true);
                }}
                style={{ color: '#dc2626' }}
              >
                <LogOut size={18} style={{ color: '#dc2626', flexShrink: 0 }} />
                <span>Keluar Admin</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pop-up Konfirmasi Logout Admin */}
      {showLogoutModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(5px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 20,
            animation: "fadeIn 0.2s ease-out",
          }}
        >
          <div
            className="uda-card"
            style={{
              maxWidth: 400,
              width: "100%",
              padding: "30px 24px",
              textAlign: "center",
              borderRadius: 14,
              border: "3px solid #0f172a",
              boxShadow: "6px 6px 0px #0f172a",
              background: "#ffffff",
            }}
          >
            <div
              style={{
                width: 58,
                height: 58,
                borderRadius: 12,
                background: "#fee2e2",
                color: "#dc2626",
                border: "2px solid #0f172a",
                boxShadow: "2.5px 2.5px 0px #0f172a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <LogOut size={26} />
            </div>

            <h3
              style={{
                fontSize: "1.25rem",
                fontWeight: 800,
                color: "#0f172a",
                marginBottom: 6,
              }}
            >
              Konfirmasi Keluar Admin
            </h3>
            <p
              style={{
                color: "#64748b",
                fontSize: "0.86rem",
                lineHeight: 1.5,
                marginBottom: 24,
              }}
            >
              Apakah Anda yakin ingin keluar dari sesi Administrator? Anda perlu
              login kembali untuk mengakses panel kontrol ini.
            </p>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                className="btn-uda btn-uda-secondary"
                style={{ flex: 1 }}
                onClick={() => setShowLogoutModal(false)}
                disabled={isLoggingOut}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn-uda btn-uda-danger"
                style={{
                  flex: 1,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
                onClick={async () => {
                  setIsLoggingOut(true);
                  await signOut();
                }}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Keluar...</span>
                  </>
                ) : (
                  <span>Ya, Keluar</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
