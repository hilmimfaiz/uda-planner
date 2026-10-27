import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const pathname = request.nextUrl.pathname;

  // Lewati static assets, internal Next.js requests, dan API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return supabaseResponse;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    '';

  if (!supabaseUrl || !supabaseKey) {
    return supabaseResponse;
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    const isProtectedArea = pathname.startsWith('/app') || pathname.startsWith('/admin');
    const isGuestOnlyArea = pathname === '/masuk' || pathname === '/daftar';

    // 1. Rute publik: teruskan langsung tanpa perlu memverifikasi session di server
    if (!isProtectedArea && !isGuestOnlyArea) {
      return supabaseResponse;
    }

    // 2. Periksa cookie auth Supabase & UdaPlanner
    const allCookies = request.cookies.getAll();
    const hasAuthCookie = allCookies.some(
      (c) => c.name.includes('-auth-token') || c.name === 'uda_auth_token'
    );

    // Jika menuju area aplikasi tapi sama sekali tidak ada cookie auth, redirect instan
    if (isProtectedArea && !hasAuthCookie) {
      const url = request.nextUrl.clone();
      url.pathname = '/masuk';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }

    // Jika menuju area guest tapi tidak ada cookie auth, langsung izinkan
    if (isGuestOnlyArea && !hasAuthCookie) {
      return supabaseResponse;
    }

    // 3. Hanya jika memiliki cookie auth, verifikasi user secara aman dengan fallback catch
    const { data } = await supabase.auth
      .getUser()
      .catch(() => ({ data: { user: null }, error: null }));
    const user = data?.user ?? null;

    if (!user && isProtectedArea) {
      // Jika cookie auth ada, jangan langsung redirect ke /masuk di middleware agar client-side auth guard yang memverifikasi
      if (hasAuthCookie) {
        return supabaseResponse;
      }
      const url = request.nextUrl.clone();
      url.pathname = '/masuk';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }

    if (user && isGuestOnlyArea) {
      const url = request.nextUrl.clone();
      url.pathname = '/app';
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  } catch (error) {
    // Pengaman utama: JANGAN PERNAH melempar 500 di middleware!
    // Jika ada error jaringan atau parsing, teruskan request dan serahkan penanganan ke client-side auth guard
    return NextResponse.next({ request });
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files with extensions
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
