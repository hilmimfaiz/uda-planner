import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'UdaPlanner — Social Media Planner & Management System',
  description: 'Sistem manajemen konten dan kalender perencanaan postingan sosial media terintegrasi dengan backend Supabase.',
};

import { Providers } from '@/components/providers';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
