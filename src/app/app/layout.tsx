"use client";

import React, { useState } from "react";
import Link from "next/navigation";
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
  Plus,
  ChevronDown,
  Check,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { DUMMY_BRANDS, DUMMY_NOTIFICATIONS } from "@/lib/dummy-data";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const showCreatePostButton = [
    "/app",
    "/app/kalender",
    "/app/papan",
    "/app/grid",
  ].includes(pathname);

  const [selectedBrandId, setSelectedBrandId] = useState<string>("all");
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [notifications, setNotifications] = useState(DUMMY_NOTIFICATIONS);

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

  return (
    <div className="app-layout">
      {/* Sidebar Desktop */}
      <aside className="app-sidebar">
        <div className="sidebar-brand-header">
          <div className="logo-symbol">U</div>
          <div>
            <div className="logo-text-title">UdaPlanner</div>
            <div className="logo-text-sub">Perencana Konten Sosmed</div>
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
              <button
                key={item.href}
                className={`nav-item-btn ${isActive ? "active" : ""}`}
                onClick={() => router.push(item.href)}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-admin-bottom">
          <button
            className={`nav-item-btn ${pathname === "/app/langganan" ? "active" : ""}`}
            onClick={() => router.push("/app/langganan")}
          >
            <CreditCard size={17} />
            <span>Langganan</span>
          </button>
          <button
            className={`nav-item-btn ${pathname === "/app/akun" ? "active" : ""}`}
            onClick={() => router.push("/app/akun")}
          >
            <User size={17} />
            <span>Akun</span>
          </button>
          <button
            className={`nav-item-btn ${pathname.startsWith("/admin") ? "active" : ""}`}
            onClick={() => router.push("/admin")}
            style={{ color: "#0f172a" }}
          >
            <Shield size={17} style={{ color: "#16a34a" }} />
            <span>Panel Admin</span>
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
          <div className="topbar-left">
            {/* Brand Switcher */}
            <div style={{ position: "relative" }}>
              <button
                className="brand-dropdown-select"
                onClick={() => setShowBrandDropdown(!showBrandDropdown)}
              >
                {selectedBrand ? (
                  <>
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        backgroundColor: selectedBrand.color,
                      }}
                    />
                    <span>{selectedBrand.name}</span>
                  </>
                ) : (
                  <>
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        backgroundColor: "#16a34a",
                      }}
                    />
                    <span>Semua Brand</span>
                  </>
                )}
                <ChevronDown size={14} style={{ color: "#64748b" }} />
              </button>

              {showBrandDropdown && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    marginTop: 6,
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 10,
                    boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                    width: 220,
                    zIndex: 60,
                    padding: 6,
                  }}
                >
                  <button
                    className="nav-item-btn"
                    style={{ fontSize: "0.85rem" }}
                    onClick={() => {
                      setSelectedBrandId("all");
                      setShowBrandDropdown(false);
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: "#16a34a",
                      }}
                    />
                    <span>Semua Brand</span>
                    {selectedBrandId === "all" && (
                      <Check
                        size={14}
                        style={{ marginLeft: "auto", color: "#16a34a" }}
                      />
                    )}
                  </button>

                  <div
                    style={{
                      height: 1,
                      background: "#f1f5f9",
                      margin: "4px 0",
                    }}
                  />

                  {DUMMY_BRANDS.map((b) => (
                    <button
                      key={b.id}
                      className="nav-item-btn"
                      style={{ fontSize: "0.85rem" }}
                      onClick={() => {
                        setSelectedBrandId(b.id);
                        setShowBrandDropdown(false);
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          backgroundColor: b.color,
                        }}
                      />
                      <span>{b.name}</span>
                      {selectedBrandId === b.id && (
                        <Check
                          size={14}
                          style={{ marginLeft: "auto", color: "#16a34a" }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="topbar-right">
            {/* Tombol Hijau + Postingan */}
            {showCreatePostButton && (
              <button
                className="btn-uda btn-uda-primary"
                onClick={() => router.push("/app/postingan/baru")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "10px 16px",
                  borderRadius: 10,
                  fontSize: "0.9rem",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  boxShadow: "0 2px 5px rgba(22, 163, 74, 0.15)",
                }}
              >
                <Plus size={17} />
                <span>Buat Postingan</span>
              </button>
            )}

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
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 12,
                    boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
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
                        color: "#16a34a",
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
                          background: n.is_read ? "#f8fafc" : "#f0fdf4",
                          border: `1px solid ${n.is_read ? "#f1f5f9" : "#bbf7d0"}`,
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
                            color: "#0f172a",
                          }}
                        >
                          {n.message}
                        </div>
                        <div
                          style={{
                            fontSize: "0.7rem",
                            color: "#64748b",
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
                      borderTop: "1px solid #f1f5f9",
                      textAlign: "center",
                    }}
                  >
                    <button
                      style={{
                        background: "none",
                        border: "none",
                        color: "#64748b",
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

            {/* Avatar */}
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                overflow: "hidden",
                cursor: "pointer",
                border: "1px solid #e2e8f0",
              }}
              onClick={() => router.push("/app/akun")}
            >
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"
                alt="Avatar"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main
          className="app-content-body"
          style={{
            flex: 1,
            padding: 28,
            maxWidth: 1300,
            width: "100%",
            margin: "0 auto",
          }}
        >
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation (Lebar HP 375px) */}
      <nav className="mobile-bottom-nav">
        <button
          className={`mobile-nav-item ${pathname === "/app" ? "active" : ""}`}
          onClick={() => router.push("/app")}
        >
          <LayoutDashboard size={18} />
          <span>Beranda</span>
        </button>
        <button
          className={`mobile-nav-item ${pathname === "/app/kalender" ? "active" : ""}`}
          onClick={() => router.push("/app/kalender")}
        >
          <CalendarIcon size={18} />
          <span>Kalender</span>
        </button>
        <button
          className="mobile-nav-center-plus"
          onClick={() => router.push("/app/postingan/baru")}
        >
          <Plus size={22} />
        </button>
        <button
          className={`mobile-nav-item ${pathname === "/app/papan" ? "active" : ""}`}
          onClick={() => router.push("/app/papan")}
        >
          <Kanban size={18} />
          <span>Papan</span>
        </button>
        <button
          className={`mobile-nav-item ${pathname === "/app/brand" ? "active" : ""}`}
          onClick={() => router.push("/app/brand")}
        >
          <Building size={18} />
          <span>Lainnya</span>
        </button>
      </nav>
    </div>
  );
}
