import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';

import { clearAuthCookies, REFRESH_COOKIE, setAuthCookies } from './auth-cookies';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthenticatedUser } from './strategies/jwt.strategy';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(dto);
    setAuthCookies(res, this.config, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
    return { user: result.user };
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);
    setAuthCookies(res, this.config, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
    return { user: result.user };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Body() dto: RefreshTokenDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken =
      dto.refreshToken ||
      (typeof req.cookies?.[REFRESH_COOKIE] === 'string' ? req.cookies[REFRESH_COOKIE] : undefined);

    const tokens = await this.authService.refresh({
      refreshToken: refreshToken ?? '',
    });
    setAuthCookies(res, this.config, tokens);
    return { ok: true };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: Request,
    @Body() dto: RefreshTokenDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken =
      dto.refreshToken ||
      (typeof req.cookies?.[REFRESH_COOKIE] === 'string' ? req.cookies[REFRESH_COOKIE] : undefined);

    if (refreshToken) {
      await this.authService.logout({ refreshToken });
    }
    clearAuthCookies(res, this.config);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getProfile(user.userId);
  }
}
