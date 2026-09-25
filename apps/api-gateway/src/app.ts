import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { registerErrorHandler } from './middleware/error-handler.js';
import { authenticate } from './middleware/authenticate.js';
import { registerProxyRoutes } from './routes/proxy.js';
import { env } from './config/env.js';

export const buildApp = async () => {
  const app = Fastify({
    logger: true,
    // Generate a UUID per request instead of Fastify's default sequential integer.
    // This ID is forwarded to upstream services for distributed log correlation.
    genReqId: () => crypto.randomUUID(),
    ajv: {
      customOptions: {
        removeAdditional: false,
      },
    },
  });

  registerErrorHandler(app);

  // Decorate request with userId so downstream code and rewriteRequestHeaders
  // can read it after JWT verification. Must be registered before any routes.
  app.decorateRequest('userId', null);

  // Register JWT plugin — decorates app with request.jwtVerify().
  await app.register(fastifyJwt, { secret: env.jwtAccessSecret });

  // Verify access JWT on every request. Skips the public auth routes.
  app.addHook('preHandler', authenticate);

  app.get('/health', async () => {
    return {
      data: {
        service: 'api-gateway',
        status: 'ok',
      },
    };
  });

  await registerProxyRoutes(app);

  return app;
};
