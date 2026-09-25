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
      // Strip the gateway prefix before forwarding.
      // /api/v1/auth/login → upstream /login
      rewritePrefix: '',
    });
  }
};
