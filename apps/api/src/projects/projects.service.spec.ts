import { NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { PrismaService } from '../database/prisma.service';
import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let prisma: {
    project: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const ownedProject = {
    id: 'proj_1',
    userId: 'user_1',
    name: 'Learning NestJS',
    description: 'Track progress',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  };

  beforeEach(async () => {
    prisma = {
      project: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ProjectsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(ProjectsService);
  });

  it('lists only projects for the authenticated user', async () => {
    prisma.project.findMany.mockResolvedValue([ownedProject]);

    const result = await service.listForUser('user_1');

    expect(prisma.project.findMany).toHaveBeenCalledWith({
      where: { userId: 'user_1' },
      orderBy: { updatedAt: 'desc' },
    });
    expect(result).toEqual([ownedProject]);
  });

  it('creates a project owned by the authenticated user', async () => {
    prisma.project.create.mockResolvedValue(ownedProject);

    const result = await service.createForUser('user_1', {
      name: ' Learning NestJS ',
      description: ' Track progress ',
    });

    expect(prisma.project.create).toHaveBeenCalledWith({
      data: {
        userId: 'user_1',
        name: 'Learning NestJS',
        description: 'Track progress',
      },
    });
    expect(result).toEqual(ownedProject);
  });

  it('updates an owned project', async () => {
    prisma.project.findFirst.mockResolvedValue(ownedProject);
    prisma.project.update.mockResolvedValue({ ...ownedProject, name: 'Updated' });

    const result = await service.updateForUser('user_1', 'proj_1', { name: ' Updated ' });

    expect(prisma.project.update).toHaveBeenCalledWith({
      where: { id: 'proj_1' },
      data: { name: 'Updated' },
    });
    expect(result.name).toBe('Updated');
  });

  it('rejects access to another user project', async () => {
    prisma.project.findFirst.mockResolvedValue(null);

    await expect(service.getForUser('user_1', 'proj_other')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('deletes an owned project', async () => {
    prisma.project.findFirst.mockResolvedValue(ownedProject);
    prisma.project.delete.mockResolvedValue(ownedProject);

    await service.deleteForUser('user_1', 'proj_1');

    expect(prisma.project.delete).toHaveBeenCalledWith({ where: { id: 'proj_1' } });
  });
});
