import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Task } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import type { CreateTaskDto } from './dto/create-task.dto';
import type { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectsService: ProjectsService,
  ) {}

  async listForProject(userId: string, projectId: string): Promise<Task[]> {
    await this.projectsService.getForUser(userId, projectId);

    return this.prisma.task.findMany({
      where: { projectId },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    });
  }

  async getForProject(userId: string, projectId: string, taskId: string): Promise<Task> {
    await this.projectsService.getForUser(userId, projectId);
    return this.findInProjectOrThrow(projectId, taskId);
  }

  async createForProject(userId: string, projectId: string, dto: CreateTaskDto): Promise<Task> {
    await this.projectsService.getForUser(userId, projectId);

    return this.prisma.task.create({
      data: {
        projectId,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        status: dto.status,
        priority: dto.priority,
        dueDate: this.parseDueDate(dto.dueDate),
      },
    });
  }

  async updateForProject(
    userId: string,
    projectId: string,
    taskId: string,
    dto: UpdateTaskDto,
  ): Promise<Task> {
    await this.projectsService.getForUser(userId, projectId);
    await this.findInProjectOrThrow(projectId, taskId);

    return this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
        ...(dto.dueDate !== undefined ? { dueDate: this.parseDueDate(dto.dueDate) } : {}),
      },
    });
  }

  async deleteForProject(userId: string, projectId: string, taskId: string): Promise<void> {
    await this.projectsService.getForUser(userId, projectId);
    await this.findInProjectOrThrow(projectId, taskId);
    await this.prisma.task.delete({ where: { id: taskId } });
  }

  private async findInProjectOrThrow(projectId: string, taskId: string): Promise<Task> {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, projectId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  private parseDueDate(value: string | null | undefined): Date | null | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (value === null || value.trim() === '') {
      return null;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('dueDate must be a valid ISO date string');
    }

    return parsed;
  }
}
