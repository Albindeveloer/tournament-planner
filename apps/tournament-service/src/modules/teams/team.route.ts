import { FastifyInstance } from 'fastify';
import { createTeam, listTeams, getTeam, updateTeam } from './team.controller.js';
import { listMembers, addMember, updateMember, removeMember } from './team-member.controller.js';

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

  app.get(
    '/:id/teams/:teamId/members',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id', 'teamId'],
          properties: { id: uuidParam, teamId: uuidParam },
        },
      },
    },
    listMembers,
  );

  app.post(
    '/:id/teams/:teamId/members',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id', 'teamId'],
          properties: { id: uuidParam, teamId: uuidParam },
        },
        body: {
          type: 'object',
          required: ['participant_id', 'member_role', 'squad_status'],
          additionalProperties: false,
          properties: {
            participant_id: uuidParam,
            member_role: { type: 'string', enum: ['PLAYER', 'CAPTAIN'] },
            squad_status: { type: 'string', enum: ['MAIN', 'SUBSTITUTE'] },
          },
        },
      },
    },
    addMember,
  );

  app.patch(
    '/:id/teams/:teamId/members/:memberId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id', 'teamId', 'memberId'],
          properties: { id: uuidParam, teamId: uuidParam, memberId: uuidParam },
        },
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            member_role: { type: 'string', enum: ['PLAYER', 'CAPTAIN'] },
            squad_status: { type: 'string', enum: ['MAIN', 'SUBSTITUTE'] },
          },
        },
      },
    },
    updateMember,
  );

  app.delete(
    '/:id/teams/:teamId/members/:memberId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id', 'teamId', 'memberId'],
          properties: { id: uuidParam, teamId: uuidParam, memberId: uuidParam },
        },
      },
    },
    removeMember,
  );
};
