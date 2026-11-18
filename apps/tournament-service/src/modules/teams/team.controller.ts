import { FastifyReply, FastifyRequest } from 'fastify';
import { teamService } from './team.service.js';
import { AppError } from '../../middleware/app-error.js';

function getUserId(request: FastifyRequest): string {
  const userId = request.headers['x-user-id'];
  if (!userId || typeof userId !== 'string') {
    throw new AppError('UNAUTHORIZED', 401, 'Authentication required');
  }
  return userId;
}

type TournamentParams = { Params: { id: string } };
type TeamParams = { Params: { id: string; teamId: string } };
type CreateTeamBody = { Body: { name: string } };
type UpdateTeamBody = { Body: { name: string } };

export const createTeam = async (
  request: FastifyRequest<TournamentParams & CreateTeamBody>,
  reply: FastifyReply,
): Promise<void> => {
  const callerId = getUserId(request);
  const team = await teamService.createTeam(callerId, request.params.id, request.body.name);
  await reply.status(201).send({ data: { team } });
};

export const listTeams = async (
  request: FastifyRequest<TournamentParams>,
  reply: FastifyReply,
): Promise<void> => {
  const teams = await teamService.listTeams(request.params.id);
  await reply.status(200).send({ data: teams });
};

export const getTeam = async (
  request: FastifyRequest<TeamParams>,
  reply: FastifyReply,
): Promise<void> => {
  const team = await teamService.getTeam(request.params.id, request.params.teamId);
  await reply.status(200).send({ data: { team } });
};

export const updateTeam = async (
  request: FastifyRequest<TeamParams & UpdateTeamBody>,
  reply: FastifyReply,
): Promise<void> => {
  const callerId = getUserId(request);
  const team = await teamService.updateTeam(
    callerId,
    request.params.id,
    request.params.teamId,
    request.body.name,
  );
  await reply.status(200).send({ data: { team } });
};
