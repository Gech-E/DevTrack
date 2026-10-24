'use client';

import * as React from 'react';
import { LearningGoalStatus, type LearningGoal, type Project } from '@devtrack/shared';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getErrorMessage } from '@/features/auth/auth-provider';
import { api } from '@/lib/api';
import { formatGoalStatus, formatLabel } from '@/lib/labels';

const statuses = Object.values(LearningGoalStatus);

export function GoalsPage() {
  const [goals, setGoals] = React.useState<LearningGoal[]>([]);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [targetDate, setTargetDate] = React.useState('');
  const [projectId, setProjectId] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [goalRows, projectRows] = await Promise.all([api.listGoals(), api.listProjects()]);
      setGoals(goalRows);
      setProjects(projectRows);
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
      const created = await api.createGoal({
        title,
        description: description.trim() || undefined,
        targetDate: targetDate ? new Date(targetDate).toISOString() : undefined,
        status: LearningGoalStatus.ACTIVE,
        projectId: projectId || null,
      });
      setGoals((current) => [created, ...current]);
      setTitle('');
      setDescription('');
      setTargetDate('');
      setProjectId('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function onStatusChange(goal: LearningGoal, status: LearningGoal['status']) {
    setError(null);
    try {
      const updated = await api.updateGoal(goal.id, { status });
      setGoals((current) => current.map((item) => (item.id === goal.id ? updated : item)));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function onProjectChange(goal: LearningGoal, nextProjectId: string) {
    setError(null);
    try {
      const updated = await api.updateGoal(goal.id, {
        projectId: nextProjectId || null,
      });
      setGoals((current) => current.map((item) => (item.id === goal.id ? updated : item)));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function onDelete(goalId: string) {
    if (!window.confirm('Delete this learning goal?')) {
      return;
    }
    setError(null);
    try {
      await api.deleteGoal(goalId);
      setGoals((current) => current.filter((goal) => goal.id !== goalId));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="animate-fade-up mx-auto w-full max-w-5xl space-y-10 px-6 py-10">
      <header className="max-w-2xl">
        <p className="text-sm tracking-[0.2em] text-[var(--accent)] uppercase">Growth</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Learning goals</h1>
        <p className="mt-3 text-lg text-[var(--muted)]">
          Set the destination. Optionally attach a project so practice stays connected to outcomes.
        </p>
      </header>

      <section className="panel space-y-5 p-6">
        <div>
          <h2 className="text-xl font-semibold">New goal</h2>
          <p className="text-sm text-[var(--muted)]">
            One clear objective. Link a project when ready.
          </p>
        </div>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={onCreate}>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="goal-title">Title</Label>
            <Input
              id="goal-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Comfortable with NestJS auth"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal-description">Notes</Label>
            <Input
              id="goal-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional context"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal-target">Target date</Label>
            <Input
              id="goal-target"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="goal-project">Linked project</Label>
            <select
              id="goal-project"
              className="w-full"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">No project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Add goal'}
            </Button>
          </div>
        </form>
      </section>

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

      {loading ? (
        <p className="text-[var(--muted)]">Loading goals…</p>
      ) : goals.length === 0 ? (
        <p className="text-[var(--muted)]">No learning goals yet.</p>
      ) : (
        <div className="grid gap-3">
          {goals.map((goal) => (
            <article
              key={goal.id}
              className="panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold">{goal.title}</h3>
                  <Badge>{formatGoalStatus(goal.status)}</Badge>
                </div>
                <p className="text-sm text-[var(--muted)]">
                  {goal.description ?? 'No notes'}
                  {goal.targetDate
                    ? ` · Target ${new Date(goal.targetDate).toLocaleDateString()}`
                    : ''}
                  {goal.project ? ` · Project: ${goal.project.name}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label={`Project for ${goal.title}`}
                  value={goal.projectId ?? ''}
                  onChange={(e) => void onProjectChange(goal, e.target.value)}
                >
                  <option value="">No project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={`Status for ${goal.title}`}
                  value={goal.status}
                  onChange={(e) =>
                    void onStatusChange(goal, e.target.value as LearningGoal['status'])
                  }
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {formatLabel(status)}
                    </option>
                  ))}
                </select>
                <Button variant="danger" size="sm" onClick={() => void onDelete(goal.id)}>
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
