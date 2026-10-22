"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Calendar as CalendarIcon,
  LayoutDashboard,
  Kanban,
  List,
  Grid,
  FileText,
  Building,
  CreditCard,
  User,
  Shield,
  Bell,
  Moon,
  Sun,
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  LogOut,
  Loader2,
} from "lucide-react";
import { DUMMY_BRANDS, DUMMY_NOTIFICATIONS } from "@/lib/dummy-data";
import { useAuth } from "@/contexts/auth-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, account, isLoading, isAdmin, signOut } = useAuth();

  const [selectedBrandId, setSelectedBrandId] = useState<string>("all");
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [notifications, setNotifications] = useState(DUMMY_NOTIFICATIONS);

  // Dark mode
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    if (localStorage.getItem("uda-theme") === "dark") setTheme("dark");
    // Saat keluar dari aplikasi, kembalikan ke tema terang
    return () => document.documentElement.removeAttribute("data-theme");
  }, []);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("uda-theme", next);
  };
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

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

  useEffect(() => {
    if (!isLoading && !user && !profile) {
      const hasCookie =
        typeof document !== "undefined" &&
        document.cookie.includes("auth-token");
      if (!hasCookie) {
        router.push(`/masuk?redirect=${encodeURIComponent(pathname)}`);
      }
    }
  }, [isLoading, user, profile, pathname, router]);

  // Kunci admin agar hanya berada di panel admin (/admin)
  useEffect(() => {
    if (!isLoading && user && isAdmin) {
      router.replace("/admin");
    }
  }, [isLoading, user, isAdmin, router]);

  // Arahkan ke pengisian profil awal jika pengguna belum melengkapi profil
  useEffect(() => {
    if (!isLoading && user) {
      if (isAdmin) return;
      try {
        const hasCompletedOnboarding =
          user.user_metadata?.has_completed_onboarding === true ||
          localStorage.getItem("uda_profile_setup_done_" + user.id) === "true";

        // Jika belum melengkapi profil awal:
        if (!hasCompletedOnboarding) {
          router.replace("/profil-awal");
          return;
        }

        // Jika sudah melengkapi profil:
        localStorage.removeItem("uda_google_auth_pending");
        localStorage.removeItem("uda_needs_profile_setup");
      } catch (e) {}
    }
  }, [isLoading, user, isAdmin, router]);

  const selectedBrand =
    selectedBrandId === "all"
      ? null
      : DUMMY_BRANDS.find((b) => b.id === selectedBrandId) || null;

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
  };

  const navItems = [
    { name: "Beranda", href: "/app", icon: LayoutDashboard },
    { name: "Kalender", href: "/app/kalender", icon: CalendarIcon },
    { name: "Papan", href: "/app/papan", icon: Kanban },
    { name: "Daftar", href: "/app/daftar", icon: List },
    { name: "Grid IG", href: "/app/grid", icon: Grid },
    { name: "Bank Konten", href: "/app/bank", icon: FileText },
    { name: "Brand", href: "/app/brand", icon: Building },
  ];

  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Pengguna UdaPlanner";
  const initial = displayName.charAt(0).toUpperCase();

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

  if (!isLoading && user && isAdmin) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <Loader2
            className="animate-spin"
            size={32}
            style={{ color: "#16a34a", margin: "0 auto 12px" }}
          />
          <p style={{ fontWeight: 700, color: "#0f172a" }}>
            Mengalihkan ke Panel Admin...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* Sidebar Desktop */}
      <aside className={`app-sidebar ${isCollapsed ? "collapsed" : ""}`}>
        <div className="sidebar-brand-header">
          <div className="sidebar-brand-info">
            <div className="logo-symbol" title="UdaPlanner">
              U
            </div>
            <div className="sidebar-brand-text">
              <div className="logo-text-title">UdaPlanner</div>
              <div className="logo-text-sub">Perencana Konten Sosmed</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const isActive =
              item.href === "/app"
                ? pathname === "/app"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item-btn ${isActive ? "active" : ""}`}
                title={item.name}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-admin-bottom">
          <Link
            href="/app/langganan"
            className={`nav-item-btn ${pathname === "/app/langganan" ? "active" : ""}`}
            title={`Langganan (${account?.plan_code?.toUpperCase() || "FREE"})`}
          >
            <CreditCard size={17} />
            <span>Langganan</span>
            <span
              style={{
                marginLeft: "auto",
                fontSize: "0.7rem",
                padding: "2px 6px",
                background: "#f0fdf4",
                color: "#16a34a",
                borderRadius: 4,
                fontWeight: 700,
              }}
            >
              {account?.plan_code?.toUpperCase() || "FREE"}
            </span>
          </Link>

          <Link
            href="/app/akun"
            className={`nav-item-btn ${pathname === "/app/akun" ? "active" : ""}`}
            title="Akun & Profil"
          >
            <User size={17} />
            <span>Akun & Profil</span>
          </Link>

          {/* Panel Admin hanya untuk administrator */}
          {isAdmin && (
            <Link
              href="/admin"
              className={`nav-item-btn ${pathname.startsWith("/admin") ? "active" : ""}`}
              style={{ color: "var(--text-main)" }}
              title="Panel Admin"
            >
              <Shield size={17} style={{ color: "#16a34a" }} />
              <span>Panel Admin</span>
            </Link>
          )}

          {/* Tombol Logout Cepat */}
          <button
            className="nav-item-btn"
            onClick={() => setShowLogoutModal(true)}
            style={{ color: "#ef4444" }}
            title="Keluar dari Akun"
          >
            <LogOut size={17} />
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

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          minHeight: "100vh",
        }}
      >
        {/* Topbar */}
        <header className="app-topbar">
          <div className="topbar-left"></div>

          <div className="topbar-right">
            {/* Tombol Hijau + Postingan */}
            <Link
              href="/app/postingan/baru"
              className="btn-uda btn-uda-primary btn-uda-sm"
              style={{ textDecoration: "none" }}
            >
              <Plus size={16} />
              <span>+ Postingan</span>
            </Link>

            {/* Tombol dark mode */}
            <button
              className="notif-bell-btn"
              onClick={toggleTheme}
              aria-label={
                theme === "dark"
                  ? "Beralih ke mode terang"
                  : "Beralih ke mode gelap"
              }
              title={theme === "dark" ? "Mode terang" : "Mode gelap"}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Notification Bell */}
            <div style={{ position: "relative" }}>
              <button
                className="notif-bell-btn"
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="notif-unread-badge">{unreadCount}</span>
                )}
              </button>

              {showNotifDropdown && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: 8,
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    borderRadius: 12,
                    boxShadow: "var(--shadow-lg)",
                    width: 320,
                    zIndex: 60,
                    padding: "12px 14px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>
                      Notifikasi Aktivitas
                    </div>
                    <button
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--dashboard-green-text)",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                      onClick={markAllAsRead}
                    >
                      Tandai dibaca
                    </button>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      maxHeight: 260,
                      overflowY: "auto",
                    }}
                  >
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        style={{
                          padding: 10,
                          borderRadius: 8,
                          background: n.is_read
                            ? "var(--bg-content)"
                            : "var(--primary-light)",
                          border: `1px solid ${n.is_read ? "var(--border-subtle)" : "var(--primary-border)"}`,
                          fontSize: "0.8rem",
                          cursor: "pointer",
                        }}
                        onClick={() => {
                          setShowNotifDropdown(false);
                          router.push("/app/notifikasi");
                        }}
                      >
                        <div
                          style={{
                            fontWeight: n.is_read ? 500 : 700,
                            color: "var(--text-main)",
                          }}
                        >
                          {n.message}
                        </div>
                        <div
                          style={{
                            fontSize: "0.7rem",
                            color: "var(--text-secondary)",
                            marginTop: 4,
                          }}
                        >
                          {n.time_ago}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      paddingTop: 8,
                      borderTop: "1px solid var(--border-color)",
                      textAlign: "center",
                    }}
                  >
                    <button
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--dashboard-green-text)",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        setShowNotifDropdown(false);
                        router.push("/app/notifikasi");
                      }}
                    >
                      Lihat Semua Notifikasi →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Badge & Avatar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                padding: "4px 8px",
                borderRadius: 8,
                transition: "background 0.2s",
              }}
              onClick={() => router.push("/app/akun")}
              title="Buka Pengaturan Akun"
            >
              {currentAvatarUrl ? (
                <img
                  src={currentAvatarUrl}
                  alt={displayName}
                  onError={() => setLocalAvatar(null)}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    backgroundColor: "#16a34a",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                  }}
                >
                  {initial}
                </div>
              )}
              <div
                style={{ display: "none", md: "block" } as any}
                className="topbar-user-info"
              >
                <div
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    color: "#0f172a",
                    lineHeight: 1.2,
                  }}
                >
                  {displayName}
                </div>
                <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                  {user?.email || profile?.email || ""}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content Body Responsif */}
        <main className="app-content-body">{children}</main>
      </div>

      {/* Mobile Bottom Navigation (Lebar HP 375px) */}
      <nav className="mobile-bottom-nav">
        <Link
          href="/app"
          className={`mobile-nav-item ${pathname === "/app" ? "active" : ""}`}
        >
          <LayoutDashboard size={18} />
          <span>Beranda</span>
        </Link>
        <Link
          href="/app/kalender"
          className={`mobile-nav-item ${pathname === "/app/kalender" ? "active" : ""}`}
        >
          <CalendarIcon size={18} />
          <span>Kalender</span>
        </Link>
        <Link href="/app/postingan/baru" className="mobile-nav-center-plus">
          <Plus size={22} />
        </Link>
        <Link
          href="/app/papan"
          className={`mobile-nav-item ${pathname === "/app/papan" ? "active" : ""}`}
        >
          <Kanban size={18} />
          <span>Papan</span>
        </Link>
        <Link
          href="/app/brand"
          className={`mobile-nav-item ${pathname === "/app/brand" ? "active" : ""}`}
        >
          <Building size={18} />
          <span>Lainnya</span>
        </Link>
      </nav>

      {/* Modal Pop-up Konfirmasi Logout */}
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
              Konfirmasi Keluar Akun
            </h3>
            <p
              style={{
                color: "#64748b",
                fontSize: "0.86rem",
                lineHeight: 1.5,
                marginBottom: 24,
              }}
            >
              Apakah Anda yakin ingin keluar dari akun? Anda perlu memasukkan
              email dan kata sandi kembali untuk masuk ke UdaPlanner.
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
