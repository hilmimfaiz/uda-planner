import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const fileName = body.fileName || `video_${Date.now()}.mp4`;
    const folder = body.folder || 'videos';

    const cleanExt = fileName.split('.').pop()?.toLowerCase() || 'mp4';
    const cleanBase = fileName
      .replace(/\.[^/.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_')
      .slice(0, 40);

    const filePath = `${folder}/${Date.now()}_${cleanBase}.${cleanExt}`;

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Database server tidak terhubung.' }, { status: 500 });
    }

    // Pastikan bucket post-assets ada dan berstatus public
    try {
      await admin.storage.updateBucket('post-assets', {
        public: true,
        fileSizeLimit: 52428800, // 50MB
      });
    } catch {}

    const { data, error } = await admin.storage
      .from('post-assets')
      .createSignedUploadUrl(filePath);

    if (error || !data) {
      console.error('Error creating signed upload URL:', error);
      return NextResponse.json({ success: false, error: error?.message || 'Gagal membuat URL unggahan.' }, { status: 500 });
    }

    const { data: urlData } = admin.storage.from('post-assets').getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      data: {
        signedUrl: data.signedUrl,
        token: data.token,
        path: filePath,
        publicUrl: urlData.publicUrl,
      },
    });
  } catch (err: any) {
    console.error('API /api/upload/sign error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Terjadi kesalahan sistem.' }, { status: 500 });
  }
}
