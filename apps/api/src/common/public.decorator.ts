import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'devtrack:is-public';

/**
 * Opts a route (or a whole controller) out of the global JWT guard.
 * Every route is authenticated by default; anything public must say so explicitly.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
