'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { APP_NAME } from '@devtrack/shared';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/auth-provider';
import { cn } from '@/lib/utils';

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

const navItems = [
  { href: '/projects', label: 'Projects' },
  { href: '/goals', label: 'Goals' },
];

export function AppHeader() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [signingOut, setSigningOut] = React.useState(false);

  async function onLogout() {
    setSigningOut(true);
    try {
      await logout();
      router.replace('/login');
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <header className="border-b border-[var(--border)] bg-black/25 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-8">
          <Link href="/projects" className="brand text-xl font-semibold tracking-tight">
            {APP_NAME}
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm transition-colors',
                    active
                      ? 'bg-white/10 text-[var(--foreground)]'
                      : 'text-[var(--muted)] hover:text-[var(--foreground)]',
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <p className="hidden text-sm text-[var(--muted)] sm:block">{user?.name}</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void onLogout()}
            disabled={signingOut}
          >
            {signingOut ? 'Signing out…' : 'Sign out'}
          </Button>
        </div>
      </div>
    </header>
  );
}
