'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Kanban,
  Grid,
  ShieldCheck,
  ChevronDown,
  ArrowRight,
  Layers,
  FileText,
  Users,
  Sparkles,
} from 'lucide-react';
import { DUMMY_PLANS } from '@/lib/dummy-data';

export default function LandingPage() {
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  const features = [
    {
      icon: CalendarIcon,
      title: 'Satu Kalender Multi-Brand',
      desc: 'Rencanakan konten untuk semua akun brand bisnis dan klien Anda di satu timeline kalender terpadu.',
    },
    {
      icon: Kanban,
      title: 'Papan Status Kanban',
      desc: 'Pantau status dari Ide, Draft, Menunggu Review, Siap Posting, hingga Sudah Posting secara teratur.',
    },
    {
      icon: Grid,
      title: 'Pratinjau Grid Instagram',
      desc: 'Simulasikan tampilan feed 3 kolom Instagram sebelum tayang agar estetika warna dan tema tetap rapi.',
    },
    {
      icon: FileText,
      title: 'Bank Caption & Hashtag',
      desc: 'Simpan template opening hook, CTA, dan kumpulan tag favorit yang bisa disalin dalam 1 klik cepat.',
    },
    {
      icon: Clock,
      title: 'Pengingat Waktu Posting',
      desc: 'Dapatkan alarm pengingat sebelum jadwal tayang, plus integrasi langsung ke Google Calendar & file .ics.',
    },
    {
      icon: Users,
      title: 'Alur Kolaborasi & Review Tim',
      desc: 'Bekerja bersama tim agensi dengan pembagian peran Owner, Editor, Reviewer, serta catatan revisi tertata.',
    },
  ];

  const steps = [
    {
      step: '01',
      title: 'Susun Rencana & Tulis Konten',
      desc: 'Pilih brand, tentukan pilar konten, tulis caption dengan penghitung karakter, dan sisipkan hashtag.',
    },
    {
      step: '02',
      title: 'Atur Jadwal & Review Bersama',
      desc: 'Tentukan tanggal dan jam di kalender. Jika perlu persetujuan, minta review klien atau atasan langsung di aplikasi.',
    },
    {
      step: '03',
      title: 'Salin 1-Klik Saat Jam Posting Tiba',
      desc: 'Buka notifikasi pengingat, klik "Salin caption + hashtag", unduh file desain, lalu posting manual dengan praktis.',
    },
  ];

  const faqs = [
    {
      q: 'Apakah UdaPlanner memposting otomatis ke media sosial?',
      a: 'UdaPlanner berfokus pada perencanaan dan kolaborasi. Anda tetap memposting manual di aplikasi media sosial, namun caption, hashtag, dan desainnya sudah siap tinggal disalin dan diunduh dalam 1 klik tanpa repot.',
    },
    {
      q: 'Bagaimana cara kerja pembayaran paket berlangganan?',
      a: 'Pembayaran dilakukan lewat transfer bank manual (BCA/Mandiri) dengan kode unik 3 digit. Setelah upload bukti transfer, admin akan memverifikasi dan akun Anda langsung aktif.',
    },
    {
      q: 'Apakah anggota tim yang saya undang harus membayar langganan?',
      a: 'Tidak. Anggota tim menggunakan kuota paket dari pemilik brand yang mengundang. Tim Anda bisa langsung berkolaborasi gratis.',
    },
    {
      q: 'Apa yang terjadi jika masa aktif paket Pro atau Tim saya berakhir?',
      a: 'Semua data postingan Anda tetap tersimpan aman. Akun akan kembali ke batas paket Gratis dan brand melebihi kuota akan berstatus Terkunci (hanya-baca) sampai diperpanjang kembali.',
    },
  ];

  return (
    <div style={{ background: '#ffffff', minHeight: '100vh', color: '#0f172a' }}>
      {/* Top Navbar */}
      <nav
        style={{
          height: 70,
          borderBottom: '1px solid #e2e8f0',
          padding: '0 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(8px)',
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="logo-symbol" style={{ width: 34, height: 34, fontSize: '1.1rem' }}>U</div>
          <span style={{ fontWeight: 800, fontSize: '1.25rem', color: '#0f172a', letterSpacing: '-0.02em' }}>
            UdaPlanner
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            className="btn-uda btn-uda-secondary btn-uda-sm"
            onClick={() => router.push('/masuk')}
          >
            Masuk
          </button>
          <button
            className="btn-uda btn-uda-primary btn-uda-sm"
            onClick={() => router.push('/daftar')}
          >
            Coba Gratis
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header style={{ padding: '70px 24px 50px', textAlign: 'center', maxWidth: 960, margin: '0 auto' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 999,
            fontSize: '0.82rem',
            fontWeight: 700,
            color: '#15803d',
            marginBottom: 20,
          }}
        >
          <Sparkles size={14} />
          <span>Aplikasi Perencana Konten Media Sosial UMKM & Agensi</span>
        </div>

        <h1
          style={{
            fontSize: '2.8rem',
            fontWeight: 800,
            lineHeight: 1.2,
            letterSpacing: '-0.03em',
            color: '#0f172a',
            marginBottom: 18,
          }}
        >
          Rencanakan semua konten sosmedmu di satu kalender
        </h1>

        <p style={{ fontSize: '1.1rem', color: '#64748b', maxWidth: 680, margin: '0 auto 32px', lineHeight: 1.6 }}>
          Simpan ide caption, hashtag, dan desain di satu tempat. Atur jadwal tayang, pantau alur review tim,
          dan salin konten dengan 1-klik saat jam posting tiba.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 14 }}>
          <button
            className="btn-uda btn-uda-primary"
            style={{ padding: '12px 28px', fontSize: '1rem' }}
            onClick={() => router.push('/daftar')}
          >
            <span>Mulai Gratis Sekarang</span>
            <ArrowRight size={18} />
          </button>
          <button
            className="btn-uda btn-uda-secondary"
            style={{ padding: '12px 24px', fontSize: '1rem' }}
            onClick={() => router.push('/app')}
          >
            Lihat Demo Aplikasi
          </button>
        </div>

        {/* Mockup Kalender Interaktif (Dibuat dari komponen asli sesuai PRD Bab 8) */}
        <div
          className="uda-card"
          style={{
            marginTop: 48,
            padding: 18,
            textAlign: 'left',
            boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
            border: '1px solid #cbd5e1',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }} />
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b' }} />
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#10b981' }} />
              <span style={{ fontWeight: 700, fontSize: '0.88rem', marginLeft: 8, color: '#334155' }}>
                Oktober 2026 — Kalender UdaCoding & Multi-Brand
              </span>
            </div>
            <span className="status-pill" style={{ background: '#f0fdf4', color: '#16a34a' }}>
              ✓ Mockup Interaktif
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, textAlign: 'center' }}>
            {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((day) => (
              <div key={day} style={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748b', padding: '4px 0' }}>
                {day}
              </div>
            ))}

            {Array.from({ length: 14 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 68,
                  borderRadius: 6,
                  border: '1px solid #e2e8f0',
                  padding: 4,
                  background: i === 3 ? '#f0fdf4' : '#ffffff',
                }}
              >
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textAlign: 'right' }}>
                  {i + 12}
                </div>
                {i === 1 && (
                  <div style={{ background: '#16a34a18', borderLeft: '3px solid #16a34a', padding: 2, borderRadius: 2, fontSize: '0.62rem', fontWeight: 700, color: '#15803d', textAlign: 'left' }}>
                    Tips RLS Supabase
                  </div>
                )}
                {i === 3 && (
                  <div style={{ background: '#3b82f618', borderLeft: '3px solid #3b82f6', padding: 2, borderRadius: 2, fontSize: '0.62rem', fontWeight: 700, color: '#1d4ed8', textAlign: 'left' }}>
                    Promo Magang
                  </div>
                )}
                {i === 6 && (
                  <div style={{ background: '#f59e0b18', borderLeft: '3px solid #f59e0b', padding: 2, borderRadius: 2, fontSize: '0.62rem', fontWeight: 700, color: '#b45309', textAlign: 'left' }}>
                    Trivia Jumat
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Bagian Masalah -> Solusi */}
      <section style={{ padding: '60px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', marginBottom: 14 }}>
            Ucapkan selamat tinggal pada rencana konten yang berantakan
          </h2>
          <p style={{ color: '#64748b', fontSize: '1rem', maxWidth: 640, margin: '0 auto 40px' }}>
            Rencana di grup WhatsApp hilang? Catatan Google Sheets tercecer? Klien minta revisi bolak-balik?
            UdaPlanner merapikan alur kerja Anda dari ide hingga tayang.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, textAlign: 'left' }}>
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="uda-card" style={{ padding: 22 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                    <Icon size={20} />
                  </div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>{f.title}</h3>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Cara Kerja 3 Langkah */}
      <section style={{ padding: '70px 24px', maxWidth: 960, margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', marginBottom: 40 }}>
          Cara Kerja Mudah dalam 3 Langkah
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24, textAlign: 'left' }}>
          {steps.map((s, i) => (
            <div key={i} className="uda-card" style={{ padding: 24, position: 'relative' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#16a34a', marginBottom: 8 }}>{s.step}</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 8 }}>{s.title}</h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tabel Harga 3 Paket */}
      <section style={{ padding: '60px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>
            Pilihan Paket Sesuai Kebutuhan Tim Anda
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: 40 }}>
            Mulai gratis, upgrade kapan saja lewat transfer bank manual tanpa langganan kartu kredit otomatis.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, textAlign: 'left' }}>
            {DUMMY_PLANS.map((plan) => (
              <div
                key={plan.code}
                className="uda-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderColor: plan.code === 'pro' ? '#16a34a' : '#e2e8f0',
                  borderWidth: plan.code === 'pro' ? 2 : 1,
                }}
              >
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{plan.name}</h3>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, margin: '8px 0 16px' }}>
                    Rp {plan.price.toLocaleString('id-ID')}
                    <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#64748b' }}>
                      {plan.price === 0 ? '' : ' / 30 hari'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.85rem' }}>
                    {plan.features.map((feat, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CheckCircle2 size={16} style={{ color: '#16a34a' }} />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  className={`btn-uda ${plan.code === 'pro' ? 'btn-uda-primary' : 'btn-uda-secondary'}`}
                  style={{ width: '100%', marginTop: 24 }}
                  onClick={() => router.push('/daftar')}
                >
                  Pilih Paket {plan.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section style={{ padding: '70px 24px', maxWidth: 760, margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, textAlign: 'center', marginBottom: 32 }}>
          Pertanyaan yang Sering Diajukan (FAQ)
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {faqs.map((faq, i) => {
            const isOpen = openFaq === i;
            return (
              <div key={i} className="uda-card" style={{ padding: '16px 20px', cursor: 'pointer' }} onClick={() => toggleFaq(i)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>{faq.q}</h4>
                  <ChevronDown
                    size={16}
                    style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease', color: '#64748b' }}
                  />
                </div>
                {isOpen && (
                  <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 12, lineHeight: 1.6 }}>
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Ajakan Penutup */}
      <footer style={{ padding: '60px 24px', background: '#0f172a', color: '#f8fafc', textAlign: 'center' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 12 }}>
            Siap merapikan jadwal konten media sosial Anda?
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: 24 }}>
            Daftar gratis sekarang dan mulai rencanakan postingan pertama dalam hitungan menit.
          </p>
          <button
            className="btn-uda btn-uda-primary"
            style={{ padding: '12px 28px', fontSize: '1rem' }}
            onClick={() => router.push('/daftar')}
          >
            Daftar Akun Gratis Sekarang →
          </button>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 40 }}>
            © 2026 PT UdaCoding Digital Indonesia. Hak Cipta Dilindungi.
          </div>
        </div>
      </footer>
    </div>
  );
}
