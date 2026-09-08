/**
 * Shared, framework-free contracts for DevTrack.
 * Keep Nest/Next and Prisma client imports out of this package.
 */

export const APP_NAME = 'DevTrack' as const;

export type HealthStatus = 'ok' | 'degraded';

/** Mirrors Prisma `TaskStatus` — keep values in sync with the schema. */
export const TaskStatus = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE',
} as const;

export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

/** Mirrors Prisma `TaskPriority` — keep values in sync with the schema. */
export const TaskPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
} as const;

export type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority];
