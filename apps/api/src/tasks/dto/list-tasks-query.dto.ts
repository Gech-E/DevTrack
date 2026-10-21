import { IsEnum, IsOptional } from 'class-validator';
import { TaskStatus } from '@devtrack/shared';

import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListTasksQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;
}
