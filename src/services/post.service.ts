import { createClient } from '@/lib/supabase/client';
import { DUMMY_POSTS, DummyPost } from '@/lib/dummy-data';
import { BrandService, isUuid } from './brand.service';
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

let localPosts: DummyPost[] = [...DUMMY_POSTS];

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
   * Mengambil data postingan secara sinkron (instan) dari cache lokal tanpa menunggu network
   */
  static getCachedPosts(filters: PostFilterOptions = {}): DummyPost[] {
    const stored = getStoredPosts();
    const storedIds = new Set(stored.map((s) => s.id));
    const combined = [
      ...stored,
      ...localPosts.filter((lp) => !storedIds.has(lp.id)),
    ];
    return this.filterPostsLocally(combined, filters);
  }

  static async getPosts(filters: PostFilterOptions = {}, userId?: string): Promise<DummyPost[]> {
    const supabase = createClient();

    // Dapatkan seluruh brand yang dimiliki atau diikuti pengguna dalam tim
    let userBrands = await BrandService.getBrands(userId);
    if (!userBrands || userBrands.length === 0) {
      userBrands = BrandService.getCachedBrands(userId);
    }
    const accessibleBrandIds = new Set(userBrands.map((b) => b.id));

    const allStored = getStoredPosts();
    const stored = accessibleBrandIds.size > 0
      ? allStored.filter((p) => !p.brand_id || accessibleBrandIds.has(p.brand_id))
      : allStored;

    if (supabase) {
      try {
        let query = supabase.from('posts' as any).select('*').order('created_at', { ascending: false });

        if (filters.brandId && filters.brandId !== 'all') {
          if (isUuid(filters.brandId)) {
            query = query.eq('brand_id', filters.brandId);
          }
        } else {
          const uuidBrandIds = Array.from(accessibleBrandIds).filter((id) => isUuid(id));
          if (uuidBrandIds.length > 0) {
            query = query.in('brand_id', uuidBrandIds);
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
        if (!error && data && data.length > 0) {
          const dbPosts: DummyPost[] = data.map((p: any) => {
            const { notes: cleanNotes, mediaUrl, mediaUrls } = this.extractMediaAndNotes(p.notes);
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
              aspect_ratio: '1:1',
              comments_count: 0,
            };
          });

          // PENTING: Lakukan SAFE NON-DESTRUCTIVE MERGE ke allStored
          // Jangan pernah menimpa localStorage hanya dengan subset query saat ini!
          const masterMap = new Map<string, DummyPost>();
          allStored.forEach((p) => masterMap.set(p.id, p));

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

          // Simpan seluruh master posts (semua brand) ke localStorage
          saveStoredPosts(Array.from(masterMap.values()));

          const masterList = Array.from(masterMap.values());
          const finalSet = [
            ...masterList,
            ...localPosts.filter((lp) => !masterMap.has(lp.id)),
          ];
          return this.filterPostsLocally(finalSet, filters);
        }
      } catch (err) {
        console.warn('PostService.getPosts db error, using local:', err);
      }
    }

    const storedIds = new Set(stored.map((s) => s.id));
    const combined = [
      ...stored,
      ...localPosts.filter((lp) => !storedIds.has(lp.id)),
    ];
    return this.filterPostsLocally(combined, filters);
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

  private static filterPostsLocally(list: DummyPost[], filters: PostFilterOptions): DummyPost[] {
    let results = [...list];
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
      results = results.filter((p) => p.title.toLowerCase().includes(q) || p.caption.toLowerCase().includes(q));
    }
    return results;
  }

  static extractMediaAndNotes(rawNotes: string | null): { notes: string; mediaUrl?: string; mediaUrls?: string[] } {
    if (!rawNotes) return { notes: '' };
    let clean = rawNotes;
    let mediaUrls: string[] | undefined;
    let mediaUrl: string | undefined;

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

    return { notes: clean, mediaUrl, mediaUrls };
  }

  static embedMediaInNotes(notes?: string | null, mediaUrl?: string | null, mediaUrls?: string[] | null): string | null {
    const cleanNotes = (notes || '')
      .replace(/<!--MEDIA_URLS:[\s\S]*?-->/g, '')
      .replace(/<!--MEDIA_URL:[\s\S]*?-->/g, '')
      .trim();

    const validUrls = Array.isArray(mediaUrls)
      ? mediaUrls.filter((u) => typeof u === 'string' && u.trim().length > 0)
      : mediaUrl && mediaUrl.trim()
      ? [mediaUrl.trim()]
      : [];

    if (validUrls.length > 1) {
      return `${cleanNotes}\n\n<!--MEDIA_URLS:${JSON.stringify(validUrls)}-->\n<!--MEDIA_URL:${validUrls[0]}-->`.trim();
    }
    if (validUrls.length === 1) {
      return `${cleanNotes}\n\n<!--MEDIA_URL:${validUrls[0]}-->`.trim();
    }
    return cleanNotes || null;
  }

  static async getPostById(id: string, userId?: string): Promise<DummyPost | null> {
    const stored = getStoredPosts();
    const localFound = stored.find((p) => p.id === id) || localPosts.find((p) => p.id === id);

    const supabase = createClient();
    let foundPost: DummyPost | null = null;

    if (supabase && isUuid(id)) {
      try {
        const { data, error } = await supabase.from('posts' as any).select('*').eq('id', id).maybeSingle();
        if (!error && data) {
          const d = data as any;
          const { notes, mediaUrl, mediaUrls } = this.extractMediaAndNotes(d.notes);
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

    // Verifikasi izin akses: Jika role belum terdaftar, fallback ke 'owner' secara aman
    let role = await BrandService.getUserBrandRole(foundPost.brand_id, userId);
    if (!role) {
      const userBrands = await BrandService.getBrands(userId);
      const matched = userBrands.find((b) => b.id === foundPost!.brand_id);
      if (matched || userBrands.length === 0) {
        role = 'owner';
      }
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

    const realBrandId = await BrandService.getRealBrandId(payload.brand_id, effectiveUserId);

    const resolvedMediaUrls =
      Array.isArray(payload.media_urls) && payload.media_urls.length > 0
        ? payload.media_urls.filter(Boolean)
        : payload.media_url
        ? [payload.media_url]
        : [];
    const primaryMediaUrl = resolvedMediaUrls[0] || payload.media_url || '';

    const fallbackId = `post-${Date.now()}`;
    const newPost: DummyPost = {
      id: fallbackId,
      brand_id: payload.brand_id || realBrandId,
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
      aspect_ratio: payload.aspect_ratio || '1:1',
      comments_count: 0,
    };

    const targetBrandId = payload.brand_id || realBrandId;
    let role = await BrandService.getUserBrandRole(targetBrandId, effectiveUserId);
    if (!role) {
      const userBrands = await BrandService.getBrands(effectiveUserId);
      const matched = userBrands.find((b) => b.id === targetBrandId || b.id === payload.brand_id || b.id === realBrandId);
      if (matched || userBrands.length === 0) {
        role = 'owner';
      } else {
        role = 'owner';
      }
    }
    if (role === 'viewer') {
      throw new Error('Akses Ditolak: Peran Viewer hanya memiliki hak baca dan tidak dapat membuat postingan baru.');
    }

    if (primaryMediaUrl && primaryMediaUrl.startsWith('data:') && typeof window !== 'undefined') {
      saveMediaToCache('post_media_' + fallbackId, primaryMediaUrl);
    }

    if (supabase) {
      try {
        const finalNotes = this.embedMediaInNotes(payload.notes, primaryMediaUrl, resolvedMediaUrls);
        const insertPayload: any = {
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

        const targetBrandUuid = isUuid(payload.brand_id)
          ? payload.brand_id
          : isUuid(realBrandId)
          ? realBrandId
          : null;

        if (targetBrandUuid) {
          insertPayload.brand_id = targetBrandUuid;
        }

        if (effectiveUserId && isUuid(effectiveUserId)) {
          insertPayload.created_by = effectiveUserId;
        }

        if (insertPayload.brand_id) {
          const { data, error } = await (supabase.from('posts' as any) as any).insert(insertPayload).select().single();
          if (!error && data) {
            const d = data as any;
            const { notes: cleanNotes, mediaUrl, mediaUrls } = this.extractMediaAndNotes(d.notes);
            const finalUrls = resolvedMediaUrls.length > 0 ? resolvedMediaUrls : (mediaUrls || (mediaUrl ? [mediaUrl] : []));
            const created: DummyPost = {
              ...newPost,
              id: d.id,
              brand_id: d.brand_id || newPost.brand_id,
              notes: cleanNotes || newPost.notes,
              media_url: finalUrls[0] || primaryMediaUrl || mediaUrl || newPost.media_url,
              media_urls: finalUrls,
            };

            if (created.media_url && created.media_url.startsWith('data:') && typeof window !== 'undefined') {
              saveMediaToCache('post_media_' + created.id, created.media_url);
            }

            localPosts.unshift(created);
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
        }
      } catch (err) {
        console.warn('PostService.createPost db error, using local fallback:', err);
      }
    }

    localPosts.unshift(newPost);
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
    if (targetBrandId) {
      let role = await BrandService.getUserBrandRole(targetBrandId, userId);
      if (!role) {
        const userBrands = await BrandService.getBrands(userId);
        const hasAccess = userBrands.some((b) => b.id === targetBrandId);
        if (hasAccess || userBrands.length === 0) {
          role = 'owner';
        } else {
          role = 'owner';
        }
      }
      if (role === 'viewer') {
        throw new Error('Akses Ditolak: Peran Viewer hanya memiliki hak baca dan tidak dapat mengubah isi postingan.');
      }
    }

    const resolvedMediaUrls =
      updates.media_urls !== undefined
        ? updates.media_urls.filter(Boolean)
        : updates.media_url !== undefined
        ? updates.media_url
          ? [updates.media_url]
          : []
        : basePost?.media_urls || (basePost?.media_url ? [basePost.media_url] : []);

    const primaryMediaUrl = resolvedMediaUrls[0] || (updates.media_url !== undefined ? updates.media_url : basePost?.media_url) || '';

    if (primaryMediaUrl && primaryMediaUrl.startsWith('data:') && typeof window !== 'undefined') {
      saveMediaToCache('post_media_' + id, primaryMediaUrl);
    }

    const supabase = createClient();
    if (supabase && isUuid(id)) {
      try {
        const dbUpdates: any = {};
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.caption !== undefined) dbUpdates.caption = updates.caption;
        if (updates.hashtags !== undefined) {
          dbUpdates.hashtags = Array.isArray(updates.hashtags) ? updates.hashtags.join(' ') : updates.hashtags;
        }
        if (updates.platforms !== undefined) dbUpdates.platforms = updates.platforms;
        if (updates.content_type !== undefined) dbUpdates.content_type = updates.content_type;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.scheduled_at !== undefined) dbUpdates.scheduled_at = updates.scheduled_at;
        if (updates.brand_id !== undefined && isUuid(updates.brand_id)) {
          dbUpdates.brand_id = updates.brand_id;
        }
        if (updates.pillar_id !== undefined) {
          dbUpdates.pillar_id = isUuid(updates.pillar_id || '') ? updates.pillar_id : null;
        }
        if (updates.notes !== undefined || updates.media_url !== undefined || updates.media_urls !== undefined) {
          const notesText = updates.notes !== undefined ? updates.notes : (basePost?.notes || '');
          dbUpdates.notes = this.embedMediaInNotes(notesText, primaryMediaUrl, resolvedMediaUrls);
        }
        if (updates.posted_at !== undefined) dbUpdates.posted_at = updates.posted_at;
        if (updates.posted_url !== undefined) dbUpdates.posted_url = updates.posted_url;
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
          fetch('/api/posts', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...updates, media_url: primaryMediaUrl, media_urls: resolvedMediaUrls }),
          }).catch((err) => console.warn('PATCH /api/posts sync notice:', err));
        } catch {}
      }
    }

    const resolvedBase = basePost || {
      id,
      brand_id: updates.brand_id || 'brand-1',
      title: updates.title || 'Untitled Post',
      caption: updates.caption || '',
      hashtags: updates.hashtags || '',
      platforms: updates.platforms || ['instagram'],
      content_type: updates.content_type || 'feed',
      status: updates.status || 'draft',
      scheduled_at: updates.scheduled_at || null,
      pillar_id: updates.pillar_id || null,
      assignee_id: updates.assignee_id || null,
      notes: updates.notes || null,
      posted_at: updates.posted_at || null,
      posted_url: updates.posted_url || null,
      media_url: primaryMediaUrl,
      media_urls: resolvedMediaUrls,
      aspect_ratio: '1:1',
      comments_count: 0,
    };

    const mergedPost: DummyPost = normalizePostMedia({
      ...resolvedBase,
      ...updates,
      media_url: primaryMediaUrl,
      media_urls: resolvedMediaUrls,
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
    const existing = currentStored.find((p) => p.id === id) || localPosts.find((p) => p.id === id);
    if (existing?.brand_id) {
      const role = await BrandService.getUserBrandRole(existing.brand_id, userId);
      if (role === 'viewer' || role === 'editor') {
        throw new Error('Akses Ditolak: Hanya Owner atau Reviewer yang dapat menghapus postingan.');
      }
    }

    const supabase = createClient();
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
