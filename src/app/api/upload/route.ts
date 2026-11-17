import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'videos';

    if (!file) {
      return NextResponse.json({ success: false, error: 'File tidak ditemukan dalam request.' }, { status: 400 });
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Database server tidak terhubung.' }, { status: 500 });
    }

    // Pastikan bucket post-assets siap
    try {
      await admin.storage.updateBucket('post-assets', {
        public: true,
        fileSizeLimit: 52428800, // 50MB
      });
    } catch {}

    const originalName = file.name || `upload_${Date.now()}.mp4`;
    const cleanExt = originalName.split('.').pop()?.toLowerCase() || (file.type.startsWith('image/') ? 'jpg' : 'mp4');
    const cleanBase = originalName
      .replace(/\.[^/.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_')
      .slice(0, 40);

    const filePath = `${folder}/${Date.now()}_${cleanBase}.${cleanExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data: uploadData, error: uploadErr } = await admin.storage
      .from('post-assets')
      .upload(filePath, buffer, {
        contentType: file.type || (cleanExt === 'mp4' ? 'video/mp4' : 'application/octet-stream'),
        upsert: true,
      });

    if (uploadErr || !uploadData) {
      console.error('Storage upload error in /api/upload:', uploadErr);
      return NextResponse.json({ success: false, error: uploadErr?.message || 'Gagal mengunggah file ke storage.' }, { status: 500 });
    }

    const { data: urlData } = admin.storage.from('post-assets').getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      data: {
        path: filePath,
        publicUrl: urlData.publicUrl,
        size: file.size,
        type: file.type,
      },
    });
  } catch (err: any) {
    console.error('API /api/upload error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Terjadi kesalahan sistem saat upload.' }, { status: 500 });
  }
}
