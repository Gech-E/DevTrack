import { APP_NAME } from '@devtrack/shared';

import { LoginForm } from '@/features/auth/login-form';

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-8 px-6 py-16 lg:flex-row lg:items-center lg:justify-between">
      <div className="max-w-md">
        <p className="mb-3 text-sm tracking-[0.2em] text-[var(--muted)] uppercase">
          Portfolio project
        </p>
        <h1 className="text-5xl font-semibold tracking-tight">{APP_NAME}</h1>
        <p className="mt-4 text-lg text-[var(--muted)]">
          Sign in to manage learning projects and tasks.
        </p>
      </div>
      <LoginForm />
    </main>
  );
}
