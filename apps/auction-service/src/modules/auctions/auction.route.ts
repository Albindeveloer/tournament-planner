import { FastifyInstance } from 'fastify';
import {
  createAuctionHandler,
  getAuctionHandler,
  updateAuctionHandler,
} from './auction.controller.js';

export const auctionRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post(
    '/',
    {
      schema: {
        body: {
          type: 'object',
          required: ['tournament_id'],
          additionalProperties: false,
          properties: {
            tournament_id: { type: 'string', format: 'uuid' },
            bid_increment: { type: 'number', minimum: 0.01 },
          },
        },
      },
    },
    createAuctionHandler,
  );

  app.get(
    '/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    getAuctionHandler,
  );

  app.patch(
    '/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            bid_increment: { type: 'number', minimum: 0.01 },
          },
        },
      },
    },
    updateAuctionHandler,
  );
};
