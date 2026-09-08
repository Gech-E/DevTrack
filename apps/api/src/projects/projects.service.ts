import { Injectable, NotFoundException } from '@nestjs/common';
import type { Project } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import type { CreateProjectDto } from './dto/create-project.dto';
import type { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  listForUser(userId: string): Promise<Project[]> {
    return this.prisma.project.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getForUser(userId: string, projectId: string): Promise<Project> {
    return this.findOwnedOrThrow(userId, projectId);
  }

  createForUser(userId: string, dto: CreateProjectDto): Promise<Project> {
    return this.prisma.project.create({
      data: {
        userId,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
      },
    });
  }

  async updateForUser(userId: string, projectId: string, dto: UpdateProjectDto): Promise<Project> {
    await this.findOwnedOrThrow(userId, projectId);

    return this.prisma.project.update({
      where: { id: projectId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
      },
    });
  }

  async deleteForUser(userId: string, projectId: string): Promise<void> {
    await this.findOwnedOrThrow(userId, projectId);
    await this.prisma.project.delete({ where: { id: projectId } });
  }

  private async findOwnedOrThrow(userId: string, projectId: string): Promise<Project> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }
}
