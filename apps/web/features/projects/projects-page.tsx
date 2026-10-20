'use client';

import * as React from 'react';
import Link from 'next/link';
import type { Project } from '@devtrack/shared';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getErrorMessage } from '@/features/auth/auth-provider';
import { api } from '@/lib/api';

export function ProjectsPage() {
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProjects(await api.listProjects());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const created = await api.createProject({
        name,
        description: description.trim() || undefined,
      });
      setProjects((current) => [created, ...current]);
      setName('');
      setDescription('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(projectId: string) {
    if (!window.confirm('Delete this project and all of its tasks?')) {
      return;
    }
    setError(null);
    try {
      await api.deleteProject(projectId);
      setProjects((current) => current.filter((project) => project.id !== projectId));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="animate-fade-up mx-auto w-full max-w-5xl space-y-8 px-6 py-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Projects</h1>
        <p className="mt-2 text-[var(--muted)]">
          Organize learning work into projects, then track tasks.
        </p>
      </div>

      <section className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <div>
          <h2 className="text-lg font-semibold">New project</h2>
          <p className="text-sm text-[var(--muted)]">Create a container for related tasks.</p>
        </div>
        <form className="mt-2 grid gap-4 sm:grid-cols-[1fr_1fr_auto]" onSubmit={onCreate}>
          <div className="space-y-2">
            <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-description">Description</Label>
            <Input
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create'}
            </Button>
          </div>
        </form>
      </section>

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

      {loading ? (
        <p className="text-[var(--muted)]">Loading projects…</p>
      ) : projects.length === 0 ? (
        <p className="text-[var(--muted)]">No projects yet. Create your first one above.</p>
      ) : (
        <div className="grid gap-3">
          {projects.map((project) => (
            <article
              key={project.id}
              className="flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <h3 className="text-lg font-semibold">
                  <Link className="hover:text-[var(--accent)]" href={`/projects/${project.id}`}>
                    {project.name}
                  </Link>
                </h3>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {project.description ?? 'No description'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="secondary" size="sm">
                  <Link href={`/projects/${project.id}`}>Open</Link>
                </Button>
                <Button variant="danger" size="sm" onClick={() => void onDelete(project.id)}>
                  Delete
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
