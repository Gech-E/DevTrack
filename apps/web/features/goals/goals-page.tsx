'use client';

import * as React from 'react';
import { LearningGoalStatus, type LearningGoal } from '@devtrack/shared';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getErrorMessage } from '@/features/auth/auth-provider';
import { formatGoalStatus, formatLabel } from '@/lib/labels';
import { api } from '@/lib/api';

const statuses = Object.values(LearningGoalStatus);

export function GoalsPage() {
  const [goals, setGoals] = React.useState<LearningGoal[]>([]);
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [targetDate, setTargetDate] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setGoals(await api.listGoals());
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
      });
      setGoals((current) => [created, ...current]);
      setTitle('');
      setDescription('');
      setTargetDate('');
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
    <div className="animate-fade-up mx-auto w-full max-w-5xl space-y-8 px-6 py-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Learning goals</h1>
        <p className="mt-2 text-[var(--muted)]">
          Track what you want to learn — separate from day-to-day project tasks.
        </p>
      </div>

      <section className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <div>
          <h2 className="text-lg font-semibold">New goal</h2>
          <p className="text-sm text-[var(--muted)]">
            Set a direction, then mark progress over time.
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
              className="flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:flex-row sm:items-center sm:justify-between"
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
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
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
