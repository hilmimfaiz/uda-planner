import { createClient } from '@/lib/supabase/client';
import { DUMMY_POSTS, DummyPost } from '@/lib/dummy-data';
import { BrandService, isUuid } from './brand.service';

const STORAGE_KEY = 'uda_custom_posts';

const getStoredPosts = (): DummyPost[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return (Array.isArray(parsed) ? parsed : []).filter(
      (p: any) => p && !p.id?.startsWith('post-gen-') && !['post-1', 'post-2', 'post-3', 'post-4', 'post-5', 'post-6'].includes(p.id)
    );
  } catch {
    return [];
  }
};

const saveStoredPosts = (posts: DummyPost[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  } catch {}
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
  static async getPosts(filters: PostFilterOptions = {}, userId?: string): Promise<DummyPost[]> {
    const supabase = createClient();

    // Dapatkan seluruh brand yang dimiliki atau diikuti pengguna dalam tim
    const userBrands = await BrandService.getBrands(userId);
    const accessibleBrandIds = new Set(userBrands.map((b) => b.id));

    // Jika pengguna tidak memiliki brand sama sekali, postingan pasti kosong!
    if (accessibleBrandIds.size === 0) {
      return [];
    }

    const stored = getStoredPosts().filter((p) => p.brand_id && accessibleBrandIds.has(p.brand_id));

    if (supabase) {
      try {
        let query = supabase.from('posts' as any).select('*').order('created_at', { ascending: false });

        if (filters.brandId && filters.brandId !== 'all') {
          if (!accessibleBrandIds.has(filters.brandId)) {
            // Brand yang diminta tidak berada dalam kepemilikan/tim pengguna, tolak akses!
            return [];
          }
          if (isUuid(filters.brandId)) {
            query = query.eq('brand_id', filters.brandId);
          }
        } else {
          // Hanya ambil postingan dari brand-brand milik pengguna atau timnya
          const uuidBrandIds = Array.from(accessibleBrandIds).filter((id) => isUuid(id));
          if (uuidBrandIds.length > 0) {
            query = query.in('brand_id', uuidBrandIds);
          } else {
            // Pengguna hanya memiliki brand lokal, gunakan stored
            return this.filterPostsLocally(stored, filters);
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
          const dbPosts: DummyPost[] = data
            .filter((p: any) => accessibleBrandIds.has(p.brand_id))
            .map((p: any) => {
              const { notes: cleanNotes, mediaUrl } = this.extractMediaAndNotes(p.notes);
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
                media_url: mediaUrl || p.media_url || '',
                aspect_ratio: '1:1',
                comments_count: 0,
              };
            });

          const dbIds = new Set(dbPosts.map((p) => p.id));
          const combined = [
            ...dbPosts,
            ...stored.filter((st) => !dbIds.has(st.id)),
            ...localPosts.filter((lp) => accessibleBrandIds.has(lp.brand_id) && !dbIds.has(lp.id) && !stored.some((st) => st.id === lp.id)),
          ];

          return this.filterPostsLocally(combined, filters);
        }
      } catch (err) {
        console.warn('PostService.getPosts db error, using local:', err);
      }
    }

    const storedIds = new Set(stored.map((s) => s.id));
    const combined = [
      ...stored,
      ...localPosts.filter((lp) => accessibleBrandIds.has(lp.brand_id) && !storedIds.has(lp.id)),
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
      results = results.filter((p) => p.brand_id === filters.brandId || !isUuid(filters.brandId));
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

  static extractMediaAndNotes(rawNotes: string | null): { notes: string; mediaUrl?: string } {
    if (!rawNotes) return { notes: '' };
    const match = rawNotes.match(/<!--MEDIA_URL:([\s\S]*?)-->/);
    if (match) {
      const mediaUrl = match[1].trim();
      const notes = rawNotes.replace(/<!--MEDIA_URL:[\s\S]*?-->/, '').trim();
      return { notes, mediaUrl };
    }
    return { notes: rawNotes };
  }

  static embedMediaInNotes(notes?: string | null, mediaUrl?: string | null): string | null {
    let cleanNotes = (notes || '').replace(/<!--MEDIA_URL:[\s\S]*?-->/, '').trim();
    if (mediaUrl && mediaUrl.trim()) {
      return `${cleanNotes}\n\n<!--MEDIA_URL:${mediaUrl.trim()}-->`.trim();
    }
    return cleanNotes || null;
  }

  static async getPostById(id: string, userId?: string): Promise<DummyPost | null> {
    const supabase = createClient();
    let foundPost: DummyPost | null = null;

    if (supabase && isUuid(id)) {
      try {
        const { data, error } = await supabase.from('posts' as any).select('*').eq('id', id).maybeSingle();
        if (!error && data) {
          const d = data as any;
          const { notes, mediaUrl } = this.extractMediaAndNotes(d.notes);
          foundPost = {
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
            media_url: mediaUrl || '',
            aspect_ratio: '1:1',
            comments_count: 0,
          };
        }
      } catch (err) {
        console.warn('PostService.getPostById db fallback:', err);
      }
    }

    if (!foundPost) {
      const stored = getStoredPosts();
      const localFound = stored.find((p) => p.id === id) || localPosts.find((p) => p.id === id);
      if (localFound) foundPost = localFound;
    }

    if (!foundPost) return null;

    // Verifikasi izin akses: Pengguna harus Owner atau Anggota Tim pada brand postingan ini!
    const role = await BrandService.getUserBrandRole(foundPost.brand_id, userId);
    if (!role) {
      return null; // Akses Ditolak: postingan milik brand orang lain
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

    // Resolusikan brand_id ke UUID riil Supabase jika ada
    const realBrandId = await BrandService.getRealBrandId(payload.brand_id, effectiveUserId);

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
      media_url: payload.media_url || '',
      aspect_ratio: payload.aspect_ratio || '1:1',
      comments_count: 0,
    };

    // Verifikasi izin pembuatan: harus Owner, Editor, atau Reviewer (Viewer dilarang!)
    const targetBrandId = payload.brand_id || realBrandId;
    const role = await BrandService.getUserBrandRole(targetBrandId, effectiveUserId);
    if (!role) {
      throw new Error('Akses Ditolak: Anda tidak terdaftar sebagai pemilik atau anggota tim brand ini.');
    }
    if (role === 'viewer') {
      throw new Error('Akses Ditolak: Peran Viewer hanya memiliki hak baca dan tidak dapat membuat postingan baru.');
    }

    if (supabase) {
      try {
        const finalNotes = this.embedMediaInNotes(payload.notes, payload.media_url);
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

        if (realBrandId && isUuid(realBrandId)) {
          insertPayload.brand_id = realBrandId;
        }

        if (effectiveUserId && isUuid(effectiveUserId)) {
          insertPayload.created_by = effectiveUserId;
        }

        const { data, error } = await (supabase.from('posts' as any) as any).insert(insertPayload).select().single();
        if (!error && data) {
          const d = data as any;
          const { notes: cleanNotes, mediaUrl } = this.extractMediaAndNotes(d.notes);
          const created: DummyPost = {
            ...newPost,
            id: d.id,
            brand_id: d.brand_id || newPost.brand_id,
            notes: cleanNotes || newPost.notes,
            media_url: payload.media_url || mediaUrl || newPost.media_url,
          };
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
      const role = await BrandService.getUserBrandRole(targetBrandId, userId);
      if (!role) {
        throw new Error('Akses Ditolak: Anda tidak memiliki akses ke brand postingan ini.');
      }
      if (role === 'viewer') {
        throw new Error('Akses Ditolak: Peran Viewer hanya memiliki hak baca dan tidak dapat mengubah isi postingan.');
      }
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
        if (updates.notes !== undefined || updates.media_url !== undefined) {
          const notesText = updates.notes !== undefined ? updates.notes : '';
          const media = updates.media_url !== undefined ? updates.media_url : '';
          dbUpdates.notes = this.embedMediaInNotes(notesText, media);
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
      media_url: updates.media_url || '',
      aspect_ratio: '1:1',
      comments_count: 0,
    };

    const mergedPost: DummyPost = {
      ...resolvedBase,
      ...updates,
      id, // Preserve ID
    };

    // Pastikan tersimpan ke localStorage (uda_custom_posts) baik postingan dummy maupun uuid
    const existingIdx = currentStored.findIndex((p) => p.id === id);
    let updatedStored: DummyPost[];
    if (existingIdx !== -1) {
      updatedStored = currentStored.map((p) => (p.id === id ? mergedPost : p));
    } else {
      updatedStored = [mergedPost, ...currentStored];
    }
    saveStoredPosts(updatedStored);

    // Update in-memory localPosts
    const index = localPosts.findIndex((p) => p.id === id);
    if (index !== -1) {
      localPosts[index] = mergedPost;
    } else {
      localPosts.unshift(mergedPost);
    }

    // Broadcast event real-time ke semua halaman (Papan Kanban, Kalender, Daftar Postingan, Beranda)
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
      if (!role) {
        throw new Error('Akses Ditolak: Anda tidak memiliki akses ke postingan ini.');
      }
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

