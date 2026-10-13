'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Download,
  Lock,
  Filter,
  ArrowUpDown,
  Plus,
} from 'lucide-react';
import { DUMMY_POSTS, DUMMY_BRANDS, DUMMY_PILLARS, DUMMY_MEMBERS, DummyPost } from '@/lib/dummy-data';
import { POST_STATUSES } from '@/lib/platforms';

export default function DaftarPostinganPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<DummyPost[]>(DUMMY_POSTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBrand, setFilterBrand] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [sortOrder, setSortOrder] = useState<'terbaru' | 'terlama'>('terbaru');

  // Filter & Search Logic
  const filtered = posts.filter((p) => {
    if (filterBrand !== 'all' && p.brand_id !== filterBrand) return false;
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (filterPlatform !== 'all' && !p.platforms.includes(filterPlatform)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return p.title.toLowerCase().includes(q) || p.caption.toLowerCase().includes(q);
    }
    return true;
  });

  // Export CSV Handler
  const handleExportCSV = () => {
    const headers = ['ID', 'Judul', 'Brand', 'Status', 'Platform', 'Jadwal', 'Caption'];
    const rows = filtered.map((p) => {
      const brand = DUMMY_BRANDS.find((b) => b.id === p.brand_id);
      return [
        p.id,
        `"${p.title.replace(/"/g, '""')}"`,
        brand ? brand.name : '',
        p.status,
        p.platforms.join('; '),
        p.scheduled_at || 'Belum dijadwalkan',
        `"${p.caption.replace(/"/g, '""')}"`,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `udaplanner-jadwal-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Daftar Semua Postingan</h1>
          <p style={{ color: '#64748b', fontSize: '0.88rem' }}>
            Filter detail, pencarian kata kunci, dan ekspor CSV jadwal konten.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn-uda btn-uda-secondary btn-uda-sm" onClick={handleExportCSV}>
            <Download size={15} />
            <span>Ekspor CSV</span>
          </button>
          <button
            className="btn-uda btn-uda-primary btn-uda-sm"
            onClick={() => router.push('/app/postingan/baru')}
          >
            <Plus size={16} />
            <span>+ Postingan Baru</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="uda-card" style={{ padding: '16px 20px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Cari judul postingan atau caption..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              fontSize: '0.88rem',
              outline: 'none',
            }}
          />
        </div>

        <select
          className="brand-dropdown-select"
          value={filterBrand}
          onChange={(e) => setFilterBrand(e.target.value)}
        >
          <option value="all">Semua Brand</option>
          {DUMMY_BRANDS.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>

        <select
          className="brand-dropdown-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">Semua Status</option>
          <option value="ide">Ide</option>
          <option value="draft">Draft</option>
          <option value="review">Menunggu Review</option>
          <option value="siap">Siap Posting</option>
          <option value="terposting">Sudah Posting</option>
        </select>

        <select
          className="brand-dropdown-select"
          value={filterPlatform}
          onChange={(e) => setFilterPlatform(e.target.value)}
        >
          <option value="all">Semua Platform</option>
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
          <option value="linkedin">LinkedIn</option>
          <option value="facebook">Facebook</option>
          <option value="youtube">YouTube</option>
        </select>
      </div>

      {/* Table Desktop / Card Mobile */}
      <div className="uda-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                <th style={{ padding: '12px 18px' }}>Judul & Brand</th>
                <th style={{ padding: '12px 18px' }}>Platform</th>
                <th style={{ padding: '12px 18px' }}>Tipe</th>
                <th style={{ padding: '12px 18px' }}>Jadwal Tayang</th>
                <th style={{ padding: '12px 18px' }}>Status</th>
                <th style={{ padding: '12px 18px', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((post) => {
                const brand = DUMMY_BRANDS.find((b) => b.id === post.brand_id);
                const statusMeta = POST_STATUSES[post.status];
                return (
                  <tr
                    key={post.id}
                    onClick={() => router.push(`/app/postingan/${post.id}`)}
                    style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.1s ease' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>{post.title}</div>
                      {brand && (
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: 4,
                            background: `${brand.color}18`,
                            color: brand.color,
                          }}
                        >
                          {brand.name}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{ textTransform: 'capitalize', color: '#334155', fontWeight: 600 }}>
                        {post.platforms.join(', ')}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px', textTransform: 'capitalize', color: '#64748b' }}>
                      {post.content_type}
                    </td>
                    <td style={{ padding: '14px 18px', color: '#334155' }}>
                      {post.scheduled_at
                        ? new Date(post.scheduled_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Belum dijadwalkan'}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span className="status-pill" style={{ background: statusMeta.bg, color: statusMeta.text }}>
                        {statusMeta.label}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <button
                        className="btn-uda btn-uda-secondary btn-uda-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/app/postingan/${post.id}`);
                        }}
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
