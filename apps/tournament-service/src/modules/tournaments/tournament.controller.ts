import { FastifyReply, FastifyRequest } from 'fastify';
import { tournamentService, CreateTournamentInput } from './tournament.service.js';
import { AppError } from '../../middleware/app-error.js';

type CreateTournamentRequest = {
  Body: CreateTournamentInput;
};

export const createTournament = async (
  request: FastifyRequest<CreateTournamentRequest>,
  reply: FastifyReply,
): Promise<void> => {
  const ownerId = request.headers['x-user-id'];

  if (!ownerId || typeof ownerId !== 'string') {
    throw new AppError('UNAUTHORIZED', 401, 'Authentication required');
  }

  const tournament = await tournamentService.createTournament(ownerId, request.body);

  await reply.status(201).send({
    data: { tournament },
  });
};
