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

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export type RefreshResponse = {
  accessToken: string;
  refreshToken: string;
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

/** Public learning goal shape. */
export type LearningGoal = {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  status: LearningGoalStatus;
  targetDate: string | null;
  createdAt: string;
  updatedAt: string;
};
