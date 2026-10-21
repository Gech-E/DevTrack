import type {
  LearningGoalStatus as PrismaLearningGoalStatus,
  TaskPriority as PrismaTaskPriority,
  TaskStatus as PrismaTaskStatus,
} from '@prisma/client';
import type { LearningGoalStatus, TaskPriority, TaskStatus } from '@devtrack/shared';

/**
 * Compile-time guard: `@devtrack/shared` mirrors the Prisma enums by hand. If a value is added
 * to one side only, `pnpm typecheck` and `pnpm build` fail here instead of surfacing at runtime.
 */
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Assert<T extends true> = T;

export type EnumsInSync = [
  Assert<Equal<PrismaTaskStatus, TaskStatus>>,
  Assert<Equal<PrismaTaskPriority, TaskPriority>>,
  Assert<Equal<PrismaLearningGoalStatus, LearningGoalStatus>>,
];
