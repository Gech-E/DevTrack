import { APP_NAME } from '@devtrack/shared';

import { LoginForm } from '@/features/auth/login-form';

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-10 px-6 py-16 lg:flex-row lg:items-center lg:justify-between">
      <div className="animate-fade-up max-w-md">
        <p className="brand mb-3 text-sm tracking-[0.22em] text-[var(--accent)] uppercase">
          {APP_NAME}
        </p>
        <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">Learn in public.</h1>
        <p className="mt-4 text-lg leading-relaxed text-[var(--muted)]">
          Track goals, ship projects, and keep tasks moving — one calm workspace for developer
          growth.
        </p>
      </div>
      <div className="animate-fade-up w-full max-w-md" style={{ animationDelay: '80ms' }}>
        <LoginForm />
      </div>
    </main>
  );
}
