import type { NextFunction, Request, Response } from 'express';

type Options = {
  /** Only enable behind HTTPS; browsers cache HSTS for months. */
  hsts: boolean;
};

/**
 * Minimal, dependency-free equivalent of the headers `helmet` sets that matter for a JSON API.
 */
export function securityHeaders({ hsts }: Options) {
  return (_request: Request, response: Response, next: NextFunction): void => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    response.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    response.setHeader('Cache-Control', 'no-store');
    if (hsts) {
      response.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
    }
    next();
  };
}
