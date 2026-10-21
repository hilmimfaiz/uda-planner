/**
 * Utility untuk mendapatkan Base URL (Origin) aplikasi secara dinamis.
 * Memastikan URL yang dihasilkan mengarah ke domain Vercel saat di-deploy,
 * dan tetap mendukung localhost saat pengembangan lokal.
 */
export function getSiteUrl(): string {
  // 1. Jika dijalankan di browser, gunakan origin aktif (otomatis domain Vercel jika dibuka dari Vercel)
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin;
  }

  // 2. Jika ditentukan manual via environment variable NEXT_PUBLIC_SITE_URL
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    const url = process.env.NEXT_PUBLIC_SITE_URL.trim();
    return url.startsWith('http') ? url : `https://${url}`;
  }

  // 3. Environment bawaan Vercel (misal: my-app.vercel.app)
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }

  // 4. Fallback lokal
  return 'http://localhost:3000';
}
