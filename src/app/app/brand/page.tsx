'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building,
  Plus,
  Lock,
  Archive,
  Settings,
  Users,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { DUMMY_BRANDS, DummyBrand } from '@/lib/dummy-data';

export default function DaftarBrandPage() {
  const router = useRouter();
  const [brands, setBrands] = useState<DummyBrand[]>(DUMMY_BRANDS);
  const [showAddBrandModal, setShowAddBrandModal] = useState(false);

  // New Brand Form
  const [newName, setNewName] = useState('');
  const [newHandle, setNewHandle] = useState('');
  const [newColor, setNewColor] = useState('#16A34A');

  const maxBrands = 5; // Kuota Paket Pro
  const isQuotaFull = brands.length >= maxBrands;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Manajemen Akun Brand</h1>
          <p style={{ color: '#64748b', fontSize: '0.88rem' }}>
            Kelola brand media sosial yang Anda naungi, undang anggota tim, dan atur pilar konten.
          </p>
        </div>

        <button
          className="btn-uda btn-uda-primary btn-uda-sm"
          onClick={() => {
            if (isQuotaFull) {
              alert('Kuota brand penuh! Upgrade ke paket Tim untuk menambah hingga 20 brand.');
            } else {
              setShowAddBrandModal(true);
            }
          }}
        >
          {isQuotaFull ? <Lock size={15} /> : <Plus size={15} />}
          <span>{isQuotaFull ? 'Tambah Brand (Penuh)' : '+ Tambah Brand'}</span>
        </button>
      </div>

      {/* Grid Kartu Brand */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {brands.map((b) => (
          <div
            key={b.id}
            className="uda-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 16,
              cursor: 'pointer',
              borderTop: `4px solid ${b.color}`,
            }}
            onClick={() => router.push(`/app/brand/${b.id}`)}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <img
                    src={b.avatar_url}
                    alt=""
                    style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '1px solid #e2e8f0' }}
                  />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>{b.name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>@{b.handle}</div>
                  </div>
                </div>

                {b.is_archived && (
                  <span className="status-pill" style={{ background: '#f1f5f9', color: '#475569' }}>
                    Diarsipkan
                  </span>
                )}
              </div>

              {/* Detail Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.82rem', color: '#475569' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Platform:</span>
                  <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{b.platforms.join(', ')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Postingan Bulan Ini:</span>
                  <span style={{ fontWeight: 700, color: '#16a34a' }}>{b.post_count_this_month} konten</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Alur Review:</span>
                  <span style={{ fontWeight: 600, color: b.require_approval ? '#b45309' : '#64748b' }}>
                    {b.require_approval ? 'Wajib Review' : 'Bebas Posting'}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
              <span style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 700 }}>
                Buka Pengaturan Brand →
              </span>
              <Settings size={16} style={{ color: '#64748b' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Modal Tambah Brand */}
      {showAddBrandModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 20,
          }}
        >
          <div className="uda-card" style={{ maxWidth: 440, width: '100%', padding: 24 }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 14 }}>Tambah Brand Baru</h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const newBrandItem: DummyBrand = {
                  id: `brand-${Date.now()}`,
                  owner_id: 'user-1',
                  name: newName,
                  handle: newHandle.replace('@', ''),
                  platforms: ['instagram'],
                  color: newColor,
                  avatar_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
                  require_approval: false,
                  is_archived: false,
                  post_count_this_month: 0,
                };
                setBrands([...brands, newBrandItem]);
                setShowAddBrandModal(false);
                setNewName('');
                setNewHandle('');
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>Nama Brand *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: UdaCoding Lab"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>Username Handle (tanpa @)</label>
                <input
                  type="text"
                  required
                  placeholder="udacoding_lab"
                  value={newHandle}
                  onChange={(e) => setNewHandle(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>Warna Identitas Brand</label>
                <input
                  type="color"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  style={{ height: 40, width: '100%', borderRadius: 8, border: '1px solid #e2e8f0', padding: 2 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" className="btn-uda btn-uda-secondary" onClick={() => setShowAddBrandModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn-uda btn-uda-primary">
                  Buat Brand
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
