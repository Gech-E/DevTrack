import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../database/prisma.service';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

const mockedBcrypt = jest.mocked(bcrypt);

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
    };
    refreshToken: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };
  let jwtService: { sign: jest.Mock };

  const sampleUser = {
    id: 'user_1',
    email: 'demo@devtrack.local',
    name: 'Demo Developer',
    passwordHash: 'hashed',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      refreshToken: {
        create: jest.fn().mockResolvedValue({ id: 'rt_1' }),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('test-access-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('test-secret'),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('register', () => {
    it('creates a user and returns token pair when email is free', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(sampleUser);
      mockedBcrypt.hash.mockResolvedValue('hashed' as never);

      const result = await service.register({
        email: 'Demo@DevTrack.local',
        password: 'password123',
        name: ' Demo Developer ',
      });

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'demo@devtrack.local',
          name: 'Demo Developer',
          passwordHash: 'hashed',
        },
      });
      expect(result.accessToken).toBe('test-access-token');
      expect(result.refreshToken).toHaveLength(96);
      expect(prisma.refreshToken.create).toHaveBeenCalled();
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('rejects duplicate emails', async () => {
      prisma.user.findUnique.mockResolvedValue(sampleUser);

      await expect(
        service.register({
          email: 'demo@devtrack.local',
          password: 'password123',
          name: 'Demo',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('login', () => {
    it('returns a token pair when credentials are valid', async () => {
      prisma.user.findUnique.mockResolvedValue(sampleUser);
      mockedBcrypt.compare.mockResolvedValue(true as never);

      const result = await service.login({
        email: 'demo@devtrack.local',
        password: 'password123',
      });

      expect(result.accessToken).toBe('test-access-token');
      expect(result.refreshToken).toBeTruthy();
    });

    it('rejects unknown emails with a generic error', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'missing@devtrack.local',
          password: 'password123',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects wrong passwords with a generic error', async () => {
      prisma.user.findUnique.mockResolvedValue(sampleUser);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(
        service.login({
          email: 'demo@devtrack.local',
          password: 'wrong-password',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('rotates refresh tokens', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt_1',
        userId: sampleUser.id,
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
        user: sampleUser,
      });
      prisma.refreshToken.update.mockResolvedValue({});

      const result = await service.refresh({ refreshToken: 'a'.repeat(64) });

      expect(prisma.refreshToken.update).toHaveBeenCalled();
      expect(result.accessToken).toBe('test-access-token');
      expect(result.refreshToken).toHaveLength(96);
    });

    it('rejects revoked refresh tokens', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt_1',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
        user: sampleUser,
      });

      await expect(service.refresh({ refreshToken: 'a'.repeat(64) })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });
});
