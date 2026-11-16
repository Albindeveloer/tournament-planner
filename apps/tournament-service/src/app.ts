import Fastify from 'fastify';
import { registerErrorHandler } from './middleware/error-handler.js';
import { tournamentRoutes } from './modules/tournaments/tournament.route.js';
import { participantRoutes } from './modules/participants/participant.route.js';
import { invitationRoutes } from './modules/invitations/invitation.route.js';
import { joinRequestRoutes } from './modules/join-requests/join-request.route.js';

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
  app.register(participantRoutes, { prefix: '/api/v1/tournaments' });
  app.register(invitationRoutes, { prefix: '/api/v1/tournaments' });
  app.register(joinRequestRoutes, { prefix: '/api/v1/tournaments' });

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
