import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';

import { PrismaService } from '../database/prisma.service';
import { MailService } from '../mail/mail.service';
import { REFRESH_REUSE_GRACE_MS } from './auth.constants';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

const mockedBcrypt = jest.mocked(bcrypt);

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    refreshToken: {
      create: jest.Mock;
      findUnique: jest.Mock;
      updateMany: jest.Mock;
      deleteMany: jest.Mock;
    };
    passwordResetToken: {
      create: jest.Mock;
      findUnique: jest.Mock;
      updateMany: jest.Mock;
      deleteMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let jwtService: { sign: jest.Mock };
  let mail: { send: jest.Mock };

  const sampleUser = {
    id: 'user_1',
    email: 'demo@devtrack.local',
    name: 'Demo Developer',
    passwordHash: 'hashed',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const uniqueViolation = () =>
    new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: 'test',
    });

  beforeEach(async () => {
    jest.clearAllMocks();

    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue(sampleUser),
        delete: jest.fn().mockResolvedValue(sampleUser),
      },
      refreshToken: {
        create: jest.fn().mockResolvedValue({ id: 'rt_new' }),
        findUnique: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      passwordResetToken: {
        create: jest.fn().mockResolvedValue({ id: 'prt_1' }),
        findUnique: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      $transaction: jest.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
    };
    jwtService = { sign: jest.fn().mockReturnValue('test-access-token') };
    mail = { send: jest.fn().mockResolvedValue(undefined) };

    mockedBcrypt.hash.mockResolvedValue('hashed' as never);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: MailService, useValue: mail },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((_key: string, fallback?: unknown) => fallback),
            getOrThrow: jest.fn().mockReturnValue('test-secret'),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('register', () => {
    it('creates a user and returns a token pair', async () => {
      prisma.user.create.mockResolvedValue(sampleUser);

      const result = await service.register({
        email: 'Demo@DevTrack.local',
        password: 'password123',
        name: ' Demo Developer ',
      });

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: { email: 'demo@devtrack.local', name: 'Demo Developer', passwordHash: 'hashed' },
      });
      expect(result.accessToken).toBe('test-access-token');
      expect(result.refreshToken).toHaveLength(96);
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('maps a unique-index violation to a conflict, even when two requests race', async () => {
      prisma.user.create.mockRejectedValue(uniqueViolation());

      await expect(
        service.register({ email: 'demo@devtrack.local', password: 'password123', name: 'Demo' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('does not swallow unrelated database errors', async () => {
      prisma.user.create.mockRejectedValue(new Error('connection lost'));

      await expect(
        service.register({ email: 'demo@devtrack.local', password: 'password123', name: 'Demo' }),
      ).rejects.toThrow('connection lost');
    });
  });

  describe('login', () => {
    it('returns a token pair when credentials are valid', async () => {
      prisma.user.findUnique.mockResolvedValue(sampleUser);
      mockedBcrypt.compare.mockResolvedValue(true as never);

      const result = await service.login({ email: 'demo@devtrack.local', password: 'password123' });

      expect(result.accessToken).toBe('test-access-token');
      expect(result.refreshToken).toBeTruthy();
    });

    it('still runs a bcrypt comparison for unknown emails so timing does not leak', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(
        service.login({ email: 'missing@devtrack.local', password: 'password123' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(mockedBcrypt.compare).toHaveBeenCalledTimes(1);
    });

    it('rejects wrong passwords with the same generic error', async () => {
      prisma.user.findUnique.mockResolvedValue(sampleUser);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(
        service.login({ email: 'demo@devtrack.local', password: 'wrong-password' }),
      ).rejects.toThrow('Invalid email or password');
    });
  });

  describe('refresh', () => {
    const storedToken = (overrides: Record<string, unknown> = {}) => ({
      id: 'rt_1',
      userId: sampleUser.id,
      tokenHash: 'hash',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      user: sampleUser,
      ...overrides,
    });

    it('rotates refresh tokens', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(storedToken());

      const result = await service.refresh({ refreshToken: 'a'.repeat(64) });

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { id: 'rt_1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(result.accessToken).toBe('test-access-token');
      expect(result.refreshToken).toHaveLength(96);
    });

    it('rejects when another request already rotated the token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(storedToken());
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.refresh({ refreshToken: 'a'.repeat(64) })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it('treats a just-rotated token as a harmless race and keeps other sessions', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(
        storedToken({ revokedAt: new Date(Date.now() - 1_000) }),
      );

      await expect(service.refresh({ refreshToken: 'a'.repeat(64) })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it('revokes every session when an old rotated token is replayed', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(
        storedToken({ revokedAt: new Date(Date.now() - REFRESH_REUSE_GRACE_MS - 5_000) }),
      );

      await expect(service.refresh({ refreshToken: 'a'.repeat(64) })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: sampleUser.id, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('rejects unknown and expired tokens', async () => {
      prisma.refreshToken.findUnique.mockResolvedValueOnce(null);
      await expect(service.refresh({ refreshToken: 'a'.repeat(64) })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );

      prisma.refreshToken.findUnique.mockResolvedValueOnce(
        storedToken({ expiresAt: new Date(Date.now() - 1_000) }),
      );
      await expect(service.refresh({ refreshToken: 'a'.repeat(64) })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('revokes the presented refresh token', async () => {
      await service.logout({ refreshToken: 'b'.repeat(64) });

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { tokenHash: sha256('b'.repeat(64)), revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  describe('changePassword', () => {
    it('updates the hash, revokes old sessions and returns a fresh pair', async () => {
      prisma.user.findUnique.mockResolvedValue(sampleUser);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      mockedBcrypt.hash.mockResolvedValue('new-hash' as never);

      const result = await service.changePassword('user_1', {
        currentPassword: 'password123',
        newPassword: 'a-much-better-password',
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_1' },
        data: { passwordHash: 'new-hash' },
      });
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user_1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(result.accessToken).toBe('test-access-token');
    });

    it('rejects an incorrect current password', async () => {
      prisma.user.findUnique.mockResolvedValue(sampleUser);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(
        service.changePassword('user_1', { currentPassword: 'nope', newPassword: 'whatever123' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteAccount', () => {
    it('deletes the user after confirming the password', async () => {
      prisma.user.findUnique.mockResolvedValue(sampleUser);
      mockedBcrypt.compare.mockResolvedValue(true as never);

      await service.deleteAccount('user_1', { password: 'password123' });

      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user_1' } });
    });

    it('keeps the account when the password is wrong', async () => {
      prisma.user.findUnique.mockResolvedValue(sampleUser);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(service.deleteAccount('user_1', { password: 'wrong' })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(prisma.user.delete).not.toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    const flush = () => new Promise((resolve) => setImmediate(resolve));

    it('sends a reset link containing a token whose hash is stored', async () => {
      prisma.user.findUnique.mockResolvedValue(sampleUser);

      await service.forgotPassword({ email: 'Demo@DevTrack.local' });
      await flush();

      expect(mail.send).toHaveBeenCalledTimes(1);
      const message = mail.send.mock.calls[0]?.[0] as { to: string; text: string };
      expect(message.to).toBe('demo@devtrack.local');

      const token = /reset-password\?token=([a-f0-9]{64})/.exec(message.text)?.[1];
      expect(token).toBeDefined();
      expect(prisma.passwordResetToken.create).toHaveBeenCalledWith({
        data: {
          userId: 'user_1',
          tokenHash: sha256(token ?? ''),
          expiresAt: expect.any(Date),
        },
      });
    });

    it('does nothing, and does not fail, for unknown emails', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.forgotPassword({ email: 'ghost@devtrack.local' }),
      ).resolves.toBeUndefined();
      await flush();

      expect(mail.send).not.toHaveBeenCalled();
      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    });

    it('swallows mail provider failures so the response is identical', async () => {
      prisma.user.findUnique.mockResolvedValue(sampleUser);
      mail.send.mockRejectedValue(new Error('provider down'));

      await expect(
        service.forgotPassword({ email: 'demo@devtrack.local' }),
      ).resolves.toBeUndefined();
      await flush();
    });
  });

  describe('resetPassword', () => {
    const token = 'c'.repeat(64);
    const record = (overrides: Record<string, unknown> = {}) => ({
      id: 'prt_1',
      userId: 'user_1',
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      ...overrides,
    });

    it('sets the new password and revokes every session', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue(record());
      mockedBcrypt.hash.mockResolvedValue('reset-hash' as never);

      await service.resetPassword({ token, password: 'a-brand-new-password' });

      expect(prisma.passwordResetToken.findUnique).toHaveBeenCalledWith({
        where: { tokenHash: sha256(token) },
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_1' },
        data: { passwordHash: 'reset-hash' },
      });
      expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
    });

    it.each([
      ['unknown', null],
      ['already used', record({ usedAt: new Date() })],
      ['expired', record({ expiresAt: new Date(Date.now() - 1_000) })],
    ])('rejects a %s token', async (_label, stored) => {
      prisma.passwordResetToken.findUnique.mockResolvedValue(stored);

      await expect(
        service.resetPassword({ token, password: 'a-brand-new-password' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects when the token is claimed by a concurrent request', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue(record());
      prisma.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.resetPassword({ token, password: 'a-brand-new-password' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });
});
