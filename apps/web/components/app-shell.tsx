'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { APP_NAME } from '@devtrack/shared';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/auth-provider';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  React.useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[var(--muted)]">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}

export function AppHeader() {
  const { user, logout } = useAuth();
  const router = useRouter();

  function onLogout() {
    logout();
    router.replace('/login');
  }

  return (
    <header className="border-b border-white/10 bg-black/20 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
        <div>
          <p className="text-sm tracking-[0.18em] text-[var(--muted)] uppercase">{APP_NAME}</p>
          <p className="text-sm text-[var(--foreground)]">{user?.name}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={onLogout}>
          Sign out
        </Button>
      </div>
    </header>
  );
}
