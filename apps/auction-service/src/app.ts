import Fastify from 'fastify';
import { registerErrorHandler } from './middleware/error-handler.js';
import { auctionRoutes } from './modules/auctions/auction.route.js';

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

  app.register(auctionRoutes, { prefix: '/api/v1/auctions' });

  app.get('/health', async (_request, _reply) => {
    return {
      data: {
        service: 'auction-service',
        status: 'ok',
      },
    };
  });

  return app;
};
