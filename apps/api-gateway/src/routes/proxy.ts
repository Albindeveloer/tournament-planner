import { FastifyInstance } from 'fastify';
import httpProxy from '@fastify/http-proxy';
import { env } from '../config/env.js';

interface ProxyRoute {
  prefix: string;
  upstream: string;
}

const routes: ProxyRoute[] = [
  { prefix: '/api/v1/auth', upstream: env.authServiceUrl },
  { prefix: '/api/v1/tournaments', upstream: env.tournamentServiceUrl },
  { prefix: '/api/v1/auctions', upstream: env.auctionServiceUrl },
  { prefix: '/api/v1/competitions', upstream: env.competitionServiceUrl },
  { prefix: '/api/v1/notifications', upstream: env.notificationServiceUrl },
];

export const registerProxyRoutes = async (app: FastifyInstance): Promise<void> => {
  for (const route of routes) {
    await app.register(httpProxy, {
      upstream: route.upstream,
      prefix: route.prefix,
      // Preserve the full path when forwarding.
      // Upstream services register routes at the same /api/v1/* prefix.
      // e.g. /api/v1/auth/login → http://auth-service/api/v1/auth/login
      rewritePrefix: route.prefix,
      replyOptions: {
        // Forward the authenticated user's ID so downstream services can
        // identify the caller without needing to verify JWTs themselves.
        rewriteRequestHeaders: (request, headers) => {
          if (request.userId) {
            return { ...headers, 'x-user-id': request.userId };
          }
          return headers;
        },
      },
    });
  }
};
