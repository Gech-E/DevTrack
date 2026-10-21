import { Prisma } from '@prisma/client';

export function isPrismaError(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

/** P2002: unique constraint failed. */
export function isUniqueViolation(error: unknown): boolean {
  return isPrismaError(error, 'P2002');
}
