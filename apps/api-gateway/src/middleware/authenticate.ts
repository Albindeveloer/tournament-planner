import { FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from './app-error.js';

// Extend @fastify/jwt so request.user is typed after jwtVerify().
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string };
    user: { sub: string };
  }
}

// Extend FastifyRequest with a userId decorator set after JWT verification.
// Downstream services receive this value as the x-user-id header.
declare module 'fastify' {
  interface FastifyRequest {
    userId: string | null;
  }
}

// Routes that do not require a valid access token.
const PUBLIC_PATHS: ReadonlySet<string> = new Set([
  '/health',
  '/api/v1/auth/register',
  '/api/v1/auth/login',
  '/api/v1/auth/refresh',
  '/api/v1/auth/forgot-password',
  '/api/v1/auth/reset-password',
]);

export const authenticate = async (
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> => {
  const path = request.url.split('?')[0] ?? '';

  if (PUBLIC_PATHS.has(path)) return;

  try {
    await request.jwtVerify();
  } catch {
    throw new AppError('UNAUTHORIZED', 401, 'Authentication required');
  }

  request.userId = request.user.sub;
};
