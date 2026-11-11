import { NextRequest, NextResponse } from 'next/server';
import { PostService } from '@/services/post.service';
import { QuotaService } from '@/services/quota.service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const brandId = searchParams.get('brandId') || undefined;
    const pillarId = searchParams.get('pillarId') || undefined;
    const status = (searchParams.get('status') as any) || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const search = searchParams.get('search') || undefined;
    const userId = searchParams.get('userId') || undefined;

    const posts = await PostService.getPosts({
      brandId,
      pillarId,
      status,
      startDate,
      endDate,
      search,
    }, userId);

    return NextResponse.json({ success: true, count: posts.length, data: posts });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const accountId = body.accountId || 'acc-001';

    const quotaCheck = await QuotaService.canCreatePost(accountId);
    if (!quotaCheck.allowed) {
      return NextResponse.json({ success: false, error: quotaCheck.message }, { status: 403 });
    }

    const { createAdminClient } = await import('@/lib/supabase/server');
    const admin = createAdminClient();

    if (admin && body.brand_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.brand_id)) {
      try {
        const finalNotes = PostService.embedMediaInNotes(body.notes, body.media_url, body.media_urls);
        const insertPayload: any = {
          brand_id: body.brand_id,
          title: body.title,
          caption: body.caption || '',
          hashtags: body.hashtags || '',
          platforms: body.platforms || ['instagram'],
          content_type: body.content_type || 'feed',
          status: body.status || 'draft',
          scheduled_at: body.scheduled_at || null,
          pillar_id: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.pillar_id || '') ? body.pillar_id : null,
          notes: finalNotes,
        };

        if (body.user_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.user_id)) {
          insertPayload.created_by = body.user_id;
        }

        const { data: dbPost, error: dbErr } = await (admin.from('posts' as any) as any).insert(insertPayload).select().single();
        if (!dbErr && dbPost) {
          const { notes: cleanNotes, mediaUrl, mediaUrls } = PostService.extractMediaAndNotes(dbPost.notes);
          return NextResponse.json({
            success: true,
            data: {
              id: dbPost.id,
              brand_id: dbPost.brand_id,
              title: dbPost.title,
              caption: dbPost.caption || '',
              hashtags: dbPost.hashtags || '',
              platforms: dbPost.platforms || ['instagram'],
              content_type: dbPost.content_type || 'feed',
              status: dbPost.status || 'draft',
              scheduled_at: dbPost.scheduled_at,
              pillar_id: dbPost.pillar_id,
              assignee_id: dbPost.assigned_to,
              notes: cleanNotes,
              media_url: mediaUrl,
              media_urls: mediaUrls,
              comments_count: 0,
            },
          }, { status: 201 });
        }
      } catch (adminErr) {
        console.warn('Admin POST posts insert warning:', adminErr);
      }
    }

    const post = await PostService.createPost({
      brand_id: body.brand_id,
      pillar_id: body.pillar_id,
      title: body.title,
      caption: body.caption,
      hashtags: body.hashtags,
      platforms: body.platforms,
      content_type: body.content_type,
      assigned_to: body.assigned_to,
      scheduled_at: body.scheduled_at,
      status: body.status || 'draft',
      user_id: body.user_id,
      media_url: body.media_url,
      media_urls: body.media_urls,
      notes: body.notes,
    });

    return NextResponse.json({ success: true, data: post }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Post ID is required' }, { status: 400 });
    }

    const { createAdminClient } = await import('@/lib/supabase/server');
    const adminSupabase = createAdminClient();
    if (adminSupabase && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      try {
        const dbUpdates: any = {};
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.posted_at !== undefined) dbUpdates.posted_at = updates.posted_at;
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.caption !== undefined) dbUpdates.caption = updates.caption;
        if (updates.content_type !== undefined) dbUpdates.content_type = updates.content_type;
        if (updates.scheduled_at !== undefined) dbUpdates.scheduled_at = updates.scheduled_at;
        if (updates.notes !== undefined || updates.media_url !== undefined || updates.media_urls !== undefined) {
          dbUpdates.notes = PostService.embedMediaInNotes(
            updates.notes,
            updates.media_url,
            updates.media_urls
          );
        }
        dbUpdates.updated_at = new Date().toISOString();

        await (adminSupabase.from('posts' as any) as any)
          .update(dbUpdates)
          .eq('id', id);
      } catch (adminErr) {
        console.warn('Admin PATCH posts notice:', adminErr);
      }
    }

    const updated = await PostService.updatePost(id, updates);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Post ID is required' }, { status: 400 });
    }

    const { createAdminClient } = await import('@/lib/supabase/server');
    const adminSupabase = createAdminClient();
    if (adminSupabase && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      try {
        await adminSupabase.from('posts' as any).delete().eq('id', id);
      } catch (delErr) {
        console.warn('Admin DELETE post error:', delErr);
      }
    }

    await PostService.deletePost(id);
    return NextResponse.json({ success: true, message: 'Post deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
