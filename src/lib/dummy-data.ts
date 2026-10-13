// Dummy Data UdaPlanner sesuai spesifikasi PRD Bab 13 (Tahap 1)

export interface DummyBrand {
  id: string;
  owner_id: string;
  name: string;
  handle: string;
  platforms: string[];
  color: string;
  avatar_url: string;
  require_approval: boolean;
  is_archived: boolean;
  post_count_this_month: number;
}

export interface DummyMember {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'owner' | 'editor' | 'reviewer' | 'viewer';
}

export interface DummyPillar {
  id: string;
  brand_id: string;
  name: string;
  color: string;
}

export interface DummyPost {
  id: string;
  brand_id: string;
  title: string;
  caption: string;
  hashtags: string;
  platforms: string[];
  content_type: 'feed' | 'carousel' | 'reels' | 'story' | 'video' | 'teks';
  status: 'ide' | 'draft' | 'review' | 'siap' | 'terposting';
  scheduled_at: string | null; // ISO string or null for "belum dijadwalkan"
  pillar_id: string | null;
  assignee_id: string | null;
  notes: string | null;
  posted_at: string | null;
  posted_url: string | null;
  media_url?: string;
  aspect_ratio?: '1:1' | '4:5';
  comments_count: number;
}

export interface DummySnippet {
  id: string;
  brand_id: string;
  type: 'caption' | 'hashtag';
  title: string;
  body: string;
}

export interface DummyNotification {
  id: string;
  type: 'review_request' | 'approved' | 'revision' | 'assigned' | 'comment';
  message: string;
  link: string;
  is_read: boolean;
  time_ago: string;
  created_at: string;
}

export const DUMMY_BRANDS: DummyBrand[] = [
  {
    id: 'brand-1',
    owner_id: 'user-1',
    name: 'UdaCoding',
    handle: 'udacoding_id',
    platforms: ['instagram', 'tiktok', 'youtube', 'linkedin'],
    color: '#16A34A', // Hijau UdaCoding
    avatar_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
    require_approval: true,
    is_archived: false,
    post_count_this_month: 12,
  },
  {
    id: 'brand-2',
    owner_id: 'user-1',
    name: 'Kopi Senja',
    handle: 'kopisenja.id',
    platforms: ['instagram', 'tiktok'],
    color: '#D97706', // Amber/Cokelat
    avatar_url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=150',
    require_approval: false,
    is_archived: false,
    post_count_this_month: 8,
  },
  {
    id: 'brand-3',
    owner_id: 'user-1',
    name: 'Batik Sari',
    handle: 'batiksari',
    platforms: ['instagram', 'facebook'],
    color: '#8B5CF6', // Ungu
    avatar_url: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=150',
    require_approval: false,
    is_archived: false,
    post_count_this_month: 5,
  },
];

export const DUMMY_MEMBERS: DummyMember[] = [
  {
    id: 'user-1',
    name: 'Rizki UdaCoding (Pemilik)',
    email: 'rizki@udacoding.id',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
    role: 'owner',
  },
  {
    id: 'user-2',
    name: 'Rina Content Specialist',
    email: 'rina@udacoding.id',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
    role: 'editor',
  },
  {
    id: 'user-3',
    name: 'Budi Lead Marketing',
    email: 'budi@udacoding.id',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
    role: 'reviewer',
  },
];

export const DUMMY_PILLARS: DummyPillar[] = [
  { id: 'pil-1', brand_id: 'brand-1', name: 'Edukasi Coding', color: '#3B82F6' },
  { id: 'pil-2', brand_id: 'brand-1', name: 'Promo & Diskon', color: '#EC4899' },
  { id: 'pil-3', brand_id: 'brand-1', name: 'Behind the Scenes', color: '#10B981' },
  { id: 'pil-4', brand_id: 'brand-1', name: 'Testimoni Alumni', color: '#F59E0B' },
];

// Helper to format ISO dates around current month for realistic calendar
const now = new Date();
const y = now.getFullYear();
const m = now.getMonth();
const getDateStr = (day: number, hour: number, minute: number) => {
  return new Date(y, m, day, hour, minute, 0).toISOString();
};

export const DUMMY_POSTS: DummyPost[] = [
  // 1. Postingan Hari Ini
  {
    id: 'post-1',
    brand_id: 'brand-1',
    title: '5 Tips Menguasai PostgreSQL & Supabase',
    caption: 'Ingin bikin backend cepat, aman, dan scalable? Simak 5 rahasia memanfaatkan Row Level Security (RLS) di Supabase! 🚀 Geser untuk detail kodenya.',
    hashtags: '#UdaCoding #Supabase #PostgreSQL #BackendDeveloper',
    platforms: ['instagram', 'linkedin'],
    content_type: 'carousel',
    status: 'siap',
    scheduled_at: getDateStr(now.getDate(), 14, 0),
    pillar_id: 'pil-1',
    assignee_id: 'user-2',
    notes: 'Desain slide sudah disetujui lead tech.',
    posted_at: null,
    posted_url: null,
    media_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600',
    aspect_ratio: '1:1',
    comments_count: 2,
  },
  // 2. Postingan Terlewat (Jadwal kemarin, status masih 'siap')
  {
    id: 'post-2',
    brand_id: 'brand-1',
    title: 'Pendaftaran Bootcamp Flutter Batch 12 Ditutup Besok',
    caption: 'Jangan sampai ketinggalan kesempatan magang dan belajar langsung bareng praktisi industri! Klik link di bio sekarang.',
    hashtags: '#Flutter #Bootcamp #UdaCoding #MobileDev',
    platforms: ['instagram'],
    content_type: 'feed',
    status: 'siap',
    scheduled_at: getDateStr(now.getDate() - 1, 10, 0),
    pillar_id: 'pil-2',
    assignee_id: 'user-2',
    notes: 'Harus segera diposting manual.',
    posted_at: null,
    posted_url: null,
    media_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600',
    aspect_ratio: '1:1',
    comments_count: 1,
  },
  // 3. Postingan Menunggu Review
  {
    id: 'post-3',
    brand_id: 'brand-1',
    title: 'Suasana Seru Kantor UdaCoding Hari Ini',
    caption: 'Bukan cuma coding, di UdaCoding kita juga seru-seruan bareng! Tebak hari ini tim lagi ngapain?',
    hashtags: '#LifeAtUdaCoding #WorkplaceCulture #DeveloperLife',
    platforms: ['instagram', 'tiktok'],
    content_type: 'reels',
    status: 'review',
    scheduled_at: getDateStr(now.getDate() + 1, 19, 0),
    pillar_id: 'pil-3',
    assignee_id: 'user-2',
    notes: 'Rina mengajukan review ke Budi.',
    posted_at: null,
    posted_url: null,
    media_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600',
    aspect_ratio: '4:5',
    comments_count: 3,
  },
  // 4. Postingan Sudah Tayang (Terposting)
  {
    id: 'post-4',
    brand_id: 'brand-1',
    title: 'Kisah Sukses Ahmad: Dari Pemula Jadi Backend Dev di Startup',
    caption: '“Belajar di UdaCoding mengubah cara saya memandang arsitektur kode.” Simak cerita inspiratif Ahmad di blog resmi kami.',
    hashtags: '#Testimoni #AlumniUdaCoding #SuksesKarir',
    platforms: ['instagram', 'facebook'],
    content_type: 'feed',
    status: 'terposting',
    scheduled_at: getDateStr(now.getDate() - 2, 13, 0),
    pillar_id: 'pil-4',
    assignee_id: 'user-1',
    notes: 'Sudah diposting di IG & FB.',
    posted_at: getDateStr(now.getDate() - 2, 13, 5),
    posted_url: 'https://instagram.com/p/udacoding-example',
    media_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600',
    aspect_ratio: '1:1',
    comments_count: 0,
  },
  // 5. Postingan Status Ide (Belum Dijadwalkan)
  {
    id: 'post-5',
    brand_id: 'brand-1',
    title: 'Ide Konten: Perbedaan Next.js App Router vs Pages Router',
    caption: 'Bikin infografis komparasi performa dan folder structure.',
    hashtags: '#NextJS #ReactJS #WebDev',
    platforms: ['instagram', 'linkedin'],
    content_type: 'carousel',
    status: 'ide',
    scheduled_at: null, // Belum dijadwalkan!
    pillar_id: 'pil-1',
    assignee_id: null,
    notes: 'Masih brainstorming konsep.',
    posted_at: null,
    posted_url: null,
    media_url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600',
    aspect_ratio: '1:1',
    comments_count: 0,
  },
  // 6. Postingan Draft
  {
    id: 'post-6',
    brand_id: 'brand-1',
    title: 'Q&A Jumat Berkah: Tanya Apa Saja Soal Karir Tech',
    caption: 'Punya pertanyaan seputar cara bikin CV programmer atau lolos interview kerja? Tulis di kolom stiker story ya!',
    hashtags: '#QA #JumatBerkah #TechCareer',
    platforms: ['instagram'],
    content_type: 'story',
    status: 'draft',
    scheduled_at: getDateStr(now.getDate() + 3, 9, 30),
    pillar_id: 'pil-3',
    assignee_id: 'user-2',
    notes: '',
    posted_at: null,
    posted_url: null,
    media_url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600',
    aspect_ratio: '4:5',
    comments_count: 0,
  },
  // 7-25: Postingan tersebar lainnya di bulan ini
  ...Array.from({ length: 19 }).map((_, idx) => {
    const day = ((idx * 3 + 2) % 28) + 1;
    const statusArr: Array<'ide' | 'draft' | 'review' | 'siap' | 'terposting'> = [
      'siap',
      'terposting',
      'draft',
      'review',
      'siap',
    ];
    const postStatus = statusArr[idx % statusArr.length];
    const brandId = idx % 3 === 0 ? 'brand-1' : idx % 3 === 1 ? 'brand-2' : 'brand-3';

    return {
      id: `post-gen-${idx + 7}`,
      brand_id: brandId,
      title: `Rencana Konten ${idx + 7}: Update Tren Media Sosial Mingguan`,
      caption: `Update strategi konten terkini untuk meningkatkan engagement akun bisnis Anda. Simak tips praktis nomor 3! #UdaPlanner #SocialMedia`,
      hashtags: '#SocialMediaTips #DigitalMarketing #KontenKreator',
      platforms: ['instagram', 'tiktok'],
      content_type: (idx % 2 === 0 ? 'feed' : 'carousel') as any,
      status: postStatus,
      scheduled_at: getDateStr(day, 10 + (idx % 8), 0),
      pillar_id: 'pil-1',
      assignee_id: 'user-2',
      notes: null,
      posted_at: postStatus === 'terposting' ? getDateStr(day, 10, 5) : null,
      posted_url: null,
      media_url: `https://picsum.photos/seed/${idx + 50}/600/600`,
      aspect_ratio: '1:1' as const,
      comments_count: idx % 4,
    };
  }),
];

export const DUMMY_SNIPPETS: DummySnippet[] = [
  {
    id: 'snip-1',
    brand_id: 'brand-1',
    type: 'caption',
    title: 'Call to Action (CTA) Link di Bio',
    body: 'Mau kuasai skill coding dari nol sampai siap kerja? Klik link di bio kami untuk konsultasi gratis dengan konsultan belajar sekarang juga! 🚀',
  },
  {
    id: 'snip-2',
    brand_id: 'brand-1',
    type: 'caption',
    title: 'Opening Hook Edukasi Menarik',
    body: 'Pernah gak sih kamu ngalamin error ini berjam-jam padahal cuma kurang titik koma? 😅 Yuk kita bahas cara cegahnya di postingan ini! 👇',
  },
  {
    id: 'snip-3',
    brand_id: 'brand-1',
    type: 'caption',
    title: 'Closing Pertanyaan Engagement',
    body: 'Kalau kamu ada di posisi ini, pilihan mana yang bakal kamu ambil? Tulis pendapatmu di kolom komentar ya! Jangan lupa share ke teman kodingmu 💻',
  },
  {
    id: 'snip-4',
    brand_id: 'brand-1',
    type: 'hashtag',
    title: 'Hashtag Utama UdaCoding',
    body: '#UdaCoding #BelajarCoding #ProgrammerIndonesia #BootcampCoding #SoftwareEngineer #TechCareer #NextJS #Supabase',
  },
  {
    id: 'snip-5',
    brand_id: 'brand-1',
    type: 'hashtag',
    title: 'Hashtag Komunitas Developer',
    body: '#CodingCommunity #DeveloperLife #100DaysOfCode #WebDevelopment #FrontendDev #BackendDev',
  },
  {
    id: 'snip-6',
    brand_id: 'brand-2',
    type: 'hashtag',
    title: 'Hashtag Kopi Nusantara',
    body: '#KopiSenja #SpecialtyCoffee #NgopiSantai #CoffeeRoaster #BaristaLife',
  },
];

export const DUMMY_NOTIFICATIONS: DummyNotification[] = [
  {
    id: 'notif-1',
    type: 'review_request',
    message: 'Rina meminta review: Suasana Seru Kantor UdaCoding Hari Ini',
    link: '/app/postingan/post-3',
    is_read: false,
    time_ago: '10 menit yang lalu',
    created_at: new Date(Date.now() - 10 * 60000).toISOString(),
  },
  {
    id: 'notif-2',
    type: 'approved',
    message: 'Budi menyetujui postingan: 5 Tips Menguasai PostgreSQL & Supabase',
    link: '/app/postingan/post-1',
    is_read: false,
    time_ago: '1 jam yang lalu',
    created_at: new Date(Date.now() - 60 * 60000).toISOString(),
  },
  {
    id: 'notif-3',
    type: 'assigned',
    message: 'Kamu ditugaskan untuk mengerjakan: Pendaftaran Bootcamp Flutter Batch 12',
    link: '/app/postingan/post-2',
    is_read: false,
    time_ago: '3 jam yang lalu',
    created_at: new Date(Date.now() - 180 * 60000).toISOString(),
  },
  {
    id: 'notif-4',
    type: 'comment',
    message: 'Budi memberikan komentar pada postingan: Suasana Seru Kantor UdaCoding',
    link: '/app/postingan/post-3',
    is_read: true,
    time_ago: 'Kemarin',
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'notif-5',
    type: 'revision',
    message: 'Catatan revisi ditambahkan: Tolak ukur audio dan penyesuaian font slide',
    link: '/app/postingan/post-3',
    is_read: true,
    time_ago: '2 hari lalu',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
];

export const DUMMY_PLANS = [
  {
    code: 'free',
    name: 'Gratis',
    price: 0,
    duration_days: 0,
    max_brands: 1,
    max_members: 0,
    max_scheduled_per_month: 30,
    storage_mb: 200,
    max_file_mb: 10,
    max_snippets: 5,
    allow_video: false,
    allow_grid: false,
    allow_export: false,
    allow_approval: false,
    allow_comments: false,
    features: [
      '1 Brand Media Sosial',
      '30 Postingan Terjadwal / bulan',
      'Penyimpanan 200 MB (Foto saja, maks 10MB)',
      'Bank Konten 5 item',
      'Kalender Konten & Papan Kanban',
      'Pengingat Jadwal & Ekspor Google Calendar',
    ],
  },
  {
    code: 'pro',
    name: 'Pro',
    price: 49000,
    duration_days: 30,
    max_brands: 5,
    max_members: 0,
    max_scheduled_per_month: null, // Tanpa batas
    storage_mb: 5120, // 5 GB
    max_file_mb: 50,
    max_snippets: null, // Tanpa batas
    allow_video: true,
    allow_grid: true,
    allow_export: true,
    allow_approval: false,
    allow_comments: false,
    popular: true,
    features: [
      'Hingga 5 Brand Media Sosial',
      'Postingan Terjadwal Tanpa Batas',
      'Penyimpanan 5 GB (Foto & Video maks 50MB)',
      'Bank Konten Tanpa Batas',
      'Pratinjau Grid Instagram (3 kolom)',
      'Ekspor Kalender CSV & .ics per bulan',
    ],
  },
  {
    code: 'team',
    name: 'Tim',
    price: 149000,
    duration_days: 30,
    max_brands: 20,
    max_members: 10,
    max_scheduled_per_month: null, // Tanpa batas
    storage_mb: 20480, // 20 GB
    max_file_mb: 50,
    max_snippets: null, // Tanpa batas
    allow_video: true,
    allow_grid: true,
    allow_export: true,
    allow_approval: true,
    allow_comments: true,
    features: [
      'Hingga 20 Brand Media Sosial',
      '10 Anggota Tim (Editor, Reviewer, Viewer)',
      'Postingan Terjadwal Tanpa Batas',
      'Penyimpanan 20 GB (Foto & Video maks 50MB)',
      'Alur Persetujuan Konten (Wajib Review)',
      'Kolaborasi Komentar & Catatan Revisi',
      'Pratinjau Grid & Ekspor Lengkap',
    ],
  },
];
