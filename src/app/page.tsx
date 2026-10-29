'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Kanban,
  Grid,
  ChevronDown,
  ArrowRight,
  FileText,
  Users,
  Sparkles,
  ShieldCheck,
  Instagram,
  Facebook,
  Twitter,
  Youtube,
  Mail,
  Copy,
  Zap,
  TrendingUp,
  Layers,
  Check,
} from 'lucide-react';
import { PlanService, DynamicPlan } from '@/services/plan.service';
import LandingPhoneMockup from '@/components/landing-phone-mockup';

export default function LandingPage() {
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [plans, setPlans] = useState<DynamicPlan[]>([]);
  const [selectedDurationIndex, setSelectedDurationIndex] = useState<Record<string, number>>({});
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [activeTabFeature, setActiveTabFeature] = useState<'calendar' | 'kanban' | 'grid' | 'snippets'>('calendar');
  const [inquiryEmail, setInquiryEmail] = useState('');
  const [inquiryQuestion, setInquiryQuestion] = useState('');
  const [inquirySubmitted, setInquirySubmitted] = useState(false);
  const [isSubmittingInquiry, setIsSubmittingInquiry] = useState(false);
  const [inquiryError, setInquiryError] = useState<string | null>(null);

  useEffect(() => {
    PlanService.getActivePlans().then((data) => {
      if (data && data.length > 0) {
        setPlans(data);
        const initialDurIdx: Record<string, number> = {};
        data.forEach((p) => {
          initialDurIdx[p.code] = 0;
        });
        setSelectedDurationIndex(initialDurIdx);
      }
    });
  }, []);

  // Animasi reveal saat scroll down / gulir ke bawah
  useEffect(() => {
    const observerCallback: IntersectionObserverCallback = (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          // Setelah elemen terlihat, tetap dipertahankan terlihat (revealed)
          observer.unobserve(entry.target);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, {
      root: null,
      rootMargin: '0px 0px -40px 0px',
      threshold: 0.1,
    });

    const elements = document.querySelectorAll('.scroll-reveal');
    elements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [plans]);

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  const handleCopyMock = () => {
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryEmail.trim()) return;
    setIsSubmittingInquiry(true);
    setInquiryError(null);
    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inquiryEmail.trim(),
          question: inquiryQuestion.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengirimkan pertanyaan. Silakan periksa kembali email Anda.');
      }
      setInquirySubmitted(true);
      setInquiryEmail('');
      setInquiryQuestion('');
      setTimeout(() => {
        setInquirySubmitted(false);
      }, 5000);
    } catch (err: any) {
      setInquiryError(err.message || 'Terjadi kesalahan sistem, silakan coba lagi.');
    } finally {
      setIsSubmittingInquiry(false);
    }
  };

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const navOffset = 90;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - navOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  const features = [
    {
      icon: CalendarIcon,
      tag: 'Kalender Multi-Brand',
      title: 'Timeline Jadwal Terpadu',
      desc: 'Kelola puluhan akun media sosial bisnis dan klien dalam satu kalender terstruktur tanpa tertukar jadwal.',
      color: '#16a34a',
      bg: '#f0fdf4',
    },
    {
      icon: Kanban,
      tag: 'Alur Status Kanban',
      title: 'Pipeline Konten Fleksibel',
      desc: 'Pantau pergerakan ide dari draft, review klien, siap posting, hingga terpublikasi dengan rapi.',
      color: '#0284c7',
      bg: '#f0f9ff',
    },
    {
      icon: Grid,
      tag: 'Pratinjau Grid Instagram',
      title: 'Simulasi Feed 3-Kolom',
      desc: 'Rencanakan visual feed Instagram sebelum tayang agar estetika tone warna, thumbnail, dan tema tetap harmonis.',
      color: '#8b5cf6',
      bg: '#f5f3ff',
    },
    {
      icon: FileText,
      tag: 'Bank Caption & Tag',
      title: 'Penyimpanan Template Cepat',
      desc: 'Simpan kumpulan opening hook, hashtag segmented, dan CTA favorit. Cukup 1 klik untuk menyalin ke clipboard.',
      color: '#ea580c',
      bg: '#fff7ed',
    },
    {
      icon: Clock,
      tag: 'Pengingat Waktu Posting',
      title: 'Alarm & Notifikasi Tepat Waktu',
      desc: 'Alarm otomatis sebelum jadwal tayang. Hubungkan dengan kalender handphone via file .ics dan Google Calendar.',
      color: '#10b981',
      bg: '#ecfdf5',
    },
    {
      icon: Users,
      tag: 'Kolaborasi Tim Agensi',
      title: 'Review & Catatan Revisi',
      desc: 'Bagi peran tim menjadi Owner, Editor, dan Reviewer. Klien bisa memberi komentar revisi langsung di postingan.',
      color: '#6366f1',
      bg: '#eef2ff',
    },
  ];

  const steps = [
    {
      step: '01',
      title: 'Susun Rencana & Tulis Konten',
      desc: 'Pilih brand, tentukan pilar tema, tulis caption dengan live counter karakter, dan sisipkan hashtag dari bank konten.',
    },
    {
      step: '02',
      title: 'Atur Jadwal & Review Bersama',
      desc: 'Pilih tanggal dan jam di kalender interaktif. Minta review persetujuan atasan atau klien dengan satu tombol.',
    },
    {
      step: '03',
      title: 'Salin 1-Klik Saat Jam Tayang',
      desc: 'Dapatkan pengingat jadwal, klik salin caption + hashtag, download aset desain, dan posting langsung tanpa repot.',
    },
  ];

  const testimonials = [
    {
      quote: 'UdaPlanner mengubah cara agensi kami mengelola 12 brand klien sekaligus. Kalender multi-brand dan alur review-nya sangat rapi dan hemat waktu berjam-jam.',
      author: 'Theresa Jordan',
      role: 'Social Media Strategist • Agency ID',
      avatar: 'TJ',
      stars: 5,
    },
    {
      quote: 'Simulasi feed 3-kolom Instagram-nya sangat membantu visual planning sebelum posting. Klien sekarang langsung paham tone & style tanpa mock up manual.',
      author: 'James Wilson',
      role: 'Content Creator & Brand Owner',
      avatar: 'JW',
      stars: 5,
    },
    {
      quote: 'Bank caption 1-klik dan integrasi notifikasi jam tayang bikin konten terjadwal tanpa ada yang terlewat. Sangat praktis untuk tim pemasaran kami.',
      author: 'Jhon Tosan',
      role: 'Marketing Lead • Creative Hub',
      avatar: 'JT',
      stars: 5,
    },
  ];

  const faqs = [
    {
      q: 'Apakah UdaPlanner memposting otomatis ke media sosial?',
      a: 'UdaPlanner berfokus pada perencanaan strategis, estetika grid, dan kolaborasi tim. Anda tetap memposting di aplikasi media sosial masing-masing, namun aset desain, caption, dan hashtag sudah siap 100% tinggal disalin dalam 1 klik saat pengingat berbunyi.',
    },
    {
      q: 'Bagaimana sistem pembayaran paket berlangganan bekerja?',
      a: 'Pembayaran dilakukan lewat transfer bank manual (BCA, Mandiri, BNI, BSI) dengan kode unik nominal. Begitu bukti transfer diunggah, admin akan memverifikasi dan masa aktif paket akun Anda langsung bertambah.',
    },
    {
      q: 'Bisakah saya memilih durasi berlangganan 3, 6, atau 12 bulan?',
      a: 'Tentu saja! Setiap paket Pro dan Tim menyediakan opsi durasi fleksibel (1 bulan, 3 bulan, 6 bulan, hingga 1 tahun) dengan potongan harga diskon yang semakin hemat untuk durasi panjang.',
    },
    {
      q: 'Apakah anggota tim yang saya undang harus membayar langganan juga?',
      a: 'Tidak. Anggota tim menggunakan kuota kapasitas dari pemilik brand yang mengundang. Seluruh staf kreator atau editor yang diundang dapat berkolaborasi gratis.',
    },
    {
      q: 'Apa yang terjadi jika masa aktif paket saya berakhir?',
      a: 'Seluruh riwayat konten dan data Anda tetap tersimpan dengan aman tanpa dihapus. Akun Anda hanya akan kembali ke batasan paket Gratis hingga Anda memperpanjangnya kembali.',
    },
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#ffffff', color: '#0f172a', overflowX: 'clip', position: 'relative' }}>
      {/* Top Navbar */}
      <nav className="camply-top-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '1.25rem',
              boxShadow: '0 4px 14px rgba(22, 163, 74, 0.35)',
              flexShrink: 0,
            }}
          >
            U
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontWeight: 800, fontSize: '1.15rem', color: '#0f172a', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
              UdaPlanner
            </span>
            <span
              className="camply-brand-badge"
              style={{
                marginLeft: 8,
                fontSize: '0.68rem',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: 6,
                backgroundColor: '#dcfce7',
                color: '#15803d',
                border: '1.5px solid #0f172a',
                boxShadow: '1.5px 1.5px 0px #0f172a',
                whiteSpace: 'nowrap',
              }}
            >
              by UdaCoding
            </span>
          </div>
        </div>

        {/* Menu Tengah Desktop (Camply Reference Style) */}
        <div className="desktop-menu" style={{ alignItems: 'center', gap: 12 }}>
          <a href="#fitur" onClick={(e) => scrollToSection(e, 'fitur')}>Fitur</a>
          <a href="#alur" onClick={(e) => scrollToSection(e, 'alur')}>Cara Kerja</a>
          <a href="#fitur-demo" onClick={(e) => scrollToSection(e, 'fitur-demo')}>Demo Interaktif</a>
          <a href="#harga" onClick={(e) => scrollToSection(e, 'harga')}>Paket &amp; Harga</a>
          <a href="#faq" onClick={(e) => scrollToSection(e, 'faq')}>FAQ</a>
        </div>

        <div className="camply-nav-actions" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <Link
            href="/masuk"
            className="btn-camply-dark"
          >
            Masuk
          </Link>
          <Link
            href="/daftar"
            className="btn-camply-outline"
          >
            Daftar Gratis
          </Link>
        </div>
      </nav>

      {/* Hero Section (Camply Split Layout - Neo-Brutalism Jaman Dulu) */}
      <header
        style={{
          padding: '60px 24px 50px',
          maxWidth: 1200,
          margin: '0 auto',
          position: 'relative',
        }}
      >
        {/* Decorative background glow */}
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '90%',
            height: 480,
            background: 'radial-gradient(ellipse at center, rgba(22, 163, 74, 0.09) 0%, rgba(2, 132, 199, 0.05) 50%, transparent 75%)',
            zIndex: 0,
            pointerEvents: 'none',
          }}
        />

        <div className="camply-hero-grid" style={{ position: 'relative', zIndex: 1 }}>
          {/* Kolom Kiri: Headline, Doodle Underline, Deskripsi, Tombol CTA */}
          <div className="camply-hero-left scroll-reveal reveal-left">
            <h1
              style={{
                fontSize: 'clamp(2.4rem, 4.6vw, 3.8rem)',
                fontWeight: 900,
                lineHeight: 1.15,
                letterSpacing: '-0.035em',
                color: '#0f172a',
                marginBottom: 24,
                position: 'relative',
              }}
            >
              {/* Blue doodle burst above headline like Camply reference */}
              <span style={{ position: 'relative', display: 'inline-block' }}>
                Susun Kalender Konten,
                <svg
                  style={{
                    position: 'absolute',
                    top: -22,
                    right: -12,
                    width: 36,
                    height: 28,
                    pointerEvents: 'none',
                  }}
                  viewBox="0 0 40 30"
                  fill="none"
                >
                  <path d="M8 24C10 16 14 10 22 6" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M20 26C22 18 26 12 34 8" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M4 14C8 12 14 11 20 12" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </span>
              <br />
              Rencanakan Jadi{' '}
              <span style={{ position: 'relative', display: 'inline-block', whiteSpace: 'nowrap' }}>
                <span>Lebih Praktis!</span>
                {/* Hand-drawn Orange Brush Underline */}
                <svg
                  style={{
                    position: 'absolute',
                    bottom: -10,
                    left: 0,
                    width: '100%',
                    height: 14,
                    overflow: 'visible',
                    pointerEvents: 'none',
                  }}
                  viewBox="0 0 240 14"
                  fill="none"
                >
                  <path
                    d="M4 9C55 3 130 4 236 7"
                    stroke="#f97316"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  <path
                    d="M18 12C72 7 150 8 228 11"
                    stroke="#f97316"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    opacity="0.8"
                  />
                </svg>
              </span>
            </h1>

            <p
              style={{
                fontSize: 'clamp(1rem, 1.9vw, 1.15rem)',
                color: '#475569',
                maxWidth: 540,
                marginBottom: 36,
                lineHeight: 1.7,
              }}
            >
              Satu kalender multi-brand terpadu untuk agensi, UMKM, dan kreator konten.
              Rencanakan jadwal posting, simulasi visual <strong>Grid Instagram 3-kolom</strong>,
              dan eksekusi konten tanpa pusing lupa jadwal.
            </p>

            {/* Tombol Aksi CTA (Camply Pill Style with Retro Brutalist Shadow) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 14,
              }}
            >
              <Link
                href="/daftar"
                className="btn-camply-dark"
                style={{
                  padding: '14px 32px',
                  fontSize: '1rem',
                }}
              >
                <span>Mulai Sekarang Gratis</span>
                <ArrowRight size={18} />
              </Link>
              <a
                href="#fitur-demo"
                onClick={(e) => scrollToSection(e, 'fitur-demo')}
                className="btn-camply-outline"
                style={{
                  padding: '14px 26px',
                  fontSize: '0.98rem',
                }}
              >
                <span>Coba Demo Interaktif</span>
              </a>
            </div>
          </div>

          {/* Kolom Kanan: Smartphone Mockup Camply Style */}
          <div className="scroll-reveal reveal-right delay-150" style={{ position: 'relative' }}>
            <LandingPhoneMockup />
          </div>
        </div>
      </header>

      {/* Live Interactive Product Showcase Sandbox (Camply Image 3 Split Layout) */}
      <section
        id="fitur-demo"
        style={{
          padding: '60px 24px 80px',
          maxWidth: 1200,
          margin: '0 auto',
        }}
      >
        <div className="camply-simulasi-grid">
          {/* Kolom Kiri: Window Interaktif Live Sandbox */}
          <div className="scroll-reveal reveal-left delay-100">
            <div
              className="uda-card"
              style={{
                width: '100%',
                padding: 0,
                overflow: 'hidden',
                borderRadius: 16,
                border: '3px solid #0f172a',
                boxShadow: '8px 8px 0px #0f172a',
                textAlign: 'left',
                backgroundColor: '#ffffff',
              }}
            >
              {/* Header Window Bar */}
              <div
                style={{
                  backgroundColor: '#0f172a',
                  color: '#f8fafc',
                  padding: '12px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '2px solid #0f172a',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 11, height: 11, borderRadius: '50%', backgroundColor: '#ef4444' }} />
                  <span style={{ width: 11, height: 11, borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                  <span style={{ width: 11, height: 11, borderRadius: '50%', backgroundColor: '#10b981' }} />
                  <span style={{ marginLeft: 8, fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8' }}>
                    udaplanner.id/workspace
                  </span>
                </div>

                <span
                  style={{
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 4,
                  }}
                >
                  Live Sandbox
                </span>
              </div>

              {/* Viewport Konten Berdasarkan Tab */}
              <div style={{ padding: '20px', backgroundColor: '#f8fafc', minHeight: 330 }}>
                {activeTabFeature === 'calendar' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>
                        Oktober 2026 — Jadwal Multi-Brand
                      </div>
                      <span className="status-pill" style={{ backgroundColor: '#dcfce7', color: '#16a34a', fontSize: '0.72rem' }}>
                        Jadwal Terpadu
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, textAlign: 'center' }}>
                      {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((day) => (
                        <div key={day} style={{ fontWeight: 700, fontSize: '0.72rem', color: '#64748b', paddingBottom: 4 }}>
                          {day}
                        </div>
                      ))}

                      {[
                        { date: 19, title: 'Tips RLS', brand: 'UdaCoding', color: '#16a34a', time: '09:00' },
                        { date: 20, title: 'Feed IG', brand: 'Fashion ID', color: '#8b5cf6', time: '13:30' },
                        { date: 21, title: 'Launch', brand: 'UdaPlanner', color: '#0284c7', time: '15:00', today: true },
                        { date: 22, title: 'Tutorial', brand: 'UdaCoding', color: '#16a34a', time: '10:00' },
                        { date: 23, title: 'Trivia', brand: 'Fashion ID', color: '#8b5cf6', time: '16:00' },
                        { date: 24, title: 'Story QnA', brand: 'Agency ID', color: '#ea580c', time: '11:00' },
                        { date: 25, title: 'Carousel', brand: 'UdaPlanner', color: '#0284c7', time: '19:00' },
                      ].map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            minHeight: 74,
                            borderRadius: 8,
                            backgroundColor: '#ffffff',
                            border: item.today ? '2px solid #16a34a' : '1px solid #e2e8f0',
                            boxShadow: item.today ? '0 2px 8px rgba(22, 163, 74, 0.2)' : 'none',
                            padding: 6,
                            textAlign: 'left',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: item.today ? '#16a34a' : '#334155' }}>
                              {item.date} {item.today && '•'}
                            </span>
                            <span style={{ fontSize: '0.62rem', color: '#94a3b8' }}>{item.time}</span>
                          </div>
                          <div
                            style={{
                              backgroundColor: `${item.color}15`,
                              borderLeft: `2.5px solid ${item.color}`,
                              padding: '2px 4px',
                              borderRadius: 3,
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              color: item.color,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {item.title}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTabFeature === 'grid' && (
                  <div style={{ maxWidth: 360, margin: '0 auto', textAlign: 'center' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a', marginBottom: 10 }}>
                      Pratinjau Visual Feed 3-Kolom
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                      {[
                        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400',
                        'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400',
                        'https://images.unsplash.com/photo-1542744094-3a31f272c490?w=400',
                        'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400',
                        'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400',
                        'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=400',
                      ].map((url, i) => (
                        <div
                          key={i}
                          style={{
                            aspectRatio: '1/1',
                            borderRadius: 6,
                            overflow: 'hidden',
                            backgroundImage: `url(${url})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            position: 'relative',
                            border: '1.5px solid #0f172a',
                          }}
                        >
                          <span
                            style={{
                              position: 'absolute',
                              bottom: 3,
                              right: 3,
                              backgroundColor: 'rgba(15, 23, 42, 0.8)',
                              color: '#ffffff',
                              fontSize: '0.6rem',
                              fontWeight: 800,
                              padding: '1px 4px',
                              borderRadius: 3,
                            }}
                          >
                            {i === 0 ? 'Siap' : 'Ide'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTabFeature === 'snippets' && (
                  <div style={{ maxWidth: 440, margin: '0 auto' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a', marginBottom: 10 }}>
                      Bank Caption &amp; Hashtag Siap Salin
                    </div>
                    <div
                      style={{
                        backgroundColor: '#ffffff',
                        border: '2px solid #0f172a',
                        boxShadow: '3px 3px 0px #0f172a',
                        borderRadius: 10,
                        padding: '14px',
                        position: 'relative',
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: '0.84rem', color: '#0f172a', marginBottom: 4 }}>
                        Opening Hook Promo Kilat
                      </div>
                      <p style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.5, marginBottom: 8 }}>
                        "Bongkar rahasia susun kalender konten 30 hari dalam 1 jam saja! Simak checklist lengkap di bawah ini:"
                      </p>
                      <div style={{ fontSize: '0.74rem', color: '#0284c7', fontWeight: 700 }}>
                        #ContentPlanner #SocialMediaStrategy #UdaCoding
                      </div>
                      <button
                        onClick={handleCopyMock}
                        className="btn-camply-dark"
                        style={{
                          marginTop: 12,
                          padding: '6px 14px',
                          fontSize: '0.78rem',
                        }}
                      >
                        {copiedCaption ? <Check size={14} /> : <Copy size={14} />}
                        <span>{copiedCaption ? 'Tersalin!' : 'Salin 1-Klik'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Pengantar Fitur & Capsule Selector Dock (Image 3) */}
          <div className="scroll-reveal reveal-right delay-200">
            <h2
              style={{
                fontSize: 'clamp(2rem, 3.6vw, 2.9rem)',
                fontWeight: 900,
                color: '#0f172a',
                lineHeight: 1.2,
                letterSpacing: '-0.03em',
                marginBottom: 16,
                position: 'relative',
              }}
            >
              Kalender, Feed Grid, Caption Bank, <br />
              <span style={{ color: '#16a34a' }}>Apa Lagi yang Anda Butuhkan?</span>
            </h2>

            <p style={{ color: '#475569', fontSize: '1rem', lineHeight: 1.7, marginBottom: 28, maxWidth: 480 }}>
              Eksplorasi kemudahan workspace terpadu UdaPlanner. Rancang jadwal posting 30 hari ke depan,
              pratinjau visual feed Instagram 3-kolom, dan simpan ratusan hook opening viral siap salin.
            </p>

            {/* Floating Dock Selector Capsule (Matching Image 3 Capsule Style) */}
            <div className="camply-dock-pill" style={{ display: 'inline-flex', flexWrap: 'nowrap', whiteSpace: 'nowrap', gap: 6, padding: '6px 10px' }}>
              {[
                { id: 'calendar', label: 'Kalender', icon: CalendarIcon },
                { id: 'grid', label: 'Grid IG', icon: Grid },
                { id: 'snippets', label: 'Bank Caption', icon: FileText },
              ].map((t) => {
                const IconComponent = t.icon;
                const isActive = activeTabFeature === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTabFeature(t.id as any)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '7px 15px',
                      borderRadius: 999,
                      border: isActive ? '2px solid #0f172a' : '2px solid transparent',
                      backgroundColor: isActive ? '#0f172a' : 'transparent',
                      color: isActive ? '#ffffff' : '#334155',
                      fontWeight: 800,
                      fontSize: '0.84rem',
                      cursor: 'pointer',
                      boxShadow: isActive ? '2.5px 2.5px 0px #16a34a' : 'none',
                      transition: 'all 0.15s ease',
                      flexShrink: 0,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <IconComponent size={14} style={{ color: isActive ? '#4ade80' : '#64748b' }} />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar (Camply Image 4 Style) */}
      <div className="camply-stats-bar scroll-reveal reveal-scale">
        <div className="camply-stats-grid">
          <div className="camply-stat-item">
            <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.03em' }}>5+ Brand</div>
            <div style={{ fontSize: '0.85rem', color: '#a7f3d0', fontWeight: 700, marginTop: 4 }}>Multi-Brand Bebas Kelola</div>
          </div>
          <div className="camply-stat-item">
            <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.03em' }}>15K+</div>
            <div style={{ fontSize: '0.85rem', color: '#a7f3d0', fontWeight: 700, marginTop: 4 }}>Postingan Terjadwal</div>
          </div>
          <div className="camply-stat-item">
            <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.03em' }}>5.000+</div>
            <div style={{ fontSize: '0.85rem', color: '#a7f3d0', fontWeight: 700, marginTop: 4 }}>Kreator &amp; Bisnis Aktif</div>
          </div>
          <div className="camply-stat-item">
            <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.03em' }}>4.9 ★</div>
            <div style={{ fontSize: '0.85rem', color: '#a7f3d0', fontWeight: 700, marginTop: 4 }}>Rating Kepuasan Pengguna</div>
          </div>
        </div>
      </div>

      {/* Bagian Fitur Utama (Camply Image 4 Feature Benefits) */}
      <section id="fitur" style={{ padding: '80px 24px', backgroundColor: '#fcfbf9' }}>
        <div className="scroll-reveal" style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-block',
              padding: '5px 16px',
              backgroundColor: '#fef08a',
              color: '#0f172a',
              borderRadius: 8,
              fontSize: '0.82rem',
              fontWeight: 800,
              marginBottom: 16,
              border: '2px solid #0f172a',
              boxShadow: '2.5px 2.5px 0px #0f172a',
            }}
          >
            FITUR LENGKAP &amp; INTEGRATIF
          </div>
          <h2
            style={{
              fontSize: 'clamp(2rem, 3.8vw, 3rem)',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              color: '#0f172a',
              maxWidth: 780,
              margin: '0 auto 16px',
              position: 'relative',
            }}
          >
            <span style={{ position: 'relative', display: 'inline-block' }}>
              Cara Terbaik Kelola Jadwal Konten!
              {/* Blue doodle burst */}
              <svg
                style={{
                  position: 'absolute',
                  top: -24,
                  right: -14,
                  width: 32,
                  height: 26,
                  pointerEvents: 'none',
                }}
                viewBox="0 0 40 30"
                fill="none"
              >
                <path d="M8 24C10 16 14 10 22 6" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M20 26C22 18 26 12 34 8" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M4 14C8 12 14 11 20 12" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
          </h2>
          <p style={{ color: '#475569', fontSize: '1.02rem', maxWidth: 640, margin: '0 auto 52px', lineHeight: 1.7 }}>
            Semua instrumen yang Anda butuhkan untuk merancang konten dari ide kasar hingga tayang tanpa risiko salah jadwal.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 330px), 1fr))',
              gap: 24,
              textAlign: 'left',
            }}
          >
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className={`uda-card scroll-reveal reveal-scale delay-${((i % 3) + 1) * 100}`}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '2.5px solid #0f172a',
                    borderRadius: 16,
                    padding: '28px 24px',
                    boxShadow: '4px 4px 0px #0f172a',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 12,
                      backgroundColor: f.bg,
                      color: f.color,
                      border: '2px solid #0f172a',
                      boxShadow: '2.5px 2.5px 0px #0f172a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 18,
                    }}
                  >
                    <Icon size={24} />
                  </div>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      color: f.color,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      backgroundColor: `${f.bg}`,
                      border: `1.5px solid #0f172a`,
                      padding: '2px 8px',
                      borderRadius: 6,
                      boxShadow: '1.5px 1.5px 0px #0f172a',
                      display: 'inline-block',
                      marginBottom: 8,
                    }}
                  >
                    {f.tag}
                  </span>
                  <h3 style={{ fontSize: '1.22rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 10px' }}>
                    {f.title}
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.6 }}>
                    {f.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Cara Kerja 3 Langkah & Testimoni Pelanggan (Camply Image 2 & 4) */}
      <section id="alur" style={{ padding: '80px 24px', maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
        <div className="scroll-reveal">
          <div
            style={{
              display: 'inline-block',
            padding: '5px 16px',
            backgroundColor: '#dcfce7',
            color: '#15803d',
            borderRadius: 8,
            fontSize: '0.82rem',
            fontWeight: 800,
            marginBottom: 16,
            border: '2px solid #0f172a',
            boxShadow: '2.5px 2.5px 0px #0f172a',
          }}
        >
          ALUR KERJA PRAKTIS
        </div>
        <h2 style={{ fontSize: 'clamp(2rem, 3.8vw, 3rem)', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em', marginBottom: 14 }}>
          Alur Kerja Simpel dalam 3 Langkah
        </h2>
        <p style={{ color: '#475569', fontSize: '1.02rem', maxWidth: 580, margin: '0 auto 48px', lineHeight: 1.7 }}>
          Dari rancangan ide kasar hingga postingan tayang tanpa ada konten yang terlewatkan.
        </p>
        </div>

        {/* 3 Step Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 24, textAlign: 'left', marginBottom: 70 }}>
          {steps.map((s, idx) => (
            <div
              key={idx}
              className={`uda-card scroll-reveal reveal-scale delay-${(idx + 1) * 150}`}
              style={{
                padding: '32px 26px',
                borderRadius: 16,
                border: '2.5px solid #0f172a',
                backgroundColor: '#ffffff',
                boxShadow: '4px 4px 0px #0f172a',
                position: 'relative',
              }}
            >
              <div
                style={{
                  fontSize: '2.6rem',
                  fontWeight: 900,
                  color: '#16a34a',
                  lineHeight: 1,
                  marginBottom: 14,
                }}
              >
                {s.step}
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>
                {s.title}
              </h3>
              <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.6 }}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Testimonials Section (Camply Image 2: Satisfied Customers Are Our Best Ads) */}
        <div style={{ paddingTop: 30, borderTop: '2px dashed #cbd5e1' }}>
          <div className="scroll-reveal" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 36, textAlign: 'left' }}>
            <div>
              <h3 style={{ fontSize: 'clamp(1.7rem, 3vw, 2.4rem)', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em', position: 'relative' }}>
                <span style={{ position: 'relative', display: 'inline-block' }}>
                  Kreator &amp; Tim Puas Adalah Iklan Terbaik Kami.
                  <svg
                    style={{
                      position: 'absolute',
                      top: -20,
                      left: -20,
                      width: 32,
                      height: 24,
                      pointerEvents: 'none',
                    }}
                    viewBox="0 0 40 30"
                    fill="none"
                  >
                    <path d="M8 24C10 16 14 10 22 6" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M20 26C22 18 26 12 34 8" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M4 14C8 12 14 11 20 12" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </span>
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: 4 }}>
                Simak pengalaman nyata dari kreator dan pemilik bisnis yang telah merapikan alur kontennya.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 24, textAlign: 'left' }}>
            {testimonials.map((t, idx) => (
              <div
                key={idx}
                className={`uda-card scroll-reveal reveal-scale delay-${(idx + 1) * 150}`}
                style={{
                  backgroundColor: '#ffffff',
                  border: '2.5px solid #0f172a',
                  borderRadius: 16,
                  padding: '28px 24px',
                  boxShadow: '4px 4px 0px #0f172a',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '2.6rem', color: '#0284c7', lineHeight: 0.8, fontWeight: 900, marginBottom: 12 }}>
                    “
                  </div>
                  <p style={{ fontSize: '0.94rem', color: '#334155', lineHeight: 1.6, fontStyle: 'italic', marginBottom: 20 }}>
                    "{t.quote}"
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: '50%',
                      backgroundColor: '#fef08a',
                      border: '2px solid #0f172a',
                      boxShadow: '2px 2px 0px #0f172a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.92rem',
                      fontWeight: 900,
                      color: '#0f172a',
                      flexShrink: 0,
                    }}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>{t.author}</div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{t.role}</div>
                    <div style={{ color: '#eab308', fontSize: '0.75rem', marginTop: 2 }}>
                      {'★'.repeat(t.stars)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tabel Harga Dinamis dengan Variasi Durasi */}
      <section id="harga" style={{ padding: '80px 24px', backgroundColor: '#f8fafc', borderTop: '2px solid #0f172a' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', textAlign: 'center' }}>
          <div className="scroll-reveal">
            <div
              style={{
                display: 'inline-block',
              padding: '6px 16px',
              backgroundColor: '#fef08a',
              color: '#0f172a',
              borderRadius: 999,
              fontSize: '0.82rem',
              fontWeight: 900,
              marginBottom: 14,
              border: '2px solid #0f172a',
              boxShadow: '2px 2px 0px #0f172a',
            }}
          >
            PILIH PAKET LANGGANAN
          </div>
          <h2 style={{ fontSize: 'clamp(1.9rem, 4vw, 2.8rem)', fontWeight: 900, color: '#0f172a', marginBottom: 14, letterSpacing: '-0.02em' }}>
            Investasi Cerdas untuk Konten Berkualitas
          </h2>
          <p style={{ color: '#64748b', fontSize: '1rem', maxWidth: 640, margin: '0 auto 48px', lineHeight: 1.6 }}>
            Mulai gratis, upgrade kapan saja lewat transfer bank manual (BCA, Mandiri, BNI, BSI) tanpa potongan biaya kartu kredit tersembunyi.
          </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 310px), 1fr))',
              gap: 26,
              textAlign: 'left',
              alignItems: 'stretch',
            }}
          >
            {plans.map((p) => {
              const durIndex = selectedDurationIndex[p.code] || 0;
              const activeDurations = (p.durations || []).filter((d) => d.isActive);
              const currentDur = activeDurations[durIndex] || activeDurations[0];
              const priceDisplay = currentDur ? currentDur.price : p.price;
              const isPro = p.code === 'pro';

              return (
                <div
                  key={p.code}
                  className={`uda-card scroll-reveal reveal-scale delay-${p.code === 'free' ? 100 : p.code === 'pro' ? 200 : 300}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '34px 28px',
                    borderRadius: 18,
                    border: '2.5px solid #0f172a',
                    backgroundColor: '#ffffff',
                    boxShadow: isPro ? '6px 6px 0px #16a34a' : '5px 5px 0px #0f172a',
                    position: 'relative',
                  }}
                >
                  {isPro && (
                    <div
                      style={{
                        position: 'absolute',
                        top: -14,
                        right: 24,
                        backgroundColor: '#fef08a',
                        color: '#0f172a',
                        border: '2px solid #0f172a',
                        fontSize: '0.74rem',
                        fontWeight: 900,
                        padding: '4px 14px',
                        borderRadius: 999,
                        letterSpacing: '0.02em',
                        boxShadow: '2px 2px 0px #0f172a',
                      }}
                    >
                      ★ PALING POPULER
                    </div>
                  )}

                  <div>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a' }}>{p.name}</h3>
                    <p style={{ fontSize: '0.86rem', color: '#64748b', marginTop: 4, minHeight: 40, lineHeight: 1.5 }}>
                      {p.description}
                    </p>

                    {/* Selector Variasi Durasi (1 Bulan, 3 Bulan, 6 Bulan, 12 Bulan) */}
                    {activeDurations.length > 1 && (
                      <div style={{ margin: '14px 0 18px' }}>
                        <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#475569', marginBottom: 6 }}>
                          Pilihan Durasi Paket:
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {activeDurations.map((dur, dIdx) => (
                            <button
                              key={dur.id}
                              onClick={() =>
                                setSelectedDurationIndex((prev) => ({
                                  ...prev,
                                  [p.code]: dIdx,
                                }))
                              }
                              style={{
                                padding: '5px 10px',
                                borderRadius: 8,
                                border: '1.5px solid #0f172a',
                                backgroundColor: durIndex === dIdx ? '#fef08a' : '#ffffff',
                                color: '#0f172a',
                                fontSize: '0.76rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                boxShadow: durIndex === dIdx ? '1px 1px 0px #0f172a' : 'none',
                              }}
                            >
                              {dur.name}
                              {dur.discountPercent > 0 && (
                                <span style={{ marginLeft: 4, color: '#16a34a', fontWeight: 900 }}>
                                  -{dur.discountPercent}%
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Harga */}
                    <div style={{ margin: '18px 0 24px' }}>
                      <div style={{ fontSize: '2.3rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
                        {priceDisplay === 0 ? 'Gratis' : `Rp ${priceDisplay.toLocaleString('id-ID')}`}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 6, fontWeight: 600 }}>
                        {priceDisplay === 0
                          ? 'Gratis selamanya tanpa kartu kredit'
                          : `Per ${currentDur?.name || '30 hari'}`}
                      </div>
                    </div>

                    {/* Fitur Utama */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                        fontSize: '0.88rem',
                        borderTop: '2px dashed #e2e8f0',
                        paddingTop: 18,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <CheckCircle2 size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
                        <span>Maksimal <strong>{p.maxBrands} Akun Brand</strong></span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <CheckCircle2 size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
                        <span>
                          {p.maxMembers > 0 ? `Hingga ${p.maxMembers} Anggota Tim` : 'Penggunaan Tunggal (Solo)'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <CheckCircle2 size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
                        <span>
                          {p.maxPosts ? `${p.maxPosts} Postingan Terjadwal / Bulan` : 'Postingan Tanpa Batas'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <CheckCircle2 size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
                        <span>
                          Storage {p.storageMb >= 1024 ? `${p.storageMb / 1024} GB` : `${p.storageMb} MB`}
                        </span>
                      </div>
                      {p.allowGrid && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <CheckCircle2 size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
                          <span>Pratinjau Grid Instagram Interaktif</span>
                        </div>
                      )}
                      {p.allowExport && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <CheckCircle2 size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
                          <span>Ekspor Kalender CSV & ICS (Google Calendar)</span>
                        </div>
                      )}
                      {p.allowApproval && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <CheckCircle2 size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
                          <span>Alur Persetujuan & Review Klien</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Link
                    href="/daftar"
                    className={isPro ? 'btn-camply-dark' : 'btn-camply-outline'}
                    style={{
                      width: '100%',
                      marginTop: 28,
                      height: 48,
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      borderRadius: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textDecoration: 'none',
                    }}
                  >
                    {p.code === 'free' ? 'Daftar Akun Gratis' : `Pilih Paket ${p.name}`}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ Section (Camply Image 1: Got A Question For Campty? + Accordion) */}
      <section id="faq" style={{ padding: '90px 24px', maxWidth: 1180, margin: '0 auto' }}>
        <div className="camply-faq-grid">
          {/* Kolom Kiri: Got a Question + Email Capsule Input */}
          <div className="scroll-reveal reveal-left">
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: 12 }}>
              <svg
                style={{
                  position: 'absolute',
                  top: -16,
                  right: -24,
                  width: 32,
                  height: 24,
                  pointerEvents: 'none',
                }}
                viewBox="0 0 40 30"
                fill="none"
              >
                <path d="M8 24C10 16 14 10 22 6" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M20 26C22 18 26 12 34 8" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M4 14C8 12 14 11 20 12" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <h2
                style={{
                  fontSize: 'clamp(2rem, 3.8vw, 3rem)',
                  fontWeight: 900,
                  color: '#0f172a',
                  lineHeight: 1.15,
                  letterSpacing: '-0.03em',
                  margin: 0,
                }}
              >
                Got A Question<br />For Uda-Planner?
              </h2>
            </div>

            <p style={{ color: '#64748b', fontSize: '0.96rem', lineHeight: 1.6, maxWidth: 420, marginBottom: 28 }}>
              Jika ada pertanyaan khusus yang ingin Anda ajukan seputar fitur, pembayaran, atau kustomisasi tim, kami siap membantu menjawabnya.
            </p>

            {/* Form Pertanyaan Langsung Berfungsi */}
            <form onSubmit={handleInquirySubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 460 }}>
              <div
                style={{
                  background: '#ffffff',
                  border: '2.5px solid #0f172a',
                  borderRadius: 14,
                  boxShadow: '4px 4px 0px #0f172a',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <input
                  type="email"
                  placeholder="Masukkan Email Anda (cth: anda@gmail.com)"
                  value={inquiryEmail}
                  onChange={(e) => setInquiryEmail(e.target.value)}
                  required
                  disabled={isSubmittingInquiry}
                  style={{
                    border: 'none',
                    borderBottom: '1.5px solid #cbd5e1',
                    outline: 'none',
                    background: 'transparent',
                    padding: '6px 4px',
                    fontSize: '0.92rem',
                    fontWeight: 600,
                    color: '#0f172a',
                    width: '100%',
                  }}
                />
                <textarea
                  rows={2}
                  placeholder="Tuliskan pertanyaan Anda seputar fitur, pembayaran, atau kustomisasi..."
                  value={inquiryQuestion}
                  onChange={(e) => setInquiryQuestion(e.target.value)}
                  disabled={isSubmittingInquiry}
                  style={{
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    padding: '4px',
                    fontSize: '0.88rem',
                    color: '#0f172a',
                    resize: 'none',
                    fontFamily: 'inherit',
                  }}
                />
                <button
                  type="submit"
                  disabled={isSubmittingInquiry || !inquiryEmail.trim()}
                  style={{
                    backgroundColor: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 999,
                    padding: '10px 22px',
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    cursor: isSubmittingInquiry ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    alignSelf: 'flex-end',
                    transition: 'all 0.15s ease',
                    opacity: isSubmittingInquiry ? 0.7 : 1,
                  }}
                >
                  {isSubmittingInquiry ? 'Mengirim Data...' : inquirySubmitted ? 'Terkirim ✓' : 'Kirim Pertanyaan'}
                </button>
              </div>

              {inquiryError && (
                <p style={{ color: '#dc2626', fontSize: '0.84rem', fontWeight: 700, margin: '2px 0 0' }}>
                  {inquiryError}
                </p>
              )}
              {inquirySubmitted && (
                <div style={{ backgroundColor: '#dcfce7', border: '1.5px solid #16a34a', borderRadius: 8, padding: '10px 14px', color: '#15803d', fontSize: '0.86rem', fontWeight: 700, marginTop: 4 }}>
                  ✓ Pertanyaan berhasil terkirim! Tim UdaPlanner akan segera merespons ke email Anda.
                </div>
              )}
            </form>
          </div>

          {/* Kolom Kanan: FAQ Subtitle + Clean Accordion Items */}
          <div className="scroll-reveal reveal-right delay-150">
            <p style={{ color: '#475569', fontSize: '1rem', fontWeight: 600, marginBottom: 20 }}>
              Maybe your question is have been answered, check this out:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {faqs.map((faq, i) => {
                const isOpen = openFaq === i;
                return (
                  <div
                    key={i}
                    className={`uda-card scroll-reveal reveal-scale delay-${((i % 4) + 1) * 100}`}
                    style={{
                      padding: '18px 22px',
                      cursor: 'pointer',
                      borderRadius: 14,
                      border: '2.5px solid #0f172a',
                      backgroundColor: isOpen ? '#f0fdf4' : '#ffffff',
                      boxShadow: isOpen ? '3px 3px 0px #16a34a' : '3px 3px 0px #0f172a',
                      transition: 'all 0.2s',
                    }}
                    onClick={() => toggleFaq(i)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                      <h4 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.4 }}>
                        {faq.q}
                      </h4>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          border: '1.5px solid #0f172a',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: isOpen ? '#bbf7d0' : '#f8fafc',
                          flexShrink: 0,
                          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s ease',
                        }}
                      >
                        <ChevronDown size={16} color="#0f172a" />
                      </div>
                    </div>
                    {isOpen && (
                      <p style={{ fontSize: '0.92rem', color: '#475569', marginTop: 14, lineHeight: 1.6, borderTop: '1px dashed #cbd5e1', paddingTop: 12 }}>
                        {faq.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>


      {/* Camply-Inspired Multi-Column Dark Green Retro Footer */}
      <footer className="camply-footer">
        <div className="camply-footer-grid scroll-reveal">
          {/* Kolom 1: Brand Logo & Tagline */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  backgroundColor: '#ffffff',
                  color: '#064e3b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '1.25rem',
                  border: '2px solid #0f172a',
                  boxShadow: '2.5px 2.5px 0px #0f172a',
                }}
              >
                U
              </div>
              <div>
                <span style={{ fontWeight: 800, fontSize: '1.25rem', color: '#ffffff', letterSpacing: '-0.02em' }}>
                  UdaPlanner
                </span>
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 6,
                    backgroundColor: '#dcfce7',
                    color: '#064e3b',
                    border: '1.5px solid #0f172a',
                    boxShadow: '1.5px 1.5px 0px #0f172a',
                  }}
                >
                  by UdaCoding
                </span>
              </div>
            </div>

            <p style={{ color: '#d1fae5', fontSize: '0.88rem', lineHeight: 1.7, maxWidth: 300 }}>
              Solusi perencana dan kalender konten multi-brand terpadu untuk agensi, UMKM, dan kreator media sosial Indonesia.
            </p>
          </div>

          {/* Kolom 2: Company */}
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff', marginBottom: 18, letterSpacing: '-0.01em' }}>
              Company
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <a href="#fitur" onClick={(e) => scrollToSection(e, 'fitur')} className="footer-nav-link">Fitur</a>
              <a href="#alur" onClick={(e) => scrollToSection(e, 'alur')} className="footer-nav-link">Cara Kerja</a>
              <a href="#fitur-demo" onClick={(e) => scrollToSection(e, 'fitur-demo')} className="footer-nav-link">Demo Kalender</a>
              <a href="#faq" onClick={(e) => scrollToSection(e, 'faq')} className="footer-nav-link">FAQ</a>
            </div>
          </div>

          {/* Kolom 3: Resources */}
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff', marginBottom: 18, letterSpacing: '-0.01em' }}>
              Resources
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <a href="#harga" onClick={(e) => scrollToSection(e, 'harga')} className="footer-nav-link">Paket &amp; Harga</a>
              <Link href="/masuk" className="footer-nav-link">Simulasi Feed IG</Link>
              <Link href="/daftar" className="footer-nav-link">Bank Caption &amp; Tag</Link>
              <Link href="/app" className="footer-nav-link">Kanban Status</Link>
            </div>
          </div>

          {/* Kolom 4: Support */}
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff', marginBottom: 18, letterSpacing: '-0.01em' }}>
              Support
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Link href="/masuk" className="footer-nav-link">Masuk ke Akun</Link>
              <Link href="/daftar" className="footer-nav-link">Daftar Akun Baru</Link>
              <a href="mailto:support@udacoding.com" className="footer-nav-link">Pusat Bantuan</a>
              <a href="mailto:info@udacoding.com" className="footer-nav-link">Kirim Masukan</a>
            </div>
          </div>

          {/* Kolom 5: Contact Info */}
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff', marginBottom: 18, letterSpacing: '-0.01em' }}>
              Contact Info
            </h4>
            <p style={{ color: '#d1fae5', fontSize: '0.88rem', marginBottom: 16 }}>
              <a
                href="mailto:support@udacoding.com"
                style={{ color: '#ffffff', fontWeight: 700, textDecoration: 'none', borderBottom: '1.5px dashed #86efac' }}
              >
                support@udacoding.com
              </a>
            </p>

            {/* Social Icons row (Camply circular buttons) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <a
                href="https://instagram.com/udacoding"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-social-btn"
                title="Instagram"
              >
                <Instagram size={17} />
              </a>
              <a
                href="https://facebook.com/udacoding"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-social-btn"
                title="Facebook"
              >
                <Facebook size={17} />
              </a>
              <a
                href="https://twitter.com/udacoding"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-social-btn"
                title="Twitter"
              >
                <Twitter size={17} />
              </a>
              <a
                href="https://youtube.com/@udacoding"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-social-btn"
                title="YouTube"
              >
                <Youtube size={17} />
              </a>
            </div>
          </div>
        </div>

        {/* Separator & Bottom Copyright */}
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            borderTop: '1px solid rgba(255, 255, 255, 0.2)',
            paddingTop: 24,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
            fontSize: '0.82rem',
            color: '#a7f3d0',
          }}
        >
          <div>
            Copyright © 2026 <strong>UdaPlanner by PT. Koding Teknologi Asia</strong>. All rights reserved.
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            <Link href="/masuk" style={{ color: '#d1fae5', textDecoration: 'none' }}>Masuk</Link>
            <Link href="/daftar" style={{ color: '#d1fae5', textDecoration: 'none' }}>Daftar Akun</Link>
            <Link href="/app" style={{ color: '#d1fae5', textDecoration: 'none' }}>Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
