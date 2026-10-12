import { FastifyReply, FastifyRequest } from 'fastify';
import {
  tournamentService,
  CreateTournamentInput,
  UpdateTournamentInput,
} from './tournament.service.js';
import { AppError } from '../../middleware/app-error.js';

type CreateTournamentRequest = { Body: CreateTournamentInput };
type GetTournamentRequest = { Params: { id: string } };
type ListTournamentsRequest = { Querystring: { page?: number; limit?: number; owner_id?: string } };
type UpdateTournamentRequest = { Params: { id: string }; Body: UpdateTournamentInput };

function getUserId(request: FastifyRequest): string {
  const userId = request.headers['x-user-id'];
  if (!userId || typeof userId !== 'string') {
    throw new AppError('UNAUTHORIZED', 401, 'Authentication required');
  }
  return userId;
}

export const createTournament = async (
  request: FastifyRequest<CreateTournamentRequest>,
  reply: FastifyReply,
): Promise<void> => {
  const ownerId = getUserId(request);
  const tournament = await tournamentService.createTournament(ownerId, request.body);
  await reply.status(201).send({ data: { tournament } });
};

export const getTournament = async (
  request: FastifyRequest<GetTournamentRequest>,
  reply: FastifyReply,
): Promise<void> => {
  getUserId(request);
  const tournament = await tournamentService.getTournament(request.params.id);
  await reply.status(200).send({ data: { tournament } });
};

export const listTournaments = async (
  request: FastifyRequest<ListTournamentsRequest>,
  reply: FastifyReply,
): Promise<void> => {
  const callerId = getUserId(request);
  const { page = 1, limit = 20, owner_id } = request.query;

  // "me" resolves to the caller's own user ID
  const resolvedOwnerId = owner_id === 'me' ? callerId : owner_id;

  const listInput: Parameters<typeof tournamentService.listTournaments>[0] = { page, limit };
  if (resolvedOwnerId !== undefined) listInput.owner_id = resolvedOwnerId;

  const { tournaments, total } = await tournamentService.listTournaments(listInput);

  const totalPages = Math.ceil(total / limit);

  await reply.status(200).send({
    data: tournaments,
    pagination: { page, limit, total, totalPages },
  });
};

export const updateTournament = async (
  request: FastifyRequest<UpdateTournamentRequest>,
  reply: FastifyReply,
): Promise<void> => {
  const callerId = getUserId(request);
  const tournament = await tournamentService.updateTournament(callerId, request.params.id, request.body);
  await reply.status(200).send({ data: { tournament } });
};
