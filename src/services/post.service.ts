import { createClient } from '@/lib/supabase/client';
import { initialPosts } from '@/lib/supabase/mock-data';
import { Post, PostStatus } from '@/types/database.types';

let mockPosts: Post[] = [...initialPosts];

export interface PostFilterOptions {
  brandId?: string;
  pillarId?: string;
  status?: PostStatus;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export class PostService {
  static async getPosts(filters: PostFilterOptions = {}): Promise<Post[]> {
    const supabase = createClient();
    if (supabase) {
      let query = supabase.from('posts').select('*').order('scheduled_at', { ascending: true, nullsFirst: false });

      if (filters.brandId) query = query.eq('brand_id', filters.brandId);
      if (filters.pillarId) query = query.eq('pillar_id', filters.pillarId);
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.startDate) query = query.gte('scheduled_at', filters.startDate);
      if (filters.endDate) query = query.lte('scheduled_at', filters.endDate);
      if (filters.search) query = query.ilike('title', `%${filters.search}%`);

      const { data, error } = await query;
      if (!error && data) return data as Post[];
    }

    // Local in-memory filter
    let results = [...mockPosts];
    if (filters.brandId) results = results.filter((p) => p.brand_id === filters.brandId);
    if (filters.pillarId) results = results.filter((p) => p.pillar_id === filters.pillarId);
    if (filters.status) results = results.filter((p) => p.status === filters.status);
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

  static async getPostById(id: string): Promise<Post | null> {
    const supabase = createClient();
    if (supabase) {
      const { data, error } = await supabase.from('posts').select('*').eq('id', id).single();
      if (!error && data) return data as Post;
    }
    return mockPosts.find((p) => p.id === id) || null;
  }

  static async getTodaySchedule(brandId?: string): Promise<Post[]> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return this.getPosts({
      brandId,
      startDate: startOfDay.toISOString(),
      endDate: endOfDay.toISOString(),
    });
  }

  static async getMissedPosts(brandId?: string): Promise<Post[]> {
    const now = new Date().toISOString();
    const all = await this.getPosts({ brandId });
    // Posts scheduled before now that are not yet published
    return all.filter((p) => p.scheduled_at && p.scheduled_at < now && p.status === 'scheduled');
  }

  static async createPost(payload: Partial<Post> & { brand_id: string; title: string; user_id?: string }): Promise<Post> {
    const newPost: Post = {
      id: `post-${Date.now()}`,
      brand_id: payload.brand_id,
      pillar_id: payload.pillar_id || null,
      title: payload.title,
      caption: payload.caption || '',
      hashtags: payload.hashtags || [],
      platforms: payload.platforms || ['instagram'],
      content_type: payload.content_type || 'feed',
      assigned_to: payload.assigned_to || null,
      scheduled_at: payload.scheduled_at || null,
      published_at: null,
      status: payload.status || 'draft',
      review_notes: payload.review_notes || null,
      created_by: payload.user_id || 'user-001',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const supabase = createClient();
    if (supabase) {
      const { data, error } = await supabase.from('posts').insert({
        brand_id: newPost.brand_id,
        pillar_id: newPost.pillar_id,
        title: newPost.title,
        caption: newPost.caption,
        hashtags: newPost.hashtags,
        platforms: newPost.platforms,
        content_type: newPost.content_type,
        assigned_to: newPost.assigned_to,
        scheduled_at: newPost.scheduled_at,
        status: newPost.status,
        created_by: newPost.created_by,
      } as any).select().single();
      if (!error && data) return data as Post;
    }

    mockPosts.unshift(newPost);
    return newPost;
  }

  static async updatePost(id: string, updates: Partial<Post>): Promise<Post | null> {
    const supabase = createClient();
    if (supabase) {
      const { data, error } = await (supabase.from('posts' as any) as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (!error && data) return data as Post;
    }

    const index = mockPosts.findIndex((p) => p.id === id);
    if (index !== -1) {
      mockPosts[index] = { ...mockPosts[index], ...updates, updated_at: new Date().toISOString() };
      return mockPosts[index];
    }
    return null;
  }

  static async updateStatus(id: string, status: PostStatus, reviewNotes?: string): Promise<Post | null> {
    const updates: Partial<Post> = { status };
    if (reviewNotes !== undefined) updates.review_notes = reviewNotes;
    if (status === 'published') updates.published_at = new Date().toISOString();
    return this.updatePost(id, updates);
  }

  static async reschedulePost(id: string, newScheduledAt: string): Promise<Post | null> {
    return this.updatePost(id, { scheduled_at: newScheduledAt });
  }

  static async deletePost(id: string): Promise<boolean> {
    const supabase = createClient();
    if (supabase) {
      const { error } = await supabase.from('posts').delete().eq('id', id);
      if (!error) return true;
    }
    mockPosts = mockPosts.filter((p) => p.id !== id);
    return true;
  }
}
