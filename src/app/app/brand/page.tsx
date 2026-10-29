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
import { GuidedTour, TourStep } from '@/components/guided-tour';

const brandTourSteps: TourStep[] = [
  {
    targetId: 'tour-brand-header',
    title: 'Manajemen Akun Brand',
    description: 'Kelola seluruh workspace brand media sosial Anda di sini. Atur pilar konten dan undang anggota tim untuk berkolaborasi.',
    placement: 'bottom',
  },
  {
    targetId: 'tour-brand-grid',
    title: 'Koleksi Kartu Brand',
    description: 'Setiap brand memiliki warna identitas, logo, daftar pilar konten, serta jumlah postingan aktif tersendiri.',
    placement: 'top',
  },
  {
    targetId: 'tour-brand-first-card',
    title: 'Ubah Logo & Buka Pengaturan',
    description: 'Arahkan kursor ke foto logo untuk menggantinya secara instan, atau klik kartu brand untuk masuk ke pengaturan detail dan undang tim.',
    placement: 'right',
  },
];

export default function DaftarBrandPage() {
  const router = useRouter();
  const { user, account } = useAuth();
  const { showSuccess, showError } = useModal();
  const supabase = createClient();
  const [brands, setBrands] = useState<DummyBrand[]>(DUMMY_BRANDS);
  const [showAddBrandModal, setShowAddBrandModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  React.useEffect(() => {
    BrandService.getBrands(user?.id).then((data) => {
      setBrands(data || []);
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
  const [brandPlatforms, setBrandPlatforms] = useState<string[]>(['instagram', 'tiktok']);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['instagram', 'tiktok']);
  const [platformInput, setPlatformInput] = useState('');

  // Quick Photo Change for Existing Brand
  const [updatingBrandId, setUpdatingBrandId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeBrandForUpload = useRef<string | null>(null);
  const newBrandFileInputRef = useRef<HTMLInputElement>(null);

  // Kuota Brand Berdasarkan Paket Langganan:
  // - Paket Gratis: Maksimal 1 Brand
  // - Paket Pro: Maksimal 5 Brand
  // - Paket Tim: Maksimal 20 Brand
  const planCode = account?.plan_code || 'free';
  const maxBrands = planCode === 'team' ? 20 : planCode === 'pro' ? 5 : 1;
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
      <div id="tour-brand-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Manajemen Akun Brand</h1>
            <span
              style={{
                fontSize: '0.74rem',
                fontWeight: 800,
                padding: '3px 10px',
                borderRadius: 999,
                background: isQuotaFull ? '#fef2f2' : '#f0fdf4',
                color: isQuotaFull ? '#dc2626' : '#16a34a',
                border: `1.5px solid ${isQuotaFull ? '#fca5a5' : '#86efac'}`,
              }}
            >
              {brands.length} / {maxBrands} Brand (Paket {planCode.toUpperCase()})
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.88rem', marginTop: 2 }}>
            {planCode === 'free'
              ? 'Paket Gratis dibatasi maksimal 1 Akun Brand. Upgrade ke Pro (5 Brand) atau Tim (20 Brand) untuk ekspansi brand.'
              : planCode === 'pro'
              ? 'Paket Pro mendukung hingga 5 Brand Media Sosial. Upgrade ke Tim untuk mengelola hingga 20 brand.'
              : 'Paket Tim Agensi mendukung hingga 20 Brand Media Sosial dengan kolaborasi tim penuh.'}
          </p>
        </div>

        <button
          className={`btn-uda ${isQuotaFull ? 'btn-uda-secondary' : 'btn-uda-primary'} btn-uda-sm`}
          onClick={() => {
            if (isQuotaFull) {
              const upgradeMsg =
                planCode === 'free'
                  ? 'Batas 1 Akun Brand untuk Paket Gratis telah tercapai. Tingkatkan ke Paket Pro (5 Brand) atau Paket Tim (20 Brand) untuk menambah akun brand baru.'
                  : planCode === 'pro'
                  ? 'Batas 5 Akun Brand untuk Paket Pro telah tercapai. Tingkatkan ke Paket Tim (20 Brand) untuk mengelola brand baru.'
                  : 'Anda telah mencapai batas maksimal 20 Akun Brand pada Paket Tim.';

              showError('Kuota Brand Maksimal Tercapai', upgradeMsg);
            } else {
              setShowAddBrandModal(true);
            }
          }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          {isQuotaFull ? <Lock size={15} style={{ color: '#dc2626' }} /> : <Plus size={15} />}
          <span>{isQuotaFull ? `Kuota Penuh (${brands.length}/${maxBrands})` : 'Tambah Brand'}</span>
        </button>
      </div>

      {/* Grid Kartu Brand Responsif */}
      <div id="tour-brand-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 290px), 1fr))', gap: 20 }}>
        {brands.map((b, bIdx) => {
          const isUpdatingThis = updatingBrandId === b.id;

          return (
            <div
              key={b.id}
              id={bIdx === 0 ? "tour-brand-first-card" : undefined}
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

        {brands.length === 0 && (
          <div
            className="uda-card"
            style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              padding: '48px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
              }}
            >
              <Building size={28} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Belum Ada Brand
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.88rem', maxWidth: 420, margin: 0 }}>
              Mulai kelola konten dengan menambahkan akun brand media sosial pertama Anda secara manual.
            </p>
            <button
              onClick={() => setShowAddBrandModal(true)}
              className="btn-uda btn-uda-primary"
              style={{ marginTop: 8 }}
            >
              <Plus size={16} />
              <span>Tambah Brand Pertama</span>
            </button>
          </div>
        )}
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
                  const finalPlatforms = selectedPlatforms.length > 0 ? selectedPlatforms : ['instagram'];
                  const created = await BrandService.createBrand({
                    ownerId: user?.id,
                    name: newName,
                    handle: newHandle.replace('@', ''),
                    color: newColor,
                    avatarUrl: newAvatarUrl,
                    platforms: finalPlatforms,
                  });
                  setBrands((prev) => [created, ...prev.filter((b) => b.id !== created.id)]);
                  setShowAddBrandModal(false);
                  setNewName('');
                  setNewHandle('');
                  setNewAvatarUrl('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150');
                  setBrandPlatforms(['instagram', 'tiktok']);
                  setSelectedPlatforms(['instagram', 'tiktok']);
                  setPlatformInput('');
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

              {/* Kolom Platform: Input dengan Enter menjadi Checkbox */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                    Platform Media Sosial
                  </label>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Tekan <strong>Enter</strong> untuk menambah
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="text"
                    placeholder="Contoh: Instagram, TikTok, LinkedIn, Twitter..."
                    value={platformInput}
                    onChange={(e) => setPlatformInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = platformInput.trim().toLowerCase().replace(/\s+/g, '-');
                        if (val) {
                          if (!brandPlatforms.includes(val)) {
                            setBrandPlatforms((prev) => [...prev, val]);
                          }
                          if (!selectedPlatforms.includes(val)) {
                            setSelectedPlatforms((prev) => [...prev, val]);
                          }
                          setPlatformInput('');
                        }
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      outline: 'none',
                      fontSize: '0.88rem',
                    }}
                  />
                  <button
                    type="button"
                    className="btn-uda btn-uda-secondary btn-uda-sm"
                    onClick={() => {
                      const val = platformInput.trim().toLowerCase().replace(/\s+/g, '-');
                      if (val) {
                        if (!brandPlatforms.includes(val)) {
                          setBrandPlatforms((prev) => [...prev, val]);
                        }
                        if (!selectedPlatforms.includes(val)) {
                          setSelectedPlatforms((prev) => [...prev, val]);
                        }
                        setPlatformInput('');
                      }
                    }}
                    style={{ padding: '0 12px' }}
                  >
                    + Tambah
                  </button>
                </div>

                {/* List Checkbox Platform */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {brandPlatforms.map((plt) => {
                    const isChecked = selectedPlatforms.includes(plt);
                    return (
                      <label
                        key={plt}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '5px 10px',
                          borderRadius: 8,
                          border: `1.5px solid ${isChecked ? '#16a34a' : '#cbd5e1'}`,
                          backgroundColor: isChecked ? '#f0fdf4' : '#ffffff',
                          cursor: 'pointer',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          color: isChecked ? '#15803d' : '#475569',
                          transition: 'all 0.15s ease',
                          userSelect: 'none',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPlatforms((prev) => [...prev, plt]);
                            } else {
                              setSelectedPlatforms((prev) => prev.filter((p) => p !== plt));
                            }
                          }}
                          style={{ accentColor: '#16a34a', cursor: 'pointer' }}
                        />
                        <span style={{ textTransform: 'capitalize' }}>{plt}</span>
                        {/* Hapus platform custom */}
                        {!['instagram', 'tiktok'].includes(plt) && (
                          <span
                            role="button"
                            title="Hapus platform ini"
                            onClick={(ev) => {
                              ev.preventDefault();
                              ev.stopPropagation();
                              setBrandPlatforms((prev) => prev.filter((p) => p !== plt));
                              setSelectedPlatforms((prev) => prev.filter((p) => p !== plt));
                            }}
                            style={{
                              marginLeft: 4,
                              color: '#94a3b8',
                              fontWeight: 800,
                              fontSize: '0.9rem',
                              lineHeight: 1,
                              cursor: 'pointer',
                            }}
                          >
                            ×
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Platform yang dicentang akan otomatis muncul sebagai pilihan di <strong>Form Konten</strong>.
                </div>
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

      <GuidedTour steps={brandTourSteps} tourKey="uda_tour_brand" />
    </div>
  );
}
