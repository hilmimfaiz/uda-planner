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
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { DUMMY_POSTS, DUMMY_BRANDS, DUMMY_PILLARS, DUMMY_MEMBERS, DummyPost, DummyBrand } from '@/lib/dummy-data';
import { POST_STATUSES } from '@/lib/platforms';
import { PostService } from '@/services/post.service';
import { BrandService } from '@/services/brand.service';
import { useModal } from '@/contexts/modal-context';
import { GuidedTour, TourStep } from '@/components/guided-tour';

function generatePaginationPages(current: number, total: number): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, '...', total];
  }
  if (current >= total - 3) {
    return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, '...', current - 1, current, current + 1, '...', total];
}

const daftarTourSteps: TourStep[] = [
  {
    targetId: 'tour-daftar-header',
    title: 'Daftar Semua Postingan',
    description: 'Kelola seluruh inventaris konten Anda secara terstruktur. Buat postingan baru atau unduh data ke format CSV untuk arsip dan pelaporan.',
    placement: 'bottom',
  },
  {
    targetId: 'tour-daftar-filter',
    title: 'Pencarian & Multi-Filter',
    description: 'Temukan postingan spesifik dengan cepat menggunakan pencarian teks atau filter berdasarkan Brand, Status, dan Platform media sosial.',
    placement: 'bottom',
  },
  {
    targetId: 'tour-daftar-row',
    title: 'Baris Data Postingan & Aksi',
    description: 'Contoh baris teratas: klik baris mana saja untuk membuka editor detail postingan, atau gunakan tombol hapus cepat di ujung kanan.',
    placement: 'bottom',
  },
];

export default function DaftarPostinganPage() {
  const router = useRouter();
  const { confirmDelete, showSuccess } = useModal();
  const [posts, setPosts] = useState<DummyPost[]>(DUMMY_POSTS);
  const [brands, setBrands] = useState<DummyBrand[]>(DUMMY_BRANDS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBrand, setFilterBrand] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [sortOrder, setSortOrder] = useState<'terbaru' | 'terlama'>('terbaru');

  // Paginasi
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  React.useEffect(() => {
    PostService.getPosts().then((data) => {
      if (data && data.length > 0) setPosts(data);
    });
    BrandService.getBrands().then((data) => {
      if (data && data.length > 0) setBrands(data);
    });
  }, []);

  // Filter & Search Logic
  const filtered = posts
    .filter((p) => {
      if (filterBrand !== 'all' && p.brand_id !== filterBrand) return false;
      if (filterStatus !== 'all' && p.status !== filterStatus) return false;
      if (filterPlatform !== 'all' && !p.platforms.includes(filterPlatform)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return p.title.toLowerCase().includes(q) || p.caption.toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      const timeA = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0;
      const timeB = b.scheduled_at ? new Date(b.scheduled_at).getTime() : 0;
      return sortOrder === 'terbaru' ? timeB - timeA : timeA - timeB;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));

  // Reset page when out of bounds
  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filtered.length);
  const paginatedPosts = filtered.slice(startIndex, endIndex);

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
      <div id="tour-daftar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
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
      <div id="tour-daftar-filter" className="uda-card" style={{ padding: '16px 20px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Cari judul postingan atau caption..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
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
          onChange={(e) => {
            setFilterBrand(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="all">Semua Brand</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>

        <select
          className="brand-dropdown-select"
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setCurrentPage(1);
          }}
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
          onChange={(e) => {
            setFilterPlatform(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="all">Semua Platform</option>
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
          <option value="linkedin">LinkedIn</option>
          <option value="facebook">Facebook</option>
          <option value="youtube">YouTube</option>
        </select>

        <select
          className="brand-dropdown-select"
          value={sortOrder}
          onChange={(e) => {
            setSortOrder(e.target.value as any);
            setCurrentPage(1);
          }}
        >
          <option value="terbaru">Terbaru Dahulu</option>
          <option value="terlama">Terlama Dahulu</option>
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
              {filtered.length === 0 ? (
                <tr id="tour-daftar-row">
                  <td colSpan={6} style={{ padding: '32px 20px', textAlign: 'center', color: '#64748b' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Tidak ada postingan ditemukan</div>
                    <div style={{ fontSize: '0.82rem' }}>Coba ubah kata kunci pencarian atau sesuaikan opsi filter Anda.</div>
                  </td>
                </tr>
              ) : (
                paginatedPosts.map((post, postIdx) => {
                  const brand = DUMMY_BRANDS.find((b) => b.id === post.brand_id);
                  const statusMeta = POST_STATUSES[post.status];
                  return (
                    <tr
                      key={post.id}
                      id={postIdx === 0 && currentPage === 1 ? 'tour-daftar-row' : undefined}
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
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                          <button
                            className="btn-uda btn-uda-secondary btn-uda-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/app/postingan/${post.id}`);
                            }}
                          >
                            Detail
                          </button>
                          <button
                            className="btn-uda btn-uda-secondary btn-uda-sm"
                            title="Hapus Postingan"
                            onClick={(e) => {
                              e.stopPropagation();
                              confirmDelete({
                                title: 'Hapus Postingan Ini?',
                                message: `Apakah Anda yakin ingin menghapus "${post.title}"?`,
                                onConfirm: async () => {
                                  await PostService.deletePost(post.id);
                                  setPosts((prev) => prev.filter((p) => p.id !== post.id));
                                  showSuccess('Postingan Berhasil Dihapus', `Postingan "${post.title}" telah dihapus.`);
                                },
                              });
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Kontrol Paginasi */}
      {filtered.length > 0 && (
        <div
          className="uda-card"
          style={{
            padding: '14px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 14,
            backgroundColor: '#ffffff',
            borderRadius: 12,
            border: '2px solid #0f172a',
            boxShadow: '3px 3px 0px #0f172a',
          }}
        >
          {/* Info Jumlah & Opsi Baris */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.84rem', color: '#475569', fontWeight: 600 }}>
              Menampilkan <strong>{filtered.length === 0 ? 0 : startIndex + 1}</strong> – <strong>{endIndex}</strong> dari <strong>{filtered.length}</strong> postingan
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Tampilkan:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="brand-dropdown-select"
                style={{ padding: '4px 8px', fontSize: '0.8rem', height: 32 }}
              >
                <option value={5}>5 per halaman</option>
                <option value={10}>10 per halaman</option>
                <option value={20}>20 per halaman</option>
                <option value={50}>50 per halaman</option>
              </select>
            </div>
          </div>

          {/* Tombol Halaman */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="btn-uda btn-uda-secondary btn-uda-sm"
              style={{
                opacity: currentPage === 1 ? 0.45 : 1,
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '6px 12px',
                fontSize: '0.82rem',
                fontWeight: 700,
              }}
            >
              <ChevronLeft size={15} />
              <span>Sebelumnya</span>
            </button>

            {/* Nomor Halaman */}
            <div style={{ display: 'flex', gap: 4 }}>
              {generatePaginationPages(currentPage, totalPages).map((p, idx) => {
                if (p === '...') {
                  return (
                    <span
                      key={`ellipsis-${idx}`}
                      style={{
                        padding: '4px 8px',
                        fontSize: '0.85rem',
                        color: '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      ...
                    </span>
                  );
                }
                const pageNum = Number(p);
                const isActive = pageNum === currentPage;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    style={{
                      minWidth: 34,
                      height: 34,
                      borderRadius: 8,
                      border: '1.5px solid #0f172a',
                      boxShadow: isActive ? '2px 2px 0px #0f172a' : 'none',
                      backgroundColor: isActive ? '#16a34a' : '#ffffff',
                      color: isActive ? '#ffffff' : '#0f172a',
                      fontWeight: isActive ? 900 : 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.1s ease',
                    }}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="btn-uda btn-uda-secondary btn-uda-sm"
              style={{
                opacity: currentPage === totalPages ? 0.45 : 1,
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '6px 12px',
                fontSize: '0.82rem',
                fontWeight: 700,
              }}
            >
              <span>Selanjutnya</span>
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      <GuidedTour steps={daftarTourSteps} tourKey="uda_tour_daftar" />
    </div>
  );
}
