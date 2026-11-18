import { FastifyInstance } from 'fastify';
import { createTeam, listTeams, getTeam, updateTeam } from './team.controller.js';

const uuidParam = { type: 'string', format: 'uuid' };

export const teamRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post(
    '/:id/teams',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: uuidParam },
        },
        body: {
          type: 'object',
          required: ['name'],
          additionalProperties: false,
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
          },
        },
      },
    },
    createTeam,
  );

  app.get(
    '/:id/teams',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: uuidParam },
        },
      },
    },
    listTeams,
  );

  app.get(
    '/:id/teams/:teamId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id', 'teamId'],
          properties: {
            id: uuidParam,
            teamId: uuidParam,
          },
        },
      },
    },
    getTeam,
  );

  app.patch(
    '/:id/teams/:teamId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id', 'teamId'],
          properties: {
            id: uuidParam,
            teamId: uuidParam,
          },
        },
        body: {
          type: 'object',
          required: ['name'],
          additionalProperties: false,
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
          },
        },
      },
    },
    updateTeam,
  );
};
