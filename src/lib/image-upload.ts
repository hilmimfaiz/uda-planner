import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Kompres gambar ke Base64 (Data URL) di client-side.
 * Aman dan kompatibel untuk offline, demo mode, atau saat bucket storage belum siap.
 */
export async function compressImageToBase64(
  file: File,
  maxWidth = 400,
  maxHeight = 400,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', quality));
        } else {
          resolve(event.target?.result as string);
        }
      };
      img.onerror = () => reject(new Error('Gagal memproses gambar.'));
    };
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Upload gambar ke Supabase Storage (bucket 'avatars' atau lainnya).
 * Jika bucket belum dibuat atau terjadi error RLS, otomatis fallback ke Base64 Data URL.
 */
export async function uploadBrandLogo(
  supabase: any,
  file: File,
  brandIdOrHandle: string
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Harap pilih file gambar (JPG, PNG, atau WebP).');
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Ukuran gambar maksimal 5 MB.');
  }

  // Jika Supabase tidak tersedia, langsung fallback base64
  if (!supabase) {
    return await compressImageToBase64(file);
  }

  try {
    const fileExt = file.name.split('.').pop() || 'png';
    const filePath = `brands/${brandIdOrHandle}_${Date.now()}.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (!uploadError && uploadData) {
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      if (publicUrlData?.publicUrl) {
        return publicUrlData.publicUrl;
      }
    }

    // Fallback jika bucket storage avatars belum dibuat atau upload ditolak
    return await compressImageToBase64(file);
  } catch {
    return await compressImageToBase64(file);
  }
}
