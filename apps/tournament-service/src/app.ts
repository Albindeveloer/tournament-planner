import Fastify from 'fastify';
import { registerErrorHandler } from './middleware/error-handler.js';
import { tournamentRoutes } from './modules/tournaments/tournament.route.js';

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

  app.register(tournamentRoutes, { prefix: '/api/v1/tournaments' });

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
