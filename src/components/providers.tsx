'use client';

import React from 'react';
import { AuthProvider } from '@/contexts/auth-context';
import { ModalProvider } from '@/contexts/modal-context';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ModalProvider>
        {children}
      </ModalProvider>
    </AuthProvider>
  );
}
