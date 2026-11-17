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
    const id = searchParams.get('id') || undefined;

    const { createAdminClient } = await import('@/lib/supabase/server');
    const admin = createAdminClient();

    // Jika id spesifik diminta, ambil langsung menggunakan admin client agar konsisten dan bebas RLS
    if (admin && id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      const { data: p, error: pErr } = await (admin.from('posts' as any) as any)
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!pErr && p) {
        const { notes: cleanNotes, mediaUrl, mediaUrls, coverUrl } = PostService.extractMediaAndNotes(p.notes);
        const resolvedUrls = mediaUrls && mediaUrls.length > 0
          ? mediaUrls
          : mediaUrl || p.media_url
          ? [mediaUrl || p.media_url]
          : [];
        return NextResponse.json({
          success: true,
          data: {
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
          },
        });
      }
    }

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

    if (!admin) {
      return NextResponse.json({ success: false, error: 'Koneksi database server gagal diinisialisasi.' }, { status: 500 });
    }

    const isBrandUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.brand_id);
    const isUserUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.user_id || '');

    // 1. Dapatkan atau pastikan brand yang sah di Supabase brands table
    let brandRow: any = null;
    let targetBrandId = body.brand_id;

    if (isBrandUuid) {
      const { data: existingBrand } = await (admin.from('brands' as any) as any)
        .select('*')
        .eq('id', body.brand_id)
        .maybeSingle();
      brandRow = existingBrand;
    }

    // Jika brand belum ada di Supabase brands table (misal dibuat saat local storage atau ID bukan UUID):
    if (!brandRow) {
      // Periksa apakah user memiliki brand lain yang sah di Supabase
      if (isUserUuid) {
        const { data: userBrands } = await (admin.from('brands' as any) as any)
          .select('*')
          .eq('owner_id', body.user_id)
          .order('created_at', { ascending: true })
          .limit(1);
        if (userBrands && userBrands.length > 0) {
          brandRow = userBrands[0];
          targetBrandId = brandRow.id;
        }
      }

      // Jika user belum memiliki brand sama sekali di Supabase, buatkan brand otomatis di Supabase
      if (!brandRow) {
        const newBrandId = isBrandUuid ? body.brand_id : crypto.randomUUID();
        const brandName = body.brand_name || body.brandName || 'Brand Utama';
        const brandHandle = (body.brand_handle || brandName).toLowerCase().replace(/[^a-z0-9_.]+/g, '') || 'brand';

        const { data: createdBrand, error: cbErr } = await (admin.from('brands' as any) as any)
          .insert({
            id: newBrandId,
            owner_id: isUserUuid ? body.user_id : null,
            name: brandName,
            handle: brandHandle,
            platforms: body.platforms && body.platforms.length > 0 ? body.platforms : ['instagram'],
            color: '#16A34A',
            avatar_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
            require_approval: false,
            is_archived: false,
          })
          .select()
          .single();

        if (!cbErr && createdBrand) {
          brandRow = createdBrand;
          targetBrandId = createdBrand.id;

          if (isUserUuid) {
            await (admin.from('brand_members' as any) as any)
              .insert({
                brand_id: targetBrandId,
                user_id: body.user_id,
                role: 'owner',
              })
              .catch(() => {});
          }
        }
      }
    }

    // 2. Role-Based Access Control (RBAC):
    // Owner dan Editor DAPAT membuat postingan.
    // Reviewer dan Viewer TIDAK DAPAT membuat postingan.
    let userRole: 'owner' | 'editor' | 'reviewer' | 'viewer' | null = null;
    if (brandRow) {
      if (isUserUuid && brandRow.owner_id === body.user_id) {
        userRole = 'owner';
      } else if (isUserUuid) {
        const { data: member } = await (admin.from('brand_members' as any) as any)
          .select('role')
          .eq('brand_id', targetBrandId)
          .eq('user_id', body.user_id)
          .maybeSingle();
        if (member?.role) {
          userRole = member.role.toLowerCase() as any;
        }
      }
      if (!userRole) userRole = 'owner';
    } else {
      userRole = 'owner';
    }

    if (userRole === 'viewer') {
      return NextResponse.json({ success: false, error: 'Akses Ditolak: Peran Viewer hanya memiliki izin membaca dan tidak dapat membuat postingan.' }, { status: 403 });
    }
    if (userRole === 'reviewer') {
      return NextResponse.json({ success: false, error: 'Akses Ditolak: Peran Reviewer hanya dapat mereview postingan dan tidak dapat membuat postingan baru.' }, { status: 403 });
    }

    // 3. Pastikan foreign key created_by valid di auth.users Supabase
    let finalCreatedBy: string | null = null;
    if (isUserUuid) {
      const { data: authUser } = await admin.auth.admin.getUserById(body.user_id).catch(() => ({ data: null }));
      if (authUser?.user) {
        finalCreatedBy = body.user_id;
      } else if (brandRow?.owner_id) {
        finalCreatedBy = brandRow.owner_id;
      }
    }

    // 4. Pastikan foreign key pillar_id valid di content_pillars Supabase
    let finalPillarId: string | null = null;
    if (body.pillar_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.pillar_id)) {
      const { data: pillarExists } = await (admin.from('content_pillars' as any) as any)
        .select('id')
        .eq('id', body.pillar_id)
        .maybeSingle();
      if (pillarExists) finalPillarId = body.pillar_id;
    }

    // 5. Pastikan foreign key assignee_id valid di auth.users Supabase
    let finalAssigneeId: string | null = null;
    const targetAssignee = body.assignee_id || body.assigned_to;
    if (targetAssignee && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetAssignee)) {
      finalAssigneeId = targetAssignee;
    }

    const isBigBase64 = (s?: string | null) => typeof s === 'string' && s.startsWith('data:') && s.length > 500000;

    // Strip overly large base64 DataURLs from media — hanya simpan URL publik (http/https) atau thumbnail wajar
    const sanitizeMediaUrls = (urls?: any): string[] => {
      if (!Array.isArray(urls)) return [];
      return urls.filter((u: any) => typeof u === 'string' && u.trim().length > 0 && !isBigBase64(u));
    };

    const rawMediaUrl = body.media_url || '';
    const rawMediaUrls = body.media_urls || [];
    const rawCoverUrl = body.cover_url || '';

    const cleanMediaUrl = isBigBase64(rawMediaUrl) ? '' : rawMediaUrl;
    const cleanMediaUrls = sanitizeMediaUrls(rawMediaUrls);
    const cleanCoverUrl = isBigBase64(rawCoverUrl) ? '' : rawCoverUrl;

    const finalNotes = PostService.embedMediaInNotes(body.notes, cleanMediaUrl, cleanMediaUrls.length > 0 ? cleanMediaUrls : (cleanMediaUrl ? [cleanMediaUrl] : []), cleanCoverUrl);
    const formattedHashtags = Array.isArray(body.hashtags)
      ? body.hashtags.join(' ')
      : (body.hashtags || '');

    const insertPayload: any = {
      brand_id: targetBrandId,
      title: body.title || 'Untitled Post',
      caption: body.caption || '',
      hashtags: formattedHashtags,
      platforms: body.platforms && body.platforms.length > 0 ? body.platforms : ['instagram'],
      content_type: body.content_type || 'feed',
      status: body.status || 'draft',
      scheduled_at: body.scheduled_at || null,
      pillar_id: finalPillarId,
      notes: finalNotes,
    };

    if (finalCreatedBy) {
      insertPayload.created_by = finalCreatedBy;
    }
    if (finalAssigneeId) {
      insertPayload.assignee_id = finalAssigneeId;
    }

    const { data: dbPost, error: dbErr } = await (admin.from('posts' as any) as any)
      .insert(insertPayload)
      .select()
      .single();

    if (dbErr) {
      console.error('Database insert error in POST /api/posts:', dbErr);
      return NextResponse.json({ success: false, error: dbErr.message }, { status: 500 });
    }

    if (dbPost) {
      const { notes: cleanNotes, mediaUrl, mediaUrls, coverUrl } = PostService.extractMediaAndNotes(dbPost.notes);
      const resolvedUrls = mediaUrls && mediaUrls.length > 0 ? mediaUrls : (mediaUrl ? [mediaUrl] : (cleanMediaUrls.length > 0 ? cleanMediaUrls : []));
      const resolvedMediaUrl = resolvedUrls[0] || cleanMediaUrl || '';
      const resolvedCoverUrl = coverUrl || cleanCoverUrl || '';

      // Broadcast Realtime ke seluruh anggota brand
      await sendRealtimeBroadcast(`brand_room_${targetBrandId}`, 'post_updated', {
        type: 'created',
        brandId: targetBrandId,
        postId: dbPost.id,
      });
      sendRealtimeBroadcast('brand_posts_room', 'post_updated', {
        type: 'created',
        brandId: targetBrandId,
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
          media_url: resolvedMediaUrl,
          media_urls: resolvedUrls,
          cover_url: resolvedCoverUrl,
          aspect_ratio: '1:1',
          comments_count: 0,
        },
      }, { status: 201 });
    }

    return NextResponse.json({ success: false, error: 'Gagal membuat postingan di database.' }, { status: 500 });
  } catch (error: any) {
    console.error('API POST posts error:', error);
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

    // Reviewer: Hanya boleh update status (review/siap/draft), catatan revisi (notes), dan tanda posting (posted_at)
    if (userRole === 'reviewer') {
      // Hapus kunci yang dilarang agar Reviewer tidak mengubah konten sekaligus tidak terblokir dengan 403
      delete updates.title;
      delete updates.caption;
      delete updates.hashtags;
      delete updates.content_type;
      delete updates.scheduled_at;
      delete updates.brand_id;
      delete updates.pillar_id;
      delete updates.media_url;
      delete updates.media_urls;
      delete updates.cover_url;
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
