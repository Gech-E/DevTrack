import { NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { LearningGoalStatus } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { GoalsService } from './goals.service';

describe('GoalsService', () => {
  let service: GoalsService;
  let prisma: {
    learningGoal: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const goal = {
    id: 'goal_1',
    userId: 'user_1',
    title: 'Master NestJS',
    description: null,
    status: LearningGoalStatus.ACTIVE,
    targetDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      learningGoal: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [GoalsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(GoalsService);
  });

  it('lists goals for the authenticated user', async () => {
    prisma.learningGoal.findMany.mockResolvedValue([goal]);

    const result = await service.listForUser('user_1');

    expect(prisma.learningGoal.findMany).toHaveBeenCalledWith({
      where: { userId: 'user_1' },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    });
    expect(result).toEqual([goal]);
  });

  it('rejects access to another user goal', async () => {
    prisma.learningGoal.findFirst.mockResolvedValue(null);

    await expect(service.getForUser('user_1', 'goal_other')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
