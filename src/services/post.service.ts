import { createClient } from '@/lib/supabase/client';
import { DUMMY_POSTS, DummyPost } from '@/lib/dummy-data';
import { BrandService, isUuid } from './brand.service';

const STORAGE_KEY = 'uda_custom_posts';

const getStoredPosts = (): DummyPost[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
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
  static async getPosts(filters: PostFilterOptions = {}): Promise<DummyPost[]> {
    const supabase = createClient();
    const stored = getStoredPosts();

    if (supabase) {
      try {
        let query = supabase.from('posts' as any).select('*').order('created_at', { ascending: false });

        if (filters.brandId && filters.brandId !== 'all' && isUuid(filters.brandId)) {
          query = query.eq('brand_id', filters.brandId);
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
          const dbPosts: DummyPost[] = data.map((p: any) => ({
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
            notes: p.notes || null,
            posted_at: p.posted_at || null,
            posted_url: p.posted_url || null,
            media_url: p.media_url || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600',
            aspect_ratio: '1:1',
            comments_count: 0,
          }));

          const dbIds = new Set(dbPosts.map((p) => p.id));
          const combined = [
            ...dbPosts,
            ...stored.filter((st) => !dbIds.has(st.id)),
            ...localPosts.filter((lp) => !dbIds.has(lp.id) && !stored.some((st) => st.id === lp.id)),
          ];

          return this.filterPostsLocally(combined, filters);
        }
      } catch (err) {
        console.warn('PostService.getPosts db error, using local:', err);
      }
    }

    const storedIds = new Set(stored.map((s) => s.id));
    const combined = [...stored, ...localPosts.filter((lp) => !storedIds.has(lp.id))];
    return this.filterPostsLocally(combined, filters);
  }

  /**
   * Mengambil jadwal postingan KHUSUS hari ini (tanggal hari ini di zona waktu lokal/WIB)
   */
  static async getTodayPosts(filters: Omit<PostFilterOptions, 'startDate' | 'endDate'> = {}): Promise<DummyPost[]> {
    return this.getPostsForDate(new Date(), filters);
  }

  /**
   * Mengambil jadwal postingan untuk tanggal tertentu secara presisi
   */
  static async getPostsForDate(targetDate: Date, filters: Omit<PostFilterOptions, 'startDate' | 'endDate'> = {}): Promise<DummyPost[]> {
    const all = await this.getPosts(filters);
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

  static async getPostById(id: string): Promise<DummyPost | null> {
    const supabase = createClient();
    if (supabase && isUuid(id)) {
      try {
        const { data, error } = await supabase.from('posts' as any).select('*').eq('id', id).maybeSingle();
        if (!error && data) {
          const d = data as any;
          return {
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
            notes: d.notes || null,
            posted_at: d.posted_at || null,
            posted_url: d.posted_url || null,
            media_url: d.media_url || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600',
            aspect_ratio: '1:1',
            comments_count: 0,
          };
        }
      } catch (err) {
        console.warn('PostService.getPostById db fallback:', err);
      }
    }

    const stored = getStoredPosts();
    const found = stored.find((p) => p.id === id);
    if (found) return found;

    return localPosts.find((p) => p.id === id) || null;
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

    // Resolusikan brand_id ke UUID riil Supabase
    const realBrandId = await BrandService.getRealBrandId(payload.brand_id, effectiveUserId);

    const fallbackId = `post-${Date.now()}`;
    const newPost: DummyPost = {
      id: fallbackId,
      brand_id: realBrandId || payload.brand_id,
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
      media_url: payload.media_url || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600',
      aspect_ratio: payload.aspect_ratio || '1:1',
      comments_count: 0,
    };

    if (supabase) {
      try {
        const insertPayload: any = {
          brand_id: realBrandId,
          title: payload.title,
          caption: payload.caption || '',
          hashtags: formattedHashtags,
          platforms: payload.platforms || ['instagram'],
          content_type: payload.content_type || 'feed',
          status: payload.status || 'draft',
          scheduled_at: payload.scheduled_at || null,
          pillar_id: isUuid(payload.pillar_id || '') ? payload.pillar_id : null,
          notes: payload.notes || null,
        };

        if (effectiveUserId && isUuid(effectiveUserId)) {
          insertPayload.created_by = effectiveUserId;
        }

        const { data, error } = await (supabase.from('posts' as any) as any).insert(insertPayload).select().single();
        if (!error && data) {
          const d = data as any;
          const created: DummyPost = {
            ...newPost,
            id: d.id,
            brand_id: d.brand_id,
          };
          localPosts.unshift(created);
          const currentStored = getStoredPosts();
          saveStoredPosts([created, ...currentStored.filter((p) => p.id !== created.id)]);
          return created;
        } else if (error) {
          console.error('PostService.createPost Supabase insert error:', error.message, error.details);
        }
      } catch (err) {
        console.warn('PostService.createPost db error, using local:', err);
      }
    }

    localPosts.unshift(newPost);
    const currentStored = getStoredPosts();
    saveStoredPosts([newPost, ...currentStored.filter((p) => p.id !== newPost.id)]);
    return newPost;
  }

  static async updatePost(id: string, updates: Partial<DummyPost>): Promise<DummyPost | null> {
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
        if (updates.pillar_id !== undefined) {
          dbUpdates.pillar_id = isUuid(updates.pillar_id || '') ? updates.pillar_id : null;
        }
        if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
        if (updates.posted_at !== undefined) dbUpdates.posted_at = updates.posted_at;
        if (updates.posted_url !== undefined) dbUpdates.posted_url = updates.posted_url;
        dbUpdates.updated_at = new Date().toISOString();

        await (supabase.from('posts' as any) as any)
          .update(dbUpdates)
          .eq('id', id);
      } catch (err) {
        console.warn('PostService.updatePost db error:', err);
      }
    }

    const currentStored = getStoredPosts();
    const updatedStored = currentStored.map((p) => (p.id === id ? { ...p, ...updates } : p));
    saveStoredPosts(updatedStored);

    const index = localPosts.findIndex((p) => p.id === id);
    if (index !== -1) {
      localPosts[index] = { ...localPosts[index], ...updates };
      return localPosts[index];
    }
    return null;
  }

  static async deletePost(id: string): Promise<boolean> {
    const supabase = createClient();
    if (supabase && isUuid(id)) {
      try {
        await supabase.from('posts' as any).delete().eq('id', id);
      } catch (err) {
        console.warn('PostService.deletePost db error:', err);
      }
    }

    const currentStored = getStoredPosts();
    saveStoredPosts(currentStored.filter((p) => p.id !== id));
    localPosts = localPosts.filter((p) => p.id !== id);
    return true;
  }
}

