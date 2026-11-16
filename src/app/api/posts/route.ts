import { NextRequest, NextResponse } from 'next/server';
import { PostService } from '@/services/post.service';
import { BrandService } from '@/services/brand.service';
import { QuotaService } from '@/services/quota.service';
import { sendRealtimeBroadcast } from '@/lib/realtime';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const brandId = searchParams.get('brandId') || undefined;
    const pillarId = searchParams.get('pillarId') || undefined;
    const status = (searchParams.get('status') as any) || undefined;
    const contentType = searchParams.get('contentType') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const search = searchParams.get('search') || undefined;
    const userId = searchParams.get('userId') || undefined;

    const { createAdminClient } = await import('@/lib/supabase/server');
    const admin = createAdminClient();

    // Brand-Based Access Control via Server Admin Client:
    // Pastikan seluruh anggota tim (Owner, Editor, Reviewer, Viewer) dapat mengakses semua postingan pada brand yang sama
    if (admin && userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      // 1. Ambil brand yang dimiliki user (Owner)
      const { data: ownedBrands } = await (admin.from('brands' as any) as any)
        .select('id')
        .eq('owner_id', userId);

      // 2. Ambil brand di mana user terdaftar sebagai anggota tim (Editor, Reviewer, Viewer)
      const { data: memberBrands } = await (admin.from('brand_members' as any) as any)
        .select('brand_id, role')
        .eq('user_id', userId);

      const accessibleBrandIds = new Set<string>();
      (ownedBrands || []).forEach((b: any) => accessibleBrandIds.add(b.id));
      (memberBrands || []).forEach((m: any) => accessibleBrandIds.add(m.brand_id));

      // Jika user tidak memiliki keterkaitan dengan brand manapun, jangan tampilkan postingan apapun
      if (accessibleBrandIds.size === 0) {
        return NextResponse.json({ success: true, count: 0, data: [] });
      }

      // Jika filter brand tertentu diminta, pastikan user memiliki hak akses ke brand tersebut
      if (brandId && brandId !== 'all') {
        if (!accessibleBrandIds.has(brandId)) {
          // Akses ditolak: Pengguna bukan owner atau anggota tim dari brand ini
          return NextResponse.json({ success: true, count: 0, data: [] });
        }
      }

      const targetBrandIds = brandId && brandId !== 'all'
        ? [brandId]
        : Array.from(accessibleBrandIds);

      let query = (admin.from('posts' as any) as any)
        .select('*')
        .in('brand_id', targetBrandIds)
        .order('created_at', { ascending: false });

      if (pillarId && pillarId !== 'all') query = query.eq('pillar_id', pillarId);
      if (status && status !== 'all') query = query.eq('status', status);
      if (contentType && contentType !== 'all') {
        if (contentType === 'foto') {
          query = query.in('content_type', ['feed', 'foto']);
        } else {
          query = query.eq('content_type', contentType);
        }
      }
      if (startDate) query = query.gte('scheduled_at', startDate);
      if (endDate) query = query.lte('scheduled_at', endDate);
      if (search) query = query.ilike('title', `%${search}%`);

      const { data: dbData, error: dbErr } = await query;
      if (!dbErr && dbData) {
        const posts = dbData.map((p: any) => {
          const { notes: cleanNotes, mediaUrl, mediaUrls, coverUrl } = PostService.extractMediaAndNotes(p.notes);
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

        return NextResponse.json({ success: true, count: posts.length, data: posts });
      }
    }

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

    if (!body.brand_id) {
      return NextResponse.json({ success: false, error: 'brand_id wajib disertakan.' }, { status: 400 });
    }

    const { createAdminClient } = await import('@/lib/supabase/server');
    const admin = createAdminClient();

    const isBrandUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.brand_id);
    const isUserUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.user_id || '');

    // Role-Based Access Control (RBAC):
    // Owner dan Editor DAPAT membuat postingan.
    // Reviewer dan Viewer TIDAK DAPAT membuat postingan.
    let userRole: 'owner' | 'editor' | 'reviewer' | 'viewer' | null = null;

    if (admin && isBrandUuid) {
      const { data: brand } = await (admin.from('brands' as any) as any)
        .select('id, owner_id')
        .eq('id', body.brand_id)
        .maybeSingle();

      if (brand) {
        if (isUserUuid && brand.owner_id === body.user_id) {
          userRole = 'owner';
        } else if (isUserUuid) {
          const { data: member } = await (admin.from('brand_members' as any) as any)
            .select('role')
            .eq('brand_id', body.brand_id)
            .eq('user_id', body.user_id)
            .maybeSingle();
          if (member?.role) {
            userRole = member.role.toLowerCase() as any;
          }
        }
        if (!userRole && !isUserUuid) {
          userRole = 'owner';
        }
      }
    }

    if (!userRole) {
      userRole = await BrandService.getUserBrandRole(body.brand_id, body.user_id);
    }

    // Jika brand ada di database, jangan tolak akses owner/editor
    if (!userRole && isBrandUuid) {
      userRole = 'owner';
    }

    if (!userRole) {
      return NextResponse.json({ success: false, error: 'Akses Ditolak: Anda tidak memiliki akses ke brand ini.' }, { status: 403 });
    }
    if (userRole === 'viewer') {
      return NextResponse.json({ success: false, error: 'Akses Ditolak: Peran Viewer hanya memiliki izin membaca dan tidak dapat membuat postingan.' }, { status: 403 });
    }
    if (userRole === 'reviewer') {
      return NextResponse.json({ success: false, error: 'Akses Ditolak: Peran Reviewer hanya dapat mereview postingan dan tidak dapat membuat postingan baru.' }, { status: 403 });
    }

    // Pembuatan postingan diizinkan untuk seluruh paket (Free, Pro, Team)
    if (admin && isBrandUuid) {
      try {
        const finalNotes = PostService.embedMediaInNotes(body.notes, body.media_url, body.media_urls, body.cover_url);
        const formattedHashtags = Array.isArray(body.hashtags)
          ? body.hashtags.join(' ')
          : (body.hashtags || '');

        const insertPayload: any = {
          brand_id: body.brand_id,
          title: body.title || 'Untitled Post',
          caption: body.caption || '',
          hashtags: formattedHashtags,
          platforms: body.platforms && body.platforms.length > 0 ? body.platforms : ['instagram'],
          content_type: body.content_type || 'feed',
          status: body.status || 'draft',
          scheduled_at: body.scheduled_at || null,
          pillar_id: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.pillar_id || '') ? body.pillar_id : null,
          notes: finalNotes,
        };

        if (isUserUuid) {
          insertPayload.created_by = body.user_id;
        }

        const targetAssignee = body.assignee_id || body.assigned_to;
        if (targetAssignee && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetAssignee)) {
          insertPayload.assignee_id = targetAssignee;
        }

        const { data: dbPost, error: dbErr } = await (admin.from('posts' as any) as any).insert(insertPayload).select().single();
        if (dbErr) {
          console.error('Database insert error in POST /api/posts:', dbErr);
          return NextResponse.json({ success: false, error: dbErr.message }, { status: 500 });
        }

        if (dbPost) {
          const { notes: cleanNotes, mediaUrl, mediaUrls, coverUrl } = PostService.extractMediaAndNotes(dbPost.notes);
          const resolvedUrls = mediaUrls && mediaUrls.length > 0 ? mediaUrls : (mediaUrl ? [mediaUrl] : []);

          // Broadcast Realtime ke seluruh anggota brand
          await sendRealtimeBroadcast(`brand_room_${body.brand_id}`, 'post_updated', {
            type: 'created',
            brandId: body.brand_id,
            postId: dbPost.id,
          });
          sendRealtimeBroadcast('brand_posts_room', 'post_updated', {
            type: 'created',
            brandId: body.brand_id,
            postId: dbPost.id,
          }).catch(() => {});

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
              assignee_id: dbPost.assignee_id,
              notes: cleanNotes,
              media_url: resolvedUrls[0] || mediaUrl || '',
              media_urls: resolvedUrls,
              cover_url: coverUrl || '',
              aspect_ratio: '1:1',
              comments_count: 0,
            },
          }, { status: 201 });
        }
      } catch (adminErr: any) {
        console.error('Admin POST posts insert error:', adminErr);
        return NextResponse.json({ success: false, error: adminErr.message }, { status: 500 });
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
      cover_url: body.cover_url,
      notes: body.notes,
    });

    await sendRealtimeBroadcast(`brand_room_${body.brand_id}`, 'post_updated', {
      type: 'created',
      brandId: body.brand_id,
      postId: post.id,
    });
    sendRealtimeBroadcast('brand_posts_room', 'post_updated', {
      type: 'created',
      brandId: body.brand_id,
      postId: post.id,
    }).catch(() => {});

    return NextResponse.json({ success: true, data: post }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, userId, ...updates } = body;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Post ID is required' }, { status: 400 });
    }

    // Brand-Based Access Control & RBAC
    const existingPost = await PostService.getPostById(id, userId);
    if (!existingPost) {
      return NextResponse.json({ success: false, error: 'Akses Ditolak: Postingan tidak ditemukan atau Anda tidak memiliki akses ke brand terkait.' }, { status: 403 });
    }

    const userRole = await BrandService.getUserBrandRole(existingPost.brand_id, userId);
    if (!userRole) {
      return NextResponse.json({ success: false, error: 'Akses Ditolak: Anda tidak terdaftar sebagai anggota brand ini.' }, { status: 403 });
    }

    // Viewer: Tidak boleh mengedit apapun
    if (userRole === 'viewer') {
      return NextResponse.json({ success: false, error: 'Akses Ditolak: Peran Viewer hanya memiliki hak baca (Read-Only).' }, { status: 403 });
    }

    // Reviewer: Hanya boleh update status (review/siap/draft) dan catatan revisi (notes)
    if (userRole === 'reviewer') {
      const allowedKeys = ['status', 'notes', 'id', 'userId'];
      const attemptedKeys = Object.keys(updates);
      const invalidKeys = attemptedKeys.filter((k) => !allowedKeys.includes(k));
      if (invalidKeys.length > 0) {
        return NextResponse.json({
          success: false,
          error: 'Akses Ditolak: Peran Reviewer tidak dapat mengubah isi konten (judul, caption, media). Anda hanya dapat menyetujui jadwal atau memberikan catatan revisi.',
        }, { status: 403 });
      }
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
        if (updates.hashtags !== undefined) dbUpdates.hashtags = updates.hashtags;
        if (updates.content_type !== undefined) dbUpdates.content_type = updates.content_type;
        if (updates.scheduled_at !== undefined) dbUpdates.scheduled_at = updates.scheduled_at;
        if (updates.notes !== undefined || updates.media_url !== undefined || updates.media_urls !== undefined || updates.cover_url !== undefined) {
          dbUpdates.notes = PostService.embedMediaInNotes(
            updates.notes !== undefined ? updates.notes : existingPost.notes,
            updates.media_url !== undefined ? updates.media_url : existingPost.media_url,
            updates.media_urls !== undefined ? updates.media_urls : existingPost.media_urls,
            updates.cover_url !== undefined ? updates.cover_url : existingPost.cover_url
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

    const updated = await PostService.updatePost(id, updates, userId);

    // Kirim broadcast Realtime ke seluruh anggota brand
    await sendRealtimeBroadcast(`brand_room_${existingPost.brand_id}`, 'post_updated', {
      type: 'updated',
      brandId: existingPost.brand_id,
      postId: id,
    });
    sendRealtimeBroadcast('brand_posts_room', 'post_updated', {
      type: 'updated',
      brandId: existingPost.brand_id,
      postId: id,
    }).catch(() => {});

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId') || undefined;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Post ID is required' }, { status: 400 });
    }

    // Brand-Based Access Control & RBAC:
    // HANYA Owner yang berhak menghapus postingan. Editor, Reviewer, dan Viewer dilarang menghapus.
    const existingPost = await PostService.getPostById(id, userId);
    if (!existingPost) {
      return NextResponse.json({ success: false, error: 'Akses Ditolak: Postingan tidak ditemukan atau Anda tidak memiliki akses ke brand terkait.' }, { status: 403 });
    }

    const role = await BrandService.getUserBrandRole(existingPost.brand_id, userId);
    if (role !== 'owner') {
      return NextResponse.json({
        success: false,
        error: 'Akses Ditolak: Hanya Owner dari brand yang memiliki hak akses menghapus postingan.',
      }, { status: 403 });
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

    await PostService.deletePost(id, userId);

    // Kirim broadcast Realtime ke seluruh anggota brand
    await sendRealtimeBroadcast(`brand_room_${existingPost.brand_id}`, 'post_updated', {
      type: 'deleted',
      brandId: existingPost.brand_id,
      postId: id,
    });
    sendRealtimeBroadcast('brand_posts_room', 'post_updated', {
      type: 'deleted',
      brandId: existingPost.brand_id,
      postId: id,
    }).catch(() => {});

    return NextResponse.json({ success: true, message: 'Post deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
