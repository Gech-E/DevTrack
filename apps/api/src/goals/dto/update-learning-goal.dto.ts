import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { LearningGoalStatus } from '@devtrack/shared';

export class UpdateLearningGoalDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsOptional()
  @IsEnum(LearningGoalStatus)
  status?: LearningGoalStatus;

  @IsOptional()
  @IsString()
  targetDate?: string | null;
}
