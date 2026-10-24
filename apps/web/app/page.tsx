'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { APP_NAME } from '@devtrack/shared';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/auth-provider';

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/projects');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center text-[var(--muted)]">
        Loading…
      </main>
    );
  }

  if (user) {
    return null;
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="hero-glow" aria-hidden />
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-16">
        <p className="brand animate-fade-up text-sm tracking-[0.28em] text-[var(--accent)] uppercase">
          {APP_NAME}
        </p>
        <h1 className="brand animate-fade-up mt-4 max-w-3xl text-5xl font-semibold tracking-tight sm:text-7xl">
          Learn with intention.
        </h1>
        <p
          className="animate-fade-up mt-5 max-w-xl text-lg leading-relaxed text-[var(--muted)]"
          style={{ animationDelay: '70ms' }}
        >
          A calm workspace for developer growth — goals, projects, and tasks in one place.
        </p>
        <div
          className="animate-fade-up mt-8 flex flex-wrap gap-3"
          style={{ animationDelay: '120ms' }}
        >
          <Button asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/register">Create account</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
