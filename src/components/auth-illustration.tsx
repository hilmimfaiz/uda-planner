'use client';

import React from 'react';

interface AuthIllustrationProps {
  variant?: 'login' | 'register';
  title?: string;
  subtitle?: string;
  badgeText?: string;
}

export function AuthIllustration({
  variant = 'login',
  title,
  subtitle,
  badgeText,
}: AuthIllustrationProps) {
  const isRegister = variant === 'register';

  const displayTitle =
    title ||
    (isRegister
      ? 'Mulai Rencanakan Konten Terbaikmu'
      : 'Simplify management with our dashboard');

  const displaySubtitle =
    subtitle ||
    (isRegister
      ? 'Kelola kalender konten bersama tim, bangun konsistensi postingan, dan kembangkan audiens media sosial Anda.'
      : 'Susun kalender editorial, jadwalkan postingan media sosial, dan kelola multi-brand dalam satu platform cerdas.');

  const displayBadge =
    badgeText ||
    (isRegister
      ? 'Registrasi Akun Baru'
      : 'Dashboard Perencana Konten');

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background Decorative Pattern */}
      <div
        style={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 140,
          height: 140,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.08)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          left: -30,
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.06)',
          pointerEvents: 'none',
        }}
      />

      {/* Header Info */}
      <div style={{ position: 'relative', zIndex: 2, padding: '8px 4px 16px' }}>
        {/* Retro Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            backgroundColor: '#facc15',
            color: '#0f172a',
            fontSize: '0.75rem',
            fontWeight: 900,
            padding: '4px 10px',
            borderRadius: 6,
            border: '2px solid #0f172a',
            boxShadow: '2px 2px 0px #0f172a',
            marginBottom: 16,
            letterSpacing: '0.02em',
          }}
        >
          {displayBadge}
        </div>

        <h2
          style={{
            color: '#ffffff',
            fontSize: 'clamp(1.4rem, 2.5vw, 1.85rem)',
            fontWeight: 900,
            lineHeight: 1.25,
            letterSpacing: '-0.02em',
            marginBottom: 10,
            textShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          {displayTitle}
        </h2>

        <p
          style={{
            color: 'rgba(255, 255, 255, 0.88)',
            fontSize: '0.88rem',
            lineHeight: 1.55,
            fontWeight: 500,
            maxWidth: 360,
          }}
        >
          {displaySubtitle}
        </p>
      </div>

      {/* Vector Illustration Container */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          marginTop: 'auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-end',
          paddingTop: 12,
        }}
      >
        {isRegister ? (
          /* ========================================================
             VERSI REGISTER: ROCKET LAUNCH + IG 9-GRID + GROWTH
             ======================================================== */
          <svg
            viewBox="0 0 420 310"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              width: '100%',
              maxWidth: 390,
              height: 'auto',
              filter: 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.15))',
            }}
          >
            {/* Floating Sticker 1: 10x Konsisten */}
            <g transform="translate(14, 16) rotate(-5)">
              <rect
                x="0"
                y="0"
                width="144"
                height="28"
                rx="6"
                fill="#fef08a"
                stroke="#0f172a"
                strokeWidth="2"
              />
              <text x="72" y="18" textAnchor="middle" fill="#854d0e" fontSize="11" fontWeight="800" fontFamily="sans-serif">
                10x Lebih Konsisten
              </text>
            </g>

            {/* Floating Sticker 2: Kolaborasi Tim */}
            <g transform="translate(252, 20) rotate(4)">
              <rect
                x="0"
                y="0"
                width="154"
                height="28"
                rx="6"
                fill="#dcfce7"
                stroke="#0f172a"
                strokeWidth="2"
              />
              <text x="77" y="18" textAnchor="middle" fill="#15803d" fontSize="11" fontWeight="800" fontFamily="sans-serif">
                Kolaborasi Tim Aktif
              </text>
            </g>

            {/* Retro Sparkles */}
            <path
              d="M45 80 L48 88 L56 91 L48 94 L45 102 L42 94 L34 91 L42 88 Z"
              fill="#facc15"
              stroke="#0f172a"
              strokeWidth="1.5"
            />
            <path
              d="M380 90 L382 96 L388 98 L382 100 L380 106 L378 100 L372 98 L378 96 Z"
              fill="#ffffff"
              stroke="#0f172a"
              strokeWidth="1.5"
            />

            {/* Ground / Launchpad Platform */}
            <g id="launch-platform">
              <rect x="25" y="278" width="370" height="12" rx="6" fill="#0f172a" opacity="0.3" />
              <rect x="35" y="268" width="350" height="14" rx="5" fill="#334155" stroke="#0f172a" strokeWidth="2.5" />
              <line x1="45" y1="275" x2="375" y2="275" stroke="#64748b" strokeWidth="2" strokeDasharray="6 4" />
            </g>

            {/* Giant Smartphone: Instagram 9-Grid Preview */}
            <g id="phone-grid" transform="translate(50, 78)">
              {/* Phone Shadow */}
              <rect x="5" y="8" width="130" height="190" rx="18" fill="#0f172a" opacity="0.25" />
              {/* Phone Body */}
              <rect x="0" y="0" width="130" height="190" rx="18" fill="#ffffff" stroke="#0f172a" strokeWidth="2.5" />
              {/* Phone Camera Notch */}
              <rect x="42" y="5" width="46" height="5" rx="2.5" fill="#0f172a" />

              {/* Instagram App Header */}
              <rect x="0" y="15" width="130" height="30" fill="#f8fafc" />
              <circle cx="20" cy="30" r="10" fill="#16a34a" stroke="#0f172a" strokeWidth="1.5" />
              <text x="16.5" y="34" fill="#ffffff" fontSize="9" fontWeight="900">U</text>
              <rect x="36" y="24" width="42" height="4" rx="2" fill="#0f172a" />
              <rect x="36" y="31" width="28" height="3" rx="1.5" fill="#94a3b8" />
              <rect x="88" y="23" width="34" height="14" rx="4" fill="#22c55e" stroke="#0f172a" strokeWidth="1" />
              <text x="94" y="33" fill="#ffffff" fontSize="7.5" fontWeight="900">Follow</text>

              {/* 9-Grid Content Tiles */}
              {/* Row 1 */}
              <rect x="8" y="50" width="35" height="35" rx="4" fill="#38bdf8" stroke="#0f172a" strokeWidth="1.2" />
              <circle cx="25.5" cy="67.5" r="7" fill="#ffffff" opacity="0.8" />
              <rect x="47" y="50" width="35" height="35" rx="4" fill="#f43f5e" stroke="#0f172a" strokeWidth="1.2" />
              <polygon points="64.5,60 72,73 57,73" fill="#ffffff" opacity="0.8" />
              <rect x="86" y="50" width="35" height="35" rx="4" fill="#a855f7" stroke="#0f172a" strokeWidth="1.2" />
              <rect x="94" y="58" width="19" height="19" rx="2" fill="#ffffff" opacity="0.8" />

              {/* Row 2 */}
              <rect x="8" y="89" width="35" height="35" rx="4" fill="#facc15" stroke="#0f172a" strokeWidth="1.2" />
              <path d="M25.5 98 L29 106 L22 106 Z" fill="#0f172a" />
              <rect x="47" y="89" width="35" height="35" rx="4" fill="#22c55e" stroke="#0f172a" strokeWidth="1.2" />
              <circle cx="64.5" cy="106.5" r="6" fill="#ffffff" />
              <rect x="86" y="89" width="35" height="35" rx="4" fill="#fb923c" stroke="#0f172a" strokeWidth="1.2" />
              <ellipse cx="103.5" cy="106.5" rx="8" ry="5" fill="#ffffff" opacity="0.8" />

              {/* Row 3 */}
              <rect x="8" y="128" width="35" height="35" rx="4" fill="#6366f1" stroke="#0f172a" strokeWidth="1.2" />
              <rect x="47" y="128" width="35" height="35" rx="4" fill="#ec4899" stroke="#0f172a" strokeWidth="1.2" />
              <rect x="86" y="128" width="35" height="35" rx="4" fill="#14b8a6" stroke="#0f172a" strokeWidth="1.2" />

              {/* Floating Heart & Bookmark on Grid */}
              <g transform="translate(76, 150)">
                <rect x="0" y="0" width="46" height="20" rx="5" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
                <path d="M6 9 C4.5 6.8 7 4.8 9 6.8 C11 4.8 13.5 6.8 12 9 L9 12 Z" fill="#e11d48" />
                <text x="15" y="13.5" fill="#0f172a" fontSize="8.5" fontWeight="900">1.4k</text>
              </g>
            </g>

            {/* Content Launch Rocket (Flying upward at angle) */}
            <g id="rocket" transform="translate(200, 35) rotate(18)">
              {/* Rocket Exhaust Smoke Clouds */}
              <circle cx="28" cy="120" r="14" fill="#ffffff" opacity="0.85" stroke="#0f172a" strokeWidth="1.5" />
              <circle cx="16" cy="130" r="11" fill="#fef08a" stroke="#0f172a" strokeWidth="1.5" />
              <circle cx="42" cy="128" r="12" fill="#fde047" stroke="#0f172a" strokeWidth="1.5" />
              <circle cx="30" cy="142" r="16" fill="#fed7aa" stroke="#0f172a" strokeWidth="1.5" />

              {/* Rocket Fire Exhaust */}
              <polygon points="18,102 38,102 28,126" fill="#f97316" stroke="#0f172a" strokeWidth="2" />
              <polygon points="22,102 34,102 28,118" fill="#facc15" />

              {/* Rocket Body */}
              <path
                d="M28 10 C12 35 14 96 14 96 L42 96 C42 96 44 35 28 10 Z"
                fill="#ffffff"
                stroke="#0f172a"
                strokeWidth="2.5"
              />
              {/* Rocket Nose Tip */}
              <path
                d="M28 10 C21 24 20 38 20 38 L36 38 C36 38 35 24 28 10 Z"
                fill="#ef4444"
                stroke="#0f172a"
                strokeWidth="2"
              />
              {/* Rocket Porthole Window */}
              <circle cx="28" cy="54" r="8" fill="#38bdf8" stroke="#0f172a" strokeWidth="2" />
              <circle cx="26" cy="52" r="2.5" fill="#ffffff" />

              {/* Rocket Wings / Fins */}
              <polygon points="14,75 2,98 14,94" fill="#ef4444" stroke="#0f172a" strokeWidth="2" />
              <polygon points="42,75 54,98 42,94" fill="#ef4444" stroke="#0f172a" strokeWidth="2" />
              {/* Center Fin */}
              <rect x="26" y="80" width="4" height="16" rx="2" fill="#0f172a" />
            </g>

            {/* Creator Character (Standing, holding tablet with growth chart) */}
            <g id="creator-growth" transform="translate(290, 130)">
              {/* Body */}
              <path
                d="M20 90 C20 60 70 60 70 90 Z"
                fill="#ffffff"
                stroke="#0f172a"
                strokeWidth="2.5"
              />
              <path d="M38 65 L45 74 L52 65" stroke="#0f172a" strokeWidth="2" fill="none" />

              {/* Head */}
              <rect x="40" y="50" width="10" height="12" fill="#fed7aa" stroke="#0f172a" strokeWidth="1.8" />
              <circle cx="45" cy="36" r="18" fill="#fed7aa" stroke="#0f172a" strokeWidth="2.5" />

              {/* Eyes & Smile */}
              <circle cx="39" cy="34" r="2.2" fill="#0f172a" />
              <circle cx="51" cy="34" r="2.2" fill="#0f172a" />
              <ellipse cx="36" cy="40" rx="3" ry="1.8" fill="#fca5a5" />
              <ellipse cx="54" cy="40" rx="3" ry="1.8" fill="#fca5a5" />
              <path d="M41 42 Q45 46 49 42" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" fill="none" />

              {/* Cool Cap / Hat */}
              <path
                d="M26 30 C26 16 64 16 64 30 Z"
                fill="#16a34a"
                stroke="#0f172a"
                strokeWidth="2.5"
              />
              <rect x="22" y="28" width="46" height="5" rx="2.5" fill="#22c55e" stroke="#0f172a" strokeWidth="1.8" />

              {/* Holding Analytics Tablet with Growth Chart 📈 */}
              <g transform="translate(-10, 70)">
                <rect x="0" y="0" width="46" height="32" rx="4" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
                <rect x="3" y="3" width="40" height="7" rx="2" fill="#1e293b" />
                <text x="6" y="8.5" fill="#4ade80" fontSize="5.5" fontWeight="900">Uda Growth</text>
                {/* Growth Chart Line */}
                <polyline
                  points="6,26 14,22 22,24 30,16 38,13"
                  fill="none"
                  stroke="#16a34a"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <circle cx="38" cy="13" r="2" fill="#22c55e" />
              </g>

              {/* Hand holding tablet */}
              <circle cx="-6" cy="85" r="5" fill="#fed7aa" stroke="#0f172a" strokeWidth="1.8" />
              <circle cx="32" cy="85" r="5" fill="#fed7aa" stroke="#0f172a" strokeWidth="1.8" />

              {/* Idea Lightbulb above head 💡 */}
              <g transform="translate(38, -2)">
                <circle cx="7" cy="8" r="7" fill="#facc15" stroke="#0f172a" strokeWidth="1.8" />
                <rect x="4" y="14" width="6" height="4" rx="1" fill="#e2e8f0" stroke="#0f172a" strokeWidth="1.2" />
                <line x1="7" y1="-3" x2="7" y2="-1" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                <line x1="-2" y1="2" x2="0" y2="4" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                <line x1="16" y1="2" x2="14" y2="4" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
              </g>
            </g>
          </svg>
        ) : (
          /* ========================================================
             VERSI LOGIN: WORKSTATION CREATOR ✌️ + DESK MONITOR
             ======================================================== */
          <svg
            viewBox="0 0 420 310"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              width: '100%',
              maxWidth: 390,
              height: 'auto',
              filter: 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.15))',
            }}
          >
            {/* Floating Sticker 1: Jadwal Otomatis */}
            <g transform="translate(16, 22) rotate(-6)">
              <rect
                x="0"
                y="0"
                width="130"
                height="28"
                rx="6"
                fill="#dcfce7"
                stroke="#0f172a"
                strokeWidth="2"
              />
              <rect x="0" y="0" width="130" height="28" rx="6" fill="#22c55e" opacity="0.15" />
              <text x="65" y="18" textAnchor="middle" fill="#15803d" fontSize="11" fontWeight="800" fontFamily="sans-serif">
                100% Terjadwal
              </text>
            </g>

            {/* Floating Sticker 2: Multi-Brand */}
            <g transform="translate(252, 26) rotate(4)">
              <rect
                x="0"
                y="0"
                width="154"
                height="28"
                rx="6"
                fill="#fef08a"
                stroke="#0f172a"
                strokeWidth="2"
              />
              <text x="77" y="18" textAnchor="middle" fill="#854d0e" fontSize="11" fontWeight="800" fontFamily="sans-serif">
                Multi-Brand Sosmed
              </text>
            </g>

            {/* Retro Starburst Accents */}
            <path
              d="M50 85 L53 93 L61 96 L53 99 L50 107 L47 99 L39 96 L47 93 Z"
              fill="#ffffff"
              stroke="#0f172a"
              strokeWidth="1.5"
            />
            <path
              d="M375 95 L377 101 L383 103 L377 105 L375 111 L373 105 L367 103 L373 101 Z"
              fill="#facc15"
              stroke="#0f172a"
              strokeWidth="1.5"
            />

            {/* Desktop Table Base */}
            <g id="table-scene">
              <rect x="30" y="278" width="360" height="12" rx="6" fill="#0f172a" opacity="0.3" />
              <rect x="62" y="222" width="14" height="60" rx="3" fill="#334155" stroke="#0f172a" strokeWidth="2.5" />
              <rect x="344" y="222" width="14" height="60" rx="3" fill="#334155" stroke="#0f172a" strokeWidth="2.5" />
              <rect x="62" y="280" width="22" height="6" rx="2" fill="#0f172a" />
              <rect x="336" y="280" width="22" height="6" rx="2" fill="#0f172a" />

              <rect
                x="38"
                y="212"
                width="344"
                height="16"
                rx="6"
                fill="#fed7aa"
                stroke="#0f172a"
                strokeWidth="2.5"
              />
              <line x1="38" y1="218" x2="382" y2="218" stroke="#f97316" strokeWidth="1.5" opacity="0.4" />
            </g>

            {/* Computer Monitor with UdaPlanner Social Calendar UI */}
            <g id="monitor-scene">
              <rect x="110" y="196" width="30" height="18" fill="#64748b" stroke="#0f172a" strokeWidth="2" />
              <ellipse cx="125" cy="214" rx="28" ry="5" fill="#334155" stroke="#0f172a" strokeWidth="2" />

              <rect
                x="55"
                y="98"
                width="140"
                height="102"
                rx="8"
                fill="#0f172a"
                stroke="#0f172a"
                strokeWidth="2.5"
              />
              <rect x="61" y="104" width="128" height="90" rx="5" fill="#ffffff" />

              <rect x="61" y="104" width="128" height="15" fill="#16a34a" />
              <circle cx="68" cy="111.5" r="2.5" fill="#ffffff" />
              <circle cx="75" cy="111.5" r="2.5" fill="#dcfce7" />
              <circle cx="82" cy="111.5" r="2.5" fill="#dcfce7" />
              <text x="92" y="115" fill="#ffffff" fontSize="7.5" fontWeight="900" fontFamily="sans-serif">
                UdaPlanner
              </text>

              {/* Calendar Mini Grid */}
              <rect x="65" y="124" width="37" height="18" rx="3" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1" />
              <rect x="67" y="126" width="14" height="3" rx="1" fill="#2563eb" />
              <rect x="67" y="131" width="28" height="2" rx="1" fill="#93c5fd" />

              <rect x="106" y="124" width="37" height="18" rx="3" fill="#dcfce7" stroke="#22c55e" strokeWidth="1" />
              <rect x="108" y="126" width="16" height="3" rx="1" fill="#16a34a" />
              <rect x="108" y="131" width="30" height="2" rx="1" fill="#86efac" />

              <rect x="147" y="124" width="38" height="18" rx="3" fill="#fef3c7" stroke="#eab308" strokeWidth="1" />
              <rect x="149" y="126" width="16" height="3" rx="1" fill="#d97706" />
              <rect x="149" y="131" width="28" height="2" rx="1" fill="#fde68a" />

              <rect x="65" y="146" width="37" height="18" rx="3" fill="#f3e8ff" stroke="#a855f7" strokeWidth="1" />
              <rect x="67" y="148" width="15" height="3" rx="1" fill="#9333ea" />
              <rect x="67" y="153" width="26" height="2" rx="1" fill="#d8b4fe" />

              <rect x="106" y="146" width="37" height="18" rx="3" fill="#fee2e2" stroke="#ef4444" strokeWidth="1" />
              <rect x="108" y="148" width="18" height="3" rx="1" fill="#dc2626" />
              <rect x="108" y="153" width="30" height="2" rx="1" fill="#fca5a5" />

              <rect x="147" y="146" width="38" height="18" rx="3" fill="#e0f2fe" stroke="#0284c7" strokeWidth="1" />
              <rect x="149" y="148" width="14" height="3" rx="1" fill="#0284c7" />

              <rect x="65" y="168" width="120" height="20" rx="3" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
              <circle cx="73" cy="178" r="4" fill="#22c55e" />
              <text x="81" y="181" fill="#0f172a" fontSize="7" fontWeight="700" fontFamily="sans-serif">
                8 Konten Siap Terbit Minggu Ini
              </text>
            </g>

            {/* Plant on Desk */}
            <g id="plant-scene">
              <ellipse cx="48" cy="214" rx="10" ry="3" fill="#0f172a" opacity="0.3" />
              <polygon points="41,212 55,212 52,192 44,192" fill="#ea580c" stroke="#0f172a" strokeWidth="2" />
              <ellipse cx="48" cy="186" rx="6" ry="11" fill="#22c55e" stroke="#0f172a" strokeWidth="1.8" />
              <ellipse cx="42" cy="189" rx="5" ry="9" transform="rotate(-25 42 189)" fill="#16a34a" stroke="#0f172a" strokeWidth="1.8" />
              <ellipse cx="54" cy="189" rx="5" ry="9" transform="rotate(25 54 189)" fill="#4ade80" stroke="#0f172a" strokeWidth="1.8" />
            </g>

            {/* Creator Character with Peace sign */}
            <g id="character-scene">
              <rect x="238" y="132" width="46" height="58" rx="8" fill="#1e293b" stroke="#0f172a" strokeWidth="2.5" />
              <line x1="252" y1="190" x2="252" y2="245" stroke="#0f172a" strokeWidth="4" />
              <path d="M236 245 L268 245" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" />

              <path
                d="M228 212 C228 175 294 175 294 212 Z"
                fill="#ffffff"
                stroke="#0f172a"
                strokeWidth="2.5"
              />
              <path d="M250 178 L261 188 L272 178" stroke="#0f172a" strokeWidth="2.5" fill="none" />

              <rect x="254" y="165" width="14" height="14" fill="#fed7aa" stroke="#0f172a" strokeWidth="2" />
              <circle cx="261" cy="146" r="22" fill="#fed7aa" stroke="#0f172a" strokeWidth="2.5" />

              <circle cx="253" cy="144" r="2.8" fill="#0f172a" />
              <circle cx="269" cy="144" r="2.8" fill="#0f172a" />
              <circle cx="254" cy="143" r="0.9" fill="#ffffff" />
              <circle cx="270" cy="143" r="0.9" fill="#ffffff" />
              <ellipse cx="248" cy="150" rx="3.5" ry="2" fill="#fca5a5" opacity="0.7" />
              <ellipse cx="274" cy="150" rx="3.5" ry="2" fill="#fca5a5" opacity="0.7" />
              <path d="M256 153 Q261 159 266 153" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" fill="none" />

              <path
                d="M238 138 C238 120 284 120 284 138 C284 142 278 143 274 140 C270 137 252 137 248 140 C244 143 238 142 238 138 Z"
                fill="#f97316"
                stroke="#0f172a"
                strokeWidth="2.5"
              />
              <ellipse cx="261" cy="122" rx="20" ry="6" fill="#fb923c" stroke="#0f172a" strokeWidth="2" />
              <circle cx="261" cy="116" r="3.5" fill="#facc15" stroke="#0f172a" strokeWidth="1.8" />

              <path
                d="M236 195 Q220 205 210 214"
                stroke="#ffffff"
                strokeWidth="14"
                strokeLinecap="round"
              />
              <path
                d="M236 195 Q220 205 210 214"
                stroke="#0f172a"
                strokeWidth="2.5"
                fill="none"
              />
              <circle cx="208" cy="214" r="6" fill="#fed7aa" stroke="#0f172a" strokeWidth="2" />

              {/* Peace Hand ✌️ */}
              <path
                d="M285 190 Q308 170 314 138"
                stroke="#ffffff"
                strokeWidth="14"
                strokeLinecap="round"
              />
              <path
                d="M285 190 Q308 170 314 138"
                stroke="#0f172a"
                strokeWidth="2.5"
                fill="none"
              />
              <g transform="translate(308, 116)">
                <circle cx="9" cy="18" r="7" fill="#fed7aa" stroke="#0f172a" strokeWidth="2" />
                <rect x="4" y="2" width="4.5" height="15" rx="2.2" fill="#fed7aa" stroke="#0f172a" strokeWidth="2" />
                <rect x="11" y="4" width="4.5" height="15" rx="2.2" fill="#fed7aa" stroke="#0f172a" strokeWidth="2" transform="rotate(15 13 11)" />
                <circle cx="15" cy="20" r="3" fill="#fed7aa" stroke="#0f172a" strokeWidth="1.8" />
              </g>

              <line x1="332" y1="112" x2="340" y2="108" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="336" y1="126" x2="346" y2="128" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="316" y1="98" x2="318" y2="90" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
            </g>

            {/* Laptop */}
            <g id="laptop-scene">
              <rect x="306" y="208" width="54" height="6" rx="2" fill="#e2e8f0" stroke="#0f172a" strokeWidth="2" />
              <polygon
                points="312,208 348,208 356,172 320,172"
                fill="#ef4444"
                stroke="#0f172a"
                strokeWidth="2"
              />
              <circle cx="338" cy="190" r="5" fill="#facc15" stroke="#0f172a" strokeWidth="1.2" />
              <text x="335" y="193" fill="#0f172a" fontSize="6" fontWeight="900">U</text>
              <rect x="323" y="180" width="8" height="4" rx="1" fill="#ffffff" stroke="#0f172a" strokeWidth="1" />
            </g>

            {/* Coffee Mug */}
            <g id="mug-scene">
              <rect x="190" y="202" width="14" height="13" rx="2" fill="#3b82f6" stroke="#0f172a" strokeWidth="1.8" />
              <path d="M204 204 C208 204 208 212 204 212" stroke="#0f172a" strokeWidth="1.8" fill="none" />
              <path d="M194 198 Q192 194 195 190" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.8" />
              <path d="M198 197 Q201 193 199 189" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.8" />
            </g>
          </svg>
        )}
      </div>
    </div>
  );
}
