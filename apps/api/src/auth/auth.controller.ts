import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';

import { Public } from '../common/public.decorator';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import type { AuthenticatedUser } from './strategies/jwt.strategy';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @RateLimit('auth')
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @RateLimit('auth')
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @RateLimit('auth')
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @Public()
  @RateLimit('auth')
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: RefreshTokenDto) {
    await this.authService.logout(dto);
  }

  @Public()
  @RateLimit('sensitive')
  @Post('forgot-password')
  @HttpCode(HttpStatus.ACCEPTED)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto);
    return { message: 'If that email is registered, a reset link is on its way.' };
  }

  @Public()
  @RateLimit('sensitive')
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto);
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getProfile(user.userId);
  }

  @RateLimit('sensitive')
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  changePassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.userId, dto);
  }

  @RateLimit('sensitive')
  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAccount(@CurrentUser() user: AuthenticatedUser, @Body() dto: DeleteAccountDto) {
    await this.authService.deleteAccount(user.userId, dto);
  }
}
