import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'UdaPlanner — Social Media Planner & Management System',
  description: 'Sistem manajemen konten dan kalender perencanaan postingan sosial media terintegrasi dengan backend Supabase.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
