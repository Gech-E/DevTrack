import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { TaskPriority, TaskStatus } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  let service: TasksService;
  let prisma: {
    task: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let projectsService: {
    getForUser: jest.Mock;
  };

  const project = {
    id: 'proj_1',
    userId: 'user_1',
    name: 'Learning NestJS',
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const task = {
    id: 'task_1',
    projectId: 'proj_1',
    title: 'Write tests',
    description: null,
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    dueDate: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    prisma = {
      task: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    projectsService = {
      getForUser: jest.fn().mockResolvedValue(project),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: prisma },
        { provide: ProjectsService, useValue: projectsService },
      ],
    }).compile();

    service = module.get(TasksService);
  });

  it('lists tasks only after verifying project ownership', async () => {
    prisma.task.findMany.mockResolvedValue([task]);

    const result = await service.listForProject('user_1', 'proj_1');

    expect(projectsService.getForUser).toHaveBeenCalledWith('user_1', 'proj_1');
    expect(prisma.task.findMany).toHaveBeenCalledWith({
      where: { projectId: 'proj_1' },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    });
    expect(result).toEqual([task]);
  });

  it('creates a task in an owned project', async () => {
    prisma.task.create.mockResolvedValue(task);

    await service.createForProject('user_1', 'proj_1', {
      title: ' Write tests ',
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      dueDate: '2026-12-01T00:00:00.000Z',
    });

    expect(prisma.task.create).toHaveBeenCalledWith({
      data: {
        projectId: 'proj_1',
        title: 'Write tests',
        description: null,
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        dueDate: new Date('2026-12-01T00:00:00.000Z'),
      },
    });
  });

  it('rejects invalid dueDate values', async () => {
    await expect(
      service.createForProject('user_1', 'proj_1', {
        title: 'Bad date',
        dueDate: 'not-a-date',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects tasks outside the project', async () => {
    prisma.task.findFirst.mockResolvedValue(null);

    await expect(service.getForProject('user_1', 'proj_1', 'task_other')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updates task status on an owned project', async () => {
    prisma.task.findFirst.mockResolvedValue(task);
    prisma.task.update.mockResolvedValue({ ...task, status: TaskStatus.DONE });

    const result = await service.updateForProject('user_1', 'proj_1', 'task_1', {
      status: TaskStatus.DONE,
    });

    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: 'task_1' },
      data: { status: TaskStatus.DONE },
    });
    expect(result.status).toBe(TaskStatus.DONE);
  });

  it('deletes a task in an owned project', async () => {
    prisma.task.findFirst.mockResolvedValue(task);
    prisma.task.delete.mockResolvedValue(task);

    await service.deleteForProject('user_1', 'proj_1', 'task_1');

    expect(prisma.task.delete).toHaveBeenCalledWith({ where: { id: 'task_1' } });
  });
});
