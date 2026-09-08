import { APP_NAME } from '@devtrack/shared';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-16">
      <p className="mb-3 text-sm tracking-[0.2em] text-[var(--muted)] uppercase">
        Portfolio project
      </p>
      <h1 className="mb-4 text-5xl font-semibold tracking-tight text-[var(--foreground)] sm:text-6xl">
        {APP_NAME}
      </h1>
      <p className="max-w-xl text-lg leading-relaxed text-[var(--muted)]">
        Personal developer learning and task management. Phase 1 is environment setup only — API and
        UI shells are ready; business features come next.
      </p>
      <p className="mt-8 text-sm text-[var(--accent)]">
        API health: <code className="text-[var(--foreground)]">GET /health</code> on port 3001
      </p>
    </main>
  );
}
