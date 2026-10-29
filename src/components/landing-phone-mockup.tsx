'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Grid,
  Home,
  User,
  Plus,
  Sparkles,
  CheckCircle2,
  Clock,
  Menu,
  Bell,
  Layers,
  ArrowRight,
  TrendingUp,
  FileText,
  Copy,
  Hash,
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
} from 'lucide-react';

export default function LandingPhoneMockup() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Carousel otomatis berganti setiap 1,5 detik (1500ms)
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % 3);
    }, 1500);

    return () => clearInterval(interval);
  }, [isPaused]);

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        maxWidth: 540,
        width: '100%',
        margin: '0 auto',
        overflow: 'hidden',
      }}
    >
      {/* ============================================================
          CONCENTRIC RIPPLE RINGS (Aesthetic background from reference)
          ============================================================ */}
      <svg
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '46%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '140%',
          height: '140%',
          pointerEvents: 'none',
          zIndex: 0,
        }}
        viewBox="0 0 600 600"
        fill="none"
      >
        <circle cx="300" cy="300" r="270" stroke="#e2e8f0" strokeWidth="1.5" strokeDasharray="4 6" opacity="0.7" />
        <circle cx="300" cy="300" r="215" stroke="#cbd5e1" strokeWidth="1.5" opacity="0.8" />
        <circle cx="300" cy="300" r="160" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="6 6" opacity="0.85" />
        <circle cx="300" cy="300" r="110" stroke="#94a3b8" strokeWidth="1.5" opacity="0.6" />
      </svg>

      {/* Floating Retro Doodle Clouds */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: -15,
          zIndex: 3,
          pointerEvents: 'none',
          animation: 'pulse 4s ease-in-out infinite',
        }}
      >
        <svg width="74" height="42" viewBox="0 0 74 42" fill="none">
          <path
            d="M18 36H56C62 36 68 31 68 25C68 19.5 63.5 15 58 15C57.5 15 56.8 15.1 56.2 15.3C54.2 9.2 48.5 5 42 5C35.5 5 30 8.8 27.6 14.5C26.5 14.2 25.3 14 24 14C17.4 14 12 19.4 12 26C12 31.5 16 36 18 36Z"
            fill="#ffffff"
            stroke="#0f172a"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div
        style={{
          position: 'absolute',
          top: 45,
          right: -25,
          zIndex: 3,
          pointerEvents: 'none',
        }}
      >
        <svg width="68" height="38" viewBox="0 0 74 42" fill="none">
          <path
            d="M18 36H56C62 36 68 31 68 25C68 19.5 63.5 15 58 15C57.5 15 56.8 15.1 56.2 15.3C54.2 9.2 48.5 5 42 5C35.5 5 30 8.8 27.6 14.5C26.5 14.2 25.3 14 24 14C17.4 14 12 19.4 12 26C12 31.5 16 36 18 36Z"
            fill="#ffffff"
            stroke="#0f172a"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* ============================================================
          DYNAMIC FLOATING BADGES BERDASARKAN SLIDE AKTIF
          ============================================================ */}
      {activeSlide === 0 && (
        <>
          <div
            className="scroll-reveal revealed"
            style={{
              position: 'absolute',
              top: 36,
              right: -14,
              zIndex: 10,
              backgroundColor: '#dcfce7',
              color: '#15803d',
              border: '2.5px solid #0f172a',
              borderRadius: 10,
              padding: '8px 14px',
              fontWeight: 800,
              fontSize: '0.82rem',
              boxShadow: '4px 4px 0px #0f172a',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transform: 'rotate(4deg)',
              transition: 'all 0.3s ease',
            }}
          >
            <CheckCircle2 size={16} />
            <span>100% Terjadwal</span>
          </div>

          <div
            className="scroll-reveal revealed"
            style={{
              position: 'absolute',
              bottom: 60,
              left: -20,
              zIndex: 10,
              backgroundColor: '#fef08a',
              color: '#0f172a',
              border: '2.5px solid #0f172a',
              borderRadius: 10,
              padding: '8px 14px',
              fontWeight: 800,
              fontSize: '0.82rem',
              boxShadow: '4px 4px 0px #0f172a',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transform: 'rotate(-4deg)',
              transition: 'all 0.3s ease',
            }}
          >
            <Grid size={15} style={{ color: '#0f172a' }} />
            <span>Preview Grid IG</span>
          </div>

          <div
            className="scroll-reveal revealed"
            style={{
              position: 'absolute',
              bottom: 175,
              right: -24,
              zIndex: 10,
              backgroundColor: '#ffedd5',
              color: '#c2410c',
              border: '2.5px solid #0f172a',
              borderRadius: 10,
              padding: '6px 12px',
              fontWeight: 800,
              fontSize: '0.78rem',
              boxShadow: '3px 3px 0px #0f172a',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              transform: 'rotate(-2deg)',
              transition: 'all 0.3s ease',
            }}
          >
            <Layers size={14} />
            <span>Multi-Brand Aktif</span>
          </div>
        </>
      )}

      {activeSlide === 1 && (
        <>
          <div
            className="scroll-reveal revealed"
            style={{
              position: 'absolute',
              top: 36,
              right: -14,
              zIndex: 10,
              backgroundColor: '#e0f2fe',
              color: '#0284c7',
              border: '2.5px solid #0f172a',
              borderRadius: 10,
              padding: '8px 14px',
              fontWeight: 800,
              fontSize: '0.82rem',
              boxShadow: '4px 4px 0px #0f172a',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transform: 'rotate(3deg)',
              transition: 'all 0.3s ease',
            }}
          >
            <Grid size={16} />
            <span>Visual 3-Kolom Rapi</span>
          </div>

          <div
            className="scroll-reveal revealed"
            style={{
              position: 'absolute',
              bottom: 60,
              left: -20,
              zIndex: 10,
              backgroundColor: '#fae8ff',
              color: '#a21caf',
              border: '2.5px solid #0f172a',
              borderRadius: 10,
              padding: '8px 14px',
              fontWeight: 800,
              fontSize: '0.82rem',
              boxShadow: '4px 4px 0px #0f172a',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transform: 'rotate(-3deg)',
              transition: 'all 0.3s ease',
            }}
          >
            <Sparkles size={15} />
            <span>Harmonisasi Feed</span>
          </div>

          <div
            className="scroll-reveal revealed"
            style={{
              position: 'absolute',
              bottom: 175,
              right: -24,
              zIndex: 10,
              backgroundColor: '#fef9c3',
              color: '#854d0e',
              border: '2.5px solid #0f172a',
              borderRadius: 10,
              padding: '6px 12px',
              fontWeight: 800,
              fontSize: '0.78rem',
              boxShadow: '3px 3px 0px #0f172a',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              transform: 'rotate(2deg)',
              transition: 'all 0.3s ease',
            }}
          >
            <CheckCircle2 size={14} />
            <span>Tone Warna Selaras</span>
          </div>
        </>
      )}

      {activeSlide === 2 && (
        <>
          <div
            className="scroll-reveal revealed"
            style={{
              position: 'absolute',
              top: 36,
              right: -14,
              zIndex: 10,
              backgroundColor: '#ffedd5',
              color: '#c2410c',
              border: '2.5px solid #0f172a',
              borderRadius: 10,
              padding: '8px 14px',
              fontWeight: 800,
              fontSize: '0.82rem',
              boxShadow: '4px 4px 0px #0f172a',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transform: 'rotate(4deg)',
              transition: 'all 0.3s ease',
            }}
          >
            <Copy size={16} />
            <span>1-Klik Salin Caption</span>
          </div>

          <div
            className="scroll-reveal revealed"
            style={{
              position: 'absolute',
              bottom: 60,
              left: -20,
              zIndex: 10,
              backgroundColor: '#dcfce7',
              color: '#16a34a',
              border: '2.5px solid #0f172a',
              borderRadius: 10,
              padding: '8px 14px',
              fontWeight: 800,
              fontSize: '0.82rem',
              boxShadow: '4px 4px 0px #0f172a',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transform: 'rotate(-4deg)',
              transition: 'all 0.3s ease',
            }}
          >
            <Clock size={15} />
            <span>Pengingat Tepat Waktu</span>
          </div>

          <div
            className="scroll-reveal revealed"
            style={{
              position: 'absolute',
              bottom: 175,
              right: -24,
              zIndex: 10,
              backgroundColor: '#f3e8ff',
              color: '#7e22ce',
              border: '2.5px solid #0f172a',
              borderRadius: 10,
              padding: '6px 12px',
              fontWeight: 800,
              fontSize: '0.78rem',
              boxShadow: '3px 3px 0px #0f172a',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              transform: 'rotate(-2deg)',
              transition: 'all 0.3s ease',
            }}
          >
            <Hash size={14} />
            <span>Template Hook Viral</span>
          </div>
        </>
      )}

      {/* ============================================================
          SMARTPHONE DEVICE FRAME (Neo-Brutalist Modern Phone)
          ============================================================ */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          maxWidth: 320,
          backgroundColor: '#0f172a',
          borderRadius: 44,
          padding: '10px',
          border: '3.5px solid #0f172a',
          boxShadow: '10px 10px 0px #0f172a',
          transition: 'transform 0.25s ease, box-shadow 0.25s ease',
        }}
      >
        {/* Inner Phone Screen */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 36,
            overflow: 'hidden',
            border: '2px solid #0f172a',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 520,
          }}
        >
          {/* Status Bar */}
          <div
            style={{
              padding: '12px 20px 4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.72rem',
              fontWeight: 800,
              color: '#0f172a',
            }}
          >
            <span>09:41</span>
            {/* Dynamic Island / Notch */}
            <div
              style={{
                width: 82,
                height: 18,
                backgroundColor: '#0f172a',
                borderRadius: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingRight: 8,
              }}
            >
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.68rem' }}>
              <span>5G</span>
              <div
                style={{
                  width: 18,
                  height: 9,
                  border: '1.5px solid #0f172a',
                  borderRadius: 3,
                  padding: 1,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <div style={{ width: '80%', height: '100%', backgroundColor: '#16a34a', borderRadius: 1 }} />
              </div>
            </div>
          </div>

          {/* App Header Bar (Menu + Profile) */}
          <div
            style={{
              padding: '12px 18px 8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: '1.8px solid #0f172a',
                backgroundColor: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '1.5px 1.5px 0px #0f172a',
              }}
            >
              <Menu size={16} color="#0f172a" />
            </div>

            {/* Profile Pill */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '3px 10px 3px 4px',
                borderRadius: 20,
                border: '1.5px solid #0f172a',
                backgroundColor: '#f8fafc',
                boxShadow: '1.5px 1.5px 0px #0f172a',
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  backgroundColor: '#fde047',
                  border: '1.5px solid #0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '0.72rem',
                  color: '#0f172a',
                }}
              >
                U
              </div>
              <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0f172a' }}>
                Creator
              </span>
            </div>
          </div>

          {/* ============================================================
              SLIDES CONTAINER DENGAN ANIMASI TRANSISI
              ============================================================ */}
          <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
            {/* SLIDE 1: Content Story & Calendar Schedule */}
            <div
              style={{
                padding: '6px 18px 14px',
                position: activeSlide === 0 ? 'relative' : 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                opacity: activeSlide === 0 ? 1 : 0,
                transform: activeSlide === 0 ? 'scale(1) translateX(0)' : 'scale(0.96) translateX(-20px)',
                pointerEvents: activeSlide === 0 ? 'auto' : 'none',
                transition: 'opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1), transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <h3
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 900,
                  lineHeight: 1.25,
                  color: '#0f172a',
                  letterSpacing: '-0.02em',
                  marginBottom: 12,
                }}
              >
                Create Your <br />
                Own Content Story.
              </h3>

              {/* Recommended Cards */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a' }}>Recommended</span>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b' }}>See All &gt;</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1.8px solid #0f172a',
                      borderRadius: 12,
                      overflow: 'hidden',
                      boxShadow: '2.5px 2.5px 0px #0f172a',
                    }}
                  >
                    <div
                      style={{
                        height: 60,
                        background: 'linear-gradient(135deg, #fef08a 0%, #fed7aa 50%, #86efac 100%)',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg width="60" height="42" viewBox="0 0 60 42" fill="none">
                        <polygon points="12,38 24,14 36,38" fill="#ea580c" stroke="#0f172a" strokeWidth="1.5" />
                        <polygon points="28,38 42,8 56,38" fill="#16a34a" stroke="#0f172a" strokeWidth="1.5" />
                        <circle cx="16" cy="12" r="5" fill="#fde047" stroke="#0f172a" strokeWidth="1.2" />
                      </svg>
                      <span
                        style={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          fontSize: '0.58rem',
                          fontWeight: 800,
                          backgroundColor: '#16a34a',
                          color: '#ffffff',
                          padding: '1px 5px',
                          borderRadius: 4,
                          border: '1px solid #0f172a',
                        }}
                      >
                        Siap
                      </span>
                    </div>
                    <div style={{ padding: '6px 8px' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        Tips Reels Edukasi
                      </div>
                      <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                        <Clock size={10} />
                        <span>09:00 WIB</span>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1.8px solid #0f172a',
                      borderRadius: 12,
                      overflow: 'hidden',
                      boxShadow: '2.5px 2.5px 0px #0f172a',
                    }}
                  >
                    <div
                      style={{
                        height: 60,
                        background: 'linear-gradient(135deg, #bae6fd 0%, #c7d2fe 50%, #fbcfe8 100%)',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg width="60" height="42" viewBox="0 0 60 42" fill="none">
                        <polygon points="10,38 30,12 50,38" fill="#0284c7" stroke="#0f172a" strokeWidth="1.5" />
                        <ellipse cx="30" cy="36" rx="24" ry="4" fill="#38bdf8" />
                      </svg>
                      <span
                        style={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          fontSize: '0.58rem',
                          fontWeight: 800,
                          backgroundColor: '#2563eb',
                          color: '#ffffff',
                          padding: '1px 5px',
                          borderRadius: 4,
                          border: '1px solid #0f172a',
                        }}
                      >
                        Draft
                      </span>
                    </div>
                    <div style={{ padding: '6px 8px' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        Desain Feed Promo
                      </div>
                      <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                        <Clock size={10} />
                        <span>14:30 WIB</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* My Schedule */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a' }}>My Schedule</span>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b' }}>See All &gt;</span>
                </div>

                <div
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1.8px solid #0f172a',
                    borderRadius: 12,
                    padding: '7px 10px',
                    boxShadow: '2.5px 2.5px 0px #0f172a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        border: '1.5px solid #0f172a',
                        background: 'linear-gradient(135deg, #86efac 0%, #3b82f6 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Calendar size={18} color="#0f172a" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          color: '#0f172a',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        Promo Campaign Launch
                      </div>
                      <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 600 }}>
                        Instagram • 16:00 WIB
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      backgroundColor: '#0284c7',
                      color: '#ffffff',
                      border: '1.5px solid #0f172a',
                      boxShadow: '1.5px 1.5px 0px #0f172a',
                      borderRadius: 6,
                      padding: '4px 9px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    Detail
                  </div>
                </div>
              </div>
            </div>

            {/* SLIDE 2: Instagram Feed Grid Preview Aesthetic */}
            <div
              style={{
                padding: '6px 18px 14px',
                position: activeSlide === 1 ? 'relative' : 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                opacity: activeSlide === 1 ? 1 : 0,
                transform: activeSlide === 1 ? 'scale(1) translateX(0)' : 'scale(0.96) translateX(20px)',
                pointerEvents: activeSlide === 1 ? 'auto' : 'none',
                transition: 'opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1), transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div>
                  <h3
                    style={{
                      fontSize: '1.08rem',
                      fontWeight: 900,
                      color: '#0f172a',
                      margin: 0,
                      lineHeight: 1.2,
                    }}
                  >
                    Instagram Feed Grid
                  </h3>
                  <span style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 600 }}>
                    Simulasi 3-Kolom Estetik
                  </span>
                </div>
                <span
                  style={{
                    backgroundColor: '#dbeafe',
                    color: '#1d4ed8',
                    border: '1.5px solid #0f172a',
                    padding: '2px 8px',
                    borderRadius: 6,
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    boxShadow: '1.5px 1.5px 0px #0f172a',
                  }}
                >
                  Live Feed
                </span>
              </div>

              {/* 3x2 Feed Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 12 }}>
                {[
                  { title: 'Promo Launch', color: '#16a34a', bg: 'linear-gradient(135deg, #a7f3d0 0%, #34d399 100%)', status: 'Siap' },
                  { title: 'Tutorial Reels', color: '#0284c7', bg: 'linear-gradient(135deg, #bae6fd 0%, #38bdf8 100%)', status: 'Draft' },
                  { title: 'Quote Hari Ini', color: '#8b5cf6', bg: 'linear-gradient(135deg, #ddd6fe 0%, #a78bfa 100%)', status: 'Siap' },
                  { title: 'Review Klien', color: '#ea580c', bg: 'linear-gradient(135deg, #fed7aa 0%, #fb923c 100%)', status: 'Draft' },
                  { title: 'Behind Scenes', color: '#ec4899', bg: 'linear-gradient(135deg, #fbcfe8 0%, #f472b6 100%)', status: 'Siap' },
                  { title: 'Tips Desain', color: '#eab308', bg: 'linear-gradient(135deg, #fef08a 0%, #facc15 100%)', status: 'Draft' },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      aspectRatio: '1/1',
                      borderRadius: 8,
                      border: '1.5px solid #0f172a',
                      background: item.bg,
                      boxShadow: '2px 2px 0px #0f172a',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      padding: 5,
                      overflow: 'hidden',
                    }}
                  >
                    <span
                      style={{
                        alignSelf: 'flex-end',
                        fontSize: '0.52rem',
                        fontWeight: 900,
                        backgroundColor: '#ffffff',
                        color: '#0f172a',
                        border: '1px solid #0f172a',
                        padding: '1px 3px',
                        borderRadius: 3,
                      }}
                    >
                      {item.status}
                    </span>
                    <span
                      style={{
                        fontSize: '0.58rem',
                        fontWeight: 800,
                        color: '#0f172a',
                        lineHeight: 1.1,
                      }}
                    >
                      {item.title}
                    </span>
                  </div>
                ))}
              </div>

              {/* Feed Harmony Stats Bar */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1.5px solid #0f172a',
                  borderRadius: 10,
                  padding: '8px 10px',
                  boxShadow: '2px 2px 0px #0f172a',
                  display: 'flex',
                  justifyContent: 'space-around',
                  textAlign: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#0f172a' }}>18 Konten</div>
                  <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700 }}>Bulan Ini</div>
                </div>
                <div style={{ width: 1, backgroundColor: '#cbd5e1' }} />
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#16a34a' }}>Harmonis</div>
                  <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700 }}>Tone Warna</div>
                </div>
                <div style={{ width: 1, backgroundColor: '#cbd5e1' }} />
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#0284c7' }}>100%</div>
                  <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700 }}>Terjadwal</div>
                </div>
              </div>
            </div>

            {/* SLIDE 3: Caption Bank, Hook & Reminder */}
            <div
              style={{
                padding: '6px 18px 14px',
                position: activeSlide === 2 ? 'relative' : 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                opacity: activeSlide === 2 ? 1 : 0,
                transform: activeSlide === 2 ? 'scale(1) translateX(0)' : 'scale(0.96) translateX(20px)',
                pointerEvents: activeSlide === 2 ? 'auto' : 'none',
                transition: 'opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1), transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div>
                  <h3
                    style={{
                      fontSize: '1.08rem',
                      fontWeight: 900,
                      color: '#0f172a',
                      margin: 0,
                      lineHeight: 1.2,
                    }}
                  >
                    Bank Caption &amp; Tag
                  </h3>
                  <span style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 600 }}>
                    Template Siap Salin 1-Klik
                  </span>
                </div>
                <span
                  style={{
                    backgroundColor: '#fef08a',
                    color: '#854d0e',
                    border: '1.5px solid #0f172a',
                    padding: '2px 8px',
                    borderRadius: 6,
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    boxShadow: '1.5px 1.5px 0px #0f172a',
                  }}
                >
                  Viral Hook
                </span>
              </div>

              {/* Template Card */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1.8px solid #0f172a',
                  borderRadius: 12,
                  padding: '10px',
                  boxShadow: '2.5px 2.5px 0px #0f172a',
                  marginBottom: 10,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0f172a' }}>
                    Hook Promo Diskon Kilat
                  </span>
                  <span
                    style={{
                      fontSize: '0.62rem',
                      color: '#16a34a',
                      fontWeight: 800,
                      backgroundColor: '#dcfce7',
                      padding: '1px 6px',
                      borderRadius: 4,
                      border: '1px solid #16a34a',
                    }}
                  >
                    Tersalin!
                  </span>
                </div>
                <p style={{ fontSize: '0.68rem', color: '#475569', lineHeight: 1.4, margin: '0 0 6px' }}>
                  "Stop buang waktu! Ini strategi susun kalender konten 30 hari yang bikin engagement naik 300%!"
                </p>
                <div style={{ fontSize: '0.64rem', color: '#0284c7', fontWeight: 700 }}>
                  #ContentPlanner #UdaCoding #SocialMediaStrategy
                </div>
              </div>

              {/* Alarm Notification Card */}
              <div
                style={{
                  backgroundColor: '#ecfdf5',
                  border: '1.8px solid #0f172a',
                  borderRadius: 12,
                  padding: '9px 12px',
                  boxShadow: '2.5px 2.5px 0px #0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    border: '1.5px solid #0f172a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Bell size={16} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0f172a' }}>
                    Alarm Jam Tayang: 16:00 WIB
                  </div>
                  <div style={{ fontSize: '0.62rem', color: '#047857', fontWeight: 600 }}>
                    Aset &amp; Caption siap diposting
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom App Navigation Dock */}
          <div
            style={{
              marginTop: 'auto',
              borderTop: '2px solid #0f172a',
              backgroundColor: '#ffffff',
              padding: '6px 16px 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'relative',
            }}
          >
            <div style={{ color: activeSlide === 0 ? '#16a34a' : '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Home size={17} />
              {activeSlide === 0 && (
                <div style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: '#16a34a', marginTop: 2 }} />
              )}
            </div>

            <div style={{ color: activeSlide === 1 ? '#0284c7' : '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Grid size={17} />
              {activeSlide === 1 && (
                <div style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: '#0284c7', marginTop: 2 }} />
              )}
            </div>

            {/* Glowing Center Action Button */}
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                backgroundColor: '#ea580c',
                border: '2px solid #0f172a',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '2px 2px 0px #0f172a',
                marginTop: -16,
              }}
            >
              <Plus size={20} strokeWidth={3} />
            </div>

            <div style={{ color: activeSlide === 2 ? '#8b5cf6' : '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <FileText size={17} />
              {activeSlide === 2 && (
                <div style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: '#8b5cf6', marginTop: 2 }} />
              )}
            </div>

            <div style={{ color: '#94a3b8' }}>
              <User size={17} />
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          CAROUSEL SLIDE INDICATORS (3 Bullets dengan Animasi Aktif)
          ============================================================ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginTop: 18,
          zIndex: 10,
        }}
      >
        {[0, 1, 2].map((idx) => {
          const isActive = activeSlide === idx;
          return (
            <button
              key={idx}
              onClick={() => setActiveSlide(idx)}
              aria-label={`Slide ${idx + 1}`}
              style={{
                height: 10,
                width: isActive ? 28 : 10,
                borderRadius: 999,
                backgroundColor: isActive ? '#16a34a' : '#cbd5e1',
                border: '2px solid #0f172a',
                boxShadow: isActive ? '1.5px 1.5px 0px #0f172a' : 'none',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                padding: 0,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
