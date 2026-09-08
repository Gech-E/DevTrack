import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { ProjectsModule } from '../projects/projects.module';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [AuthModule, ProjectsModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
