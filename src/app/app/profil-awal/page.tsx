'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AppProfilAwalRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/profil-awal');
  }, [router]);

  return null;
}
