import { IsEnum, IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
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
  @IsISO8601({ strict: true })
  targetDate?: string;

  @IsOptional()
  @IsString()
  projectId?: string | null;
}
