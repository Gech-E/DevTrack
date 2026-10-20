'use client';

import * as React from 'react';
import Link from 'next/link';
import { TaskPriority, TaskStatus, type Project, type Task } from '@devtrack/shared';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getErrorMessage } from '@/features/auth/auth-provider';
import { formatLabel } from '@/lib/labels';
import { api } from '@/lib/api';

const statuses = Object.values(TaskStatus);
const priorities = Object.values(TaskPriority);

export function ProjectDetailPage({ projectId }: { projectId: string }) {
  const [project, setProject] = React.useState<Project | null>(null);
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [title, setTitle] = React.useState('');
  const [priority, setPriority] = React.useState<Task['priority']>(TaskPriority.MEDIUM);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextProject, nextTasks] = await Promise.all([
        api.getProject(projectId),
        api.listTasks(projectId),
      ]);
      setProject(nextProject);
      setTasks(nextTasks);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const created = await api.createTask(projectId, { title, priority });
      setTasks((current) => [created, ...current]);
      setTitle('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function onStatusChange(task: Task, status: Task['status']) {
    setError(null);
    try {
      const updated = await api.updateTask(projectId, task.id, { status });
      setTasks((current) => current.map((item) => (item.id === task.id ? updated : item)));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function onDelete(taskId: string) {
    if (!window.confirm('Delete this task?')) {
      return;
    }
    setError(null);
    try {
      await api.deleteTask(projectId, taskId);
      setTasks((current) => current.filter((task) => task.id !== taskId));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  if (loading) {
    return <p className="px-6 py-10 text-[var(--muted)]">Loading project…</p>;
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <p className="text-[var(--danger)]">{error ?? 'Project not found'}</p>
        <Button asChild variant="secondary" className="mt-4">
          <Link href="/projects">Back to projects</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-up mx-auto w-full max-w-5xl space-y-8 px-6 py-10">
      <div>
        <Link className="text-sm text-[var(--accent)]" href="/projects">
          ← Projects
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{project.name}</h1>
        <p className="mt-2 text-[var(--muted)]">{project.description ?? 'No description'}</p>
      </div>

      <section className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <div>
          <h2 className="text-lg font-semibold">New task</h2>
          <p className="text-sm text-[var(--muted)]">Add work items under this project.</p>
        </div>
        <form className="grid gap-4 sm:grid-cols-[1fr_auto_auto]" onSubmit={onCreate}>
          <div className="space-y-2">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-priority">Priority</Label>
            <select
              id="task-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as Task['priority'])}
            >
              {priorities.map((value) => (
                <option key={value} value={value}>
                  {formatLabel(value)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Adding…' : 'Add task'}
            </Button>
          </div>
        </form>
      </section>

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

      <div className="grid gap-3">
        {tasks.length === 0 ? (
          <p className="text-[var(--muted)]">No tasks yet.</p>
        ) : (
          tasks.map((task) => (
            <article
              key={task.id}
              className="flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <h3 className="text-base font-semibold">{task.title}</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge>{formatLabel(task.status)}</Badge>
                  <Badge>{formatLabel(task.priority)}</Badge>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label={`Status for ${task.title}`}
                  value={task.status}
                  onChange={(e) => void onStatusChange(task, e.target.value as Task['status'])}
                >
                  {statuses.map((value) => (
                    <option key={value} value={value}>
                      {formatLabel(value)}
                    </option>
                  ))}
                </select>
                <Button variant="danger" size="sm" onClick={() => void onDelete(task.id)}>
                  Delete
                </Button>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
