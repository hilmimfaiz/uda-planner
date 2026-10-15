'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { createClient } from '@/lib/supabase/client';
import { Building, Sparkles, Check, ArrowRight, Loader2, Camera, Upload, X } from 'lucide-react';
import { uploadBrandLogo } from '@/lib/image-upload';

const BRAND_COLORS = [
  '#16A34A', // Hijau UdaCoding (Default)
  '#2563EB', // Biru
  '#7C3AED', // Ungu
  '#DB2777', // Pink
  '#DC2626', // Merah
  '#EA580C', // Oranye
  '#D97706', // Amber/Cokelat
  '#0D9488', // Teal
  '#0284C7', // Sky
  '#475569', // Slate
];

const PLATFORMS = [
  { id: 'instagram', name: 'Instagram' },
  { id: 'tiktok', name: 'TikTok' },
  { id: 'facebook', name: 'Facebook' },
  { id: 'youtube', name: 'YouTube' },
  { id: 'linkedin', name: 'LinkedIn' },
  { id: 'x', name: 'X / Twitter' },
  { id: 'threads', name: 'Threads' },
];

export default function OnboardingBrandPage() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();

  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [color, setColor] = useState('#16A34A');
  const [avatarUrl, setAvatarUrl] = useState<string>('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['instagram']);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const togglePlatform = (pId: string) => {
    if (selectedPlatforms.includes(pId)) {
      if (selectedPlatforms.length > 1) {
        setSelectedPlatforms(selectedPlatforms.filter((p) => p !== pId));
      }
    } else {
      setSelectedPlatforms([...selectedPlatforms, pId]);
    }
  };

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (!supabase || !user) {
        // Fallback demo mode
        router.push('/app');
        return;
      }

      const cleanHandle = handle.replace(/^@/, '').trim();

      const newBrand = {
        owner_id: user.id,
        name: name.trim(),
        handle: cleanHandle || null,
        color: color,
        platforms: selectedPlatforms,
        avatar_url: avatarUrl,
        logo_url: avatarUrl,
        require_approval: false,
        is_archived: false,
      };

      const { data, error } = await (supabase.from('brands' as any) as any)
        .insert(newBrand)
        .select()
        .maybeSingle();

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      // Berhasil membuat brand pertama -> langsung masuk ke Beranda
      router.push('/app');
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal membuat brand.');
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="uda-card" style={{ maxWidth: 520, width: '100%', padding: 36, boxShadow: '0 12px 35px rgba(0,0,0,0.06)' }}>
        {/* Step Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div className="logo-symbol" style={{ width: 36, height: 36, fontSize: '1.1rem' }}>U</div>
          <span style={{ fontWeight: 800, fontSize: '1.15rem', color: '#0f172a' }}>UdaPlanner</span>
          <span style={{ marginLeft: 'auto', fontSize: '0.78rem', background: '#dcfce7', color: '#16a34a', padding: '3px 8px', borderRadius: 6, fontWeight: 700 }}>
            Langkah 1 dari 1
          </span>
        </div>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
            Buat Brand Pertama Anda 🎉
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: 1.5 }}>
            Satu brand mewakili satu akun bisnis atau media sosial yang ingin Anda kelola jadwal postingannya.
          </p>
        </div>

        {errorMessage && (
          <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#991b1b', fontSize: '0.84rem', marginBottom: 18 }}>
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleCreateBrand} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Foto / Logo Brand */}
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
              Foto / Logo Brand (Opsional)
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: 12,
                background: '#f8fafc',
                border: '1px dashed #cbd5e1',
                borderRadius: 10,
              }}
            >
              <div style={{ position: 'relative' }}>
                <img
                  src={avatarUrl}
                  alt="Preview Logo"
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: `2px solid ${color}`,
                  }}
                />
                {isUploadingPhoto && (
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
                )}
              </div>

              <div style={{ flex: 1 }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setIsUploadingPhoto(true);
                    try {
                      const url = await uploadBrandLogo(supabase, file, handle || 'onboarding');
                      setAvatarUrl(url);
                    } catch (err: any) {
                      setErrorMessage(err.message || 'Gagal memproses gambar');
                    } finally {
                      setIsUploadingPhoto(false);
                      if (e.target) e.target.value = '';
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn-uda btn-uda-secondary btn-uda-sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Upload size={13} />
                  <span>{isUploadingPhoto ? 'Memproses...' : 'Pilih Foto / Logo'}</span>
                </button>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4 }}>
                  PNG, JPG, atau WebP (Maks. 5 MB)
                </div>
              </div>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
              Nama Brand / Akun Sosmed *
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Contoh: Kopi Senja Nusantara"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.9rem', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
              Username / Handle (Opsional)
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: 11, color: '#94a3b8', fontWeight: 600 }}>@</span>
              <input
                type="text"
                placeholder="kopisenja.id"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                style={{ width: '100%', padding: '10px 14px 10px 32px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.9rem', outline: 'none' }}
              />
            </div>
          </div>

          {/* Platform Pilihan */}
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
              Platform Media Sosial Utama
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PLATFORMS.map((p) => {
                const isSelected = selectedPlatforms.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePlatform(p.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 20,
                      border: `1px solid ${isSelected ? '#16a34a' : '#cbd5e1'}`,
                      background: isSelected ? '#f0fdf4' : '#ffffff',
                      color: isSelected ? '#16a34a' : '#475569',
                      fontSize: '0.82rem',
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    {isSelected && <Check size={13} />}
                    <span>{p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pilihan Warna Brand */}
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
              Warna Pembeda Brand di Kalender
            </label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {BRAND_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    backgroundColor: c,
                    border: color === c ? '3px solid #0f172a' : '2px solid transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    transition: 'transform 0.15s',
                    transform: color === c ? 'scale(1.15)' : 'scale(1)',
                  }}
                >
                  {color === c && <Check size={15} />}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-uda btn-uda-primary"
            style={{
              marginTop: 10,
              height: 46,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Menyiapkan Brand Anda...</span>
              </>
            ) : (
              <>
                <span>Mulai Rencanakan Konten</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
