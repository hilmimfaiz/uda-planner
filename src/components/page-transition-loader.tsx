'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

function PageTransitionLoaderInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);

  // When pathname or searchParams change, the navigation has completed
  useEffect(() => {
    if (isNavigating) {
      setProgress(100);
      const timer = setTimeout(() => {
        setIsNavigating(false);
        setProgress(0);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [pathname, searchParams]);

  // Intercept clicks on links to start progress and spinner immediately
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      // Find closest anchor tag
      const target = (e.target as HTMLElement)?.closest('a');
      if (!target) return;

      const href = target.getAttribute('href');
      const targetAttr = target.getAttribute('target');

      // Ignore external links, mailto, tel, hashes, or new tab links
      if (
        !href ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('javascript:') ||
        targetAttr === '_blank' ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey
      ) {
        return;
      }

      // If it is an internal route
      const isInternal =
        href.startsWith('/') ||
        href.startsWith(window.location.origin);

      if (isInternal) {
        const currentUrl = window.location.pathname + window.location.search;
        const targetUrl = href.replace(window.location.origin, '');

        if (targetUrl !== currentUrl) {
          setIsNavigating(true);
          setProgress(25);
        }
      }
    };

    // Listen to custom navigation events if triggered programmatically
    const handleStartNav = () => {
      setIsNavigating(true);
      setProgress(30);
    };

    const handleEndNav = () => {
      setProgress(100);
      setTimeout(() => {
        setIsNavigating(false);
        setProgress(0);
      }, 250);
    };

    window.addEventListener('click', handleDocumentClick, true);
    window.addEventListener('uda_navigation_start', handleStartNav);
    window.addEventListener('uda_navigation_end', handleEndNav);

    return () => {
      window.removeEventListener('click', handleDocumentClick, true);
      window.removeEventListener('uda_navigation_start', handleStartNav);
      window.removeEventListener('uda_navigation_end', handleEndNav);
    };
  }, []);

  // Animate progress smoothly while navigating
  useEffect(() => {
    if (!isNavigating) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 85) {
          return prev + Math.floor(Math.random() * 12) + 5;
        }
        return prev;
      });
    }, 150);

    return () => clearInterval(interval);
  }, [isNavigating]);

  if (!isNavigating && progress === 0) return null;

  return (
    <>
      {/* Top progress bar */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          zIndex: 999999,
          pointerEvents: 'none',
          background: 'rgba(22, 163, 74, 0.15)',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #16a34a, #22c55e, #86efac)',
            boxShadow: '0 0 10px rgba(34, 197, 94, 0.7)',
            transition: 'width 0.2s ease-out, opacity 0.25s ease',
            opacity: progress === 100 ? 0 : 1,
          }}
        />
      </div>

      {/* Floating Rotating Spinner Badge (Pojok Kanan Atas) */}
      <div
        style={{
          position: 'fixed',
          top: 14,
          right: 18,
          zIndex: 999999,
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: '#0f172a',
          color: '#ffffff',
          padding: '6px 14px',
          borderRadius: 999,
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
          border: '1.5px solid #22c55e',
          fontSize: '0.8rem',
          fontWeight: 700,
          animation: 'fadeIn 0.2s ease',
        }}
      >
        <Loader2 size={16} className="animate-spin" style={{ color: '#22c55e' }} />
        <span>Memuat...</span>
      </div>
    </>
  );
}

export function PageTransitionLoader() {
  return (
    <Suspense fallback={null}>
      <PageTransitionLoaderInner />
    </Suspense>
  );
}

