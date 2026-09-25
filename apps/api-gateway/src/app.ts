import Fastify from 'fastify';
import { registerErrorHandler } from './middleware/error-handler.js';
import { registerProxyRoutes } from './routes/proxy.js';

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
