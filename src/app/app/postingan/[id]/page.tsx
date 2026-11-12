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
  Sparkles,
  ArrowLeft,
  Trash2,
  UploadCloud,
  Image as ImageIcon,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Layers,
  Plus,
  Building,
  Video as VideoIcon,
  Film,
} from 'lucide-react';
import { compressImageToBase64, compressVideoFast, isMediaVideo, toPlayableVideoUrl } from '@/lib/image-upload';
import { DUMMY_BRANDS, DUMMY_SNIPPETS, DummyPost, DummyBrand, DummySnippet } from '@/lib/dummy-data';
import { PLATFORMS, CONTENT_TYPES, POST_STATUSES } from '@/lib/platforms';
import { PostService } from '@/services/post.service';
import { BrandService } from '@/services/brand.service';
import { SnippetService } from '@/services/snippet.service';
import { useAuth } from '@/contexts/auth-context';
import { useModal } from '@/contexts/modal-context';
import { GuidedTour, TourStep } from '@/components/guided-tour';
import { addAppNotification } from '@/lib/notification-manager';

const MAX_CAROUSEL_IMAGES = 10;

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
    media_urls: [],
    aspect_ratio: '1:1',
    comments_count: 0,
  };

  const [post, setPost] = useState<DummyPost>(() => {
    if (!isNew && rawId) {
      const cached = PostService.getCachedPosts().find((p) => p.id === rawId);
      if (cached) return cached;
    }
    return defaultNewPost;
  });
  const [brands, setBrands] = useState<DummyBrand[]>(DUMMY_BRANDS);
  const [snippets, setSnippets] = useState<DummySnippet[]>(DUMMY_SNIPPETS);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionNote, setRevisionNote] = useState('');
  const [showBankSnippetModal, setShowBankSnippetModal] = useState(false);
  const [snippetTab, setSnippetTab] = useState<'all' | 'caption' | 'hashtag'>('all');
  const [isSaving, setIsSaving] = useState(false);
  const [savingProgress, setSavingProgress] = useState(0);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState<{
    isUploading: boolean;
    fileName: string;
    loadedBytes: number;
    totalBytes: number;
    percent: number;
    statusText: string;
  } | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [directBlobUrl, setDirectBlobUrl] = useState<string>('');
  const [videoPoster, setVideoPoster] = useState<string>('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const formatBytes = (bytes: number): string => {
    if (bytes <= 0) return '0 KB';
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const [userRole, setUserRole] = useState<'owner' | 'editor' | 'reviewer' | 'viewer' | null>('owner');
  const [isAccessDenied, setIsAccessDenied] = useState(false);
  const [isLoadingPost, setIsLoadingPost] = useState(false);
  const [isLoadingBrands, setIsLoadingBrands] = useState(true);

  const isReadOnly = userRole === 'viewer';
  const isVideoOrReels = post.content_type === 'video' || post.content_type === 'reels';
  const isCarouselMode = post.content_type === 'carousel';

  // Daftar media konten (mendukung single image, multi-image Carousel hingga 10 gambar, dan single video)
  const mediaList: string[] = React.useMemo(() => {
    let raw: string[] = [];
    if (Array.isArray(post.media_urls) && post.media_urls.length > 0) {
      raw = post.media_urls.filter((u) => typeof u === 'string' && u.trim().length > 0);
    } else if (post.media_url && post.media_url.trim().length > 0) {
      raw = [post.media_url.trim()];
    }

    // Jika tipe konten Video atau Reels, pastikan mediaList HANYA berisi 1 file video (bukan thumbnail ganda)
    if (isVideoOrReels) {
      if (raw.length === 0) return [];
      const videoItem = raw.find((u) => isMediaVideo(u, post.content_type)) || raw[0];
      return [videoItem];
    }

    return raw;
  }, [post.media_urls, post.media_url, isVideoOrReels, post.content_type]);

  const safeSlideIndex = mediaList.length > 0 ? Math.min(activeSlideIndex, mediaList.length - 1) : 0;
  const currentMedia = mediaList[safeSlideIndex] || '';
  const isCurrentVideo = isVideoOrReels || isMediaVideo(currentMedia, post.content_type);

  // Sumber URL video yang dapat diputar secara native (Streaming Blob URL)
  const playableVideoSrc = React.useMemo(() => {
    if (!isCurrentVideo) return '';
    if (directBlobUrl) return directBlobUrl;
    return toPlayableVideoUrl(currentMedia);
  }, [isCurrentVideo, directBlobUrl, currentMedia]);

  // Deteksi apakah pengguna merupakan anggota undangan tim
  const isTeamMember = React.useMemo(() => {
    if (userRole && ['editor', 'reviewer', 'viewer'].includes(userRole)) {
      return true;
    }
    if (account?.plan_code === 'team') {
      return true;
    }
    if (typeof window !== 'undefined') {
      try {
        const uId = user?.id;
        const uEmail = user?.email?.toLowerCase();

        if (uId && localStorage.getItem('uda_team_membership_' + uId)) {
          return true;
        }

        if (uId) {
          const sysRole = localStorage.getItem('uda_system_role_' + uId);
          if (sysRole && ['Editor', 'Reviewer', 'Viewer'].includes(sysRole)) {
            return true;
          }
        }

        const bId = post.brand_id;
        if (bId) {
          const rawM = localStorage.getItem('uda_brand_members_' + bId);
          if (rawM) {
            const mList = JSON.parse(rawM);
            const found = mList.find(
              (m: any) =>
                (uId && (m.id === uId || m.user_id === uId)) ||
                (uEmail && m.email?.toLowerCase() === uEmail)
            );
            if (found && found.role && found.role !== 'owner') {
              return true;
            }
          }
        }

        const rawInv = localStorage.getItem('uda_brand_invitations');
        if (rawInv) {
          const invList = JSON.parse(rawInv);
          const foundInv = invList.find(
            (inv: any) =>
              inv.status === 'accepted' &&
              ((uEmail && inv.target_email?.toLowerCase() === uEmail) ||
                (uId && inv.target_user_id === uId))
          );
          if (foundInv) return true;
        }
      } catch (err) {}
    }
    return false;
  }, [userRole, account?.plan_code, user?.id, user?.email, post.brand_id]);

  const isFreePlan = !account || account.plan_code === 'free';
  const isContentLocked = isFreePlan && !isTeamMember;

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
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);

    // 1. Validasi khusus Video & Reels: HANYA diperbolehkan format video
    if (isVideoOrReels) {
      const invalidFile = files.find((f) => !f.type.startsWith('video/'));
      if (invalidFile) {
        showError(
          'Format Tidak Didukung',
          `Tipe konten ${post.content_type === 'reels' ? 'Reels' : 'Video'} hanya memperbolehkan unggahan format video saja (MP4, WebM, atau MOV).`
        );
        if (e.target) e.target.value = '';
        return;
      }

      const file = files[0];
      const maxMb = isTeamMember || account?.plan_code === 'team' ? 50 : 30;
      if (file.size > maxMb * 1024 * 1024) {
        showError(
          'Ukuran Video Terlalu Besar',
          `Ukuran file video maksimal adalah ${maxMb} MB.`
        );
        if (e.target) e.target.value = '';
        return;
      }

      setIsUploadingImage(true);
      const totalBytes = file.size;

      setVideoUploadProgress({
        isUploading: true,
        fileName: file.name,
        loadedBytes: 0,
        totalBytes,
        percent: 0,
        statusText: 'Mempersiapkan unggahan video...',
      });

      let currentLoaded = 0;
      let targetLoaded = Math.min(totalBytes, Math.max(1024, Math.round(totalBytes * 0.12)));
      let targetPercent = 12;

      // Animasi bar berjalan yang halus dan responsif
      const progressTimer = setInterval(() => {
        if (targetLoaded > currentLoaded) {
          const diff = targetLoaded - currentLoaded;
          const step = Math.max(Math.round(totalBytes * 0.05), Math.round(diff * 0.3));
          currentLoaded = Math.min(targetLoaded, currentLoaded + step);
          const computedPct = Math.min(96, Math.max(targetPercent, Math.round((currentLoaded / totalBytes) * 100)));
          setVideoUploadProgress((prev) =>
            prev
              ? {
                  ...prev,
                  loadedBytes: currentLoaded,
                  percent: computedPct,
                  statusText:
                    computedPct < 45
                      ? 'Mengunggah file video...'
                      : computedPct < 85
                      ? 'Mengompresi video ke ukuran rendah & hemat...'
                      : 'Menyelesaikan pemrosesan video...',
                }
              : null
          );
        }
      }, 45);

      try {
        // Buat streaming Blob URL langsung dari file agar browser langsung memutar video secara native & lancar
        const nativeBlobUrl = URL.createObjectURL(file);
        setDirectBlobUrl(nativeBlobUrl);

        // Kompresi cepat & ekstraksi thumbnail poster instan dengan progress update
        const { videoUrl, thumbnailUrl } = await compressVideoFast(file, (loaded, total, percent) => {
          targetLoaded = Math.max(targetLoaded, loaded);
          targetPercent = Math.max(targetPercent, percent);
        });

        clearInterval(progressTimer);
        setVideoUploadProgress({
          isUploading: true,
          fileName: file.name,
          loadedBytes: totalBytes,
          totalBytes,
          percent: 100,
          statusText: 'Selesai! Video siap diputar.',
        });

        // Jeda singkat 350ms agar pengguna melihat bar 100% dan ukuran penuh
        await new Promise((r) => setTimeout(r, 350));

        setVideoPoster(thumbnailUrl);

        setPost((prev) => ({
          ...prev,
          media_url: videoUrl,
          media_urls: [videoUrl],
        }));
        setActiveSlideIndex(0);
        showSuccess(
          'Video Berhasil Diunggah!',
          `File video (${formatBytes(totalBytes)}) siap diputar pada pratinjau feed.`
        );
      } catch (err: any) {
        clearInterval(progressTimer);
        showError('Gagal Memproses Video', err.message || 'Terjadi kesalahan saat memproses video.');
      } finally {
        clearInterval(progressTimer);
        setVideoUploadProgress(null);
        setIsUploadingImage(false);
        if (e.target) e.target.value = '';
      }
      return;
    }

    // 2. Validasi Foto (Feed) dan Carousel: HANYA format gambar
    const invalidFile = files.find((f) => !f.type.startsWith('image/'));
    if (invalidFile) {
      showError('Format Tidak Didukung', 'Tipe konten Foto dan Carousel hanya memperbolehkan format gambar (JPG, PNG, atau WebP).');
      if (e.target) e.target.value = '';
      return;
    }

    const effectivePlanCode = isTeamMember ? 'team' : (account?.plan_code || 'free');
    const maxSingleFileMb = effectivePlanCode === 'free' ? 10 : 50;

    const oversizedFile = files.find((f) => f.size > maxSingleFileMb * 1024 * 1024);
    if (oversizedFile) {
      showError(
        'Ukuran Foto Terlalu Besar',
        `Ukuran tiap foto maksimal untuk Paket ${effectivePlanCode.toUpperCase()} adalah ${maxSingleFileMb} MB.`
      );
      if (e.target) e.target.value = '';
      return;
    }

    // Jika mode Carousel: bisa upload hingga maksimal 10 gambar (otomatis kompresi ringan)
    if (isCarouselMode) {
      const remainingSlots = MAX_CAROUSEL_IMAGES - mediaList.length;
      if (remainingSlots <= 0) {
        showError(
          'Batas Maksimal Carousel (10 Foto)',
          'Anda telah mencapai batas maksimal 10 foto untuk 1 postingan Carousel. Hapus salah satu slide jika ingin mengganti foto.'
        );
        if (e.target) e.target.value = '';
        return;
      }

      const filesToProcess = files.slice(0, remainingSlots);
      if (files.length > remainingSlots) {
        showToast(`⚠️ Maksimal 10 gambar untuk Carousel. ${filesToProcess.length} foto pertama berhasil ditambahkan.`);
      }

      setIsUploadingImage(true);
      try {
        const compressedBatch = await Promise.all(
          filesToProcess.map((file) => compressImageToBase64(file, 1200, 1200, 0.78))
        );
        const updatedUrls = [...mediaList, ...compressedBatch].slice(0, MAX_CAROUSEL_IMAGES);
        setPost((prev) => ({
          ...prev,
          media_urls: updatedUrls,
          media_url: updatedUrls[0] || '',
        }));
        setActiveSlideIndex(updatedUrls.length - 1);
        showSuccess(
          'Slide Carousel Berhasil Ditambahkan!',
          `${compressedBatch.length} foto otomatis terkompresi hemat ukuran (Total: ${updatedUrls.length}/${MAX_CAROUSEL_IMAGES} slide).`
        );
      } catch (err: any) {
        showError('Gagal Memproses Foto Carousel', err.message || 'Terjadi kesalahan saat memproses gambar.');
      } finally {
        setIsUploadingImage(false);
        if (e.target) e.target.value = '';
      }
      return;
    }

    // Mode Foto Tunggal (Feed): Kompres otomatis instan (100KB - 300KB)
    const file = files[0];
    setIsUploadingImage(true);
    try {
      const base64 = await compressImageToBase64(file, 1200, 1200, 0.78);
      setPost((prev) => ({
        ...prev,
        media_url: base64,
        media_urls: [base64],
      }));
      setActiveSlideIndex(0);
      showSuccess('Foto Berhasil Diunggah!', 'Foto konten berhasil dikompresi otomatis dan disinkronkan ke pratinjau feed.');
    } catch (err: any) {
      showError('Gagal Memproses Foto', err.message || 'Terjadi kesalahan saat memproses gambar.');
    } finally {
      setIsUploadingImage(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemoveImage = () => {
    if (directBlobUrl) {
      try {
        URL.revokeObjectURL(directBlobUrl);
      } catch {}
      setDirectBlobUrl('');
    }
    setVideoPoster('');
    setPost((prev) => ({ ...prev, media_url: '', media_urls: [] }));
    setActiveSlideIndex(0);
  };

  const handleRemoveSingleSlide = (idxToRemove: number) => {
    const nextUrls = mediaList.filter((_, i) => i !== idxToRemove);
    setPost((prev) => ({
      ...prev,
      media_urls: nextUrls,
      media_url: nextUrls[0] || '',
    }));
    setActiveSlideIndex((prevIdx) => Math.max(0, Math.min(prevIdx, nextUrls.length - 1)));
  };

  React.useEffect(() => {
    setIsLoadingBrands(true);
    BrandService.getBrands(user?.id)
      .then((bList) => {
        const validBrands = bList || [];
        setBrands(validBrands);
        if (validBrands.length > 0) {
          if (isNew) {
            const activeBrandId = typeof window !== 'undefined' ? localStorage.getItem('uda_active_brand_id') : null;
            const targetBrand = (activeBrandId && validBrands.find((b) => b.id === activeBrandId)) || validBrands[0];
            setPost((prev) => ({ ...prev, brand_id: targetBrand.id }));
            BrandService.getUserBrandRole(targetBrand.id, user?.id).then((r) => setUserRole(r || 'owner'));
          }
        }
        setIsLoadingBrands(false);
      })
      .catch(() => {
        setIsLoadingBrands(false);
      });

    SnippetService.getSnippets(undefined, undefined, user?.id).then((sList) => {
      if (sList && sList.length > 0) setSnippets(sList);
    });

    if (!isNew && rawId) {
      const cached = PostService.getCachedPosts().find((p) => p.id === rawId);
      if (!cached) {
        setIsLoadingPost(true);
      }
      PostService.getPostById(rawId, user?.id).then(async (existingPost) => {
        if (!existingPost) {
          if (!cached) setIsAccessDenied(true);
        } else {
          setPost(existingPost);
          const r = await BrandService.getUserBrandRole(existingPost.brand_id, user?.id);
          setUserRole(r || 'owner');
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

  const primaryPlatform = post.platforms[0] || 'instagram';
  const maxCaption = PLATFORMS[primaryPlatform]?.maxCaptionLength || 2200;
  const isOverLimit = post.caption.length > maxCaption;
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSavePost = async () => {
    if (brands.length === 0) {
      showError(
        'Belum Memiliki Brand',
        'Anda harus membuat atau memilih akun brand terlebih dahulu sebelum dapat menyimpan postingan.'
      );
      router.push('/app/brand');
      return;
    }

    if (!post.title.trim()) {
      showError('Judul Wajib Diisi', 'Silakan masukkan judul postingan sebelum menyimpannya ke database.');
      return;
    }

    if (isContentLocked && (post.content_type === 'video' || post.content_type === 'reels')) {
      showError(
        'Tipe Konten Terkunci',
        'Tipe konten Video dan Reels hanya tersedia untuk pelanggan paket Pro, Tim, atau anggota tim kolaborator brand. Silakan upgrade paket langganan Anda terlebih dahulu.'
      );
      return;
    }

    const targetBrandId = (post.brand_id && brands.some((b) => b.id === post.brand_id))
      ? post.brand_id
      : (brands[0]?.id || post.brand_id || 'brand-1');

    const finalMediaUrls = isCarouselMode
      ? mediaList.slice(0, MAX_CAROUSEL_IMAGES)
      : mediaList.length > 0
      ? [mediaList[0]]
      : [];
    const finalPayload: DummyPost = {
      ...post,
      brand_id: targetBrandId,
      media_urls: finalMediaUrls,
      media_url: finalMediaUrls[0] || '',
    };

    setIsSaving(true);
    setSavingProgress(15);

    let currentProg = 15;
    const saveProgressTimer = setInterval(() => {
      currentProg = Math.min(92, currentProg + Math.floor(Math.random() * 8) + 6);
      setSavingProgress(currentProg);
    }, 65);

    try {
      if (isNew) {
        const created = await PostService.createPost({
          ...finalPayload,
          user_id: user?.id,
        });
        clearInterval(saveProgressTimer);
        setSavingProgress(100);
        await new Promise((r) => setTimeout(r, 280));
        setPost(created);
        showSuccess(
          'Postingan Berhasil Dibuat!',
          `Postingan "${created.title}" telah berhasil disimpan ke database dan tersinkron ke Kalender & Grid Instagram.`,
          () => {
            router.push(`/app/postingan/${created.id}`);
          }
        );
      } else {
        const updated = await PostService.updatePost(post.id, finalPayload);
        clearInterval(saveProgressTimer);
        setSavingProgress(100);
        await new Promise((r) => setTimeout(r, 280));
        if (updated) {
          setPost(updated);
        }
        showSuccess(
          'Perubahan Berhasil Disimpan!',
          `Semua perubahan pada postingan "${post.title}" telah tersinkron dan diperbarui di database serta Grid Instagram.`
        );
      }
    } catch (err: any) {
      clearInterval(saveProgressTimer);
      console.error('Error in handleSavePost:', err);
      showError('Gagal Menyimpan Postingan', err.message || 'Terjadi kesalahan sistem, silakan coba lagi.');
    } finally {
      clearInterval(saveProgressTimer);
      setIsSaving(false);
      setSavingProgress(0);
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

  const handleCopyCaptionAndHashtags = () => {
    const combined = `${post.caption}\n\n${post.hashtags}`.trim();
    navigator.clipboard.writeText(combined);
    showToast('📋 Caption dan hashtag berhasil disalin ke clipboard!');
  };

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

  const handleShareToWhatsApp = () => {
    const sDate = safeDate(post.scheduled_at);
    const text = encodeURIComponent(
      `*Jadwal Konten UdaPlanner*\n\nJudul: ${post.title}\nBrand: ${brand.name}\nJadwal: ${sDate ? sDate.toLocaleString('id-ID') : 'Draft (Belum Dijadwalkan)'}\n\nCaption:\n${post.caption}\n\n${post.hashtags}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

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
      description: 'Tentukan judul internal, pilih akun brand bisnis, tipe format konten (Feed, Carousel hingga 10 gambar, Reels, Story), serta jadwalkan tanggal dan jam tayang.',
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
      description: 'Lihat simulasi visual postingan persis seperti saat tampil di feed media sosial Anda (termasuk geser slide Carousel) sebelum benar-benar dipublikasikan.',
      placement: 'left',
    },
    {
      targetId: 'tour-editor-actions',
      title: 'Aksi Cepat "Saat Posting"',
      description: 'Salin caption dan hashtag dengan 1-klik, tambahkan ke Google Calendar, unduh file .ics, atau bagikan langsung ke WhatsApp.',
      placement: 'top',
    },
  ];

  if (isLoadingPost || isLoadingBrands) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 10, color: '#64748b' }}>
        <Loader2 className="animate-spin" size={24} style={{ color: '#16a34a' }} />
        <span style={{ fontWeight: 600 }}>Memuat formulir postingan...</span>
      </div>
    );
  }

  // Guard: Hanya izinkan buat / kelola postingan jika pengguna sudah memiliki brand
  if (!isLoadingBrands && brands.length === 0) {
    return (
      <div
        className="uda-card"
        style={{
          maxWidth: 540,
          margin: '60px auto',
          padding: '42px 32px',
          textAlign: 'center',
          borderRadius: 18,
          border: '3px solid #0f172a',
          boxShadow: '6px 6px 0px #0f172a',
          backgroundColor: '#ffffff',
        }}
      >
        <div
          style={{
            width: 68,
            height: 68,
            borderRadius: '50%',
            background: '#f0fdf4',
            border: '2.5px solid #16a34a',
            color: '#16a34a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px',
            boxShadow: '0 8px 20px rgba(22, 163, 74, 0.18)',
          }}
        >
          <Building size={34} />
        </div>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', marginBottom: 10 }}>
          Belum Memiliki Akun Brand
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 24 }}>
          Untuk dapat membuat dan menjadwalkan postingan konten, Anda harus memiliki akun brand media sosial terlebih dahulu. Silakan tambahkan brand pertama Anda di menu Brand.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-uda btn-uda-secondary"
            onClick={() => router.push('/app')}
          >
            Kembali ke Beranda
          </button>
          <button
            type="button"
            className="btn-uda btn-uda-primary"
            onClick={() => router.push('/app/brand')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={16} />
            <span>Buat Brand Sekarang</span>
          </button>
        </div>
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
      <GuidedTour steps={postinganTourSteps} tourKey="uda_tour_postingan" />

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
          <button className="btn-uda btn-uda-secondary btn-uda-sm" onClick={() => router.push('/app/daftar')}>
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
              style={{
                position: 'relative',
                overflow: 'hidden',
                minWidth: 155,
                justifyContent: 'center',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                opacity: isSaving ? 0.96 : 1,
              }}
            >
              {isSaving ? (
                <>
                  {/* Background Bar Berjalan */}
                  <div
                    className="uda-video-progress-bar"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      bottom: 0,
                      width: `${savingProgress}%`,
                      backgroundColor: '#15803d',
                      backgroundImage:
                        'linear-gradient(45deg, rgba(255,255,255,0.25) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.25) 75%, transparent 75%, transparent)',
                      backgroundSize: '20px 20px',
                      transition: 'width 0.15s ease-out',
                      zIndex: 1,
                    }}
                  />
                  {/* Garis Progress di Bawah Tombol */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 3,
                      backgroundColor: 'rgba(0,0,0,0.25)',
                      zIndex: 2,
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${savingProgress}%`,
                        backgroundColor: '#facc15',
                        transition: 'width 0.15s ease-out',
                      }}
                    />
                  </div>
                  {/* Teks Progres */}
                  <span style={{ position: 'relative', zIndex: 3, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Menyimpan... {savingProgress}%</span>
                  </span>
                </>
              ) : (
                <span>{isNew ? 'Buat Postingan' : 'Simpan Perubahan'}</span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 2-Kolom Layout Responsif */}
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
                  if (isContentLocked && (val === 'video' || val === 'reels')) {
                    showError(
                      'Tipe Konten Terkunci',
                      'Tipe konten Video dan Reels hanya tersedia untuk pelanggan paket Pro, Tim, atau anggota tim kolaborator brand. Silakan upgrade paket langganan Anda untuk membuka fitur ini.'
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
                  const isLocked = isContentLocked && (t.id === 'video' || t.id === 'reels');
                  return (
                    <option key={t.id} value={t.id} disabled={isLocked}>
                      {t.name} {isLocked ? '🔒 (Khusus Pro/Tim)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Centang Platform Publikasi */}
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
                          if (newPlts.length === 0) newPlts = [plt];
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

          {/* Kolom Unggah Foto / Media Konten (Mendukung Multi-Upload Carousel Maks 10 Gambar) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                  {isCarouselMode
                    ? 'Unggah Foto Carousel (Maks. 10 Gambar)'
                    : isVideoOrReels
                    ? (post.content_type === 'reels' ? 'Unggah Video Reels' : 'Unggah Video Konten')
                    : 'Unggah Foto Konten'}
                </label>
                {isCarouselMode && (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 999,
                      background: mediaList.length >= MAX_CAROUSEL_IMAGES ? '#fee2e2' : '#dcfce7',
                      color: mediaList.length >= MAX_CAROUSEL_IMAGES ? '#dc2626' : '#15803d',
                      border: '1px solid currentColor',
                    }}
                  >
                    {mediaList.length} / {MAX_CAROUSEL_IMAGES} Slide
                  </span>
                )}
              </div>

              {!isReadOnly && mediaList.length > 0 && (
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
                  <span>{isCarouselMode ? 'Hapus Semua Slide' : (isVideoOrReels ? 'Hapus Video' : 'Hapus Foto')}</span>
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept={isVideoOrReels ? 'video/mp4,video/webm,video/quicktime,video/*' : 'image/jpeg,image/png,image/webp,image/*'}
              multiple={isCarouselMode}
              style={{ display: 'none' }}
              onChange={handleImageChange}
            />

            {isCarouselMode ? (
              /* Tampilan Upload & Galeri Slide untuk Tipe Konten Carousel */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {mediaList.length > 0 && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(74px, 1fr))',
                      gap: 8,
                      padding: 10,
                      background: '#f8fafc',
                      borderRadius: 10,
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    {mediaList.map((imgUrl, idx) => {
                      const isActive = idx === safeSlideIndex;
                      return (
                        <div
                          key={idx}
                          onClick={() => setActiveSlideIndex(idx)}
                          style={{
                            position: 'relative',
                            aspectRatio: '1 / 1',
                            borderRadius: 8,
                            overflow: 'hidden',
                            border: isActive ? '2.5px solid #16a34a' : '1.5px solid #cbd5e1',
                            boxShadow: isActive ? '0 0 0 2px rgba(22, 163, 74, 0.2)' : 'none',
                            cursor: 'pointer',
                            background: '#0f172a',
                          }}
                          title={`Klik untuk melihat Slide ${idx + 1} di Pratinjau`}
                        >
                          {isMediaVideo(imgUrl) ? (
                            <video
                              src={imgUrl}
                              muted
                              playsInline
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <img
                              src={imgUrl}
                              alt={`Slide ${idx + 1}`}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          )}
                          <span
                            style={{
                              position: 'absolute',
                              bottom: 4,
                              left: 4,
                              background: 'rgba(15, 23, 42, 0.85)',
                              color: '#ffffff',
                              fontSize: '0.62rem',
                              fontWeight: 800,
                              padding: '1px 5px',
                              borderRadius: 4,
                            }}
                          >
                            #{idx + 1}
                          </span>
                          {!isReadOnly && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveSingleSlide(idx);
                              }}
                              style={{
                                position: 'absolute',
                                top: 3,
                                right: 3,
                                width: 20,
                                height: 20,
                                borderRadius: '50%',
                                background: 'rgba(220, 38, 38, 0.92)',
                                color: '#ffffff',
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                padding: 0,
                              }}
                              title={`Hapus Slide ${idx + 1}`}
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      );
                    })}

                    {/* Tombol Tambah Slide jika masih < 10 */}
                    {!isReadOnly && mediaList.length < MAX_CAROUSEL_IMAGES && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingImage}
                        style={{
                          aspectRatio: '1 / 1',
                          borderRadius: 8,
                          border: '2px dashed #16a34a',
                          background: '#f0fdf4',
                          color: '#15803d',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 2,
                          cursor: 'pointer',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                        }}
                      >
                        <Plus size={18} />
                        <span>Tambah</span>
                      </button>
                    )}
                  </div>
                )}

                {(!isReadOnly && mediaList.length < MAX_CAROUSEL_IMAGES) && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: '2px dashed #cbd5e1',
                      borderRadius: 10,
                      padding: mediaList.length > 0 ? '14px 16px' : '20px 16px',
                      backgroundColor: '#f8fafc',
                      cursor: 'pointer',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#16a34a';
                      e.currentTarget.style.backgroundColor = '#f0fdf4';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#cbd5e1';
                      e.currentTarget.style.backgroundColor = '#f8fafc';
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: '#dcfce7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#15803d',
                      }}
                    >
                      <Layers size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>
                        {isUploadingImage
                          ? 'Sedang Memproses Foto Carousel...'
                          : mediaList.length > 0
                          ? `Klik untuk Tambah Foto Slide Baru (${mediaList.length}/${MAX_CAROUSEL_IMAGES})`
                          : 'Klik untuk Pilih Beberapa Foto Sekaligus (Maks. 10 Gambar)'}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 2 }}>
                        Anda dapat memilih lebih dari 1 foto sekaligus untuk diunggah ke slide Carousel
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : videoUploadProgress?.isUploading ? (
              <div
                style={{
                  border: '2px solid #0f172a',
                  borderRadius: 12,
                  padding: '20px 18px',
                  backgroundColor: '#ffffff',
                  boxShadow: '4px 4px 0px #0f172a',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                {/* Header: Nama File & Badge Tipe Konten */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: '#f0fdf4',
                        border: '2px solid #16a34a',
                        color: '#16a34a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {post.content_type === 'reels' ? <Film size={20} /> : <VideoIcon size={20} />}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '0.88rem',
                          fontWeight: 800,
                          color: '#0f172a',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: 240,
                        }}
                        title={videoUploadProgress.fileName}
                      >
                        {videoUploadProgress.fileName}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 1 }}>
                        {post.content_type === 'reels' ? 'Video Reels (Instagram)' : 'Video Konten (Feed)'}
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      padding: '4px 9px',
                      borderRadius: 6,
                      background: videoUploadProgress.percent >= 100 ? '#dcfce7' : '#f0fdf4',
                      color: '#16a34a',
                      border: '1.5px solid #16a34a',
                      flexShrink: 0,
                    }}
                  >
                    {videoUploadProgress.percent >= 100 ? 'Selesai' : 'Sedang Mengunggah...'}
                  </span>
                </div>

                {/* Progress Bar Berjalan dengan Animasi Garis */}
                <div
                  style={{
                    width: '100%',
                    height: 18,
                    backgroundColor: '#e2e8f0',
                    borderRadius: 999,
                    border: '2px solid #0f172a',
                    overflow: 'hidden',
                    position: 'relative',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)',
                  }}
                >
                  <div
                    className="uda-video-progress-bar"
                    style={{
                      width: `${videoUploadProgress.percent}%`,
                      height: '100%',
                      backgroundColor: '#16a34a',
                      backgroundImage:
                        'linear-gradient(45deg, rgba(255,255,255,0.25) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.25) 75%, transparent 75%, transparent)',
                      backgroundSize: '24px 24px',
                      transition: 'width 0.12s ease-out',
                      borderRadius: 999,
                    }}
                  />
                </div>

                {/* Detail Ukuran KB/MB dan Persentase Berjalan */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.80rem',
                    fontWeight: 700,
                    color: '#334155',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Loader2 size={14} className="animate-spin" style={{ color: '#16a34a' }} />
                    <span>
                      <strong style={{ color: '#0f172a' }}>{formatBytes(videoUploadProgress.loadedBytes)}</strong> / {formatBytes(videoUploadProgress.totalBytes)}
                    </span>
                  </div>
                  <div style={{ color: '#16a34a', fontWeight: 800, fontSize: '0.85rem' }}>
                    {videoUploadProgress.percent}%
                  </div>
                </div>

                <div style={{ fontSize: '0.74rem', color: '#64748b', textAlign: 'center' }}>
                  {videoUploadProgress.statusText}
                </div>
              </div>
            ) : mediaList.length > 0 ? (
              <div className="post-editor-media-preview-card">
                <div className="post-editor-media-preview-left">
                  <div className="post-editor-media-thumb">
                    {isMediaVideo(mediaList[0], post.content_type) ? (
                      <video
                        src={playableVideoSrc || mediaList[0]}
                        poster={videoPoster || undefined}
                        muted
                        playsInline
                        preload="metadata"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <img
                        src={mediaList[0]}
                        alt="Foto Konten"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    )}
                  </div>
                  <div className="post-editor-media-info">
                    <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>
                      {isVideoOrReels
                        ? (post.content_type === 'reels' ? 'Video Reels Terpasang' : 'Video Konten Terpasang')
                        : 'Foto Konten Terpasang'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <CheckCircle2 size={13} />
                      <span>{post.content_type === 'reels' ? 'Tersinkron langsung ke Pratinjau Reels' : 'Tersinkron langsung ke Pratinjau Feed'}</span>
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
                    <span>{isUploadingImage ? 'Mengompres...' : (isVideoOrReels ? 'Ganti Video' : 'Ganti Foto')}</span>
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
                      ? (isVideoOrReels ? 'Belum ada video yang diunggah' : 'Belum ada foto yang diunggah')
                      : isUploadingImage
                      ? (isVideoOrReels ? 'Sedang Memproses & Mengompres Video...' : 'Sedang Memproses & Mengompres Foto...')
                      : (isVideoOrReels ? (post.content_type === 'reels' ? 'Klik untuk Unggah Video Reels' : 'Klik untuk Unggah Video Konten') : 'Klik untuk Unggah Foto Konten')}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
                    {isVideoOrReels
                      ? 'Format Video saja: MP4, WebM, MOV (Otomatis dikompresi cepat & ringan)'
                      : 'Format Gambar saja: JPG, PNG, WebP (Otomatis dikompresi cepat & ringan)'}
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
          {/* Pratinjau Sosmed (Feed Mockup dengan Slider Carousel Interaktif) */}
          <div id="tour-editor-preview" className="uda-card post-editor-card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Pratinjau Feed Media Sosial
              </h3>
              {isCarouselMode && !isVideoOrReels && mediaList.length > 1 && (
                <span
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    color: '#15803d',
                    background: '#dcfce7',
                    padding: '2px 8px',
                    borderRadius: 999,
                  }}
                >
                  Slide {safeSlideIndex + 1} dari {mediaList.length}
                </span>
              )}
            </div>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', background: '#ffffff' }}>
              {/* Header Feed */}
              <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <img
                    src={brand.avatar_url}
                    alt=""
                    style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>@{brand.handle}</div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                      {isCarouselMode
                        ? 'Postingan Carousel'
                        : isVideoOrReels
                        ? (post.content_type === 'reels' ? 'Postingan Reels' : 'Postingan Video')
                        : 'Postingan Terjadwal'}
                    </div>
                  </div>
                </div>
                {isCarouselMode && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      color: '#0f172a',
                      background: '#f1f5f9',
                      padding: '3px 8px',
                      borderRadius: 6,
                    }}
                  >
                    <Layers size={12} />
                    <span>Carousel</span>
                  </span>
                )}
              </div>

              {/* Gambar / Video Feed Tersinkron + Navigasi Geser Slide Carousel */}
              <div
                className="post-editor-feed-img-wrap"
                style={{
                  position: 'relative',
                  aspectRatio: post.content_type === 'reels' ? '9 / 16' : '1 / 1',
                  background: isCurrentVideo ? '#000000' : '#f8fafc',
                  overflow: 'hidden',
                }}
              >
                {mediaList.length > 0 ? (
                  <>
                    {isCurrentVideo ? (
                      <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <video
                          key={playableVideoSrc || currentMedia}
                          src={playableVideoSrc || currentMedia}
                          poster={videoPoster || undefined}
                          controls
                          playsInline
                          preload="auto"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            backgroundColor: '#000000',
                          }}
                        />
                      </div>
                    ) : (
                      <img
                        src={currentMedia}
                        alt={`Pratinjau Slide ${safeSlideIndex + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity 0.2s ease' }}
                      />
                    )}

                    {/* Badge Counter Slide di Pojok Kanan Atas (Khusus Carousel) */}
                    {isCarouselMode && !isVideoOrReels && mediaList.length > 1 && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 10,
                          right: 10,
                          background: 'rgba(15, 23, 42, 0.78)',
                          color: '#ffffff',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          padding: '4px 10px',
                          borderRadius: 999,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          backdropFilter: 'blur(4px)',
                        }}
                      >
                        <Layers size={12} />
                        <span>{safeSlideIndex + 1}/{mediaList.length}</span>
                      </div>
                    )}

                    {/* Tombol Geser Kiri & Kanan jika ada > 1 gambar (Khusus Carousel) */}
                    {isCarouselMode && !isVideoOrReels && mediaList.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveSlideIndex((prev) => (prev > 0 ? prev - 1 : mediaList.length - 1));
                          }}
                          style={{
                            position: 'absolute',
                            left: 10,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.92)',
                            color: '#0f172a',
                            border: '1.5px solid #0f172a',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            zIndex: 5,
                          }}
                          title="Slide Sebelumnya"
                        >
                          <ChevronLeft size={18} />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveSlideIndex((prev) => (prev < mediaList.length - 1 ? prev + 1 : 0));
                          }}
                          style={{
                            position: 'absolute',
                            right: 10,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.92)',
                            color: '#0f172a',
                            border: '1.5px solid #0f172a',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            zIndex: 5,
                          }}
                          title="Slide Berikutnya"
                        >
                          <ChevronRight size={18} />
                        </button>

                        {/* Indikator Titik (Dots) Slide Carousel di Bawah Gambar */}
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 10,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            background: 'rgba(15, 23, 42, 0.6)',
                            padding: '5px 10px',
                            borderRadius: 999,
                            backdropFilter: 'blur(4px)',
                          }}
                        >
                          {mediaList.map((_, dotIdx) => (
                            <button
                              key={dotIdx}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveSlideIndex(dotIdx);
                              }}
                              style={{
                                width: dotIdx === safeSlideIndex ? 16 : 7,
                                height: 7,
                                borderRadius: 999,
                                background: dotIdx === safeSlideIndex ? '#22c55e' : 'rgba(255,255,255,0.65)',
                                border: 'none',
                                padding: 0,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                              }}
                              title={`Ke Slide ${dotIdx + 1}`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </>
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
                    {!isReadOnly && (
                      <span style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: 700 }}>
                        {isCarouselMode ? 'Klik untuk unggah hingga 10 foto Carousel' : 'Klik untuk unggah foto'}
                      </span>
                    )}
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
                      disabled={isNew}
                      title={isNew ? 'Postingan harus dibuat terlebih dahulu sebelum mengajukan review' : 'Minta review'}
                      onClick={() => {
                        if (isNew) return;
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
                      disabled={isNew || userRole === 'editor'}
                      title={
                        isNew
                          ? 'Postingan harus dibuat terlebih dahulu sebelum disetujui'
                          : userRole === 'editor'
                          ? 'Hanya Reviewer atau Owner yang dapat menyetujui postingan'
                          : 'Setujui postingan'
                      }
                      onClick={() => {
                        if (isNew) return;
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
                      disabled={isNew || userRole === 'editor'}
                      title={
                        isNew
                          ? 'Postingan harus dibuat terlebih dahulu sebelum meminta revisi'
                          : userRole === 'editor'
                          ? 'Hanya Reviewer atau Owner yang dapat meminta revisi'
                          : 'Minta revisi'
                      }
                      onClick={() => {
                        if (isNew) return;
                        setShowRevisionModal(true);
                      }}
                    >
                      Minta Revisi
                    </button>
                  </div>
                )}

                <button
                  className="btn-uda btn-uda-primary"
                  style={{
                    width: '100%',
                    marginTop: 4,
                    justifyContent: 'center',
                    opacity: isNew || (userRole === 'editor' && brand.require_approval && post.status !== 'siap') ? 0.55 : 1,
                    cursor: isNew || (userRole === 'editor' && brand.require_approval && post.status !== 'siap') ? 'not-allowed' : 'pointer',
                  }}
                  disabled={isNew || (userRole === 'editor' && brand.require_approval && post.status !== 'siap')}
                  title={
                    isNew
                      ? 'Postingan harus dibuat dan disimpan terlebih dahulu sebelum menandai sudah tayang'
                      : userRole === 'editor' && brand.require_approval && post.status !== 'siap'
                      ? 'Postingan harus disetujui Reviewer/Owner terlebih dahulu'
                      : 'Tandai postingan sudah tayang'
                  }
                  onClick={() => {
                    if (isNew) {
                      showToast('⚠️ Silakan buat dan simpan postingan terlebih dahulu.');
                      return;
                    }
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

                {isNew && (
                  <p style={{ fontSize: '0.78rem', color: '#64748b', textAlign: 'center', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                    💡 Tombol ini akan aktif setelah postingan berhasil dibuat &amp; disimpan.
                  </p>
                )}
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

      {/* Tombol Simpan/Buat Cepat untuk Mobile */}
      {!isReadOnly && (
        <div className="post-editor-mobile-bottom-submit">
          <button
            className="btn-uda btn-uda-primary"
            onClick={handleSavePost}
            disabled={isSaving}
            style={{
              width: '100%',
              padding: '12px 18px',
              fontSize: '0.95rem',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.96 : 1,
            }}
          >
            {isSaving ? (
              <>
                <div
                  className="uda-video-progress-bar"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    width: `${savingProgress}%`,
                    backgroundColor: '#15803d',
                    backgroundImage:
                      'linear-gradient(45deg, rgba(255,255,255,0.25) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.25) 75%, transparent 75%, transparent)',
                    backgroundSize: '20px 20px',
                    transition: 'width 0.15s ease-out',
                    zIndex: 1,
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 4,
                    backgroundColor: 'rgba(0,0,0,0.25)',
                    zIndex: 2,
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${savingProgress}%`,
                      backgroundColor: '#facc15',
                      transition: 'width 0.15s ease-out',
                    }}
                  />
                </div>
                <span style={{ position: 'relative', zIndex: 3, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Menyimpan Postingan... {savingProgress}%</span>
                </span>
              </>
            ) : (
              <span>{isNew ? 'Buat Postingan Sekarang' : 'Simpan Perubahan'}</span>
            )}
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
