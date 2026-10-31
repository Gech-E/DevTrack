import type { NextConfig } from 'next';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';

function apiOrigin(): string | null {
  try {
    return process.env.NEXT_PUBLIC_API_URL ? new URL(process.env.NEXT_PUBLIC_API_URL).origin : null;
  } catch {
    return null;
  }
}

function contentSecurityPolicy(): string {
  const connectSources = ["'self'", apiOrigin()].filter(Boolean).join(' ');

  return [
    "default-src 'self'",
    // Next.js injects small inline bootstrap scripts; a nonce-based policy needs middleware.
    // This still blocks third-party scripts, framing and plugin content.
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    `connect-src ${connectSources}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

export default function config(phase: string): NextConfig {
  // A silent localhost fallback would ship a bundle that calls the wrong API.
  if (phase === PHASE_PRODUCTION_BUILD && !process.env.NEXT_PUBLIC_API_URL) {
    throw new Error(
      'NEXT_PUBLIC_API_URL must be set when building for production (for example https://api.example.com).',
    );
  }

  const isProduction = process.env.NODE_ENV === 'production';

  return {
    transpilePackages: ['@devtrack/shared'],
    poweredByHeader: false,
    async headers() {
      return [
        {
          source: '/:path*',
          headers: [
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'X-Frame-Options', value: 'DENY' },
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
            { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
            ...(isProduction
              ? [
                  {
                    key: 'Strict-Transport-Security',
                    value: 'max-age=15552000; includeSubDomains',
                  },
                  { key: 'Content-Security-Policy', value: contentSecurityPolicy() },
                ]
              : []),
          ],
        },
      ];
    },
  };
}
