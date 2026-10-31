import { LearningGoalStatus, PrismaClient, TaskPriority, TaskStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/** Demo account for local development and CI only. */
const DEMO_EMAIL = 'demo@devtrack.local';
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? 'password123';

async function main(): Promise<void> {
  // The demo user has a publicly known password, so it must never exist in a real environment.
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed demo data when NODE_ENV=production');
  }

  const email = DEMO_EMAIL;
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: 'Demo Developer',
      passwordHash,
    },
    create: {
      email,
      name: 'Demo Developer',
      passwordHash,
    },
  });

  const existingProject = await prisma.project.findFirst({
    where: { userId: user.id, name: 'Learning NestJS' },
  });

  const project =
    existingProject ??
    (await prisma.project.create({
      data: {
        userId: user.id,
        name: 'Learning NestJS',
        description: 'Track progress while building DevTrack.',
        tasks: {
          create: [
            {
              title: 'Set up Prisma schema',
              status: TaskStatus.DONE,
              priority: TaskPriority.HIGH,
            },
            {
              title: 'Implement JWT authentication',
              description: 'Register, login, and protect routes.',
              status: TaskStatus.TODO,
              priority: TaskPriority.HIGH,
            },
            {
              title: 'Build projects CRUD API',
              status: TaskStatus.TODO,
              priority: TaskPriority.MEDIUM,
            },
          ],
        },
      },
    }));

  console.log('Seed complete:', {
    user: { id: user.id, email: user.email },
    project: { id: project.id, name: project.name },
  });

  const existingGoal = await prisma.learningGoal.findFirst({
    where: { userId: user.id, title: 'Ship a full-stack portfolio app' },
  });

  if (!existingGoal) {
    await prisma.learningGoal.create({
      data: {
        userId: user.id,
        projectId: project.id,
        title: 'Ship a full-stack portfolio app',
        description: 'DevTrack end-to-end: API, UI, tests, and deploy.',
        status: LearningGoalStatus.ACTIVE,
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  }

  console.log('Seed goal ready for demo user');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
