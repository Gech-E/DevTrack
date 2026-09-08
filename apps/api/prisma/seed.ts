import { PrismaClient, TaskPriority, TaskStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = 'demo@devtrack.local';
  const passwordHash = await bcrypt.hash('password123', 10);

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
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
