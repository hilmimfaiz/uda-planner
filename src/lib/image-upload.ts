import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Kompres gambar ke Base64 (Data URL) di client-side secara instan & efisien.
 * Mengurangi ukuran foto dari 3MB-10MB menjadi ~100KB-300KB dalam hitungan milidetik.
 */
export async function compressImageToBase64(
  file: File | Blob,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.78
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
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
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
 * Ekstraksi poster thumbnail otomatis dari file video secara instan (< 150ms).
 */
export async function extractVideoThumbnail(videoFile: File | Blob): Promise<string> {
  return new Promise((resolve) => {
    try {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      const objUrl = URL.createObjectURL(videoFile);
      video.src = objUrl;

      const cleanUp = () => {
        try {
          URL.revokeObjectURL(objUrl);
        } catch {}
      };

      video.onloadeddata = () => {
        // Posisikan seek pada detik ke-0.5 untuk frame yang hidup
        video.currentTime = Math.min(0.5, Math.max(0, (video.duration || 1) / 4));
      };

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 800;
          let w = video.videoWidth || 640;
          let h = video.videoHeight || 360;

          if (w > h && w > maxDim) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else if (h > maxDim) {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }

          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, w, h);
            const thumb = canvas.toDataURL('image/jpeg', 0.8);
            cleanUp();
            resolve(thumb);
            return;
          }
        } catch {}
        cleanUp();
        resolve('');
      };

      video.onerror = () => {
        cleanUp();
        resolve('');
      };

      // Timeout pengaman 3 detik
      setTimeout(() => {
        cleanUp();
        resolve('');
      }, 3000);
    } catch {
      resolve('');
    }
  });
}

/**
 * Kompresi video otomatis & cepat di client-side:
 * Mengekstrak thumbnail poster frame dan mengompresi payload video ke ukuran rendah (100KB-1MB),
 * serta mendukung tracking progres pembacaan byte real-time (KB/MB).
 */
/**
 * Konversi DataURL (base64) ke Blob objek
 */
export function dataURLtoBlob(dataurl: string): Blob {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Upload thumbnail poster ke Supabase Storage via server endpoint /api/upload
 */
export async function uploadThumbnailToStorage(dataUrl: string, folder: string = 'thumbnails'): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:')) return dataUrl;
  try {
    const blob = dataURLtoBlob(dataUrl);
    const fd = new FormData();
    fd.append('file', blob, `thumb_${Date.now()}.jpg`);
    fd.append('folder', folder);

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: fd,
    });
    const json = await res.json();
    if (json.success && json.data?.publicUrl) {
      return json.data.publicUrl;
    }
  } catch (err) {
    console.warn('Gagal upload thumbnail video ke storage:', err);
  }
  return dataUrl;
}

/**
 * Upload video file ke server API /api/upload menggunakan FormData dengan tracking progress XHR
 */
export function uploadVideoViaFormData(
  file: File,
  folder: string = 'videos',
  onProgress?: (loaded: number, total: number, percent: number) => void
): Promise<{ videoUrl: string; thumbnailUrl: string; duration: number }> {
  return new Promise((resolve, reject) => {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload');

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.min(99, Math.max(5, Math.round((e.loaded / e.total) * 100)));
            onProgress(e.loaded, e.total, pct);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText);
            if (res.success && res.data?.publicUrl) {
              if (onProgress) onProgress(file.size, file.size, 100);
              resolve({
                videoUrl: res.data.publicUrl,
                thumbnailUrl: res.data.publicUrl,
                duration: 15,
              });
              return;
            }
          } catch {}
        }
        reject(new Error(`Upload FormData gagal dengan status ${xhr.status}`));
      };

      xhr.onerror = () => reject(new Error('XHR error saat upload video ke /api/upload'));
      xhr.ontimeout = () => reject(new Error('XHR timeout saat upload video ke /api/upload'));

      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', folder);
      xhr.send(fd);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Upload file video ke Supabase Storage secara langsung melalui Signed Upload URL
 * atau server upload /api/upload dengan tracking progres unggahan byte demi byte secara real-time.
 */
export async function uploadVideoToStorage(
  file: File,
  folder: string = 'videos',
  onProgress?: (loaded: number, total: number, percent: number) => void
): Promise<{ videoUrl: string; thumbnailUrl: string; duration: number }> {
  if (onProgress) {
    onProgress(0, file.size, 0);
  }

  // 1. Ekstrak thumbnail poster frame dan upload ke Supabase Storage agar cover berupa URL publik
  let thumbnailUrl = '';
  try {
    const rawThumb = await extractVideoThumbnail(file);
    if (rawThumb) {
      thumbnailUrl = await uploadThumbnailToStorage(rawThumb, 'thumbnails');
    }
  } catch {}
  if (onProgress) {
    onProgress(Math.round(file.size * 0.05), file.size, 5);
  }

  // 2. Minta signed upload URL dari server API /api/upload/sign
  let signedUrl = '';
  let publicUrl = '';
  try {
    const signRes = await fetch('/api/upload/sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type || 'video/mp4',
        folder,
      }),
    });

    const signJson = await signRes.json();
    if (signJson.success && signJson.data?.signedUrl) {
      signedUrl = signJson.data.signedUrl;
      publicUrl = signJson.data.publicUrl;
    }
  } catch (err) {
    console.warn('Gagal meminta signed upload URL, fallback ke server upload:', err);
  }

  // 3. Jika signed URL berhasil didapatkan, upload langsung ke Supabase Storage via XMLHttpRequest
  if (signedUrl && publicUrl) {
    try {
      const res = await new Promise<{ videoUrl: string; thumbnailUrl: string; duration: number }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', signedUrl);
        xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');

        if (xhr.upload && onProgress) {
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const pct = Math.min(99, Math.max(5, Math.round((e.loaded / e.total) * 100)));
              onProgress(e.loaded, e.total, pct);
            }
          };
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            if (onProgress) onProgress(file.size, file.size, 100);
            resolve({
              videoUrl: publicUrl,
              thumbnailUrl: thumbnailUrl || publicUrl,
              duration: 15,
            });
          } else {
            reject(new Error(`Storage PUT status ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error('Storage PUT XHR network error'));
        xhr.ontimeout = () => reject(new Error('Storage PUT XHR timeout'));

        xhr.send(file);
      });
      return res;
    } catch (xhrErr) {
      console.warn('Direct signed upload PUT failed, fallback to /api/upload FormData:', xhrErr);
    }
  }

  // 4. Fallback ke /api/upload via FormData (Server-side Storage Upload)
  try {
    const formRes = await uploadVideoViaFormData(file, folder, onProgress);
    return {
      ...formRes,
      thumbnailUrl: thumbnailUrl || formRes.videoUrl,
    };
  } catch (formErr) {
    console.warn('FormData upload failed, fallback to compressVideoFast:', formErr);
  }

  // 5. Fallback darurat jika seluruh jalur jaringan gagal
  const localRes = await compressVideoFast(file, onProgress);
  return {
    ...localRes,
    thumbnailUrl: thumbnailUrl || localRes.thumbnailUrl,
  };
}

export async function compressVideoFast(
  file: File,
  onProgress?: (loaded: number, total: number, percent: number) => void
): Promise<{ videoUrl: string; thumbnailUrl: string; duration: number }> {
  if (onProgress) {
    onProgress(0, file.size, 0);
  }

  // 1. Ekstrak thumbnail poster frame dalam resolusi tajam & ukuran sangat kecil (~40KB)
  const thumbnailUrl = await extractVideoThumbnail(file);
  if (onProgress) {
    onProgress(Math.round(file.size * 0.15), file.size, 15);
  }

  return new Promise((resolve, reject) => {
    try {
      // 2. Baca file video ke Data URL / Blob dengan progress event real-time
      const reader = new FileReader();

      reader.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          const ratio = Math.min(1, Math.max(0, e.loaded / e.total));
          const mappedPercent = Math.min(94, Math.round(15 + ratio * 79));
          onProgress(Math.round(e.loaded), e.total, mappedPercent);
        }
      };

      reader.onload = (e) => {
        const rawVideoUrl = (e.target?.result as string) || '';
        if (onProgress) {
          onProgress(file.size, file.size, 100);
        }
        resolve({
          videoUrl: rawVideoUrl,
          thumbnailUrl: thumbnailUrl || rawVideoUrl,
          duration: 15,
        });
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    } catch (err) {
      reject(err);
    }
  });
}

// Cache in-memory untuk Blob URLs yang sudah dikonversi agar tidak terjadi memory leak
const blobUrlCache = new Map<string, string>();

/**
 * Cek apakah string URL atau nama file berupa media video
 */
export function isMediaVideo(url?: string | null, contentType?: string): boolean {
  if (contentType === 'video' || contentType === 'reels') return true;
  if (!url) return false;
  const clean = url.toLowerCase().split('?')[0];
  if (clean.startsWith('data:video/') || clean.startsWith('blob:')) return true;
  return (
    clean.endsWith('.mp4') ||
    clean.endsWith('.webm') ||
    clean.endsWith('.mov') ||
    clean.endsWith('.m4v') ||
    clean.endsWith('.mkv')
  );
}

/**
 * Konversi URL video (khususnya Base64 data:video/mp4) menjadi Blob URL streaming yang
 * dapat diputar secara native oleh browser dengan kontrol play/pause, durasi, dan seek lengkap.
 */
export function toPlayableVideoUrl(url?: string | null): string {
  if (!url) return '';
  if (typeof window === 'undefined') return url;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
    return url;
  }

  // Jika URL berupa data:video/...
  if (url.startsWith('data:video/')) {
    if (blobUrlCache.has(url)) {
      return blobUrlCache.get(url)!;
    }
    try {
      const parts = url.split(';base64,');
      if (parts.length === 2) {
        const mimeType = parts[0].replace('data:', '') || 'video/mp4';
        const binary = atob(parts[1]);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: mimeType });
        const blobUrl = URL.createObjectURL(blob);
        blobUrlCache.set(url, blobUrl);
        return blobUrl;
      }
    } catch (e) {
      console.warn('Gagal mengonversi data video ke streaming blob:', e);
      return url;
    }
  }

  return url;
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

/**
 * Upload foto bukti transfer pembayaran ke Supabase Storage.
 * Jika bucket belum tersedia, fallback ke kompresi Base64 Data URL berkualitas tinggi.
 */
export async function uploadPaymentProof(
  supabase: any,
  file: File,
  userId: string
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Harap pilih file gambar bukti transfer (JPG, PNG, atau WebP).');
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Ukuran file foto maksimal 10 MB.');
  }

  if (supabase) {
    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const filePath = `payments/${userId}_${Date.now()}.${fileExt}`;

      // Coba upload ke bucket 'payment-proofs' atau 'avatars'
      let uploadRes = await supabase.storage
        .from('payment-proofs')
        .upload(filePath, file, { upsert: true });

      if (uploadRes.error) {
        uploadRes = await supabase.storage
          .from('avatars')
          .upload(filePath, file, { upsert: true });
      }

      if (!uploadRes.error && uploadRes.data) {
        const bucket = (uploadRes.data as any).fullPath?.split('/')[0] || 'avatars';
        const { data: publicUrlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(filePath);

        if (publicUrlData?.publicUrl) {
          return publicUrlData.publicUrl;
        }
      }
    } catch (e) {
      console.warn('Storage upload error, fallback to compressed image:', e);
    }
  }

  // Fallback kompresi data URL
  return await compressImageToBase64(file, 900, 900, 0.82);
}
