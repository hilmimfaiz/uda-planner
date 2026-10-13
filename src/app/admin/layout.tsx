'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Shield,
  LayoutDashboard,
  CreditCard,
  Users,
  Package,
  Settings,
  ArrowLeft,
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const adminNav = [
    { name: 'Ringkasan', href: '/admin', icon: LayoutDashboard },
    { name: 'Pembayaran', href: '/admin/pembayaran', icon: CreditCard },
    { name: 'Pengguna', href: '/admin/pengguna', icon: Users },
    { name: 'Paket', href: '/admin/paket', icon: Package },
    { name: 'Pengaturan', href: '/admin/pengaturan', icon: Settings },
  ];

  return (
    <div className="app-layout">
      {/* Sidebar Admin Gelap (#0F172A) Sesuai PRD Bab 8 */}
      <aside className="app-sidebar sidebar-admin">
        <div className="sidebar-brand-header">
          <div className="logo-symbol" style={{ background: '#16a34a' }}>
            <Shield size={20} />
          </div>
          <div>
            <div className="logo-text-title">Admin UdaPlanner</div>
            <div className="logo-text-sub">Panel Pengelola Sistem</div>
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
          >
            <ArrowLeft size={16} />
            <span>Kembali ke Aplikasi</span>
          </button>
        </div>
      </aside>

      {/* Admin Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: '100vh', background: '#f8fafc' }}>
        <header
          style={{
            height: 64,
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            padding: '0 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, background: '#16a34a22', color: '#16a34a', padding: '3px 8px', borderRadius: 4 }}>
              ADMINISTRATOR
            </span>
            <span style={{ fontSize: '0.88rem', color: '#64748b' }}>PT UdaCoding Digital Indonesia</span>
          </div>

          <button
            className="btn-uda btn-uda-secondary btn-uda-sm"
            onClick={() => router.push('/app')}
          >
            Lihat Mode Pengguna
          </button>
        </header>

        <main style={{ flex: 1, padding: 28, maxWidth: 1200, width: '100%', margin: '0 auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
