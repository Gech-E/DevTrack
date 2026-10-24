import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';

import { ACCESS_COOKIE } from '../auth-cookies';
import type { JwtPayload } from '../auth.service';

export type AuthenticatedUser = {
  userId: string;
  email: string;
};

function fromCookieOrBearer(req: Request): string | null {
  const cookieToken = req.cookies?.[ACCESS_COOKIE];
  if (typeof cookieToken === 'string' && cookieToken.length > 0) {
    return cookieToken;
  }
  return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: fromCookieOrBearer,
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    return {
      userId: payload.sub,
      email: payload.email,
    };
  }
}
