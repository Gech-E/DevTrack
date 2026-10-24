import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { LearningGoalStatus } from '@devtrack/shared';

export class CreateLearningGoalDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsEnum(LearningGoalStatus)
  status?: LearningGoalStatus;

  @IsOptional()
  @IsString()
  targetDate?: string;

  @IsOptional()
  @IsString()
  projectId?: string | null;
}
