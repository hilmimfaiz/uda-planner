import { createClient } from '@/lib/supabase/client';
import { DUMMY_POSTS, DummyPost } from '@/lib/dummy-data';
import { BrandService, isUuid, getStoredCustomBrands } from './brand.service';
import { saveMediaToCache, getMediaFromCache } from '@/lib/media-cache';

const STORAGE_KEY = 'uda_custom_posts';

const normalizePostMedia = (p: any): DummyPost => {
  const rawUrls: string[] = Array.isArray(p?.media_urls)
    ? p.media_urls.filter((u: any) => typeof u === 'string' && u.trim().length > 0)
    : [];
  const primaryUrl = p?.media_url && typeof p.media_url === 'string' && p.media_url.trim().length > 0
    ? p.media_url.trim()
    : rawUrls[0] || '';
  const finalUrls = rawUrls.length > 0 ? rawUrls : primaryUrl ? [primaryUrl] : [];
  return {
    ...p,
    media_url: finalUrls[0] || primaryUrl || '',
    media_urls: finalUrls,
    cover_url: typeof p?.cover_url === 'string' ? p.cover_url.trim() : (p?.cover_url || ''),
  };
};

const getStoredPosts = (): DummyPost[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return (Array.isArray(parsed) ? parsed : [])
      .filter((p: any) => p && !p.id?.startsWith('post-gen-') && !['post-1', 'post-2', 'post-3', 'post-4', 'post-5', 'post-6'].includes(p.id))
      .map(normalizePostMedia);
  } catch {
    return [];
  }
};

const saveStoredPosts = (posts: DummyPost[]) => {
  if (typeof window === 'undefined') return;
  const normalized = posts.map(normalizePostMedia);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch (quotaErr) {
    console.warn('LocalStorage quota warning. Trimming large video/image base64 to prevent storage crash:', quotaErr);
    try {
      const lightweight = normalized.map((p) => {
        if (p.media_url && p.media_url.startsWith('data:') && p.media_url.length > 80000) {
          saveMediaToCache('post_media_' + p.id, p.media_url);
        }
        const isBig = (u?: string) => typeof u === 'string' && u.startsWith('data:') && u.length > 80000;
        const cleanMediaUrl = isBig(p.media_url) ? '' : p.media_url;
        const cleanMediaUrls = (p.media_urls || []).map((u) => (isBig(u) ? '' : u)).filter(Boolean);
        return {
          ...p,
          media_url: cleanMediaUrl || cleanMediaUrls[0] || '',
          media_urls: cleanMediaUrls.length > 0 ? cleanMediaUrls : (cleanMediaUrl ? [cleanMediaUrl] : []),
        };
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lightweight));
    } catch (secondErr) {
      console.error('saveStoredPosts fatal fallback error:', secondErr);
    }
  }
};

let localPosts: DummyPost[] = [];

export interface PostFilterOptions {
  brandId?: string;
  pillarId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export class PostService {
  /**
   * Mengambil data postingan secara sinkron (instan) dari cache lokal
   * Terapkan Brand-Based Access Control: Hanya postingan dari brand yang dapat diakses pengguna (Owner & Anggota Tim)
   */
  static getCachedPosts(filters: PostFilterOptions = {}, userId?: string): DummyPost[] {
    let effectiveUserId = userId;
    if (typeof window !== 'undefined') {
      try {
        const rawAuth = localStorage.getItem('uda_auth_profile');
        if (rawAuth) {
          const parsed = JSON.parse(rawAuth);
          if (!effectiveUserId) effectiveUserId = parsed.id;
        }
        if (!effectiveUserId) {
          const rawUser = localStorage.getItem('uda_auth_user');
          if (rawUser) effectiveUserId = JSON.parse(rawUser)?.id;
        }
      } catch {}
    }

    const userBrands = BrandService.getCachedBrands(effectiveUserId);
    const accessibleBrandIds = new Set(userBrands.map((b) => b.id).filter(Boolean));

    // Jika pengguna tidak memiliki keterkaitan dengan brand apapun, jangan tampilkan postingan
    if (accessibleBrandIds.size === 0) {
      return [];
    }

    // Jika filter brand tertentu diminta, pastikan pengguna berhak mengakses brand tersebut
    if (filters.brandId && filters.brandId !== 'all') {
      if (!accessibleBrandIds.has(filters.brandId)) {
        return [];
      }
    }

    const stored = getStoredPosts();
    const storedIds = new Set(stored.map((s) => s.id));
    const combined = [
      ...stored,
      ...localPosts.filter((lp) => !storedIds.has(lp.id)),
    ];

    // Filter ketat: HANYA postingan yang memiliki brand_id dan brand_id nya ADA dalam accessibleBrandIds
    const accessiblePosts = combined.filter((p) => p.brand_id && accessibleBrandIds.has(p.brand_id));
    return this.filterPostsLocally(accessiblePosts, filters, accessibleBrandIds);
  }

  static async getPosts(filters: PostFilterOptions = {}, userId?: string): Promise<DummyPost[]> {
    const supabase = createClient();

    let effectiveUserId = userId;
    let currentUserEmail = '';

    if (typeof window !== 'undefined') {
      try {
        const rawAuth = localStorage.getItem('uda_auth_profile');
        if (rawAuth) {
          const parsed = JSON.parse(rawAuth);
          if (!effectiveUserId) effectiveUserId = parsed.id;
          currentUserEmail = parsed.email || '';
        }
        if (!effectiveUserId) {
          const rawUser = localStorage.getItem('uda_auth_user');
          if (rawUser) {
            const parsedU = JSON.parse(rawUser);
            effectiveUserId = parsedU.id;
            if (!currentUserEmail && parsedU.email) currentUserEmail = parsedU.email;
          }
        }
      } catch {}
    }

    if (supabase && (!effectiveUserId || !isUuid(effectiveUserId))) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) effectiveUserId = user.id;
        if (user?.email) currentUserEmail = user.email;
      } catch {}
    }

    // Dapatkan seluruh brand yang dimiliki atau diikuti pengguna dalam tim (Owner, Editor, Reviewer, Viewer)
    let userBrands = await BrandService.getBrands(effectiveUserId);
    if (!userBrands || userBrands.length === 0) {
      userBrands = BrandService.getCachedBrands(effectiveUserId);
    }
    const accessibleBrandIds = new Set(userBrands.map((b) => b.id).filter(Boolean));

    // ATURAN VISIBILITAS KETAT:
    // Pengguna yang tidak tergabung dalam brand atau tim tidak boleh melihat postingan apapun
    if (accessibleBrandIds.size === 0) {
      return [];
    }

    // Jika filter brand diminta tapi user tidak memiliki akses ke brand tersebut, tolak akses
    if (filters.brandId && filters.brandId !== 'all') {
      if (!accessibleBrandIds.has(filters.brandId)) {
        return [];
      }
    }

    const allStored = getStoredPosts();
    // Hanya ambil postingan yang terhubung dengan brand yang dapat diakses pengguna
    const stored = allStored.filter((p) => p.brand_id && accessibleBrandIds.has(p.brand_id));

    // Sinkronisasi dari API Server (/api/posts) yang menggunakan Admin Client
    // untuk memastikan seluruh postingan dari Owner & Editor pada brand terkait dapat diakses seluruh tim
    if (typeof window !== 'undefined' && effectiveUserId) {
      try {
        let apiUrl = `/api/posts?userId=${effectiveUserId}`;
        if (filters.brandId && filters.brandId !== 'all') apiUrl += `&brandId=${filters.brandId}`;
        if (filters.status && filters.status !== 'all') apiUrl += `&status=${filters.status}`;
        if (filters.search) apiUrl += `&search=${encodeURIComponent(filters.search)}`;
        if (filters.pillarId && filters.pillarId !== 'all') apiUrl += `&pillarId=${filters.pillarId}`;
        if (filters.startDate) apiUrl += `&startDate=${encodeURIComponent(filters.startDate)}`;
        if (filters.endDate) apiUrl += `&endDate=${encodeURIComponent(filters.endDate)}`;

        const res = await fetch(apiUrl);
        const resJson = await res.json();
        if (resJson.success && Array.isArray(resJson.data)) {
          const apiPosts: DummyPost[] = resJson.data.map(normalizePostMedia);

          // Simpan master posts ke storage lokal
          const apiIds = new Set(apiPosts.map((p) => p.id));
          const otherStored = allStored.filter((p) => !apiIds.has(p.id) && (!p.brand_id || !accessibleBrandIds.has(p.brand_id)));
          saveStoredPosts([...apiPosts, ...otherStored]);

          return this.filterPostsLocally(apiPosts, filters, accessibleBrandIds);
        }
      } catch (apiErr) {
        console.warn('PostService.getPosts API fetch notice, fallback to direct db:', apiErr);
      }
    }

    if (supabase) {
      try {
        let query = supabase.from('posts' as any).select('*').order('created_at', { ascending: false });

        if (filters.brandId && filters.brandId !== 'all') {
          if (isUuid(filters.brandId)) {
            query = query.eq('brand_id', filters.brandId);
          } else {
            return this.filterPostsLocally(stored, filters, accessibleBrandIds);
          }
        } else {
          const uuidBrandIds = Array.from(accessibleBrandIds).filter((id) => isUuid(id));
          if (uuidBrandIds.length > 0) {
            query = query.in('brand_id', uuidBrandIds);
          } else {
            return this.filterPostsLocally(stored, filters, accessibleBrandIds);
          }
        }

        if (filters.pillarId && filters.pillarId !== 'all' && isUuid(filters.pillarId)) {
          query = query.eq('pillar_id', filters.pillarId);
        }
        if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);
        if (filters.startDate) query = query.gte('scheduled_at', filters.startDate);
        if (filters.endDate) query = query.lte('scheduled_at', filters.endDate);
        if (filters.search) query = query.ilike('title', `%${filters.search}%`);

        const { data, error } = await query;
        if (!error && data) {
          const dbPosts: DummyPost[] = data
            // Filter ganda: pastikan p.brand_id termasuk dalam accessibleBrandIds
            .filter((p: any) => p.brand_id && accessibleBrandIds.has(p.brand_id))
            .map((p: any) => {
              const { notes: cleanNotes, mediaUrl, mediaUrls, coverUrl } = this.extractMediaAndNotes(p.notes);
              const resolvedUrls = mediaUrls && mediaUrls.length > 0
                ? mediaUrls
                : mediaUrl || p.media_url
                ? [mediaUrl || p.media_url]
                : [];
              return {
                id: p.id,
                brand_id: p.brand_id,
                title: p.title || 'Untitled Post',
                caption: p.caption || '',
                hashtags: p.hashtags || '',
                platforms: p.platforms || ['instagram'],
                content_type: p.content_type || 'feed',
                status: p.status || 'draft',
                scheduled_at: p.scheduled_at || null,
                pillar_id: p.pillar_id || null,
                assignee_id: p.assignee_id || null,
                notes: cleanNotes || null,
                posted_at: p.posted_at || null,
                posted_url: p.posted_url || null,
                media_url: resolvedUrls[0] || mediaUrl || p.media_url || '',
                media_urls: resolvedUrls,
                cover_url: coverUrl || p.cover_url || '',
                aspect_ratio: '1:1',
                comments_count: 0,
              };
            });

          const masterMap = new Map<string, DummyPost>();
          stored.forEach((p) => masterMap.set(p.id, p));

          dbPosts.forEach((dbP) => {
            const existing = masterMap.get(dbP.id);
            const mergedUrls = existing?.media_urls && existing.media_urls.length > 0
              ? existing.media_urls
              : dbP.media_urls;
            masterMap.set(
              dbP.id,
              normalizePostMedia({
                ...(existing || {}),
                ...dbP,
                media_urls: mergedUrls,
                media_url: mergedUrls?.[0] || existing?.media_url || dbP.media_url || '',
              })
            );
          });

          // Simpan kembali master posts ke storage dengan aman
          const otherStored = allStored.filter((p) => !p.brand_id || !accessibleBrandIds.has(p.brand_id));
          saveStoredPosts([...otherStored, ...Array.from(masterMap.values())]);

          const masterList = Array.from(masterMap.values());
          return this.filterPostsLocally(masterList, filters, accessibleBrandIds);
        }
      } catch (err) {
        console.warn('PostService.getPosts db error, using local:', err);
      }
    }

    return this.filterPostsLocally(stored, filters, accessibleBrandIds);
  }

  /**
   * Mengambil jadwal postingan KHUSUS hari ini (tanggal hari ini di zona waktu lokal/WIB)
   */
  static async getTodayPosts(filters: Omit<PostFilterOptions, 'startDate' | 'endDate'> = {}, userId?: string): Promise<DummyPost[]> {
    return this.getPostsForDate(new Date(), filters, userId);
  }

  /**
   * Mengambil jadwal postingan untuk tanggal tertentu secara presisi
   */
  static async getPostsForDate(
    targetDate: Date,
    filters: Omit<PostFilterOptions, 'startDate' | 'endDate'> = {},
    userId?: string
  ): Promise<DummyPost[]> {
    const all = await this.getPosts(filters, userId);
    const targetDateStr = targetDate.toDateString();
    return all.filter((p) => {
      if (!p.scheduled_at) return false;
      return new Date(p.scheduled_at).toDateString() === targetDateStr;
    }).sort((a, b) => {
      const timeA = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0;
      const timeB = b.scheduled_at ? new Date(b.scheduled_at).getTime() : 0;
      return timeA - timeB;
    });
  }

  private static filterPostsLocally(list: DummyPost[], filters: PostFilterOptions, accessibleBrandIds?: Set<string>): DummyPost[] {
    let results = [...list];
    if (accessibleBrandIds && accessibleBrandIds.size > 0) {
      results = results.filter((p) => p.brand_id && accessibleBrandIds.has(p.brand_id));
    } else if (accessibleBrandIds && accessibleBrandIds.size === 0) {
      return [];
    }
    if (filters.brandId && filters.brandId !== 'all') {
      results = results.filter((p) => p.brand_id === filters.brandId);
    }
    if (filters.pillarId && filters.pillarId !== 'all') {
      results = results.filter((p) => p.pillar_id === filters.pillarId);
    }
    if (filters.status && filters.status !== 'all') {
      results = results.filter((p) => p.status === filters.status);
    }
    if (filters.startDate) {
      results = results.filter((p) => p.scheduled_at && new Date(p.scheduled_at) >= new Date(filters.startDate!));
    }
    if (filters.endDate) {
      results = results.filter((p) => p.scheduled_at && new Date(p.scheduled_at) <= new Date(filters.endDate!));
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      results = results.filter((p) => (p.title || '').toLowerCase().includes(q) || (p.caption || '').toLowerCase().includes(q));
    }
    return results;
  }

  static extractMediaAndNotes(rawNotes: string | null): { notes: string; mediaUrl?: string; mediaUrls?: string[]; coverUrl?: string } {
    if (!rawNotes) return { notes: '' };
    let clean = rawNotes;
    let mediaUrls: string[] | undefined;
    let mediaUrl: string | undefined;
    let coverUrl: string | undefined;

    const coverMatch = clean.match(/<!--COVER_URL:([\s\S]*?)-->/);
    if (coverMatch) {
      coverUrl = coverMatch[1].trim();
      clean = clean.replace(/<!--COVER_URL:[\s\S]*?-->/g, '').trim();
    }

    const multiMatch = clean.match(/<!--MEDIA_URLS:([\s\S]*?)-->/);
    if (multiMatch) {
      try {
        const parsed = JSON.parse(multiMatch[1].trim());
        if (Array.isArray(parsed)) {
          mediaUrls = parsed.filter((u) => typeof u === 'string' && u.trim().length > 0);
          if (mediaUrls.length > 0) mediaUrl = mediaUrls[0];
        }
      } catch {}
      clean = clean.replace(/<!--MEDIA_URLS:[\s\S]*?-->/g, '').trim();
    }

    const singleMatch = clean.match(/<!--MEDIA_URL:([\s\S]*?)-->/);
    if (singleMatch) {
      const extractedSingle = singleMatch[1].trim();
      if (!mediaUrl && extractedSingle) {
        mediaUrl = extractedSingle;
      }
      if (!mediaUrls && extractedSingle) {
        mediaUrls = [extractedSingle];
      }
      clean = clean.replace(/<!--MEDIA_URL:[\s\S]*?-->/g, '').trim();
    }

    return { notes: clean, mediaUrl, mediaUrls, coverUrl };
  }

  static embedMediaInNotes(notes?: string | null, mediaUrl?: string | null, mediaUrls?: string[] | null, coverUrl?: string | null): string | null {
    const cleanNotes = (notes || '')
      .replace(/<!--MEDIA_URLS:[\s\S]*?-->/g, '')
      .replace(/<!--MEDIA_URL:[\s\S]*?-->/g, '')
      .replace(/<!--COVER_URL:[\s\S]*?-->/g, '')
      .trim();

    const validUrls = Array.isArray(mediaUrls)
      ? mediaUrls.filter((u) => typeof u === 'string' && u.trim().length > 0)
      : mediaUrl && mediaUrl.trim()
      ? [mediaUrl.trim()]
      : [];

    let result = cleanNotes;
    if (validUrls.length > 1) {
      result = `${result}\n\n<!--MEDIA_URLS:${JSON.stringify(validUrls)}-->\n<!--MEDIA_URL:${validUrls[0]}-->`.trim();
    } else if (validUrls.length === 1) {
      result = `${result}\n\n<!--MEDIA_URL:${validUrls[0]}-->`.trim();
    }
    if (coverUrl && coverUrl.trim()) {
      result = `${result}\n<!--COVER_URL:${coverUrl.trim()}-->`.trim();
    }
    return result || null;
  }

  static async getPostById(id: string, userId?: string): Promise<DummyPost | null> {
    const stored = getStoredPosts();
    const localFound = stored.find((p) => p.id === id) || localPosts.find((p) => p.id === id);

    let supabase: any = null;
    if (typeof window === 'undefined') {
      try {
        const { createAdminClient } = await import('@/lib/supabase/server');
        supabase = createAdminClient();
      } catch {}
    }
    if (!supabase) {
      supabase = createClient();
    }
    let foundPost: DummyPost | null = null;

    if (typeof window !== 'undefined' && isUuid(id)) {
      try {
        const apiRes = await fetch(`/api/posts?id=${id}`);
        const apiJson = await apiRes.json();
        if (apiJson.success && apiJson.data) {
          foundPost = normalizePostMedia(apiJson.data);
          const currentStored = getStoredPosts();
          saveStoredPosts([foundPost, ...currentStored.filter((p) => p.id !== id)]);
        }
      } catch (apiErr) {
        console.warn('PostService.getPostById API fetch notice:', apiErr);
      }
    }

    if (!foundPost && supabase && isUuid(id)) {
      try {
        const { data, error } = await supabase.from('posts' as any).select('*').eq('id', id).maybeSingle();
        if (!error && data) {
          const d = data as any;
          const { notes, mediaUrl, mediaUrls, coverUrl } = this.extractMediaAndNotes(d.notes);
          const resolvedUrls =
            mediaUrls && mediaUrls.length > 0
              ? mediaUrls
              : localFound?.media_urls && localFound.media_urls.length > 0
              ? localFound.media_urls
              : mediaUrl || localFound?.media_url
              ? [mediaUrl || localFound?.media_url || '']
              : [];
          foundPost = normalizePostMedia({
            id: d.id,
            brand_id: d.brand_id,
            title: d.title || 'Untitled Post',
            caption: d.caption || '',
            hashtags: d.hashtags || '',
            platforms: d.platforms || ['instagram'],
            content_type: d.content_type || 'feed',
            status: d.status || 'draft',
            scheduled_at: d.scheduled_at || null,
            pillar_id: d.pillar_id || null,
            assignee_id: d.assignee_id || null,
            notes: notes,
            posted_at: d.posted_at || null,
            posted_url: d.posted_url || null,
            media_url: resolvedUrls[0] || mediaUrl || '',
            media_urls: resolvedUrls,
            cover_url: coverUrl || d.cover_url || localFound?.cover_url || '',
            aspect_ratio: '1:1',
            comments_count: 0,
          });
        }
      } catch (err) {
        console.warn('PostService.getPostById db fallback:', err);
      }
    }

    if (!foundPost && localFound) {
      foundPost = normalizePostMedia(localFound);
    }

    if (!foundPost) return null;

    // Verifikasi Brand-Based Access Control: Postingan hanya boleh dilihat oleh pengguna yang memiliki hak akses
    if (!foundPost.brand_id) {
      return null;
    }

    const role = await BrandService.getUserBrandRole(foundPost.brand_id, userId);
    if (!role) {
      // Pengguna bukan owner dan bukan anggota tim (editor/reviewer/viewer) di brand ini
      return null;
    }

    // Jika media_url kosong pada postingan tersimpan, coba pulihkan dari IndexedDB cache
    if (!foundPost.media_url && typeof window !== 'undefined') {
      try {
        const cached = await getMediaFromCache('post_media_' + foundPost.id);
        if (cached) {
          foundPost.media_url = cached;
          foundPost.media_urls = [cached];
        }
      } catch {}
    }

    return foundPost;
  }

  static async createPost(payload: Partial<DummyPost> & { brand_id: string; title: string; user_id?: string; assigned_to?: string }): Promise<DummyPost> {
    if (!payload.brand_id) {
      throw new Error('Validasi Gagal: Postingan wajib terhubung dengan brand yang dipilih.');
    }

    const formattedHashtags = Array.isArray(payload.hashtags)
      ? (payload.hashtags as string[]).join(' ')
      : (payload.hashtags || '');

    const supabase = createClient();

    let effectiveUserId = payload.user_id;
    if (supabase && (!effectiveUserId || !isUuid(effectiveUserId))) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) effectiveUserId = user.id;
      } catch {}
    }

    // Verifikasi Brand-Based Access Control: pastikan pembuat memiliki hak akses ke brand terkait
    const role = await BrandService.getUserBrandRole(payload.brand_id, effectiveUserId);
    if (!role) {
      throw new Error('Akses Ditolak: Anda tidak memiliki hak akses terhadap brand yang dipilih.');
    }
    if (role === 'viewer') {
      throw new Error('Akses Ditolak: Peran Viewer hanya memiliki hak baca dan tidak dapat membuat postingan baru.');
    }
    if (role === 'reviewer') {
      throw new Error('Akses Ditolak: Peran Reviewer hanya dapat mereview postingan dan tidak dapat membuat postingan baru.');
    }

    const resolvedMediaUrls =
      Array.isArray(payload.media_urls) && payload.media_urls.length > 0
        ? payload.media_urls.filter(Boolean)
        : payload.media_url
        ? [payload.media_url]
        : [];
    const primaryMediaUrl = resolvedMediaUrls[0] || payload.media_url || '';

    // Coba simpan melalui API server /api/posts yang menggunakan Service Role Admin
    // agar seluruh anggota tim dapat melihat postingan secara tersinkronisasi
    if (typeof window !== 'undefined') {
      try {
        const targetBrandName = (typeof window !== 'undefined' && getStoredCustomBrands().find((b) => b.id === payload.brand_id)?.name) || '';
        const apiRes = await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            brand_id: payload.brand_id,
            brand_name: targetBrandName,
            user_id: effectiveUserId,
            content_type: payload.content_type || 'feed',
            media_url: primaryMediaUrl,
            media_urls: resolvedMediaUrls,
            cover_url: payload.cover_url,
            notes: payload.notes,
          }),
        });
        const apiJson = await apiRes.json();
        if (apiJson.success && apiJson.data) {
          const created: DummyPost = normalizePostMedia(apiJson.data);
          const currentStored = getStoredPosts();
          saveStoredPosts([created, ...currentStored.filter((p) => p.id !== created.id)]);
          window.dispatchEvent(new CustomEvent('uda_post_created', { detail: created }));
          window.dispatchEvent(new CustomEvent('uda_post_updated', { detail: created }));
          window.dispatchEvent(new Event('storage'));
          return created;
        } else {
          console.warn('API /api/posts notice:', apiJson?.error);
          if (apiJson?.error) {
            throw new Error(apiJson.error);
          }
        }
      } catch (apiErr: any) {
        console.warn('PostService.createPost API notice:', apiErr);
        if (apiErr?.message && !apiErr.message.includes('fetch')) {
          throw apiErr;
        }
      }
    }

    const fallbackId = `post-${Date.now()}`;
    const newPost: DummyPost = {
      id: fallbackId,
      brand_id: payload.brand_id,
      title: payload.title,
      caption: payload.caption || '',
      hashtags: formattedHashtags,
      platforms: payload.platforms || ['instagram'],
      content_type: payload.content_type || 'feed',
      status: payload.status || 'draft',
      scheduled_at: payload.scheduled_at || null,
      pillar_id: payload.pillar_id || null,
      assignee_id: payload.assignee_id || payload.assigned_to || null,
      notes: payload.notes || null,
      posted_at: payload.posted_at || null,
      posted_url: payload.posted_url || null,
      media_url: primaryMediaUrl,
      media_urls: resolvedMediaUrls,
      cover_url: payload.cover_url || '',
      aspect_ratio: payload.aspect_ratio || '1:1',
      comments_count: 0,
    };

    if (primaryMediaUrl && primaryMediaUrl.startsWith('data:') && typeof window !== 'undefined') {
      saveMediaToCache('post_media_' + fallbackId, primaryMediaUrl);
    }

    if (supabase && isUuid(payload.brand_id)) {
      try {
        const finalNotes = this.embedMediaInNotes(payload.notes, primaryMediaUrl, resolvedMediaUrls, payload.cover_url);
        const insertPayload: any = {
          brand_id: payload.brand_id,
          title: payload.title,
          caption: payload.caption || '',
          hashtags: formattedHashtags,
          platforms: payload.platforms || ['instagram'],
          content_type: payload.content_type || 'feed',
          status: payload.status || 'draft',
          scheduled_at: payload.scheduled_at || null,
          pillar_id: isUuid(payload.pillar_id || '') ? payload.pillar_id : null,
          notes: finalNotes,
        };

        if (effectiveUserId && isUuid(effectiveUserId)) {
          insertPayload.created_by = effectiveUserId;
        }

        const { data, error } = await (supabase.from('posts' as any) as any).insert(insertPayload).select().single();
        if (!error && data) {
          const d = data as any;
          const { notes: cleanNotes, mediaUrl, mediaUrls, coverUrl } = this.extractMediaAndNotes(d.notes);
          const finalUrls = resolvedMediaUrls.length > 0 ? resolvedMediaUrls : (mediaUrls || (mediaUrl ? [mediaUrl] : []));
          const created: DummyPost = {
            ...newPost,
            id: d.id,
            brand_id: d.brand_id || newPost.brand_id,
            notes: cleanNotes || newPost.notes,
            media_url: finalUrls[0] || primaryMediaUrl || mediaUrl || newPost.media_url,
            media_urls: finalUrls,
            cover_url: payload.cover_url || coverUrl || '',
          };

          if (created.media_url && created.media_url.startsWith('data:') && typeof window !== 'undefined') {
            saveMediaToCache('post_media_' + created.id, created.media_url);
          }

          const currentStored = getStoredPosts();
          saveStoredPosts([created, ...currentStored.filter((p) => p.id !== created.id)]);

          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('uda_post_created', { detail: created }));
            window.dispatchEvent(new CustomEvent('uda_post_updated', { detail: created }));
            window.dispatchEvent(new Event('storage'));
          }

          return created;
        } else if (error) {
          console.warn('PostService.createPost Supabase insert notice:', error.message);
        }
      } catch (err) {
        console.warn('PostService.createPost db error, using local fallback:', err);
      }
    }

    const currentStored = getStoredPosts();
    saveStoredPosts([newPost, ...currentStored.filter((p) => p.id !== newPost.id)]);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('uda_post_created', { detail: newPost }));
      window.dispatchEvent(new CustomEvent('uda_post_updated', { detail: newPost }));
      window.dispatchEvent(new Event('storage'));
    }

    return newPost;
  }

  static async updatePost(id: string, updates: Partial<DummyPost>, userId?: string): Promise<DummyPost> {
    const currentStored = getStoredPosts();
    const existingInStored = currentStored.find((p) => p.id === id);
    const existingInLocal = localPosts.find((p) => p.id === id);
    const basePost = existingInStored || existingInLocal;

    const targetBrandId = updates.brand_id || basePost?.brand_id;
    if (!targetBrandId) {
      throw new Error('Validasi Gagal: Brand postingan tidak ditemukan.');
    }

    const role = await BrandService.getUserBrandRole(targetBrandId, userId);
    if (!role) {
      throw new Error('Akses Ditolak: Anda tidak memiliki hak akses terhadap brand postingan ini.');
    }
    if (role === 'viewer') {
      throw new Error('Akses Ditolak: Peran Viewer hanya memiliki hak baca dan tidak dapat mengubah isi postingan.');
    }
    let effectiveUpdates = { ...updates };
    if (role === 'reviewer') {
      const sanitizedUpdates: Partial<DummyPost> = {};
      if (updates.status !== undefined) sanitizedUpdates.status = updates.status;
      if (updates.notes !== undefined) sanitizedUpdates.notes = updates.notes;
      if (updates.posted_at !== undefined) sanitizedUpdates.posted_at = updates.posted_at;
      effectiveUpdates = sanitizedUpdates;
    }

    if (effectiveUpdates.brand_id && basePost?.brand_id && effectiveUpdates.brand_id !== basePost.brand_id) {
      const newRole = await BrandService.getUserBrandRole(effectiveUpdates.brand_id, userId);
      if (!newRole || newRole === 'viewer') {
        throw new Error('Akses Ditolak: Anda tidak memiliki hak akses untuk memindahkan postingan ke brand tersebut.');
      }
    }

    const resolvedMediaUrls =
      effectiveUpdates.media_urls !== undefined
        ? effectiveUpdates.media_urls.filter(Boolean)
        : effectiveUpdates.media_url !== undefined
        ? effectiveUpdates.media_url
          ? [effectiveUpdates.media_url]
          : []
        : basePost?.media_urls || (basePost?.media_url ? [basePost.media_url] : []);

    const primaryMediaUrl = resolvedMediaUrls[0] || (effectiveUpdates.media_url !== undefined ? effectiveUpdates.media_url : basePost?.media_url) || '';
    const primaryCoverUrl = effectiveUpdates.cover_url !== undefined ? effectiveUpdates.cover_url : (basePost?.cover_url || '');

    if (primaryMediaUrl && primaryMediaUrl.startsWith('data:') && typeof window !== 'undefined') {
      saveMediaToCache('post_media_' + id, primaryMediaUrl);
    }

    const supabase = createClient();
    if (supabase && isUuid(id)) {
      try {
        const dbUpdates: any = {};
        if (effectiveUpdates.title !== undefined) dbUpdates.title = effectiveUpdates.title;
        if (effectiveUpdates.caption !== undefined) dbUpdates.caption = effectiveUpdates.caption;
        if (effectiveUpdates.hashtags !== undefined) {
          dbUpdates.hashtags = Array.isArray(effectiveUpdates.hashtags) ? effectiveUpdates.hashtags.join(' ') : effectiveUpdates.hashtags;
        }
        if (effectiveUpdates.platforms !== undefined) dbUpdates.platforms = effectiveUpdates.platforms;
        if (effectiveUpdates.content_type !== undefined) dbUpdates.content_type = effectiveUpdates.content_type;
        if (effectiveUpdates.status !== undefined) dbUpdates.status = effectiveUpdates.status;
        if (effectiveUpdates.scheduled_at !== undefined) dbUpdates.scheduled_at = effectiveUpdates.scheduled_at;
        if (effectiveUpdates.brand_id !== undefined && isUuid(effectiveUpdates.brand_id)) {
          dbUpdates.brand_id = effectiveUpdates.brand_id;
        }
        if (effectiveUpdates.pillar_id !== undefined) {
          dbUpdates.pillar_id = isUuid(effectiveUpdates.pillar_id || '') ? effectiveUpdates.pillar_id : null;
        }
        if (effectiveUpdates.notes !== undefined || effectiveUpdates.media_url !== undefined || effectiveUpdates.media_urls !== undefined || effectiveUpdates.cover_url !== undefined) {
          const notesText = effectiveUpdates.notes !== undefined ? effectiveUpdates.notes : (basePost?.notes || '');
          dbUpdates.notes = this.embedMediaInNotes(notesText, primaryMediaUrl, resolvedMediaUrls, primaryCoverUrl);
        }
        if (effectiveUpdates.posted_at !== undefined) dbUpdates.posted_at = effectiveUpdates.posted_at;
        if (effectiveUpdates.posted_url !== undefined) dbUpdates.posted_url = effectiveUpdates.posted_url;
        dbUpdates.updated_at = new Date().toISOString();

        const { error } = await (supabase.from('posts' as any) as any)
          .update(dbUpdates)
          .eq('id', id);

        if (error) {
          console.warn('PostService.updatePost Supabase update notice:', error.message);
        }
      } catch (err) {
        console.warn('PostService.updatePost db error:', err);
      }

      if (typeof window !== 'undefined') {
        try {
          await fetch('/api/posts', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, userId, ...effectiveUpdates, media_url: primaryMediaUrl, media_urls: resolvedMediaUrls, cover_url: primaryCoverUrl }),
          });
        } catch (patchErr) {
          console.warn('PATCH /api/posts sync notice:', patchErr);
        }
      }
    }

    const resolvedBase = basePost || {
      id,
      brand_id: effectiveUpdates.brand_id || 'brand-1',
      title: effectiveUpdates.title || 'Untitled Post',
      caption: effectiveUpdates.caption || '',
      hashtags: effectiveUpdates.hashtags || '',
      platforms: effectiveUpdates.platforms || ['instagram'],
      content_type: effectiveUpdates.content_type || 'feed',
      status: effectiveUpdates.status || 'draft',
      scheduled_at: effectiveUpdates.scheduled_at || null,
      pillar_id: effectiveUpdates.pillar_id || null,
      assignee_id: effectiveUpdates.assignee_id || null,
      notes: effectiveUpdates.notes || null,
      posted_at: effectiveUpdates.posted_at || null,
      posted_url: effectiveUpdates.posted_url || null,
      media_url: primaryMediaUrl,
      media_urls: resolvedMediaUrls,
      cover_url: primaryCoverUrl,
      aspect_ratio: '1:1',
      comments_count: 0,
    };

    const mergedPost: DummyPost = normalizePostMedia({
      ...resolvedBase,
      ...effectiveUpdates,
      media_url: primaryMediaUrl,
      media_urls: resolvedMediaUrls,
      cover_url: primaryCoverUrl,
      id,
    });

    const existingIdx = currentStored.findIndex((p) => p.id === id);
    let updatedStored: DummyPost[];
    if (existingIdx !== -1) {
      updatedStored = currentStored.map((p) => (p.id === id ? mergedPost : p));
    } else {
      updatedStored = [mergedPost, ...currentStored];
    }
    saveStoredPosts(updatedStored);

    const index = localPosts.findIndex((p) => p.id === id);
    if (index !== -1) {
      localPosts[index] = mergedPost;
    } else {
      localPosts.unshift(mergedPost);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('uda_post_updated', { detail: mergedPost }));
      window.dispatchEvent(new Event('storage'));
    }

    return mergedPost;
  }

  static async deletePost(id: string, userId?: string): Promise<boolean> {
    const currentStored = getStoredPosts();
    let existing = currentStored.find((p) => p.id === id) || localPosts.find((p) => p.id === id);

    const supabase = createClient();
    if (!existing && supabase && isUuid(id)) {
      try {
        const { data } = await supabase.from('posts' as any).select('brand_id').eq('id', id).maybeSingle();
        if (data) existing = data as any;
      } catch {}
    }

    if (existing?.brand_id) {
      const role = await BrandService.getUserBrandRole(existing.brand_id, userId);
      if (!role) {
        throw new Error('Akses Ditolak: Anda tidak memiliki hak akses terhadap brand postingan ini.');
      }
      if (role !== 'owner') {
        throw new Error('Akses Ditolak: Hanya Owner dari brand yang berhak menghapus postingan.');
      }
    }

    if (supabase && isUuid(id)) {
      try {
        await supabase.from('posts' as any).delete().eq('id', id);
      } catch (err) {
        console.warn('PostService.deletePost db error:', err);
      }
    }

    saveStoredPosts(currentStored.filter((p) => p.id !== id));
    localPosts = localPosts.filter((p) => p.id !== id);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('uda_post_deleted', { detail: { id } }));
      window.dispatchEvent(new Event('storage'));
    }

    return true;
  }
}
