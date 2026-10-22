'use client';

import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, ChevronRight, ChevronLeft, X, HelpCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

import { createClient } from '@/lib/supabase/client';

export interface TourStep {
  targetId?: string; // id element HTML target
  targetSelector?: string; // fallback selector
  title: string;
  description: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  actionHint?: string;
}

interface GuidedTourProps {
  steps: TourStep[];
  tourKey?: string;
  autoStart?: boolean;
  onComplete?: () => void;
}

export function GuidedTour({
  steps,
  tourKey = 'uda_guided_tour_dashboard',
  autoStart = true,
  onComplete,
}: GuidedTourProps) {
  const { user } = useAuth();
  const supabase = createClient();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; placement: string }>({
    top: 0,
    left: 0,
    placement: 'bottom',
  });
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Periksa apakah tour harus dijalankan secara otomatis pada halaman ini
  useEffect(() => {
    try {
      const userId = user?.id;
      const userTourKey = userId ? `${tourKey}_${userId}` : tourKey;

      // 1. Cek apakah halaman ini sudah pernah diselesaikan atau dilewati oleh pengguna ini
      const isCompleted =
        (userId && localStorage.getItem(userTourKey) === 'completed') ||
        (userId && localStorage.getItem(`uda_tour_seen_${tourKey}_${userId}`) === 'true') ||
        localStorage.getItem(tourKey) === 'completed';

      if (isCompleted) {
        return;
      }

      // 2. Evaluasi apakah user adalah akun baru yang berhak mendapatkan panduan otomatis
      const hasNewUserTourFlag =
        (userId && localStorage.getItem('uda_new_user_tour_' + userId) === 'true') ||
        (userId && localStorage.getItem('uda_auto_start_dashboard_tour_' + userId) === 'true') ||
        (typeof window !== 'undefined' && localStorage.getItem('uda_auto_start_dashboard_tour') === 'true');

      const isNewSession =
        typeof window !== 'undefined' &&
        (sessionStorage.getItem('uda_new_user_first_dashboard_visit') === 'true' ||
         localStorage.getItem('uda_user_is_new') === 'true');

      const isFirstTimeAccount =
        user &&
        !user.user_metadata?.has_logged_in_before &&
        (userId ? !localStorage.getItem('uda_has_logged_in_before_' + userId) : true);

      const isNewUser = hasNewUserTourFlag || isNewSession || isFirstTimeAccount;

      // Panduan otomatis berjalan jika autoStart aktif dan user adalah akun baru
      if (!autoStart || !isNewUser) {
        return;
      }

      // Beri sedikit jeda waktu render halaman agar elemen DOM terpasang sempurna
      const timer = setTimeout(() => {
        setIsOpen(true);
        setCurrentStepIndex(0);
      }, 700);
      return () => clearTimeout(timer);
    } catch (e) {
      // ignore
    }
  }, [tourKey, autoStart, user]);

  // Update target rect saat langkah berubah, window resize, atau scroll
  const updateTargetPosition = () => {
    if (!isOpen || currentStepIndex >= steps.length) return;
    const step = steps[currentStepIndex];

    let element: HTMLElement | null = null;
    if (step.targetId) {
      element = document.getElementById(step.targetId);
    }
    if (!element && step.targetSelector) {
      element = document.querySelector(step.targetSelector) as HTMLElement;
    }

    if (element) {
      // Scroll target element ke tengah layar jika berada di luar viewport
      const rect = element.getBoundingClientRect();
      const isVisible =
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth);

      if (!isVisible) {
        if (step.placement === 'top') {
          element.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'nearest' });
        } else {
          element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        }
      }

      const syncRect = () => {
        if (!element) return;
        const updatedRect = element.getBoundingClientRect();
        setTargetRect(updatedRect);
        calculateTooltipPosition(updatedRect, step.placement || 'bottom');
      };

      syncRect();
      // Re-sync setelah scroll selesai agar posisi spotlight presisi
      const scrollTimer = setTimeout(syncRect, 220);
      return () => clearTimeout(scrollTimer);
    } else {
      // Jika elemen target belum siap di DOM, coba re-check dalam 200ms
      if (step.targetId || step.targetSelector) {
        const retryTimer = setTimeout(() => {
          const retryEl = step.targetId
            ? document.getElementById(step.targetId)
            : document.querySelector(step.targetSelector!) as HTMLElement;
          if (retryEl) {
            const rect = retryEl.getBoundingClientRect();
            setTargetRect(rect);
            calculateTooltipPosition(rect, step.placement || 'bottom');
          }
        }, 220);
      }

      // Jika tidak ada elemen target (misal langkah intro selamat datang / penutup), posisikan di tengah layar
      setTargetRect(null);
      const windowW = window.innerWidth;
      const windowH = window.innerHeight;
      const tooltipW = Math.min(420, windowW - 32);
      setTooltipPos({
        top: Math.max(80, windowH / 2 - 140),
        left: Math.max(16, (windowW - tooltipW) / 2),
        placement: 'center',
      });
    }
  };

  const calculateTooltipPosition = (rect: DOMRect, preferredPlacement: string) => {
    const windowW = window.innerWidth;
    const windowH = window.innerHeight;
    const tooltipW = Math.min(420, windowW - 32);
    const tooltipH = 220; // perkiraan tinggi tooltip
    const gap = 16;

    let top = 0;
    let left = 0;
    let finalPlacement = preferredPlacement;

    if (preferredPlacement === 'bottom') {
      if (rect.bottom + tooltipH + gap < windowH) {
        top = rect.bottom + gap;
        left = Math.min(Math.max(16, rect.left + rect.width / 2 - tooltipW / 2), windowW - tooltipW - 16);
      } else {
        // Flip to top jika bawah terpotong
        top = Math.max(16, rect.top - tooltipH - gap);
        left = Math.min(Math.max(16, rect.left + rect.width / 2 - tooltipW / 2), windowW - tooltipW - 16);
        finalPlacement = 'top';
      }
    } else if (preferredPlacement === 'top') {
      if (rect.top - tooltipH - gap > 10) {
        top = rect.top - tooltipH - gap;
        left = Math.min(Math.max(16, rect.left + rect.width / 2 - tooltipW / 2), windowW - tooltipW - 16);
      } else {
        // Jangan pernah flip ke bottom! Tempatkan di bagian atas yang nyaman dan terlihat jelas
        top = Math.max(76, rect.top + 16);
        left = Math.min(Math.max(16, rect.left + rect.width / 2 - tooltipW / 2), windowW - tooltipW - 16);
        finalPlacement = 'top';
      }
    } else if (preferredPlacement === 'center') {
      top = Math.max(80, rect.top + Math.max(20, (rect.height - tooltipH) / 3));
      left = Math.min(Math.max(16, rect.left + rect.width / 2 - tooltipW / 2), windowW - tooltipW - 16);
      finalPlacement = 'center';
    } else if (preferredPlacement === 'right') {
      if (rect.right + tooltipW + gap < windowW) {
        left = rect.right + gap;
        top = Math.min(Math.max(16, rect.top + rect.height / 2 - tooltipH / 2), windowH - tooltipH - 16);
      } else {
        top = rect.bottom + gap;
        left = Math.min(Math.max(16, rect.left), windowW - tooltipW - 16);
        finalPlacement = 'bottom';
      }
    } else {
      top = rect.bottom + gap;
      left = Math.min(Math.max(16, rect.left + rect.width / 2 - tooltipW / 2), windowW - tooltipW - 16);
      finalPlacement = 'bottom';
    }

    // Pastikan tooltip selalu berada dalam batas viewport vertikal dan horizontal
    top = Math.max(16, Math.min(top, windowH - tooltipH - 20));
    left = Math.max(16, Math.min(left, windowW - tooltipW - 16));

    setTooltipPos({ top, left, placement: finalPlacement });
  };

  useEffect(() => {
    if (isOpen) {
      updateTargetPosition();
      const handleResize = () => updateTargetPosition();
      const handleScroll = () => updateTargetPosition();
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll, true);
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [isOpen, currentStepIndex]);

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const markTourFinished = () => {
    try {
      const userId = user?.id;
      const userTourKey = userId ? `${tourKey}_${userId}` : tourKey;
      localStorage.setItem(userTourKey, 'completed');
      localStorage.setItem(tourKey, 'completed');
      if (userId) {
        localStorage.setItem(`uda_tour_seen_${tourKey}_${userId}`, 'true');
      }

      // Khusus jika yang diselesaikan adalah tour dashboard
      if (tourKey === 'uda_guided_tour_dashboard') {
        if (userId) {
          localStorage.removeItem('uda_auto_start_dashboard_tour_' + userId);
          localStorage.setItem('uda_dashboard_tour_seen_' + userId, 'true');
        }
        localStorage.removeItem('uda_auto_start_dashboard_tour');
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('uda_new_user_first_dashboard_visit');
        }

        if (supabase && user?.id) {
          supabase.auth.updateUser({
            data: {
              has_seen_dashboard_tour: true,
            },
          }).catch(() => {});
        }
      }
    } catch (e) {}
  };

  const handleSkip = () => {
    markTourFinished();
    setIsOpen(false);
  };

  const handleComplete = () => {
    markTourFinished();
    setIsOpen(false);
    if (onComplete) onComplete();
  };

  const handleRestart = () => {
    setCurrentStepIndex(0);
    setIsOpen(true);
  };

  const currentStep = steps[currentStepIndex];

  return (
    <>
      {/* Floating Button "Panduan Halaman" */}
{!isOpen && (
  <button
    onClick={handleRestart}
    className="guided-tour-floating-trigger btn-uda"
    title="Buka Panduan Langkah Halaman Ini"
    style={{
      position: 'fixed',
      zIndex: 900,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      backgroundColor: 'var(--primary-light)',
      color: 'var(--text-main)',
      border: '2px solid var(--border-color)',
      boxShadow: '0 3px 10px rgba(0, 0, 0, 0.15)',
      padding: '8px 14px',
      borderRadius: 8,
      fontSize: '0.82rem',
      fontWeight: 800,
      cursor: 'pointer',
    }}
  >
    <BookOpen
      size={16}
      style={{ color: 'var(--dashboard-green-text)' }}
    />
    <span>Panduan Halaman</span>
  </button>
)}

      {/* OVERLAY & SPOTLIGHT PANDUAN INTERAKTIF */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9998,
            pointerEvents: 'auto',
          }}
        >
          {/* Backdrop Overlay TANPA BLUR:
              Jika ada targetRect, area di luar spotlight otomatis diredupkan oleh box-shadow spotlight,
              sehingga elemen target terlihat 100% jernih, tajam, dan tidak kabur/blur sama sekali.
              Jika tidak ada targetRect, overlay gelap transparan ditampilkan tanpa efek blur. */}
          <div
            onClick={handleSkip}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: targetRect ? 'transparent' : 'rgba(15, 23, 42, 0.65)',
              transition: 'all 0.25s ease',
            }}
          />

          {/* Spotlight Highlight Cutout pada Target Element (Jernih, Tajam, Tanpa Blur) */}
          {targetRect && (
            <div
              style={{
                position: 'fixed',
                top: targetRect.top - 8,
                left: targetRect.left - 8,
                width: targetRect.width + 16,
                height: targetRect.height + 16,
                borderRadius: 14,
                boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.72), 0 0 0 3.5px #16a34a, 0 10px 30px rgba(22, 163, 74, 0.35)',
                backgroundColor: 'transparent',
                pointerEvents: 'none',
                zIndex: 9999,
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                animation: 'pulseGlow 2s infinite',
              }}
            />
          )}

          {/* Tooltip Card / Popover */}
          <div
            ref={tooltipRef}
            style={{
              position: 'fixed',
              top: tooltipPos.top,
              left: tooltipPos.left,
              maxWidth: 420,
              width: 'calc(100vw - 32px)',
              backgroundColor: '#ffffff',
              borderRadius: 14,
              border: '3px solid #0f172a',
              boxShadow: '6px 6px 0px #0f172a',
              padding: '24px 22px 20px',
              zIndex: 10000,
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              animation: 'fadeInUp 0.2s ease-out',
            }}
          >
            {/* Header: Badge Progres & Tombol Tutup */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    backgroundColor: '#dcfce7',
                    color: '#15803d',
                    border: '1.5px solid #0f172a',
                    boxShadow: '1.5px 1.5px 0px #0f172a',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    padding: '3px 10px',
                    borderRadius: 6,
                    letterSpacing: '0.02em',
                  }}
                >
                  <BookOpen size={12} />
                  <span>
                    Langkah {currentStepIndex + 1} dari {steps.length}
                  </span>
                </span>
              </div>

              <button
                onClick={handleSkip}
                title="Lewati Panduan"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 4,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#0f172a')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
              >
                <X size={18} />
              </button>
            </div>

            {/* Judul & Deskripsi */}
            <h3
              style={{
                fontSize: '1.2rem',
                fontWeight: 800,
                color: '#0f172a',
                lineHeight: 1.3,
                marginBottom: 8,
              }}
            >
              {currentStep.title}
            </h3>

            <p
              style={{
                fontSize: '0.88rem',
                color: '#475569',
                lineHeight: 1.55,
                marginBottom: currentStep.actionHint ? 10 : 16,
              }}
            >
              {currentStep.description}
            </p>

            {currentStep.actionHint && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  backgroundColor: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  borderRadius: 8,
                  fontSize: '0.8rem',
                  color: '#0284c7',
                  marginBottom: 16,
                }}
              >
                <HelpCircle size={14} style={{ flexShrink: 0 }} />
                <span>{currentStep.actionHint}</span>
              </div>
            )}

            {/* Progress Bar Indikator */}
            <div
              style={{
                width: '100%',
                height: 4,
                backgroundColor: '#f1f5f9',
                borderRadius: 999,
                overflow: 'hidden',
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${((currentStepIndex + 1) / steps.length) * 100}%`,
                  backgroundColor: '#16a34a',
                  transition: 'width 0.3s ease',
                  borderRadius: 999,
                }}
              />
            </div>

            {/* Tombol Kontrol Panduan: Kembali, Lewati, Selanjutnya / Selesai */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <button
                onClick={handleSkip}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '6px 8px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#0f172a')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
              >
                Lewati Panduan
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {currentStepIndex > 0 && (
                  <button
                    onClick={handlePrev}
                    className="btn-uda btn-uda-secondary btn-uda-sm"
                    style={{
                      height: 38,
                      padding: '0 14px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: '0.85rem',
                      fontWeight: 700,
                    }}
                  >
                    <ChevronLeft size={16} />
                    <span>Kembali</span>
                  </button>
                )}

                <button
                  onClick={handleNext}
                  className="btn-uda btn-uda-primary btn-uda-sm"
                  style={{
                    height: 38,
                    padding: '0 16px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)',
                  }}
                >
                  {currentStepIndex === steps.length - 1 ? (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Selesai</span>
                    </>
                  ) : (
                    <>
                      <span>Selanjutnya</span>
                      <ChevronRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
