import { FastifyInstance } from 'fastify';
import { createInvitation, listInvitations, updateInvitation } from './invitation.controller.js';

const uuidParam = { type: 'string', format: 'uuid' };

export const invitationRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post(
    '/:id/invitations',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: uuidParam },
        },
        body: {
          type: 'object',
          required: ['invitee_id'],
          additionalProperties: false,
          properties: {
            invitee_id: uuidParam,
          },
        },
      },
    },
    createInvitation,
  );

  app.get(
    '/:id/invitations',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: uuidParam },
        },
      },
    },
    listInvitations,
  );

  app.patch(
    '/:id/invitations/:invitationId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id', 'invitationId'],
          properties: {
            id: uuidParam,
            invitationId: uuidParam,
          },
        },
        body: {
          type: 'object',
          required: ['status'],
          additionalProperties: false,
          properties: {
            status: { type: 'string', enum: ['ACCEPTED', 'REJECTED', 'CANCELLED'] },
          },
        },
      },
    },
    updateInvitation,
  );
};
