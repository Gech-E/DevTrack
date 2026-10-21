import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import {
  ACCESS_TOKEN_TTL_SECONDS,
  DEFAULT_JWT_AUDIENCE,
  DEFAULT_JWT_ISSUER,
  JWT_ALGORITHM,
} from './auth.constants';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const issuer = config.get<string>('JWT_ISSUER', DEFAULT_JWT_ISSUER);
        const audience = config.get<string>('JWT_AUDIENCE', DEFAULT_JWT_AUDIENCE);

        return {
          secret: config.getOrThrow<string>('JWT_SECRET'),
          signOptions: {
            algorithm: JWT_ALGORITHM,
            expiresIn: ACCESS_TOKEN_TTL_SECONDS,
            issuer,
            audience,
          },
          verifyOptions: { algorithms: [JWT_ALGORITHM], issuer, audience },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
