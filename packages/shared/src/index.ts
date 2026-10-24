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

/** Mirrors Prisma `LearningGoalStatus`. */
export const LearningGoalStatus = {
  NOT_STARTED: 'NOT_STARTED',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
} as const;

export type LearningGoalStatus = (typeof LearningGoalStatus)[keyof typeof LearningGoalStatus];

/** Public user shape returned by auth endpoints (never includes password). */
export type AuthUser = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
};

/** Tokens live in httpOnly cookies; responses only expose the user. */
export type AuthResponse = {
  user: AuthUser;
};

export type RefreshResponse = {
  ok: true;
};

/** Public project shape returned by project endpoints. */
export type Project = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Public task shape returned by task endpoints. */
export type Task = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Linked project summary on a learning goal. */
export type GoalProjectSummary = {
  id: string;
  name: string;
};

/** Public learning goal shape. */
export type LearningGoal = {
  id: string;
  userId: string;
  projectId: string | null;
  project: GoalProjectSummary | null;
  title: string;
  description: string | null;
  status: LearningGoalStatus;
  targetDate: string | null;
  createdAt: string;
  updatedAt: string;
};
