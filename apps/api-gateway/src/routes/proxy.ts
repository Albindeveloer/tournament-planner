import type { IncomingHttpHeaders } from 'node:http';
import { FastifyInstance } from 'fastify';
import httpProxy from '@fastify/http-proxy';

export interface ServiceUrls {
  auth: string;
  tournament: string;
  auction: string;
  competition: string;
  notification: string;
}

interface ProxyRoute {
  prefix: string;
  upstream: string;
}

export const registerProxyRoutes = async (app: FastifyInstance, urls: ServiceUrls): Promise<void> => {
  const routes: ProxyRoute[] = [
    { prefix: '/api/v1/auth', upstream: urls.auth },
    { prefix: '/api/v1/tournaments', upstream: urls.tournament },
    { prefix: '/api/v1/auctions', upstream: urls.auction },
    { prefix: '/api/v1/competitions', upstream: urls.competition },
    { prefix: '/api/v1/notifications', upstream: urls.notification },
  ];

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
        rewriteRequestHeaders: (request, headers): IncomingHttpHeaders => {
          const result: IncomingHttpHeaders = { ...(headers as IncomingHttpHeaders) };
          result['x-request-id'] = request.id;
          if (request.userId !== null) {
            result['x-user-id'] = request.userId;
          }
          return result;
        },
      },
    });
  }
};
