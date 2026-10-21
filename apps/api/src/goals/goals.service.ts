import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { LearningGoal } from '@prisma/client';

import { pageArgs, type PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../database/prisma.service';
import type { CreateLearningGoalDto } from './dto/create-learning-goal.dto';
import type { UpdateLearningGoalDto } from './dto/update-learning-goal.dto';

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  listForUser(userId: string, query: PaginationQueryDto = {}): Promise<LearningGoal[]> {
    return this.prisma.learningGoal.findMany({
      where: { userId },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
      ...pageArgs(query),
    });
  }

  async getForUser(userId: string, goalId: string): Promise<LearningGoal> {
    return this.findOwnedOrThrow(userId, goalId);
  }

  createForUser(userId: string, dto: CreateLearningGoalDto): Promise<LearningGoal> {
    return this.prisma.learningGoal.create({
      data: {
        userId,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        status: dto.status,
        targetDate: this.parseDate(dto.targetDate),
      },
    });
  }

  async updateForUser(
    userId: string,
    goalId: string,
    dto: UpdateLearningGoalDto,
  ): Promise<LearningGoal> {
    await this.findOwnedOrThrow(userId, goalId);

    return this.prisma.learningGoal.update({
      where: { id: goalId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.targetDate !== undefined ? { targetDate: this.parseDate(dto.targetDate) } : {}),
      },
    });
  }

  async deleteForUser(userId: string, goalId: string): Promise<void> {
    await this.findOwnedOrThrow(userId, goalId);
    await this.prisma.learningGoal.delete({ where: { id: goalId } });
  }

  private async findOwnedOrThrow(userId: string, goalId: string): Promise<LearningGoal> {
    const goal = await this.prisma.learningGoal.findFirst({
      where: { id: goalId, userId },
    });

    if (!goal) {
      throw new NotFoundException('Learning goal not found');
    }

    return goal;
  }

  private parseDate(value: string | null | undefined): Date | null | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (value === null || value.trim() === '') {
      return null;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('targetDate must be a valid ISO date string');
    }

    return parsed;
  }
}
