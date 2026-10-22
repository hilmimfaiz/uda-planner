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
  type: 'review_request' | 'approved' | 'revision' | 'assigned' | 'comment' | 'system' | 'team_invite';
  title?: string;
  message: string;
  link: string;
  is_read: boolean;
  time_ago: string;
  created_at: string;
  target_email?: string;
  target_user_id?: string;
  invite_data?: {
    invite_id: string;
    brand_id: string;
    brand_name: string;
    brand_avatar?: string;
    role: 'owner' | 'editor' | 'reviewer' | 'viewer';
    inviter_name: string;
    inviter_email?: string;
    target_email: string;
    target_user_id?: string;
    target_name?: string;
    status: 'pending' | 'accepted' | 'rejected';
    created_at: string;
  };
}

export const DUMMY_BRANDS: DummyBrand[] = [];

export const DUMMY_MEMBERS: DummyMember[] = [];

export const DUMMY_PILLARS: DummyPillar[] = [];

export const DUMMY_POSTS: DummyPost[] = [];

export const DUMMY_SNIPPETS: DummySnippet[] = [];

export const DUMMY_NOTIFICATIONS: DummyNotification[] = [];

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
