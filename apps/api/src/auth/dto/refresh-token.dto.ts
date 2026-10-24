import { IsOptional, IsString, MinLength } from 'class-validator';

/** Optional when the refresh token is already present as an httpOnly cookie. */
export class RefreshTokenDto {
  @IsOptional()
  @IsString()
  @MinLength(32)
  refreshToken?: string;
}
