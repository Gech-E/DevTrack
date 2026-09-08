'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/features/auth/auth-provider';

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) {
      return;
    }
    router.replace(user ? '/projects' : '/login');
  }, [loading, user, router]);

  return (
    <main className="flex min-h-screen items-center justify-center text-[var(--muted)]">
      Loading DevTrack…
    </main>
  );
}
