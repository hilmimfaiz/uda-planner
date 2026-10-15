'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
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
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, account, isLoading, isAdmin, signOut } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('uda_sidebar_collapsed');
      if (saved === 'true') {
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
        localStorage.setItem('uda_sidebar_collapsed', String(next));
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
    { name: 'Ringkasan', href: '/admin', icon: LayoutDashboard },
    { name: 'Pembayaran', href: '/admin/pembayaran', icon: CreditCard },
    { name: 'Pengguna', href: '/admin/pengguna', icon: Users },
    { name: 'Paket', href: '/admin/paket', icon: Package },
    { name: 'Pengaturan', href: '/admin/pengaturan', icon: Settings },
  ];

  // Hanya tampilkan loader singkat jika user/account benar-benar belum teridentifikasi sama sekali
  if (isLoading && !user && !account) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#f8fafc', gap: 12 }}>
        <Shield size={36} style={{ color: '#16a34a' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem' }}>
          <Loader2 size={18} className="animate-spin" />
          <span>Memverifikasi Hak Akses Administrator...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Jika bukan admin, tolak akses dan tampilkan tombol kembali ke aplikasi pengguna
  if (!isAdmin) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: 24 }}>
        <div className="uda-card" style={{ maxWidth: 480, textAlign: 'center', padding: 36 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: '#fef2f2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <AlertTriangle size={28} />
          </div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
            Akses Khusus Administrator
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: 24 }}>
            Akun Anda (<strong>{user?.email || 'Akun Anda'}</strong>) terdaftar sebagai Pengguna Standar. Halaman ini hanya dapat diakses oleh Administrator Sistem UdaPlanner.
          </p>
          <button
            className="btn-uda btn-uda-primary"
            onClick={() => router.push('/app')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, margin: '0 auto' }}
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
      <aside className={`app-sidebar sidebar-admin ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-brand-header">
          <div className="sidebar-brand-info">
            <div className="logo-symbol" style={{ background: '#16a34a' }} title="Admin UdaPlanner">
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
              <button
                key={item.href}
                className={`nav-item-btn ${isActive ? 'active' : ''}`}
                onClick={() => router.push(item.href)}
                title={item.name}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-admin-bottom">
          <button
            className="nav-item-btn"
            onClick={() => router.push('/app')}
            style={{ color: '#94a3b8' }}
            title="Kembali ke Aplikasi"
          >
            <ArrowLeft size={16} />
            <span>Kembali ke Aplikasi</span>
          </button>

          {/* Tombol Logout Admin di Sidebar */}
          <button
            className="nav-item-btn"
            onClick={() => setShowLogoutModal(true)}
            style={{ color: '#ef4444' }}
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
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            <span>{isCollapsed ? "" : "Perkecil Menu"}</span>
          </button>
        </div>
      </aside>

      {/* Admin Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: '100vh', background: '#f8fafc' }}>
        <header
          className="admin-header"
          style={{
            height: 64,
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            padding: '0 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, background: '#16a34a22', color: '#16a34a', padding: '3px 8px', borderRadius: 4, flexShrink: 0 }}>
              ADMIN
            </span>
            <span style={{ fontSize: '0.85rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.email || 'Admin'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <button
              className="btn-uda btn-uda-secondary btn-uda-sm"
              onClick={() => router.push('/app')}
            >
              Mode Pengguna
            </button>
            <button
              className="btn-uda btn-uda-secondary btn-uda-sm"
              onClick={() => setShowLogoutModal(true)}
              style={{ color: '#ef4444', borderColor: '#fecaca', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              title="Keluar dari Panel Admin"
            >
              <LogOut size={14} />
              <span>Keluar</span>
            </button>
          </div>
        </header>

        {/* Mobile Horizontal Navigation for Admin (< 768px) */}
        <nav className="admin-mobile-nav">
          {adminNav.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <button
                key={item.href}
                className={`admin-mobile-nav-btn ${isActive ? 'active' : ''}`}
                onClick={() => router.push(item.href)}
              >
                <Icon size={14} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        {/* Content Body Responsif */}
        <main className="admin-content-body">
          {children}
        </main>
      </div>

      {/* Modal Pop-up Konfirmasi Logout Admin */}
      {showLogoutModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div
            className="uda-card"
            style={{
              maxWidth: 400,
              width: '100%',
              padding: '30px 24px',
              textAlign: 'center',
              borderRadius: 16,
              background: '#ffffff',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div
              style={{
                width: 58,
                height: 58,
                borderRadius: '50%',
                background: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <LogOut size={26} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
              Konfirmasi Keluar Admin
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.86rem', lineHeight: 1.5, marginBottom: 24 }}>
              Apakah Anda yakin ingin keluar dari sesi Administrator? Anda perlu login kembali untuk mengakses panel kontrol ini.
            </p>

            <div style={{ display: 'flex', gap: 10 }}>
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
                style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
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
