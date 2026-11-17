import { FastifyInstance } from 'fastify';
import {
  createCaptainRequest,
  listCaptainRequests,
  updateCaptainRequest,
} from './captain-request.controller.js';

const uuidParam = { type: 'string', format: 'uuid' };

export const captainRequestRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post(
    '/:id/captain-requests',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: uuidParam },
        },
      },
    },
    createCaptainRequest,
  );

  app.get(
    '/:id/captain-requests',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: uuidParam },
        },
      },
    },
    listCaptainRequests,
  );

  app.patch(
    '/:id/captain-requests/:captainRequestId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id', 'captainRequestId'],
          properties: {
            id: uuidParam,
            captainRequestId: uuidParam,
          },
        },
        body: {
          type: 'object',
          required: ['status'],
          additionalProperties: false,
          properties: {
            status: { type: 'string', enum: ['REJECTED', 'CANCELLED'] },
          },
        },
      },
    },
    updateCaptainRequest,
  );
};
