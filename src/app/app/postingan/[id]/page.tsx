'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Copy,
  Download,
  Calendar as CalendarIcon,
  Share2,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Sparkles,
  ArrowLeft,
  Trash2,
  FileCheck,
  UploadCloud,
  Image as ImageIcon,
  X,
  Loader2,
} from 'lucide-react';
import { compressImageToBase64 } from '@/lib/image-upload';
import { DUMMY_POSTS, DUMMY_BRANDS, DUMMY_PILLARS, DUMMY_MEMBERS, DUMMY_SNIPPETS, DummyPost, DummyBrand, DummySnippet } from '@/lib/dummy-data';
import { PLATFORMS, CONTENT_TYPES, POST_STATUSES } from '@/lib/platforms';
import { PostService } from '@/services/post.service';
import { BrandService } from '@/services/brand.service';
import { SnippetService } from '@/services/snippet.service';
import { useAuth } from '@/contexts/auth-context';
import { useModal } from '@/contexts/modal-context';
import { GuidedTour, TourStep } from '@/components/guided-tour';
import { addAppNotification } from '@/lib/notification-manager';

export default function PostEditorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, account } = useAuth();
  const { confirmDelete, showSuccess, showError } = useModal();
  const rawId = params?.id as string;
  const isNew = !rawId || rawId === 'baru';

  const defaultNewPost: DummyPost = {
    id: `post-${Date.now()}`,
    brand_id: DUMMY_BRANDS[0]?.id || 'brand-1',
    title: '',
    caption: '',
    hashtags: '',
    platforms: ['instagram'],
    content_type: 'feed',
    status: 'draft',
    scheduled_at: null,
    pillar_id: null,
    assignee_id: null,
    notes: null,
    posted_at: null,
    posted_url: null,
    media_url: '',
    aspect_ratio: '1:1',
    comments_count: 0,
  };

  const [post, setPost] = useState<DummyPost>(defaultNewPost);
  const [brands, setBrands] = useState<DummyBrand[]>(DUMMY_BRANDS);
  const [snippets, setSnippets] = useState<DummySnippet[]>(DUMMY_SNIPPETS);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionNote, setRevisionNote] = useState('');
  const [showBankSnippetModal, setShowBankSnippetModal] = useState(false);
  const [snippetTab, setSnippetTab] = useState<'all' | 'caption' | 'hashtag'>('all');
  const [showPostedUrlModal, setShowPostedUrlModal] = useState(false);
  const [postedUrlInput, setPostedUrlInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const safeDate = (dateVal?: string | null): Date | null => {
    if (!dateVal) return null;
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? null : d;
  };

  const toDateTimeLocalString = (isoOrDateStr: string | null | undefined): string => {
    const d = safeDate(isoOrDateStr);
    if (!d) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    const YYYY = d.getFullYear();
    const MM = pad(d.getMonth() + 1);
    const DD = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    return `${YYYY}-${MM}-${DD}T${hh}:${mm}`;
  };

  const parseFromDateTimeLocal = (val: string): string | null => {
    if (!val || !val.trim()) return null;
    const d = safeDate(val);
    return d ? d.toISOString() : null;
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showError('Format Tidak Didukung', 'Harap unggah file foto dengan format gambar (JPG, PNG, atau WebP).');
      return;
    }

    const planCode = account?.plan_code || 'free';
    const maxSingleFileMb = planCode === 'free' ? 10 : 50;

    if (file.size > maxSingleFileMb * 1024 * 1024) {
      showError(
        'Ukuran Foto Terlalu Besar',
        `Ukuran foto maksimal untuk Paket ${planCode.toUpperCase()} adalah ${maxSingleFileMb} MB.`
      );
      return;
    }

    // Hitung total penggunaan storage saat ini dari seluruh postingan
    try {
      const allPosts = await PostService.getPosts({}, user?.id);
      const currentUsedMb = (allPosts || []).reduce((acc, p) => {
        if (p.id !== post.id && p.media_url) {
          const bytes = p.media_url.startsWith('data:')
            ? Math.round(p.media_url.length * 0.75)
            : 3 * 1024 * 1024;
          return acc + bytes / (1024 * 1024);
        }
        return acc;
      }, 0);

      const newFileMb = file.size / (1024 * 1024);
      const maxStorageMb = planCode === 'team' ? 20480 : planCode === 'pro' ? 5120 : 200;

      if (currentUsedMb + newFileMb > maxStorageMb) {
        if (planCode === 'free') {
          showError(
            'Kapasitas Penyimpanan Penuh (Batas 200 MB)',
            `Akun Paket Gratis dibatasi total penyimpanan 200 MB (saat ini terpakai ${currentUsedMb.toFixed(1)} MB). Jika ingin tetap mengunggah postingan baru, Anda harus menghapus postingan lama yang sudah tidak dipakai lagi atau tingkatkan paket ke Pro / Tim.`
          );
        } else {
          showError(
            'Kapasitas Penyimpanan Penuh',
            `Batas penyimpanan untuk Paket ${planCode.toUpperCase()} (${maxStorageMb >= 1024 ? maxStorageMb / 1024 + ' GB' : maxStorageMb + ' MB'}) telah tercapai. Silakan hapus media atau postingan yang tidak digunakan lagi.`
          );
        }
        return;
      }
    } catch (quotaErr) {
      console.warn('Storage quota check notice:', quotaErr);
    }

    setIsUploadingImage(true);
    try {
      const base64 = await compressImageToBase64(file, 800, 800, 0.8);
      setPost((prev) => ({ ...prev, media_url: base64 }));
      showSuccess('Foto Berhasil Diunggah!', 'Foto konten telah diperbarui dan langsung disinkronkan ke pratinjau feed.');
    } catch (err: any) {
      showError('Gagal Memproses Foto', err.message || 'Terjadi kesalahan saat memproses gambar.');
    } finally {
      setIsUploadingImage(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemoveImage = () => {
    setPost((prev) => ({ ...prev, media_url: '' }));
  };

  const [userRole, setUserRole] = useState<'owner' | 'editor' | 'reviewer' | 'viewer' | null>(null);
  const [isAccessDenied, setIsAccessDenied] = useState(false);
  const [isLoadingPost, setIsLoadingPost] = useState(!isNew);

  const isReadOnly = userRole === 'viewer';

  React.useEffect(() => {
    BrandService.getBrands(user?.id).then((bList) => {
      if (bList && bList.length > 0) {
        setBrands(bList);
        if (isNew) {
          setPost((prev) => ({ ...prev, brand_id: bList[0].id }));
          BrandService.getUserBrandRole(bList[0].id, user?.id).then((r) => setUserRole(r));
        }
      }
    });

    SnippetService.getSnippets(undefined, undefined, user?.id).then((sList) => {
      if (sList && sList.length > 0) setSnippets(sList);
    });

    if (!isNew && rawId) {
      setIsLoadingPost(true);
      PostService.getPostById(rawId, user?.id).then(async (existingPost) => {
        if (!existingPost) {
          setIsAccessDenied(true);
        } else {
          setPost(existingPost);
          const r = await BrandService.getUserBrandRole(existingPost.brand_id, user?.id);
          setUserRole(r);
        }
        setIsLoadingPost(false);
      });
    }
  }, [rawId, isNew, user?.id]);

  const fallbackBrand: DummyBrand = {
    id: post.brand_id || 'no-brand',
    owner_id: user?.id || '',
    name: 'Pilih Brand',
    handle: 'brand',
    platforms: ['instagram'],
    color: '#16a34a',
    avatar_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
    require_approval: false,
    is_archived: false,
    post_count_this_month: 0,
  };
  const brand = brands.find((b) => b.id === post.brand_id) || brands[0] || fallbackBrand;
  const statusMeta =
    (post?.status && POST_STATUSES[post.status]) ||
    POST_STATUSES.ide || {
      label: 'Draft',
      bg: '#f1f5f9',
      text: '#475569',
    };

  // Character limit validation
  const primaryPlatform = post.platforms[0] || 'instagram';
  const maxCaption = PLATFORMS[primaryPlatform]?.maxCaptionLength || 2200;
  const isOverLimit = post.caption.length > maxCaption;
  const isFreePlan = !account || account.plan_code === 'free';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSavePost = async () => {
    if (!post.title.trim()) {
      showError('Judul Wajib Diisi', 'Silakan masukkan judul postingan sebelum menyimpannya ke database.');
      return;
    }

    if (isFreePlan && (post.content_type === 'video' || post.content_type === 'reels')) {
      showError(
        'Tipe Konten Terkunci',
        'Tipe konten Video dan Reels hanya tersedia untuk pelanggan paket Pro dan Tim. Silakan upgrade paket langganan Anda terlebih dahulu.'
      );
      return;
    }

    setIsSaving(true);
    try {
      if (isNew) {
        const created = await PostService.createPost({
          ...post,
          user_id: user?.id,
        });
        setPost(created);
        showSuccess(
          'Postingan Berhasil Dibuat!',
          `Postingan "${created.title}" telah berhasil disimpan ke database dan tersinkron.`,
          () => {
            router.push(`/app/postingan/${created.id}`);
          }
        );
      } else {
        const updated = await PostService.updatePost(post.id, post);
        if (updated) {
          setPost(updated);
        }
        showSuccess(
          'Perubahan Berhasil Disimpan!',
          `Semua perubahan pada postingan "${post.title}" telah tersinkron dan diperbarui di database.`
        );
      }
    } catch (err: any) {
      console.error('Error in handleSavePost:', err);
      showError('Gagal Menyimpan Postingan', err.message || 'Terjadi kesalahan sistem, silakan coba lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePost = () => {
    confirmDelete({
      title: 'Hapus Postingan Ini?',
      message: `Apakah Anda yakin ingin menghapus "${post.title || 'postingan ini'}"? Postingan akan dihapus secara permanen dari sistem.`,
      onConfirm: async () => {
        await PostService.deletePost(post.id);
        showSuccess('Postingan Berhasil Dihapus', 'Postingan telah dihapus dari sistem.', () => {
          router.push('/app/daftar');
        });
      },
    });
  };

  // 1-Click Copy Caption + Hashtag
  const handleCopyCaptionAndHashtags = () => {
    const combined = `${post.caption}\n\n${post.hashtags}`.trim();
    navigator.clipboard.writeText(combined);
    showToast('📋 Caption dan hashtag berhasil disalin ke clipboard!');
  };

  // Google Calendar Link generator
  const handleAddToGoogleCalendar = () => {
    const title = encodeURIComponent(post.title);
    const details = encodeURIComponent(
      `Brand: ${brand.name}\nPlatform: ${post.platforms.join(', ')}\n\nCaption:\n${post.caption}\n\n${post.hashtags}`
    );
    const sDate = safeDate(post.scheduled_at) || new Date();
    const startTime = sDate.toISOString().replace(/-|:|\.\d\d\d/g, '');
    const endTime = new Date(sDate.getTime() + 30 * 60000).toISOString().replace(/-|:|\.\d\d\d/g, '');

    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startTime}/${endTime}&details=${details}`;
    window.open(gcalUrl, '_blank');
  };

  // Download .ics file
  const handleDownloadICS = () => {
    const sDate = safeDate(post.scheduled_at);
    const dtStart = sDate ? sDate.toISOString().replace(/-|:|\.\d\d\d/g, '') : '';
    const dtEnd = sDate ? new Date(sDate.getTime() + 30 * 60000).toISOString().replace(/-|:|\.\d\d\d/g, '') : '';

    const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//UdaCoding//UdaPlanner//ID
BEGIN:VEVENT
SUMMARY:${post.title}
DESCRIPTION:${post.caption.replace(/\n/g, '\\n')}
DTSTART:${dtStart}
DTEND:${dtEnd}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${post.title.replace(/\s+/g, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('📅 File .ics kalender berhasil diunduh!');
  };

  // Bagikan ke WhatsApp
  const handleShareToWhatsApp = () => {
    const sDate = safeDate(post.scheduled_at);
    const text = encodeURIComponent(
      `*Jadwal Konten UdaPlanner*\n\nJudul: ${post.title}\nBrand: ${brand.name}\nJadwal: ${sDate ? sDate.toLocaleString('id-ID') : 'Draft (Belum Dijadwalkan)'}\n\nCaption:\n${post.caption}\n\n${post.hashtags}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  // Langkah Panduan Interaktif Editor Postingan
  const postinganTourSteps: TourStep[] = [
    {
      targetId: 'tour-editor-header',
      title: 'Editor Detail Postingan',
      description: 'Kelola informasi konten, periksa status postingan saat ini, dan simpan postingan Anda ke kalender.',
      placement: 'bottom',
    },
    {
      targetId: 'tour-editor-form',
      title: 'Formulir Konten & Jadwal',
      description: 'Tentukan judul internal, pilih akun brand bisnis, tipe format konten (Feed, Carousel, Reels, Story), serta jadwalkan tanggal dan jam tayang.',
      placement: 'right',
    },
    {
      targetId: 'tour-editor-caption',
      title: 'Caption & Hashtag Cerdas',
      description: 'Tulis caption dengan indikator batas karakter real-time dan sisipkan kumpulan hashtag otomatis dari Bank Konten.',
      placement: 'top',
    },
    {
      targetId: 'tour-editor-preview',
      title: 'Pratinjau Visual Sosmed',
      description: 'Lihat simulasi visual postingan persis seperti saat tampil di feed media sosial Anda sebelum benar-benar dipublikasikan.',
      placement: 'left',
    },
    {
      targetId: 'tour-editor-actions',
      title: 'Aksi Cepat "Saat Posting"',
      description: 'Salin caption dan hashtag dengan 1-klik, tambahkan ke Google Calendar, unduh file .ics, atau bagikan langsung ke WhatsApp.',
      placement: 'top',
    },
  ];

  if (isLoadingPost) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 10, color: '#64748b' }}>
        <Loader2 className="animate-spin" size={24} style={{ color: '#16a34a' }} />
        <span style={{ fontWeight: 600 }}>Memverifikasi hak akses postingan...</span>
      </div>
    );
  }

  if (isAccessDenied) {
    return (
      <div className="uda-card" style={{ maxWidth: 540, margin: '60px auto', padding: '40px 32px', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <AlertCircle size={32} />
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
          Akses Ditolak
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: 24 }}>
          Anda tidak memiliki izin untuk melihat atau mengedit postingan ini. Postingan ini dimiliki oleh akun/brand lain dan Anda tidak terdaftar sebagai anggota tim kolaborator brand tersebut.
        </p>
        <button className="btn-uda btn-uda-primary" onClick={() => router.push('/app/daftar')}>
          Kembali ke Daftar Postingan
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* GUIDED TOUR POSTINGAN */}
      <GuidedTour steps={postinganTourSteps} tourKey="uda_tour_postingan" />

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
            zIndex: 9999,
            fontSize: '0.88rem',
            fontWeight: 600,
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Banner Khusus Mode Viewer */}
      {isReadOnly && (
        <div
          style={{
            padding: '12px 18px',
            background: '#eff6ff',
            border: '1.5px solid #bfdbfe',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            color: '#1e40af',
            fontSize: '0.86rem',
            fontWeight: 600,
          }}
        >
          <span style={{ fontSize: '1.3rem' }}>👁️</span>
          <span>
            <strong>Mode Lihat Saja (Viewer):</strong> Anda terdaftar sebagai Viewer pada brand ini. Anda dapat meninjau detail dan pratinjau feed, namun tidak memiliki izin untuk mengedit atau menghapus konten.
          </span>
        </div>
      )}

      {/* Top Action Bar Responsif */}
      <div id="tour-editor-header" className="post-editor-top-bar">
        <div className="post-editor-top-left">
          <button className="btn-uda btn-uda-secondary btn-uda-sm" onClick={() => router.back()}>
            <ArrowLeft size={16} />
            <span>Kembali</span>
          </button>
          <div className="post-editor-meta-pills">
            {userRole && (
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '3px 9px',
                  borderRadius: 999,
                  background: userRole === 'owner' ? '#dcfce7' : userRole === 'reviewer' ? '#e0e7ff' : userRole === 'editor' ? '#fef3c7' : '#f1f5f9',
                  color: userRole === 'owner' ? '#15803d' : userRole === 'reviewer' ? '#4338ca' : userRole === 'editor' ? '#92400e' : '#475569',
                  border: '1px solid currentColor',
                  textTransform: 'uppercase',
                }}
              >
                Peran: {userRole}
              </span>
            )}

            <span className="status-pill" style={{ background: statusMeta.bg, color: statusMeta.text }}>
              Status: {statusMeta.label}
            </span>
          </div>
        </div>

        <div className="post-editor-top-actions">
          {!isNew && (userRole === 'owner' || userRole === 'reviewer') && (
            <button className="btn-uda btn-uda-danger btn-uda-sm" onClick={handleDeletePost} title="Hapus Postingan">
              <Trash2 size={15} />
              <span>Hapus</span>
            </button>
          )}

          {!isReadOnly && (
            <button
              className="btn-uda btn-uda-primary btn-uda-sm post-editor-btn-submit"
              onClick={handleSavePost}
              disabled={isSaving}
            >
              {isSaving ? 'Menyimpan...' : isNew ? 'Buat Postingan' : 'Simpan Perubahan'}
            </button>
          )}
        </div>
      </div>

      {/* 2-Kolom Layout Responsif (Desktop 2-Kolom, Mobile/Tablet 1-Kolom) */}
      <div className="post-editor-layout-grid">
        {/* KOLOM KIRI: FORM EDITOR */}
        <div id="tour-editor-form" className="uda-card post-editor-card" style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%', boxSizing: 'border-box' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Form Editor Konten</h2>

          {/* Judul Internal */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Judul Internal *</label>
            <input
              type="text"
              value={post.title}
              disabled={isReadOnly}
              onChange={(e) => setPost({ ...post, title: e.target.value })}
              style={{
                padding: '9px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                fontSize: '0.9rem',
                outline: 'none',
                backgroundColor: isReadOnly ? '#f8fafc' : '#ffffff',
                cursor: isReadOnly ? 'not-allowed' : 'text',
              }}
            />
          </div>

          {/* Brand & Jenis Konten */}
          <div className="post-editor-grid-2col">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Brand</label>
              <select
                className="brand-dropdown-select"
                value={post.brand_id}
                disabled={isReadOnly || !isNew}
                onChange={async (e) => {
                  const bId = e.target.value;
                  setPost({ ...post, brand_id: bId });
                  const r = await BrandService.getUserBrandRole(bId, user?.id);
                  setUserRole(r);
                }}
                style={{
                  backgroundColor: isReadOnly || !isNew ? '#f8fafc' : '#ffffff',
                  cursor: isReadOnly || !isNew ? 'not-allowed' : 'pointer',
                }}
              >
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Tipe Konten</label>
              <select
                className="brand-dropdown-select"
                value={post.content_type}
                disabled={isReadOnly}
                onChange={(e) => {
                  const val = e.target.value as any;
                  if (isFreePlan && (val === 'video' || val === 'reels')) {
                    showError(
                      'Tipe Konten Terkunci',
                      'Tipe konten Video dan Reels hanya tersedia untuk pelanggan paket Pro dan Tim. Silakan upgrade paket langganan Anda untuk membuka fitur ini.'
                    );
                    return;
                  }
                  setPost({ ...post, content_type: val });
                }}
                style={{
                  backgroundColor: isReadOnly ? '#f8fafc' : '#ffffff',
                  cursor: isReadOnly ? 'not-allowed' : 'pointer',
                }}
              >
                {CONTENT_TYPES.map((t) => {
                  const isLocked = isFreePlan && (t.id === 'video' || t.id === 'reels');
                  return (
                    <option key={t.id} value={t.id} disabled={isLocked}>
                      {t.name} {isLocked ? '🔒 (Khusus Pro/Tim)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Centang Platform Publikasi (Berdasarkan Platform Brand) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                Platform Publikasi ({brand.name})
              </label>
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                {post.platforms.length} platform dipilih
              </span>
            </div>
            <div className="post-editor-platform-list">
              {(brand.platforms && brand.platforms.length > 0 ? brand.platforms : ['instagram', 'tiktok']).map((plt) => {
                const isChecked = post.platforms.includes(plt);
                const platformMeta = PLATFORMS[plt];
                return (
                  <label
                    key={plt}
                    className="post-editor-platform-item"
                    style={{
                      border: `1.5px solid ${isChecked ? '#16a34a' : '#cbd5e1'}`,
                      backgroundColor: isChecked ? '#f0fdf4' : '#ffffff',
                      cursor: isReadOnly ? 'not-allowed' : 'pointer',
                      color: isChecked ? '#15803d' : '#475569',
                      opacity: isReadOnly ? 0.75 : 1,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isReadOnly}
                      onChange={(e) => {
                        if (isReadOnly) return;
                        let newPlts = [...post.platforms];
                        if (e.target.checked) {
                          if (!newPlts.includes(plt)) newPlts.push(plt);
                        } else {
                          newPlts = newPlts.filter((p) => p !== plt);
                          if (newPlts.length === 0) newPlts = [plt]; // minimal 1
                        }
                        setPost({ ...post, platforms: newPlts });
                      }}
                      style={{ accentColor: '#16a34a', cursor: isReadOnly ? 'not-allowed' : 'pointer' }}
                    />
                    <span style={{ textTransform: 'capitalize' }}>
                      {platformMeta?.name || plt}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Jadwal Tanggal & Jam */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Jadwal Tayang</label>
            <input
              type="datetime-local"
              value={toDateTimeLocalString(post.scheduled_at)}
              disabled={isReadOnly}
              onChange={(e) => setPost({ ...post, scheduled_at: parseFromDateTimeLocal(e.target.value) })}
              style={{
                padding: '9px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                fontSize: '0.9rem',
                outline: 'none',
                backgroundColor: isReadOnly ? '#f8fafc' : '#ffffff',
                cursor: isReadOnly ? 'not-allowed' : 'text',
              }}
            />
          </div>

          {/* Kolom Unggah Foto / Media Konten */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Unggah Foto / Media Konten</label>
              {!isReadOnly && post.media_url && (
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#dc2626',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Trash2 size={13} />
                  <span>Hapus Foto</span>
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageChange}
            />

            {post.media_url ? (
              <div className="post-editor-media-preview-card">
                <div className="post-editor-media-preview-left">
                  <div className="post-editor-media-thumb">
                    <img
                      src={post.media_url}
                      alt="Foto Konten"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <div className="post-editor-media-info">
                    <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>
                      Foto Konten Terpasang
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <CheckCircle2 size={13} />
                      <span>Tersinkron langsung ke Pratinjau Feed</span>
                    </div>
                  </div>
                </div>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage}
                    className="btn-uda btn-uda-secondary btn-uda-sm post-editor-media-btn"
                    style={{ flexShrink: 0 }}
                  >
                    <UploadCloud size={14} />
                    <span>{isUploadingImage ? 'Mengunggah...' : 'Ganti Foto'}</span>
                  </button>
                )}
              </div>
            ) : (
              <div
                onClick={() => {
                  if (!isReadOnly) fileInputRef.current?.click();
                }}
                style={{
                  border: '2px dashed #cbd5e1',
                  borderRadius: 10,
                  padding: '20px 16px',
                  backgroundColor: '#f8fafc',
                  cursor: isReadOnly ? 'default' : 'pointer',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'all 0.15s ease',
                  opacity: isReadOnly ? 0.7 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isReadOnly) {
                    e.currentTarget.style.borderColor = '#16a34a';
                    e.currentTarget.style.backgroundColor = '#f0fdf4';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isReadOnly) {
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                  }
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0f172a',
                  }}
                >
                  <UploadCloud size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                    {isReadOnly
                      ? 'Belum ada foto yang diunggah'
                      : isUploadingImage
                      ? 'Sedang Memproses Foto...'
                      : 'Klik untuk Unggah Foto Konten'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
                    Mendukung format JPG, PNG, atau WebP (Maksimal 10 MB)
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Caption dengan Tombol Sisipkan dari Bank & Penghitung Karakter */}
          <div id="tour-editor-caption" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="post-editor-caption-header">
              <div className="post-editor-caption-title-wrap">
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Caption Postingan</label>
                {!isReadOnly && (
                  <button
                    type="button"
                    className="btn-uda btn-uda-secondary btn-uda-sm"
                    onClick={() => setShowBankSnippetModal(true)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', fontSize: '0.78rem' }}
                  >
                    <Sparkles size={13} style={{ color: '#16a34a' }} />
                    <span>Bank Konten</span>
                  </button>
                )}
              </div>
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: isOverLimit ? '#dc2626' : '#64748b',
                }}
              >
                {post.caption.length} / {maxCaption} karakter
              </span>
            </div>
            <textarea
              rows={6}
              value={post.caption}
              readOnly={isReadOnly}
              onChange={(e) => setPost({ ...post, caption: e.target.value })}
              placeholder="Tulis caption postingan dan hashtag di sini..."
              style={{
                padding: '10px 12px',
                border: `1px solid ${isOverLimit ? '#dc2626' : '#e2e8f0'}`,
                borderRadius: 8,
                fontSize: '0.88rem',
                outline: 'none',
                lineHeight: 1.5,
                backgroundColor: isReadOnly ? '#f8fafc' : '#ffffff',
                cursor: isReadOnly ? 'not-allowed' : 'text',
              }}
            />
          </div>

          {/* Catatan Internal Penuh ke Bawah */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minHeight: 160 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Catatan Internal / Revisi</label>
            <textarea
              value={post.notes || ''}
              readOnly={isReadOnly}
              onChange={(e) => setPost({ ...post, notes: e.target.value })}
              placeholder="Catatan untuk tim atau penanggung jawab..."
              style={{
                flex: 1,
                width: '100%',
                minHeight: 140,
                padding: '12px 14px',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                fontSize: '0.88rem',
                outline: 'none',
                lineHeight: 1.5,
                resize: 'vertical',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                backgroundColor: isReadOnly ? '#f8fafc' : '#ffffff',
                cursor: isReadOnly ? 'not-allowed' : 'text',
              }}
            />
          </div>
        </div>

        {/* KOLOM KANAN: PRATINJAU SOSMED & KARTU AKSI */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Pratinjau Sosmed (Feed Mockup) */}
          <div id="tour-editor-preview" className="uda-card post-editor-card" style={{ padding: 18 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: 12, color: '#0f172a' }}>
              Pratinjau Feed Media Sosial
            </h3>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', background: '#ffffff' }}>
              {/* Header Feed */}
              <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #f1f5f9' }}>
                <img
                  src={brand.avatar_url}
                  alt=""
                  style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>@{brand.handle}</div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Postingan Terjadwal</div>
                </div>
              </div>

              {/* Gambar Feed Tersinkron */}
              <div
                className="post-editor-feed-img-wrap"
                style={{
                  aspectRatio: post.content_type === 'reels' || post.content_type === 'story' ? '9 / 16' : '1 / 1',
                }}
              >
                {post.media_url ? (
                  <img
                    src={post.media_url}
                    alt="Pratinjau Foto Feed"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    onClick={() => {
                      if (!isReadOnly) fileInputRef.current?.click();
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                      color: '#94a3b8',
                      padding: 24,
                      textAlign: 'center',
                      cursor: isReadOnly ? 'default' : 'pointer',
                    }}
                  >
                    <ImageIcon size={40} />
                    <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Belum ada foto yang diunggah</span>
                    {!isReadOnly && <span style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: 700 }}>Klik untuk unggah foto</span>}
                  </div>
                )}
              </div>

              {/* Caption */}
              <div style={{ padding: 12 }}>
                <div style={{ fontSize: '0.85rem', lineHeight: 1.4, color: '#0f172a', whiteSpace: 'pre-line' }}>
                  <strong>@{brand.handle}</strong> {post.caption ? post.caption.slice(0, 140) : 'Tulis caption postingan untuk melihat pratinjau feed...'}
                  {post.caption.length > 140 && <span style={{ color: '#64748b' }}> ...selengkapnya</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Kartu Status & Alur Persetujuan (Workflow) */}
          <div className="uda-card post-editor-card" style={{ padding: 18 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: 12, color: '#0f172a' }}>
              Alur Status & Persetujuan
            </h3>

            {isReadOnly ? (
              <div style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: 8, fontSize: '0.82rem', color: '#64748b', textAlign: 'center' }}>
                👁️ Mode Viewer: Anda hanya memiliki izin membaca status postingan.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {brand.require_approval && (
                  <div className="post-editor-workflow-buttons">
                    <button
                      className="btn-uda btn-uda-secondary btn-uda-sm"
                      style={{ flex: 1 }}
                      onClick={() => {
                        setPost({ ...post, status: 'review' });
                        addAppNotification({
                          type: 'review_request',
                          message: `Postingan "${post.title || 'Untitled'}" diajukan untuk review`,
                          link: `/app/postingan/${post.id}`,
                        });
                        showToast('📩 Pengajuan review telah dikirimkan ke Reviewer!');
                      }}
                    >
                      Minta Review
                    </button>
                    <button
                      className="btn-uda btn-uda-primary btn-uda-sm"
                      style={{ flex: 1 }}
                      disabled={userRole === 'editor'}
                      title={userRole === 'editor' ? 'Hanya Reviewer atau Owner yang dapat menyetujui postingan' : 'Setujui postingan'}
                      onClick={() => {
                        setPost({ ...post, status: 'siap' });
                        addAppNotification({
                          type: 'approved',
                          message: `Postingan "${post.title || 'Untitled'}" telah disetujui dan siap tayang!`,
                          link: `/app/postingan/${post.id}`,
                        });
                        showToast('✅ Postingan disetujui dan siap tayang!');
                      }}
                    >
                      Setujui (Approve)
                    </button>
                    <button
                      className="btn-uda btn-uda-danger btn-uda-sm"
                      style={{ flex: 1 }}
                      disabled={userRole === 'editor'}
                      title={userRole === 'editor' ? 'Hanya Reviewer atau Owner yang dapat meminta revisi' : 'Minta revisi'}
                      onClick={() => setShowRevisionModal(true)}
                    >
                      Minta Revisi
                    </button>
                  </div>
                )}

                <button
                  className="btn-uda btn-uda-primary"
                  style={{ width: '100%', marginTop: 4, justifyContent: 'center' }}
                  disabled={userRole === 'editor' && brand.require_approval && post.status !== 'siap'}
                  title={userRole === 'editor' && brand.require_approval && post.status !== 'siap' ? 'Postingan harus disetujui Reviewer/Owner terlebih dahulu' : 'Tandai postingan sudah tayang'}
                  onClick={() => {
                    setPost({ ...post, status: 'terposting', posted_at: new Date().toISOString() });
                    addAppNotification({
                      type: 'approved',
                      message: `Postingan "${post.title || 'Untitled'}" telah ditandai Sudah Tayang!`,
                      link: `/app/postingan/${post.id}`,
                    });
                    showToast('🎉 Selamat! Postingan telah ditandai Sudah Tayang.');
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>Tandai Sudah Posting</span>
                </button>
              </div>
            )}
          </div>

          {/* Kartu "Saat Posting" Sesuai PRD Bab 8 */}
          <div id="tour-editor-actions" className="uda-card post-editor-card" style={{ padding: 18 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: 12, color: '#0f172a' }}>
              Aksi Cepat "Saat Posting"
            </h3>

            <div className="post-editor-actions-list">
              <button
                className="btn-uda btn-uda-primary"
                onClick={handleCopyCaptionAndHashtags}
              >
                <Copy size={16} />
                <span>Salin Caption + Hashtag (1-Klik)</span>
              </button>

              <button
                className="btn-uda btn-uda-secondary"
                onClick={handleAddToGoogleCalendar}
              >
                <CalendarIcon size={16} />
                <span>Tambah ke Google Calendar</span>
              </button>

              <button
                className="btn-uda btn-uda-secondary"
                onClick={handleDownloadICS}
              >
                <Download size={16} />
                <span>Unduh File .ics Kalender</span>
              </button>

              <button
                className="btn-uda btn-uda-secondary"
                onClick={handleShareToWhatsApp}
              >
                <Share2 size={16} />
                <span>Bagikan Jadwal ke WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tombol Simpan/Buat Cepat untuk Mobile agar mudah dijangkau satu tangan */}
      {!isReadOnly && (
        <div className="post-editor-mobile-bottom-submit">
          <button
            className="btn-uda btn-uda-primary"
            onClick={handleSavePost}
            disabled={isSaving}
            style={{ width: '100%', padding: '12px 18px', fontSize: '0.95rem', justifyContent: 'center' }}
          >
            {isSaving ? 'Menyimpan...' : isNew ? '🚀 Buat Postingan Sekarang' : '💾 Simpan Perubahan'}
          </button>
        </div>
      )}

      {/* MODAL: MINTA REVISI */}
      {showRevisionModal && (
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
          <div className="uda-card post-editor-modal-card" style={{ maxWidth: 440, width: '100%', padding: 24, boxSizing: 'border-box' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 8, color: '#0f172a' }}>
              Catatan Minta Revisi
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 14 }}>
              Status akan dikembalikan ke Draft dan editor akan mendapatkan notifikasi.
            </p>

            <textarea
              rows={4}
              required
              value={revisionNote}
              onChange={(e) => setRevisionNote(e.target.value)}
              placeholder="Contoh: Tolak ukur audio dan penyesuaian font slide 2..."
              style={{
                width: '100%',
                padding: 10,
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                fontSize: '0.88rem',
                outline: 'none',
                marginBottom: 16,
                boxSizing: 'border-box',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn-uda btn-uda-secondary" onClick={() => setShowRevisionModal(false)}>
                Batal
              </button>
              <button
                className="btn-uda btn-uda-danger"
                onClick={() => {
                  setPost({ ...post, status: 'draft', notes: revisionNote });
                  setShowRevisionModal(false);
                  showToast('📝 Catatan revisi dikirimkan ke editor.');
                }}
              >
                Kirim Revisi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SISIPKAN DARI BANK KONTEN (DENGAN PEMISAHAN TAB TEMPLATE CAPTION & KUMPULAN HASHTAG) */}
      {showBankSnippetModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 16,
          }}
        >
          <div className="uda-card post-editor-modal-card" style={{ maxWidth: 540, width: '100%', maxHeight: '85vh', overflowY: 'auto', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={18} style={{ color: '#16a34a' }} />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Pilih dari Bank Konten</h3>
              </div>
              <button
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
                onClick={() => setShowBankSnippetModal(false)}
              >
                ✕
              </button>
            </div>

            {/* Filter Tabs: Semua, Template Caption, Kumpulan Hashtag */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, borderBottom: '1px solid #e2e8f0', paddingBottom: 10, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <button
                type="button"
                onClick={() => setSnippetTab('all')}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: snippetTab === 'all' ? '#0f172a' : '#f1f5f9',
                  color: snippetTab === 'all' ? '#ffffff' : '#475569',
                }}
              >
                Semua ({snippets.length})
              </button>
              <button
                type="button"
                onClick={() => setSnippetTab('caption')}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: snippetTab === 'caption' ? '#16a34a' : '#f1f5f9',
                  color: snippetTab === 'caption' ? '#ffffff' : '#475569',
                }}
              >
                Template Caption ({snippets.filter((s) => s.type === 'caption').length})
              </button>
              <button
                type="button"
                onClick={() => setSnippetTab('hashtag')}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: snippetTab === 'hashtag' ? '#2563eb' : '#f1f5f9',
                  color: snippetTab === 'hashtag' ? '#ffffff' : '#475569',
                }}
              >
                Kumpulan Hashtag ({snippets.filter((s) => s.type === 'hashtag').length})
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {snippets
                .filter((s) => snippetTab === 'all' || s.type === snippetTab)
                .map((snip) => (
                  <div
                    key={snip.id}
                    style={{
                      padding: 12,
                      borderRadius: 8,
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>{snip.title}</div>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          padding: '2px 8px',
                          borderRadius: 999,
                          fontWeight: 700,
                          background: snip.type === 'caption' ? '#dcfce7' : '#dbeafe',
                          color: snip.type === 'caption' ? '#15803d' : '#1d4ed8',
                        }}
                      >
                        {snip.type === 'caption' ? 'Template Caption' : 'Kumpulan Hashtag'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: 6, whiteSpace: 'pre-line' }}>
                      {snip.body}
                    </div>

                    <button
                      className="btn-uda btn-uda-primary btn-uda-sm"
                      style={{ marginTop: 10 }}
                      onClick={() => {
                        const newCaption = post.caption
                          ? `${post.caption}\n\n${snip.body}`.trim()
                          : snip.body;
                        setPost({ ...post, caption: newCaption });
                        setShowBankSnippetModal(false);
                        showToast(`✅ ${snip.title} berhasil disisipkan ke caption!`);
                      }}
                    >
                      Sisipkan ke Caption
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
