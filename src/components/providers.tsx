'use client';

import React from 'react';
import { AuthProvider } from '@/contexts/auth-context';
import { ModalProvider } from '@/contexts/modal-context';
import { PageTransitionLoader } from './page-transition-loader';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ModalProvider>
        <PageTransitionLoader />
        {children}
      </ModalProvider>
    </AuthProvider>
  );
}
