import { IsEnum, IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
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

  /** ISO 8601 date or date-time; send `null` to clear. */
  @IsOptional()
  @IsISO8601({ strict: true })
  targetDate?: string | null;
}
