'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  ChevronLeft,
  ChevronRight,
  Check,
  BookOpen,
  LogOut,
  Loader2,
  Menu,
  X,
} from 'lucide-react';
import { DUMMY_NOTIFICATIONS } from '@/lib/dummy-data';
import { useAuth } from '@/contexts/auth-context';
import { getStoredNotifications, markAllNotificationsAsRead, addAppNotification, syncServerInvitations } from '@/lib/notification-manager';
import { PostService } from '@/services/post.service';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, account, isLoading, isAdmin, signOut } = useAuth();

  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [notifications, setNotifications] = useState(DUMMY_NOTIFICATIONS);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  useEffect(() => {
    setShowMobileMenu(false);
  }, [pathname]);

  useEffect(() => {
    const refreshNotifs = () => {
      setNotifications(getStoredNotifications(user?.email || undefined, user?.id || undefined));
    };
    refreshNotifs();

    if (user?.email || user?.id) {
      syncServerInvitations(user?.email || undefined, user?.id || undefined).then(refreshNotifs);
    }

    const interval = setInterval(() => {
      if (user?.email || user?.id) {
        syncServerInvitations(user?.email || undefined, user?.id || undefined).then(refreshNotifs);
      }
    }, 30000);

    const onFocus = () => {
      if (user?.email || user?.id) {
        syncServerInvitations(user?.email || undefined, user?.id || undefined).then(refreshNotifs);
      }
    };

    window.addEventListener('focus', onFocus);
    window.addEventListener('uda_notification_added', refreshNotifs);
    window.addEventListener('uda_notifications_read', refreshNotifs);
    window.addEventListener('storage', refreshNotifs);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('uda_notification_added', refreshNotifs);
      window.removeEventListener('uda_notifications_read', refreshNotifs);
      window.removeEventListener('storage', refreshNotifs);
    };
  }, [user?.email, user?.id]);

  // Scheduler Background Pengingat Jadwal Tayang Otomatis
  useEffect(() => {
    const checkUpcomingPosts = async () => {
      if (typeof window === 'undefined') return;
      try {
        const storedMins = localStorage.getItem('uda_reminder_minutes');
        const reminderMinutes = storedMins ? parseInt(storedMins, 10) : 15;
        const browserNotifAllowed =
          'Notification' in window &&
          Notification.permission === 'granted' &&
          localStorage.getItem('uda_browser_notif_enabled') === 'true';

        const posts = await PostService.getPosts({}, user?.id);
        const now = Date.now();

        posts.forEach((post) => {
          if (!post.scheduled_at || (post.status as string) === 'terposting' || (post.status as string) === 'published') return;
          const schedTime = new Date(post.scheduled_at).getTime();
          if (isNaN(schedTime)) return;

          const diffMs = schedTime - now;
          const diffMinutes = Math.round(diffMs / (60 * 1000));

          // Jika postingan berada dalam rentang menit pengingat (misal antara 1 menit hingga reminderMinutes)
          if (diffMinutes > 0 && diffMinutes <= reminderMinutes) {
            const alertKey = `uda_alerted_${post.id}_${post.scheduled_at}_${reminderMinutes}`;
            const alreadyAlerted = sessionStorage.getItem(alertKey);

            if (!alreadyAlerted) {
              sessionStorage.setItem(alertKey, 'true');

              // 1. Notifikasi internal aplikasi dengan audio dering
              addAppNotification({
                type: 'system',
                title: '⏰ Alarm Pengingat Jadwal Tayang',
                message: `Pengingat: Postingan "${post.title}" dijadwalkan tayang dalam ${diffMinutes} menit!`,
                link: '/app/daftar',
                playSound: true,
              });

              // 2. Notifikasi peramban browser asli
              if (browserNotifAllowed) {
                try {
                  new Notification(`⏰ Alarm Tayang: ${diffMinutes} Menit Lagi`, {
                    body: `Postingan "${post.title}" akan segera tayang sesuai jadwal!`,
                    icon: '/favicon.ico',
                  });
                } catch (e) {}
              }
            }
          }
        });
      } catch (err) {
        console.debug('checkUpcomingPosts error:', err);
      }
    };

    // Jalankan pertama kali saat masuk, lalu cek setiap 30 detik
    checkUpcomingPosts();
    const interval = setInterval(checkUpcomingPosts, 30000);

    const onReminderChanged = () => {
      checkUpcomingPosts();
    };

    window.addEventListener('uda_reminder_changed', onReminderChanged);

    return () => {
      clearInterval(interval);
      window.removeEventListener('uda_reminder_changed', onReminderChanged);
    };
  }, [user?.id]);


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

  useEffect(() => {
    if (!isLoading && !user && !profile) {
      const hasCookie = typeof document !== 'undefined' && (document.cookie.includes('auth-token') || document.cookie.includes('uda_auth_token'));
      const hasLocalStorage = typeof window !== 'undefined' && !!localStorage.getItem('uda_auth_user');
      if (!hasCookie && !hasLocalStorage) {
        router.push(`/masuk?redirect=${encodeURIComponent(pathname)}`);
      }
    }
  }, [isLoading, user, profile, pathname, router]);

  // Kunci admin agar hanya berada di panel admin (/admin)
  useEffect(() => {
    if (!isLoading && user && isAdmin) {
      router.replace('/admin');
    }
  }, [isLoading, user, isAdmin, router]);

  // Arahkan ke pengisian profil awal jika pengguna belum melengkapi profil
  useEffect(() => {
    if (!isLoading && user) {
      if (isAdmin) return;
      try {
        const hasCompletedOnboarding =
          user.user_metadata?.has_completed_onboarding === true ||
          localStorage.getItem('uda_profile_setup_done_' + user.id) === 'true';

        // Jika belum melengkapi profil awal:
        if (!hasCompletedOnboarding) {
          router.replace('/profil-awal');
          return;
        }

        // Jika sudah melengkapi profil:
        localStorage.removeItem('uda_google_auth_pending');
        localStorage.removeItem('uda_needs_profile_setup');
      } catch (e) {}
    }
  }, [isLoading, user, isAdmin, router]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAllAsRead = () => {
    setNotifications(markAllNotificationsAsRead());
  };

  const navItems = [
    { name: 'Beranda', href: '/app', icon: LayoutDashboard },
    { name: 'Kalender', href: '/app/kalender', icon: CalendarIcon },
    { name: 'Papan', href: '/app/papan', icon: Kanban },
    { name: 'Daftar', href: '/app/daftar', icon: List },
    { name: 'Grid IG', href: '/app/grid', icon: Grid },
    { name: 'Bank Konten', href: '/app/bank', icon: FileText },
    { name: 'Brand', href: '/app/brand', icon: Building },
  ];

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Pengguna UdaPlanner';
  const initial = displayName.charAt(0).toUpperCase();

  const [localAvatar, setLocalAvatar] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      try {
        const stored = localStorage.getItem('uda_custom_avatar_' + user.id);
        if (stored) setLocalAvatar(stored);
      } catch (e) {}
    }
  }, [user]);

  const currentAvatarUrl = profile?.avatar_url || localAvatar;

  if (!isLoading && user && isAdmin) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 className="animate-spin" size={32} style={{ color: '#16a34a', margin: '0 auto 12px' }} />
          <p style={{ fontWeight: 700, color: '#0f172a' }}>Mengalihkan ke Panel Admin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* Sidebar Desktop */}
      <aside className={`app-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-brand-header">
          <div className="sidebar-brand-info">
            <div className="logo-symbol" title="UdaPlanner">U</div>
            <div className="sidebar-brand-text">
              <div className="logo-text-title">UdaPlanner</div>
              <div className="logo-text-sub">Perencana Konten Sosmed</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const isActive =
              item.href === '/app'
                ? pathname === '/app'
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            const isGridLocked = item.href === '/app/grid' && (!account || account.plan_code === 'free');

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item-btn ${isActive ? 'active' : ''}`}
                title={item.name + (isGridLocked ? ' (Khusus Pro & Tim)' : '')}
              >
                <Icon size={18} />
                <span>{item.name}</span>
                {isGridLocked && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      padding: '1px 5px',
                      borderRadius: 4,
                      background: '#fef3c7',
                      color: '#b45309',
                      border: '1px solid #fde68a',
                      letterSpacing: '0.02em',
                    }}
                  >
                    PRO
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-admin-bottom">
          <Link
            href="/app/langganan"
            className={`nav-item-btn ${pathname === '/app/langganan' ? 'active' : ''}`}
            title={`Langganan (${account?.plan_code?.toUpperCase() || 'FREE'})`}
          >
            <CreditCard size={17} />
            <span>Langganan</span>
            <span
              style={{
                marginLeft: 'auto',
                fontSize: '0.7rem',
                padding: '2px 6px',
                background:
                  account?.plan_code === 'team'
                    ? '#f5f3ff'
                    : account?.plan_code === 'pro'
                    ? '#f0fdf4'
                    : '#f1f5f9',
                color:
                  account?.plan_code === 'team'
                    ? '#7c3aed'
                    : account?.plan_code === 'pro'
                    ? '#16a34a'
                    : '#64748b',
                borderRadius: 4,
                fontWeight: 800,
              }}
            >
              {account?.plan_code?.toUpperCase() || 'FREE'}
            </span>
          </Link>

          <Link
            href="/app/akun"
            className={`nav-item-btn ${pathname === '/app/akun' ? 'active' : ''}`}
            title="Akun & Profil"
          >
            <User size={17} />
            <span>Akun & Profil</span>
          </Link>

          {/* Panel Admin hanya untuk administrator */}
          {isAdmin && (
            <Link
              href="/admin"
              className={`nav-item-btn ${pathname.startsWith('/admin') ? 'active' : ''}`}
              style={{ color: '#0f172a' }}
              title="Panel Admin"
            >
              <Shield size={17} style={{ color: '#16a34a' }} />
              <span>Panel Admin</span>
            </Link>
          )}

          {/* Tombol Logout Cepat */}
          <button
            className="nav-item-btn"
            onClick={() => setShowLogoutModal(true)}
            style={{ color: '#ef4444' }}
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
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            <span>{isCollapsed ? "" : "Perkecil Menu"}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: '100vh' }}>
        {/* Topbar */}
        <header className="app-topbar">
          <div className="topbar-left">
            {/* Mobile / Tablet App Logo & Brand Header */}
            <Link href="/app" className="mobile-app-header-brand" title="UdaPlanner">
              <div className="logo-symbol" style={{ width: 34, height: 34, fontSize: '1.05rem', flexShrink: 0 }}>
                U
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 900, fontSize: '1.05rem', color: '#0f172a', letterSpacing: '-0.025em', lineHeight: 1.15 }}>
                  UdaPlanner
                </span>
                <span style={{ fontSize: '0.64rem', color: '#16a34a', fontWeight: 800, letterSpacing: '0.04em' }}>
                  {account?.plan_code ? `PLAN ${account.plan_code.toUpperCase()}` : 'PLAN FREE'}
                </span>
              </div>
            </Link>

            {/* Tombol Panduan Halaman di Header Pojok Kiri Atas */}
            <button
              type="button"
              id="header-guided-tour-btn"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('uda_start_guided_tour'));
                }
              }}
              className="btn-uda"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                backgroundColor: '#fef08a',
                color: '#0f172a',
                border: '1.5px solid #0f172a',
                boxShadow: '2.5px 2.5px 0px #0f172a',
                padding: '6px 12px',
                borderRadius: 9,
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Buka Panduan Langkah Halaman Ini"
            >
              <BookOpen size={15} style={{ color: '#16a34a' }} />
              <span className="tour-btn-label">Panduan Halaman</span>
            </button>
          </div>

          <div className="topbar-right">
            {/* Tombol Hijau + Postingan (Disembunyikan di HP kecil karena ada tombol bulat tengah di bottom nav) */}
            <Link
              href="/app/postingan/baru"
              className="btn-uda btn-uda-primary btn-uda-sm topbar-plus-post-btn"
              style={{ textDecoration: 'none' }}
            >
              <Plus size={16} />
              <span>+ Postingan</span>
            </Link>

            {/* Notification Bell */}
            <div style={{ position: 'relative' }}>
              <button
                className="notif-bell-btn"
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              >
                <Bell size={18} />
                {unreadCount > 0 && <span className="notif-unread-badge">{unreadCount}</span>}
              </button>

              {showNotifDropdown && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: 8,
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                    width: 320,
                    zIndex: 60,
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Notifikasi Aktivitas</div>
                    <button
                      style={{ background: 'none', border: 'none', color: '#16a34a', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                      onClick={markAllAsRead}
                    >
                      Tandai dibaca
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        style={{
                          padding: 10,
                          borderRadius: 8,
                          background: n.is_read ? '#f8fafc' : '#f0fdf4',
                          border: `1px solid ${n.is_read ? '#f1f5f9' : '#bbf7d0'}`,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                        }}
                        onClick={() => {
                          setShowNotifDropdown(false);
                          router.push('/app/notifikasi');
                        }}
                      >
                        <div style={{ fontWeight: n.is_read ? 500 : 700, color: '#0f172a' }}>{n.message}</div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 4 }}>{n.time_ago}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
                    <button
                      style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => {
                        setShowNotifDropdown(false);
                        router.push('/app/notifikasi');
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
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 8,
                transition: 'background 0.2s',
              }}
              onClick={() => router.push('/app/akun')}
              title="Buka Pengaturan Akun"
            >
              {currentAvatarUrl ? (
                <img
                  src={currentAvatarUrl}
                  alt={displayName}
                  onError={() => setLocalAvatar(null)}
                  style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                  }}
                >
                  {initial}
                </div>
              )}
              <div style={{ display: 'none', md: 'block' } as any} className="topbar-user-info">
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
                  {displayName}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  {user?.email || profile?.email || ''}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content Body Responsif */}
        <main className="app-content-body">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation (Lebar Layar <= 991px) */}
      <nav className="mobile-bottom-nav">
        <Link
          href="/app"
          className={`mobile-nav-item ${pathname === '/app' ? 'active' : ''}`}
        >
          <LayoutDashboard size={18} />
          <span>Beranda</span>
        </Link>
        <Link
          href="/app/kalender"
          className={`mobile-nav-item ${pathname === '/app/kalender' ? 'active' : ''}`}
        >
          <CalendarIcon size={18} />
          <span>Kalender</span>
        </Link>
        <Link
          href="/app/postingan/baru"
          className="mobile-nav-center-plus"
          title="Buat Postingan Baru"
        >
          <Plus size={22} />
        </Link>
        <Link
          href="/app/papan"
          className={`mobile-nav-item ${pathname === '/app/papan' ? 'active' : ''}`}
        >
          <Kanban size={18} />
          <span>Papan</span>
        </Link>
        <button
          type="button"
          onClick={() => setShowMobileMenu(true)}
          className={`mobile-nav-item ${showMobileMenu || (!['/app', '/app/kalender', '/app/papan'].includes(pathname) && !pathname.startsWith('/app/postingan')) ? 'active' : ''}`}
          title="Buka Menu Aplikasi"
        >
          <Menu size={18} />
          <span>Menu</span>
        </button>
      </nav>

      {/* Mobile App Drawer / Menu Sheet (Akses Cepat Semua Fitur) */}
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
                {currentAvatarUrl ? (
                  <img
                    src={currentAvatarUrl}
                    alt={displayName}
                    onError={() => setLocalAvatar(null)}
                    style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #0f172a' }}
                  />
                ) : (
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
                    {initial}
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.96rem', color: '#0f172a', lineHeight: 1.2 }}>
                    {displayName}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Paket: <span style={{ fontWeight: 800, color: '#16a34a' }}>{account?.plan_code?.toUpperCase() || 'FREE'}</span>
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
              Jelajahi Fitur Aplikasi
            </div>

            <div className="mobile-drawer-grid">
              <Link
                href="/app"
                className={`mobile-drawer-item ${pathname === '/app' ? 'active' : ''}`}
                onClick={() => setShowMobileMenu(false)}
              >
                <LayoutDashboard size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
                <span>Beranda</span>
              </Link>
              <Link
                href="/app/kalender"
                className={`mobile-drawer-item ${pathname === '/app/kalender' ? 'active' : ''}`}
                onClick={() => setShowMobileMenu(false)}
              >
                <CalendarIcon size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
                <span>Kalender</span>
              </Link>
              <Link
                href="/app/papan"
                className={`mobile-drawer-item ${pathname === '/app/papan' ? 'active' : ''}`}
                onClick={() => setShowMobileMenu(false)}
              >
                <Kanban size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
                <span>Papan Status</span>
              </Link>
              <Link
                href="/app/daftar"
                className={`mobile-drawer-item ${pathname === '/app/daftar' ? 'active' : ''}`}
                onClick={() => setShowMobileMenu(false)}
              >
                <List size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
                <span>Daftar Post</span>
              </Link>
              <Link
                href="/app/grid"
                className={`mobile-drawer-item ${pathname === '/app/grid' ? 'active' : ''}`}
                onClick={() => setShowMobileMenu(false)}
              >
                <Grid size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
                <span>Grid IG Feed</span>
              </Link>
              <Link
                href="/app/bank"
                className={`mobile-drawer-item ${pathname === '/app/bank' ? 'active' : ''}`}
                onClick={() => setShowMobileMenu(false)}
              >
                <FileText size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
                <span>Bank Konten</span>
              </Link>
              <Link
                href="/app/brand"
                className={`mobile-drawer-item ${pathname.startsWith('/app/brand') ? 'active' : ''}`}
                onClick={() => setShowMobileMenu(false)}
              >
                <Building size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
                <span>Brand & Tim</span>
              </Link>
              <Link
                href="/app/langganan"
                className={`mobile-drawer-item ${pathname === '/app/langganan' ? 'active' : ''}`}
                onClick={() => setShowMobileMenu(false)}
              >
                <CreditCard size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
                <span>Langganan</span>
              </Link>
              <Link
                href="/app/akun"
                className={`mobile-drawer-item ${pathname === '/app/akun' ? 'active' : ''}`}
                onClick={() => setShowMobileMenu(false)}
              >
                <User size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
                <span>Akun & Profil</span>
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className={`mobile-drawer-item ${pathname.startsWith('/admin') ? 'active' : ''}`}
                  onClick={() => setShowMobileMenu(false)}
                >
                  <Shield size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
                  <span>Panel Admin</span>
                </Link>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setShowMobileMenu(false);
                setShowLogoutModal(true);
              }}
              className="btn-uda btn-uda-danger"
              style={{
                width: '100%',
                minHeight: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontWeight: 800,
                fontSize: '0.88rem',
              }}
            >
              <LogOut size={16} />
              <span>Keluar dari Akun</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal Pop-up Konfirmasi Logout */}
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
              borderRadius: 14,
              border: '3px solid #0f172a',
              boxShadow: '6px 6px 0px #0f172a',
              background: '#ffffff',
            }}
          >
            <div
              style={{
                width: 58,
                height: 58,
                borderRadius: 12,
                background: '#fee2e2',
                color: '#dc2626',
                border: '2px solid #0f172a',
                boxShadow: '2.5px 2.5px 0px #0f172a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <LogOut size={26} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
              Konfirmasi Keluar Akun
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.86rem', lineHeight: 1.5, marginBottom: 24 }}>
              Apakah Anda yakin ingin keluar dari akun? Anda perlu memasukkan email dan kata sandi kembali untuk masuk ke UdaPlanner.
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
