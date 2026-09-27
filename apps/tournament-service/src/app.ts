import Fastify from 'fastify';
import { registerErrorHandler } from './middleware/error-handler.js';

export const buildApp = () => {
  const app = Fastify({
    logger: true,
    ajv: {
      customOptions: {
        removeAdditional: false,
      },
    },
  });

  registerErrorHandler(app);

  app.get('/health', async (_request, _reply) => {
    return {
      data: {
        service: 'tournament-service',
        status: 'ok',
      },
    };
  });

  return app;
};
