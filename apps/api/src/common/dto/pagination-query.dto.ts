import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export const DEFAULT_PAGE_SIZE = 100;
export const MAX_PAGE_SIZE = 200;

/** Shared `?limit=&offset=` query parameters for every list endpoint. */
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

export function pageArgs(query: PaginationQueryDto): { take: number; skip: number } {
  return { take: query.limit ?? DEFAULT_PAGE_SIZE, skip: query.offset ?? 0 };
}
