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
} from 'lucide-react';
import { DUMMY_POSTS, DUMMY_BRANDS, DUMMY_PILLARS, DUMMY_MEMBERS, DUMMY_SNIPPETS, DummyPost, DummyBrand, DummySnippet } from '@/lib/dummy-data';
import { PLATFORMS, CONTENT_TYPES, POST_STATUSES } from '@/lib/platforms';
import { PostService } from '@/services/post.service';
import { BrandService } from '@/services/brand.service';
import { SnippetService } from '@/services/snippet.service';
import { useAuth } from '@/contexts/auth-context';
import { useModal } from '@/contexts/modal-context';

export default function PostEditorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
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
    media_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600',
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
  const [showPostedUrlModal, setShowPostedUrlModal] = useState(false);
  const [postedUrlInput, setPostedUrlInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    BrandService.getBrands(user?.id).then((bList) => {
      if (bList && bList.length > 0) {
        setBrands(bList);
        if (isNew) {
          setPost((prev) => ({ ...prev, brand_id: bList[0].id }));
        }
      }
    });

    SnippetService.getSnippets().then((sList) => {
      if (sList && sList.length > 0) setSnippets(sList);
    });

    if (!isNew && rawId) {
      PostService.getPostById(rawId).then((existingPost) => {
        if (existingPost) setPost(existingPost);
      });
    }
  }, [rawId, isNew, user?.id]);

  const brand = brands.find((b) => b.id === post.brand_id) || brands[0] || DUMMY_BRANDS[0];
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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSavePost = async () => {
    if (!post.title.trim()) {
      showError('Judul Wajib Diisi', 'Silakan masukkan judul postingan sebelum menyimpannya ke database.');
      return;
    }

    setIsSaving(true);
    try {
      if (isNew) {
        const created = await PostService.createPost({
          ...post,
          user_id: user?.id,
        });
        showSuccess(
          'Postingan Berhasil Dibuat!',
          `Postingan "${created.title}" telah berhasil disimpan ke database.`,
          () => {
            router.push(`/app/postingan/${created.id}`);
          }
        );
      } else {
        await PostService.updatePost(post.id, post);
        showSuccess(
          'Perubahan Berhasil Disimpan!',
          `Semua perubahan pada postingan "${post.title}" telah diperbarui di database.`
        );
      }
    } catch (err: any) {
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
    const startTime = post.scheduled_at
      ? new Date(post.scheduled_at).toISOString().replace(/-|:|\.\d\d\d/g, '')
      : new Date().toISOString().replace(/-|:|\.\d\d\d/g, '');
    const endTime = post.scheduled_at
      ? new Date(new Date(post.scheduled_at).getTime() + 30 * 60000).toISOString().replace(/-|:|\.\d\d\d/g, '')
      : new Date(Date.now() + 30 * 60000).toISOString().replace(/-|:|\.\d\d\d/g, '');

    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startTime}/${endTime}&details=${details}`;
    window.open(gcalUrl, '_blank');
  };

  // Download .ics file
  const handleDownloadICS = () => {
    const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//UdaCoding//UdaPlanner//ID
BEGIN:VEVENT
SUMMARY:${post.title}
DESCRIPTION:${post.caption.replace(/\n/g, '\\n')}
DTSTART:${post.scheduled_at ? new Date(post.scheduled_at).toISOString().replace(/-|:|\.\d\d\d/g, '') : ''}
DTEND:${post.scheduled_at ? new Date(new Date(post.scheduled_at).getTime() + 30 * 60000).toISOString().replace(/-|:|\.\d\d\d/g, '') : ''}
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
    const text = encodeURIComponent(
      `*Jadwal Konten UdaPlanner*\n\nJudul: ${post.title}\nBrand: ${brand.name}\nJadwal: ${post.scheduled_at ? new Date(post.scheduled_at).toLocaleString('id-ID') : 'Draft'}\n\nCaption:\n${post.caption}\n\n${post.hashtags}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
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
            zIndex: 9999,
            fontSize: '0.88rem',
            fontWeight: 600,
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Top Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn-uda btn-uda-secondary btn-uda-sm" onClick={() => router.back()}>
          <ArrowLeft size={16} />
          <span>Kembali</span>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {!isNew && (
            <button className="btn-uda btn-uda-danger btn-uda-sm" onClick={handleDeletePost} title="Hapus Postingan">
              <Trash2 size={15} />
              <span>Hapus</span>
            </button>
          )}
          <span className="status-pill" style={{ background: statusMeta.bg, color: statusMeta.text }}>
            Status: {statusMeta.label}
          </span>
          <button
            className="btn-uda btn-uda-primary btn-uda-sm"
            onClick={handleSavePost}
            disabled={isSaving}
          >
            {isSaving ? 'Menyimpan...' : isNew ? 'Buat Postingan' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>

      {/* Desktop 2-Kolom Layout Sesuai PRD Bab 8 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(420px, 1.4fr) minmax(360px, 1fr)', gap: 24 }}>
        {/* KOLOM KIRI: FORM EDITOR */}
        <div className="uda-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Form Editor Konten</h2>

          {/* Judul Internal */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Judul Internal *</label>
            <input
              type="text"
              value={post.title}
              onChange={(e) => setPost({ ...post, title: e.target.value })}
              style={{
                padding: '9px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Brand & Jenis Konten */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Brand</label>
              <select
                className="brand-dropdown-select"
                value={post.brand_id}
                onChange={(e) => setPost({ ...post, brand_id: e.target.value })}
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
                onChange={(e) => setPost({ ...post, content_type: e.target.value as any })}
              >
                {CONTENT_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Jadwal Tanggal & Jam */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Jadwal Tayang</label>
            <input
              type="datetime-local"
              value={post.scheduled_at ? new Date(post.scheduled_at).toISOString().slice(0, 16) : ''}
              onChange={(e) => setPost({ ...post, scheduled_at: new Date(e.target.value).toISOString() })}
              style={{
                padding: '9px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Caption dengan Penghitung Karakter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Caption Postingan</label>
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
              onChange={(e) => setPost({ ...post, caption: e.target.value })}
              placeholder="Tulis caption postingan di sini..."
              style={{
                padding: '10px 12px',
                border: `1px solid ${isOverLimit ? '#dc2626' : '#e2e8f0'}`,
                borderRadius: 8,
                fontSize: '0.88rem',
                outline: 'none',
                lineHeight: 1.5,
              }}
            />
          </div>

          {/* Hashtags dengan Tombol "Sisipkan dari Bank" */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Kumpulan Hashtag</label>
              <button
                type="button"
                className="btn-uda btn-uda-secondary btn-uda-sm"
                onClick={() => setShowBankSnippetModal(true)}
              >
                <Sparkles size={13} style={{ color: '#16a34a' }} />
                <span>Sisipkan dari Bank</span>
              </button>
            </div>
            <input
              type="text"
              value={post.hashtags}
              onChange={(e) => setPost({ ...post, hashtags: e.target.value })}
              placeholder="#UdaCoding #NextJS #Supabase"
              style={{
                padding: '9px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                fontSize: '0.88rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Catatan Internal */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Catatan Internal / Revisi</label>
            <input
              type="text"
              value={post.notes || ''}
              onChange={(e) => setPost({ ...post, notes: e.target.value })}
              placeholder="Catatan untuk tim atau penanggung jawab..."
              style={{
                padding: '9px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                fontSize: '0.88rem',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* KOLOM KANAN: PRATINJAU SOSMED & KARTU AKSI */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Pratinjau Sosmed (Feed Mockup) */}
          <div className="uda-card" style={{ padding: 18 }}>
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

              {/* Gambar Feed */}
              <div style={{ aspectRatio: '1 / 1', background: '#f8fafc', overflow: 'hidden' }}>
                <img
                  src={post.media_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500'}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              {/* Caption & Hashtags */}
              <div style={{ padding: 12 }}>
                <div style={{ fontSize: '0.85rem', lineHeight: 1.4, color: '#0f172a' }}>
                  <strong>@{brand.handle}</strong> {post.caption.slice(0, 110)}
                  {post.caption.length > 110 && <span style={{ color: '#64748b' }}> ...selengkapnya</span>}
                </div>
                {post.hashtags && (
                  <div style={{ fontSize: '0.8rem', color: '#16a34a', marginTop: 6, fontWeight: 600 }}>
                    {post.hashtags}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Kartu Status & Alur Persetujuan (Workflow) */}
          <div className="uda-card" style={{ padding: 18 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: 12, color: '#0f172a' }}>
              Alur Status & Persetujuan
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {brand.require_approval && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn-uda btn-uda-secondary btn-uda-sm"
                    style={{ flex: 1 }}
                    onClick={() => {
                      setPost({ ...post, status: 'review' });
                      showToast('📩 Pengajuan review telah dikirimkan ke Reviewer!');
                    }}
                  >
                    Minta Review
                  </button>
                  <button
                    className="btn-uda btn-uda-primary btn-uda-sm"
                    style={{ flex: 1 }}
                    onClick={() => {
                      setPost({ ...post, status: 'siap' });
                      showToast('✅ Postingan disetujui dan siap tayang!');
                    }}
                  >
                    Setujui (Approve)
                  </button>
                  <button
                    className="btn-uda btn-uda-danger btn-uda-sm"
                    style={{ flex: 1 }}
                    onClick={() => setShowRevisionModal(true)}
                  >
                    Minta Revisi
                  </button>
                </div>
              )}

              <button
                className="btn-uda btn-uda-primary"
                style={{ width: '100%', marginTop: 4 }}
                onClick={() => {
                  setPost({ ...post, status: 'terposting', posted_at: new Date().toISOString() });
                  showToast('🎉 Selamat! Postingan telah ditandai Sudah Tayang.');
                }}
              >
                <CheckCircle2 size={16} />
                <span>Tandai Sudah Posting</span>
              </button>
            </div>
          </div>

          {/* Kartu "Saat Posting" Sesuai PRD Bab 8 */}
          <div className="uda-card" style={{ padding: 18 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: 12, color: '#0f172a' }}>
              Aksi Cepat "Saat Posting"
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                className="btn-uda btn-uda-primary"
                style={{ width: '100%', justifyContent: 'flex-start' }}
                onClick={handleCopyCaptionAndHashtags}
              >
                <Copy size={16} />
                <span>Salin Caption + Hashtag (1-Klik)</span>
              </button>

              <button
                className="btn-uda btn-uda-secondary"
                style={{ width: '100%', justifyContent: 'flex-start' }}
                onClick={handleAddToGoogleCalendar}
              >
                <CalendarIcon size={16} />
                <span>Tambah ke Google Calendar</span>
              </button>

              <button
                className="btn-uda btn-uda-secondary"
                style={{ width: '100%', justifyContent: 'flex-start' }}
                onClick={handleDownloadICS}
              >
                <Download size={16} />
                <span>Unduh File .ics Kalender</span>
              </button>

              <button
                className="btn-uda btn-uda-secondary"
                style={{ width: '100%', justifyContent: 'flex-start' }}
                onClick={handleShareToWhatsApp}
              >
                <Share2 size={16} />
                <span>Bagikan Jadwal ke WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      </div>

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
          <div className="uda-card" style={{ maxWidth: 440, width: '100%', padding: 24 }}>
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

      {/* MODAL: SISIPKAN DARI BANK KONTEN */}
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
            padding: 20,
          }}
        >
          <div className="uda-card" style={{ maxWidth: 520, width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Pilih dari Bank Konten</h3>
              <button
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}
                onClick={() => setShowBankSnippetModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {snippets.map((snip) => (
                <div
                  key={snip.id}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>{snip.title}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4, whiteSpace: 'pre-line' }}>
                    {snip.body}
                  </div>
                  <button
                    className="btn-uda btn-uda-primary btn-uda-sm"
                    style={{ marginTop: 8 }}
                    onClick={() => {
                      if (snip.type === 'hashtag') {
                        setPost({ ...post, hashtags: `${post.hashtags} ${snip.body}`.trim() });
                      } else {
                        setPost({ ...post, caption: `${post.caption}\n\n${snip.body}`.trim() });
                      }
                      setShowBankSnippetModal(false);
                      showToast(`✅ ${snip.title} berhasil disisipkan!`);
                    }}
                  >
                    Sisipkan ke Postingan
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
