'use client';

import React, { useState, useRef } from 'react';
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
  Camera,
  Upload,
  X,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { DUMMY_BRANDS, DummyBrand } from '@/lib/dummy-data';
import { useAuth } from '@/contexts/auth-context';
import { createClient } from '@/lib/supabase/client';
import { uploadBrandLogo } from '@/lib/image-upload';
import { BrandService } from '@/services/brand.service';
import { useModal } from '@/contexts/modal-context';

export default function DaftarBrandPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { showSuccess, showError } = useModal();
  const supabase = createClient();
  const [brands, setBrands] = useState<DummyBrand[]>(DUMMY_BRANDS);
  const [showAddBrandModal, setShowAddBrandModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  React.useEffect(() => {
    BrandService.getBrands(user?.id).then((data) => {
      if (data && data.length > 0) setBrands(data);
    });
  }, [user?.id]);

  // New Brand Form State
  const [newName, setNewName] = useState('');
  const [newHandle, setNewHandle] = useState('');
  const [newColor, setNewColor] = useState('#16A34A');
  const [newAvatarUrl, setNewAvatarUrl] = useState<string>(
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150'
  );
  const [isUploadingNewAvatar, setIsUploadingNewAvatar] = useState(false);

  // Quick Photo Change for Existing Brand
  const [updatingBrandId, setUpdatingBrandId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeBrandForUpload = useRef<string | null>(null);
  const newBrandFileInputRef = useRef<HTMLInputElement>(null);

  const maxBrands = 5; // Kuota Paket Pro
  const isQuotaFull = brands.length >= maxBrands;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Handler saat file dipilih untuk brand yang sudah ada di kartu
  const handleCardFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const targetBrandId = activeBrandForUpload.current;
    if (!file || !targetBrandId) return;

    setUpdatingBrandId(targetBrandId);

    try {
      const uploadedUrl = await uploadBrandLogo(supabase, file, targetBrandId);

      // Update state brands dan database
      setBrands((prev) =>
        prev.map((b) => (b.id === targetBrandId ? { ...b, avatar_url: uploadedUrl } : b))
      );

      await BrandService.updateBrand(targetBrandId, { avatar_url: uploadedUrl });

      showToast('✅ Foto logo brand berhasil diperbarui!');
    } catch (err: any) {
      showToast('❌ Gagal mengunggah foto: ' + (err.message || 'Format tidak didukung'));
    } finally {
      setUpdatingBrandId(null);
      activeBrandForUpload.current = null;
      if (e.target) e.target.value = '';
    }
  };

  // Handler saat file dipilih di modal tambah brand baru
  const handleNewBrandPhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingNewAvatar(true);
    try {
      const uploadedUrl = await uploadBrandLogo(
        supabase,
        file,
        newHandle.trim() || 'new-brand'
      );
      setNewAvatarUrl(uploadedUrl);
      showToast('✅ Foto logo brand berhasil diunggah!');
    } catch (err: any) {
      showToast('❌ Gagal memproses gambar: ' + (err.message || 'Coba lagi'));
    } finally {
      setIsUploadingNewAvatar(false);
      if (e.target) e.target.value = '';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: '#0f172a',
            color: '#f8fafc',
            padding: '12px 18px',
            borderRadius: 10,
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            zIndex: 99999,
            fontSize: '0.88rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Hidden file input for card photo updates */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
        style={{ display: 'none' }}
        onChange={handleCardFileSelect}
      />

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

      {/* Grid Kartu Brand Responsif */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 290px), 1fr))', gap: 20 }}>
        {brands.map((b) => {
          const isUpdatingThis = updatingBrandId === b.id;

          return (
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
                position: 'relative',
                transition: 'all 0.2s ease',
              }}
              onClick={() => router.push(`/app/brand/${b.id}`)}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Brand Avatar with Hover Camera Button */}
                    <div
                      style={{ position: 'relative', width: 46, height: 46 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <img
                        src={b.avatar_url}
                        alt={b.name}
                        style={{
                          width: 46,
                          height: 46,
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: `2px solid ${b.color}40`,
                        }}
                      />
                      {isUpdatingThis ? (
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: '50%',
                            background: 'rgba(0,0,0,0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                          }}
                        >
                          <Loader2 size={16} className="animate-spin" />
                        </div>
                      ) : (
                        <button
                          type="button"
                          title="Klik untuk ubah foto brand"
                          onClick={(e) => {
                            e.stopPropagation();
                            activeBrandForUpload.current = b.id;
                            fileInputRef.current?.click();
                          }}
                          style={{
                            position: 'absolute',
                            bottom: -2,
                            right: -2,
                            background: '#0f172a',
                            color: '#ffffff',
                            border: '2px solid #ffffff',
                            borderRadius: '50%',
                            width: 20,
                            height: 20,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            padding: 0,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                          }}
                        >
                          <Camera size={10} />
                        </button>
                      )}
                    </div>

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
          );
        })}
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
          <div className="uda-card" style={{ maxWidth: 460, width: '100%', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Tambah Brand Baru</h3>
              <button
                type="button"
                onClick={() => setShowAddBrandModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const created = await BrandService.createBrand({
                    ownerId: user?.id,
                    name: newName,
                    handle: newHandle.replace('@', ''),
                    color: newColor,
                    avatarUrl: newAvatarUrl,
                  });
                  setBrands((prev) => [created, ...prev.filter((b) => b.id !== created.id)]);
                  setShowAddBrandModal(false);
                  setNewName('');
                  setNewHandle('');
                  setNewAvatarUrl('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150');
                  showSuccess(
                    'Brand Berhasil Dibuat!',
                    `Brand "${created.name}" (@${created.handle}) telah berhasil disimpan ke database dan siap digunakan.`
                  );
                } catch (err: any) {
                  showError('Gagal Membuat Brand', err.message || 'Silakan periksa kembali data input.');
                }
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              {/* Bagian Unggah Foto / Logo Brand */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                  Foto / Logo Brand
                </label>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: 12,
                    background: '#f8fafc',
                    borderRadius: 10,
                    border: '1px dashed #cbd5e1',
                  }}
                >
                  <div style={{ position: 'relative' }}>
                    <img
                      src={newAvatarUrl}
                      alt="Preview Logo"
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: `2px solid ${newColor}`,
                      }}
                    />
                    {isUploadingNewAvatar && (
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: '50%',
                          background: 'rgba(0,0,0,0.5)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                        }}
                      >
                        <Loader2 size={18} className="animate-spin" />
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1 }}>
                    <input
                      type="file"
                      ref={newBrandFileInputRef}
                      accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                      style={{ display: 'none' }}
                      onChange={handleNewBrandPhotoSelect}
                    />
                    <button
                      type="button"
                      className="btn-uda btn-uda-secondary btn-uda-sm"
                      onClick={() => newBrandFileInputRef.current?.click()}
                      disabled={isUploadingNewAvatar}
                      style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <Upload size={14} />
                      <span>{isUploadingNewAvatar ? 'Memproses...' : 'Unggah Foto / Logo'}</span>
                    </button>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4 }}>
                      PNG, JPG, atau WebP (Maks. 5 MB)
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Nama Brand *</label>
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
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Username Handle (tanpa @)</label>
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
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Warna Identitas Brand</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="color"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    style={{ height: 40, width: 60, borderRadius: 8, border: '1px solid #e2e8f0', padding: 2, cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>{newColor}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" className="btn-uda btn-uda-secondary" onClick={() => setShowAddBrandModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn-uda btn-uda-primary" disabled={isUploadingNewAvatar}>
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
