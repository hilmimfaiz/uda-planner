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

    // Validate monthly post quota
    const quotaCheck = await QuotaService.canCreatePost(accountId);
    if (!quotaCheck.allowed) {
      return NextResponse.json({ success: false, error: quotaCheck.message }, { status: 403 });
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

    await PostService.deletePost(id);
    return NextResponse.json({ success: true, message: 'Post deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
