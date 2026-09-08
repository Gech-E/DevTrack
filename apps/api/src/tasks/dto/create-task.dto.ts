import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { TaskPriority, TaskStatus } from '@devtrack/shared';

export class CreateTaskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsString()
  dueDate?: string;
}
