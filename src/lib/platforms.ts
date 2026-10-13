export interface PlatformConfig {
  id: string;
  name: string;
  maxCaptionLength: number;
  iconName: string;
  badgeBg: string;
  badgeText: string;
}

export const PLATFORMS: Record<string, PlatformConfig> = {
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    maxCaptionLength: 2200,
    iconName: 'Instagram',
    badgeBg: 'rgba(225, 48, 108, 0.1)',
    badgeText: '#E1306C',
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    maxCaptionLength: 4000,
    iconName: 'Video',
    badgeBg: 'rgba(0, 0, 0, 0.1)',
    badgeText: '#000000',
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    maxCaptionLength: 63206,
    iconName: 'Facebook',
    badgeBg: 'rgba(24, 119, 242, 0.1)',
    badgeText: '#1877F2',
  },
  youtube: {
    id: 'youtube',
    name: 'YouTube',
    maxCaptionLength: 5000,
    iconName: 'Youtube',
    badgeBg: 'rgba(255, 0, 0, 0.1)',
    badgeText: '#FF0000',
  },
  linkedin: {
    id: 'linkedin',
    name: 'LinkedIn',
    maxCaptionLength: 3000,
    iconName: 'Linkedin',
    badgeBg: 'rgba(10, 102, 194, 0.1)',
    badgeText: '#0A66C2',
  },
  x: {
    id: 'x',
    name: 'X (Twitter)',
    maxCaptionLength: 280,
    iconName: 'Twitter',
    badgeBg: 'rgba(15, 23, 42, 0.1)',
    badgeText: '#0F172A',
  },
  threads: {
    id: 'threads',
    name: 'Threads',
    maxCaptionLength: 500,
    iconName: 'AtSign',
    badgeBg: 'rgba(0, 0, 0, 0.1)',
    badgeText: '#000000',
  },
};

export const CONTENT_TYPES = [
  { id: 'feed', name: 'Foto (Feed)' },
  { id: 'carousel', name: 'Carousel' },
  { id: 'reels', name: 'Reels' },
  { id: 'story', name: 'Story' },
  { id: 'video', name: 'Video' },
  { id: 'teks', name: 'Teks' },
  { id: 'live', name: 'Live' },
];

export const POST_STATUSES = {
  ide: {
    id: 'ide',
    label: 'Ide',
    color: '#94A3B8',
    bg: '#F1F5F9',
    text: '#475569',
  },
  draft: {
    id: 'draft',
    label: 'Draft',
    color: '#3B82F6',
    bg: '#EFF6FF',
    text: '#1D4ED8',
  },
  review: {
    id: 'review',
    label: 'Menunggu Review',
    color: '#F59E0B',
    bg: '#FFFBEB',
    text: '#B45309',
  },
  siap: {
    id: 'siap',
    label: 'Siap Posting',
    color: '#16A34A',
    bg: '#F0FDF4',
    text: '#15803D',
  },
  terposting: {
    id: 'terposting',
    label: 'Sudah Posting',
    color: '#475569',
    bg: '#F8FAFC',
    text: '#334155',
  },
  terlewat: {
    id: 'terlewat',
    label: 'Terlewat',
    color: '#DC2626',
    bg: '#FEF2F2',
    text: '#B91C1C',
  },
};

export const BRAND_COLORS = [
  '#16A34A', // Hijau UdaCoding (Default)
  '#3B82F6', // Biru
  '#6366F1', // Indigo
  '#8B5CF6', // Ungu
  '#EC4899', // Pink
  '#EF4444', // Merah
  '#F59E0B', // Kuning/Amber
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#0F172A', // Hitam/Slate
];
