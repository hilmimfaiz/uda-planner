import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { WhatsAppHelpButton } from '@/components/whatsapp-button';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'UdaPlanner — Social Media Planner & Management System',
  description: 'Sistem manajemen konten dan kalender perencanaan postingan sosial media terintegrasi dengan backend Supabase.',
  icons: {
    icon: '/icon.png',
    shortcut: '/favicon.ico',
    apple: '/icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#16a34a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${plusJakartaSans.variable} ${jetBrainsMono.variable}`} suppressHydrationWarning>
      <body className={`${plusJakartaSans.className} antialiased`} suppressHydrationWarning>
        <Providers>
          {children}
          <WhatsAppHelpButton />
        </Providers>
      </body>
    </html>
  );
}
