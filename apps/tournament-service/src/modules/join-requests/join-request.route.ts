import { FastifyInstance } from 'fastify';
import { createJoinRequest, listJoinRequests, updateJoinRequest } from './join-request.controller.js';

const uuidParam = { type: 'string', format: 'uuid' };

export const joinRequestRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post(
    '/:id/join-requests',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: uuidParam },
        },
      },
    },
    createJoinRequest,
  );

  app.get(
    '/:id/join-requests',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: uuidParam },
        },
      },
    },
    listJoinRequests,
  );

  app.patch(
    '/:id/join-requests/:joinRequestId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id', 'joinRequestId'],
          properties: {
            id: uuidParam,
            joinRequestId: uuidParam,
          },
        },
        body: {
          type: 'object',
          required: ['status'],
          additionalProperties: false,
          properties: {
            status: { type: 'string', enum: ['APPROVED', 'REJECTED', 'CANCELLED'] },
          },
        },
      },
    },
    updateJoinRequest,
  );
};
