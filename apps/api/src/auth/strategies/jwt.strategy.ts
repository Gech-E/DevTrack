import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { JwtPayload } from '../auth.service';
import { DEFAULT_JWT_AUDIENCE, DEFAULT_JWT_ISSUER, JWT_ALGORITHM } from '../auth.constants';

export type AuthenticatedUser = {
  userId: string;
  email: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
      // Pin the algorithm so a token cannot downgrade verification (for example to "none").
      algorithms: [JWT_ALGORITHM],
      issuer: config.get<string>('JWT_ISSUER', DEFAULT_JWT_ISSUER),
      audience: config.get<string>('JWT_AUDIENCE', DEFAULT_JWT_AUDIENCE),
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    return {
      userId: payload.sub,
      email: payload.email,
    };
  }
}
