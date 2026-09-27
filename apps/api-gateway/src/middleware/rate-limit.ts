import { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';

// Endpoints that accept unauthenticated input and are targets for abuse
// (credential stuffing, brute-force, account enumeration).
const RATE_LIMITED_PATHS: ReadonlySet<string> = new Set([
  '/api/v1/auth/register',
  '/api/v1/auth/login',
  '/api/v1/auth/refresh',
  '/api/v1/auth/forgot-password',
  '/api/v1/auth/reset-password',
]);

export const registerRateLimit = async (app: FastifyInstance): Promise<void> => {
  await app.register(rateLimit, {
    global: true,
    // Run at the very first hook so over-limit requests are rejected before
    // body parsing, JWT verification, or any downstream work.
    hook: 'onRequest',
    // NOTE: exact limits are not finalized — tune for production traffic.
    max: 10,
    timeWindow: '1 minute',
    // allowList returning true = request is allowed through without counting.
    // Only the five sensitive auth routes are rate limited; everything else bypasses.
    allowList: (request) => {
      const path = request.url.split('?')[0] ?? '';
      return !RATE_LIMITED_PATHS.has(path);
    },
    // Match the standard API error contract used across all gateway responses.
    errorResponseBuilder: (_request, context) => ({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Too many requests. Please try again in ${context.after}.`,
        details: null,
      },
    }),
  });
};
