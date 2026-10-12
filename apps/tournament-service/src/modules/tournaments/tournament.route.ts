import { FastifyInstance } from 'fastify';
import { createTournament, getTournament, listTournaments, updateTournament } from './tournament.controller.js';

export const tournamentRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post(
    '/',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name', 'game', 'format', 'team_size', 'number_of_teams'],
          additionalProperties: false,
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 200 },
            description: { type: 'string', maxLength: 2000 },
            game: { type: 'string', enum: ['EFOOTBALL'] },
            format: { type: 'string', enum: ['KNOCKOUT'] },
            team_size: { type: 'integer', minimum: 1, maximum: 4 },
            number_of_teams: { type: 'integer', minimum: 2 },
            substitutes_enabled: { type: 'boolean' },
            team_formation_mode: { type: 'string', enum: ['MANUAL', 'AUCTION'] },
            registration_start_at: { type: 'string', format: 'date-time' },
            registration_end_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    createTournament,
  );

  app.get(
    '/',
    {
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            owner_id: { type: 'string' },
          },
        },
      },
    },
    listTournaments,
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
    getTournament,
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
            name: { type: 'string', minLength: 1, maxLength: 200 },
            description: { type: 'string', maxLength: 2000 },
            game: { type: 'string', enum: ['EFOOTBALL'] },
            format: { type: 'string', enum: ['KNOCKOUT'] },
            team_size: { type: 'integer', minimum: 1, maximum: 4 },
            number_of_teams: { type: 'integer', minimum: 2 },
            substitutes_enabled: { type: 'boolean' },
            team_formation_mode: { type: 'string', enum: ['MANUAL', 'AUCTION'] },
            registration_start_at: { type: 'string', format: 'date-time' },
            registration_end_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    updateTournament,
  );
};
