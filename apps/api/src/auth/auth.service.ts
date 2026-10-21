import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import type { User } from '@prisma/client';

import { isUniqueViolation } from '../common/prisma-errors';
import { PrismaService } from '../database/prisma.service';
import { MailService } from '../mail/mail.service';
import {
  BCRYPT_ROUNDS,
  PASSWORD_RESET_TTL_MS,
  REFRESH_REUSE_GRACE_MS,
  REFRESH_TOKEN_TTL_MS,
} from './auth.constants';
import type { ChangePasswordDto } from './dto/change-password.dto';
import type { DeleteAccountDto } from './dto/delete-account.dto';
import type { ForgotPasswordDto } from './dto/forgot-password.dto';
import type { LoginDto } from './dto/login.dto';
import type { RefreshTokenDto } from './dto/refresh-token.dto';
import type { RegisterDto } from './dto/register.dto';
import type { ResetPasswordDto } from './dto/reset-password.dto';

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
};

export type AuthResult = {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

export type JwtPayload = {
  sub: string;
  email: string;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private dummyHash: Promise<string> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const email = this.normalizeEmail(dto.email);
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    let user: User;
    try {
      user = await this.prisma.user.create({
        data: {
          email,
          name: dto.name.trim(),
          passwordHash,
        },
      });
    } catch (error) {
      // The unique index is the source of truth, so concurrent registrations cannot both succeed.
      if (isUniqueViolation(error)) {
        throw new ConflictException('Email is already registered');
      }
      throw error;
    }

    return this.buildAuthResult(user);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const email = this.normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Always run a bcrypt comparison so response time does not reveal whether the email exists.
    const hashToCompare = user?.passwordHash ?? (await this.getDummyHash());
    const passwordMatches = await bcrypt.compare(dto.password, hashToCompare);

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.buildAuthResult(user);
  }

  async refresh(dto: RefreshTokenDto): Promise<TokenPair> {
    const tokenHash = this.hashToken(dto.refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (stored.revokedAt) {
      // A rotated token coming back outside the grace window means it leaked: end every session.
      if (Date.now() - stored.revokedAt.getTime() > REFRESH_REUSE_GRACE_MS) {
        await this.revokeAllRefreshTokens(stored.userId);
        this.logger.warn(`Refresh token reuse detected; revoked all sessions for ${stored.userId}`);
      }
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Claim the token atomically; if another request already rotated it, this one loses.
    const claimed = await this.prisma.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (claimed.count !== 1) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.issueTokenPair(stored.user);
  }

  async logout(dto: RefreshTokenDto): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.hashToken(dto.refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async getProfile(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.toPublicUser(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<TokenPair> {
    const user = await this.requireUserWithPassword(userId, dto.currentPassword);
    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      this.prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return this.issueTokenPair(user);
  }

  async deleteAccount(userId: string, dto: DeleteAccountDto): Promise<void> {
    const user = await this.requireUserWithPassword(userId, dto.password);
    // Foreign keys cascade, so projects, tasks, goals and tokens go with the user.
    await this.prisma.user.delete({ where: { id: user.id } });
  }

  /**
   * Always resolves the same way whether or not the email is registered, and does the slow work
   * (token write, email) in the background so timing does not reveal registered addresses either.
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: this.normalizeEmail(dto.email) },
    });

    if (!user) {
      return;
    }

    void this.createAndSendResetToken(user).catch((error: unknown) => {
      this.logger.error(
        `Failed to send password reset email: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    });
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const tokenHash = this.hashToken(dto.token);
    const record = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('This reset link is invalid or has expired');
    }

    const claimed = await this.prisma.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (claimed.count !== 1) {
      throw new BadRequestException('This reset link is invalid or has expired');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  private async createAndSendResetToken(user: User): Promise<void> {
    const token = randomBytes(32).toString('hex');

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
      this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: this.hashToken(token),
          expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
        },
      }),
    ]);

    const baseUrl = this.config.get<string>('WEB_APP_URL', 'http://localhost:3000');
    const link = `${baseUrl.replace(/\/$/, '')}/reset-password?token=${token}`;

    await this.mail.send({
      to: user.email,
      subject: 'Reset your DevTrack password',
      text: [
        `Hi ${user.name},`,
        '',
        'Someone asked to reset the password for your DevTrack account.',
        `Open this link within 1 hour to choose a new password:\n${link}`,
        '',
        'If you did not ask for this, you can ignore this email; your password has not changed.',
      ].join('\n'),
      html: `<p>Hi ${this.escapeHtml(user.name)},</p><p>Someone asked to reset the password for your DevTrack account.</p><p><a href="${link}">Choose a new password</a> (valid for 1 hour).</p><p>If you did not ask for this, you can ignore this email; your password has not changed.</p>`,
    });
  }

  private async requireUserWithPassword(userId: string, password: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const hashToCompare = user?.passwordHash ?? (await this.getDummyHash());
    const matches = await bcrypt.compare(password, hashToCompare);

    if (!user || !matches) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    return user;
  }

  private async revokeAllRefreshTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async buildAuthResult(user: User): Promise<AuthResult> {
    const tokens = await this.issueTokenPair(user);
    return {
      ...tokens,
      user: this.toPublicUser(user),
    };
  }

  private async issueTokenPair(user: User): Promise<TokenPair> {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    // Secret, algorithm, issuer, audience and expiry are configured once in AuthModule.
    const accessToken = this.jwtService.sign(payload);

    const refreshToken = randomBytes(48).toString('hex');
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    await this.pruneStaleTokens(user.id);

    return { accessToken, refreshToken };
  }

  /** Keeps the refresh_tokens table from growing forever; failures are harmless. */
  private async pruneStaleTokens(userId: string): Promise<void> {
    try {
      const now = Date.now();
      await this.prisma.refreshToken.deleteMany({
        where: {
          userId,
          OR: [
            { expiresAt: { lt: new Date(now) } },
            { revokedAt: { lt: new Date(now - 7 * 24 * 60 * 60 * 1000) } },
          ],
        },
      });
    } catch (error) {
      this.logger.debug(
        `Token pruning skipped: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= bcrypt.hash(randomBytes(16).toString('hex'), BCRYPT_ROUNDS);
    return this.dummyHash;
  }

  private normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }

  private toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };
  }
}
