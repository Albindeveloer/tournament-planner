import { FastifyInstance } from 'fastify';
import { listParticipants, withdrawParticipant } from './participant.controller.js';

const uuidParam = { type: 'string', format: 'uuid' };

export const participantRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get(
    '/:id/participants',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: uuidParam },
        },
      },
    },
    listParticipants,
  );

  app.post(
    '/:id/participants/:participantId/withdraw',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id', 'participantId'],
          properties: {
            id: uuidParam,
            participantId: uuidParam,
          },
        },
      },
    },
    withdrawParticipant,
  );
};
