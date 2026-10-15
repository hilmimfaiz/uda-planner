'use client';

import React, { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Users,
  Layers,
  Settings,
  ShieldCheck,
  Share2,
  Copy,
  Trash2,
  Plus,
  Check,
  Camera,
  Upload,
  Loader2,
  X,
} from 'lucide-react';
import { DUMMY_BRANDS, DUMMY_PILLARS, DUMMY_MEMBERS } from '@/lib/dummy-data';
import { useAuth } from '@/contexts/auth-context';
import { createClient } from '@/lib/supabase/client';
import { uploadBrandLogo } from '@/lib/image-upload';

export default function PengaturanBrandDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();
  const brandId = (params?.id as string) || 'brand-1';

  const brand = DUMMY_BRANDS.find((b) => b.id === brandId) || DUMMY_BRANDS[0];

  const [activeTab, setActiveTab] = useState<'profil' | 'pilar' | 'anggota' | 'pengaturan'>('profil');
  const [pillars, setPillars] = useState(DUMMY_PILLARS.filter((p) => p.brand_id === brand.id));
  const [members, setMembers] = useState(DUMMY_MEMBERS);
  const [requireApproval, setRequireApproval] = useState(brand.require_approval);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Brand Profile Edit States
  const [brandName, setBrandName] = useState(brand.name);
  const [brandHandle, setBrandHandle] = useState(brand.handle);
  const [brandColor, setBrandColor] = useState(brand.color);
  const [brandAvatarUrl, setBrandAvatarUrl] = useState(brand.avatar_url);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Invite Modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'reviewer' | 'viewer'>('editor');
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null);

  // Delete Brand confirmation state
  const [deleteInputName, setDeleteInputName] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      const uploadedUrl = await uploadBrandLogo(supabase, file, brand.id);
      setBrandAvatarUrl(uploadedUrl);

      if (supabase && user) {
        await (supabase.from('brands' as any) as any)
          .update({
            logo_url: uploadedUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', brand.id);
      }

      showToast('✅ Foto logo brand berhasil diunggah!');
    } catch (err: any) {
      showToast('❌ Gagal mengunggah foto: ' + (err.message || 'Coba lagi'));
    } finally {
      setIsUploadingAvatar(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleGenerateInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const token = Math.random().toString(36).substring(2, 12);
    const link = `http://localhost:3000/undangan/${token}`;
    setGeneratedInviteLink(link);
    showToast('Link undangan berhasil dibuat!');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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
            zIndex: 9999,
            fontSize: '0.88rem',
            fontWeight: 600,
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button className="btn-uda btn-uda-secondary btn-uda-sm" onClick={() => router.push('/app/brand')}>
          <ArrowLeft size={16} />
          <span>Kembali</span>
        </button>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
            Pengaturan Brand: {brand.name}
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.82rem' }}>@{brand.handle}</p>
        </div>
      </div>

      {/* 4 Tabs Sesuai PRD Bab 8 */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 10 }}>
        {[
          { id: 'profil', label: 'Profil Brand' },
          { id: 'pilar', label: 'Pilar Konten' },
          { id: 'anggota', label: 'Anggota & Undangan' },
          { id: 'pengaturan', label: 'Pengaturan & Review' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === tab.id ? '#f0fdf4' : 'transparent',
              color: activeTab === tab.id ? '#16a34a' : '#64748b',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: PROFIL BRAND */}
      {activeTab === 'profil' && (
        <div className="uda-card" style={{ maxWidth: 580 }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 18, color: '#0f172a' }}>
            Detail Profil Brand
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Foto / Logo Brand Upload */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                Logo / Foto Profil Brand
              </label>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: 16,
                  background: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  borderRadius: 12,
                }}
              >
                <div style={{ position: 'relative' }}>
                  <img
                    src={brandAvatarUrl}
                    alt={brandName}
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: `3px solid ${brandColor}`,
                      background: '#ffffff',
                    }}
                  />
                  {isUploadingAvatar && (
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
                      <Loader2 size={22} className="animate-spin" />
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                    style={{ display: 'none' }}
                    onChange={handleLogoUpload}
                  />

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn-uda btn-uda-primary btn-uda-sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                      style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <Camera size={14} />
                      <span>{isUploadingAvatar ? 'Mengunggah...' : 'Unggah Foto Baru'}</span>
                    </button>

                    <button
                      type="button"
                      className="btn-uda btn-uda-secondary btn-uda-sm"
                      onClick={() => {
                        setBrandAvatarUrl('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150');
                        showToast('Logo direset ke gambar default');
                      }}
                      style={{ fontSize: '0.8rem' }}
                    >
                      Reset Logo
                    </button>
                  </div>

                  <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                    Format didukung: PNG, JPG, WebP, atau SVG. Rasio disarankan 1:1, ukuran maks. 5 MB.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Nama Brand</label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, marginTop: 4, outline: 'none', fontSize: '0.9rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Username Handle (@)</label>
              <input
                type="text"
                value={brandHandle}
                onChange={(e) => setBrandHandle(e.target.value.replace('@', ''))}
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, marginTop: 4, outline: 'none', fontSize: '0.9rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Warna Identitas Brand</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                <input
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  style={{ width: 50, height: 42, border: '1px solid #e2e8f0', borderRadius: 8, padding: 2, cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#475569' }}>{brandColor}</span>
              </div>
            </div>

            <button
              className="btn-uda btn-uda-primary"
              style={{ width: 'fit-content', marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={async () => {
                if (supabase && user) {
                  await (supabase.from('brands' as any) as any)
                    .update({
                      name: brandName,
                      slug: brandHandle,
                      color: brandColor,
                      logo_url: brandAvatarUrl,
                      updated_at: new Date().toISOString(),
                    })
                    .eq('id', brand.id);
                }
                showToast('✅ Profil brand berhasil diperbarui!');
              }}
            >
              Simpan Profil Brand
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: PILAR KONTEN */}
      {activeTab === 'pilar' && (
        <div className="uda-card" style={{ maxWidth: 640 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Daftar Pilar Konten</h3>
              <p style={{ fontSize: '0.82rem', color: '#64748b' }}>Kategori tema komunikasi untuk postingan brand</p>
            </div>
            <button
              className="btn-uda btn-uda-primary btn-uda-sm"
              onClick={() => {
                const newP = {
                  id: `pil-${Date.now()}`,
                  brand_id: brand.id,
                  name: 'Pilar Baru',
                  color: '#6366F1',
                };
                setPillars([...pillars, newP]);
                showToast('Pilar baru ditambahkan');
              }}
            >
              + Tambah Pilar
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pillars.map((pil) => (
              <div
                key={pil.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 12,
                  borderRadius: 8,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: pil.color }} />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{pil.name}</span>
                </div>
                <button
                  className="btn-uda btn-uda-secondary btn-uda-sm"
                  onClick={() => setPillars(pillars.filter((p) => p.id !== pil.id))}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ANGGOTA & UNDANGAN */}
      {activeTab === 'anggota' && (
        <div className="uda-card" style={{ maxWidth: 680 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Anggota Tim Kolaborator</h3>
              <p style={{ fontSize: '0.82rem', color: '#64748b' }}>Peran: Owner, Editor, Reviewer, Viewer</p>
            </div>
            <button className="btn-uda btn-uda-primary btn-uda-sm" onClick={() => setShowInviteModal(true)}>
              + Undang Anggota
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {members.map((m) => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 12,
                  borderRadius: 10,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <img
                    src={m.avatar}
                    alt=""
                    style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{m.name}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{m.email}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <select
                    className="brand-dropdown-select"
                    defaultValue={m.role}
                    style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                  >
                    <option value="owner">Owner</option>
                    <option value="editor">Editor</option>
                    <option value="reviewer">Reviewer</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: PENGATURAN & REVIEW */}
      {activeTab === 'pengaturan' && (
        <div className="uda-card" style={{ maxWidth: 580, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 8 }}>Alur Persetujuan (Wajib Review)</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 12 }}>
              Jika diaktifkan, editor tidak bisa langsung menjadwalkan konten tanpa persetujuan Reviewer atau Pemilik.
            </p>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 700 }}>
              <input
                type="checkbox"
                checked={requireApproval}
                onChange={(e) => {
                  setRequireApproval(e.target.checked);
                  showToast(e.target.checked ? 'Alur Wajib Review diaktifkan' : 'Alur Wajib Review dimatikan');
                }}
                style={{ width: 18, height: 18, accentColor: '#16a34a' }}
              />
              <span>Aktifkan "Wajib Review" untuk brand ini</span>
            </label>
          </div>

          <div style={{ borderTop: '1px solid #fecaca', paddingTop: 16 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#dc2626', marginBottom: 6 }}>Zona Berbahaya</h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 10 }}>
              Ketik nama brand <strong>"{brand.name}"</strong> untuk mengonfirmasi penghapusan permanen:
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="text"
                placeholder={brand.name}
                value={deleteInputName}
                onChange={(e) => setDeleteInputName(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #fecaca', borderRadius: 8, flex: 1 }}
              />
              <button
                className="btn-uda btn-uda-danger btn-uda-sm"
                disabled={deleteInputName !== brand.name}
                onClick={() => {
                  showToast('Brand berhasil dihapus.');
                  router.push('/app/brand');
                }}
              >
                Hapus Brand
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL UNDANG ANGGOTA */}
      {showInviteModal && (
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
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 12 }}>Undang Anggota Tim Baru</h3>

            {!generatedInviteLink ? (
              <form onSubmit={handleGenerateInvite} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>Email Anggota</label>
                  <input
                    type="email"
                    required
                    placeholder="nama@email.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, marginTop: 4 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>Peran Akses</label>
                  <select
                    className="brand-dropdown-select"
                    style={{ width: '100%', marginTop: 4 }}
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                  >
                    <option value="editor">Editor (Bisa buat & edit konten)</option>
                    <option value="reviewer">Reviewer (Menyetujui / minta revisi)</option>
                    <option value="viewer">Viewer (Hanya melihat & komentar)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                  <button type="button" className="btn-uda btn-uda-secondary" onClick={() => setShowInviteModal(false)}>
                    Batal
                  </button>
                  <button type="submit" className="btn-uda btn-uda-primary">
                    Buat Link Undangan
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  Salin link undangan ini dan kirimkan langsung kepada calon anggota lewat WhatsApp:
                </p>

                <div style={{ padding: 10, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', wordBreak: 'break-all', fontSize: '0.82rem', fontWeight: 600 }}>
                  {generatedInviteLink}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    className="btn-uda btn-uda-secondary"
                    style={{ flex: 1 }}
                    onClick={() => {
                      navigator.clipboard.writeText(generatedInviteLink);
                      showToast('📋 Link undangan berhasil disalin!');
                    }}
                  >
                    <Copy size={15} />
                    <span>Salin Link</span>
                  </button>
                  <button
                    className="btn-uda btn-uda-primary"
                    style={{ flex: 1 }}
                    onClick={() => {
                      const msg = encodeURIComponent(`Halo! Anda diundang untuk bergabung mengelola brand ${brand.name} di UdaPlanner sebagai ${inviteRole}:\n\n${generatedInviteLink}`);
                      window.open(`https://wa.me/?text=${msg}`, '_blank');
                    }}
                  >
                    <Share2 size={15} />
                    <span>Kirim ke WA</span>
                  </button>
                </div>

                <button
                  className="btn-uda btn-uda-secondary btn-uda-sm"
                  style={{ marginTop: 8 }}
                  onClick={() => {
                    setGeneratedInviteLink(null);
                    setShowInviteModal(false);
                  }}
                >
                  Tutup
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
