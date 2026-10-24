import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { LearningGoal, Project } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import type { CreateLearningGoalDto } from './dto/create-learning-goal.dto';
import type { UpdateLearningGoalDto } from './dto/update-learning-goal.dto';

export type GoalWithProject = LearningGoal & {
  project: Pick<Project, 'id' | 'name'> | null;
};

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  listForUser(userId: string): Promise<GoalWithProject[]> {
    return this.prisma.learningGoal.findMany({
      where: { userId },
      include: { project: { select: { id: true, name: true } } },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    });
  }

  async getForUser(userId: string, goalId: string): Promise<GoalWithProject> {
    return this.findOwnedOrThrow(userId, goalId);
  }

  async createForUser(userId: string, dto: CreateLearningGoalDto): Promise<GoalWithProject> {
    const projectId = await this.resolveOwnedProjectId(userId, dto.projectId);

    return this.prisma.learningGoal.create({
      data: {
        userId,
        projectId,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        status: dto.status,
        targetDate: this.parseDate(dto.targetDate),
      },
      include: { project: { select: { id: true, name: true } } },
    });
  }

  async updateForUser(
    userId: string,
    goalId: string,
    dto: UpdateLearningGoalDto,
  ): Promise<GoalWithProject> {
    await this.findOwnedOrThrow(userId, goalId);

    const projectId =
      dto.projectId === undefined
        ? undefined
        : await this.resolveOwnedProjectId(userId, dto.projectId);

    return this.prisma.learningGoal.update({
      where: { id: goalId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.targetDate !== undefined ? { targetDate: this.parseDate(dto.targetDate) } : {}),
        ...(projectId !== undefined ? { projectId } : {}),
      },
      include: { project: { select: { id: true, name: true } } },
    });
  }

  async deleteForUser(userId: string, goalId: string): Promise<void> {
    await this.findOwnedOrThrow(userId, goalId);
    await this.prisma.learningGoal.delete({ where: { id: goalId } });
  }

  private async findOwnedOrThrow(userId: string, goalId: string): Promise<GoalWithProject> {
    const goal = await this.prisma.learningGoal.findFirst({
      where: { id: goalId, userId },
      include: { project: { select: { id: true, name: true } } },
    });

    if (!goal) {
      throw new NotFoundException('Learning goal not found');
    }

    return goal;
  }

  private async resolveOwnedProjectId(
    userId: string,
    projectId: string | null | undefined,
  ): Promise<string | null> {
    if (projectId === undefined || projectId === null || projectId.trim() === '') {
      return null;
    }

    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
      select: { id: true },
    });

    if (!project) {
      throw new BadRequestException('Project not found for this user');
    }

    return project.id;
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
