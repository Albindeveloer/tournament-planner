import { FastifyReply, FastifyRequest } from 'fastify';
import { participantService } from './participant.service.js';
import { AppError } from '../../middleware/app-error.js';

function getUserId(request: FastifyRequest): string {
  const userId = request.headers['x-user-id'];
  if (!userId || typeof userId !== 'string') {
    throw new AppError('UNAUTHORIZED', 401, 'Authentication required');
  }
  return userId;
}

type TournamentParams = { Params: { id: string } };
type ParticipantParams = { Params: { id: string; participantId: string } };

export const listParticipants = async (
  request: FastifyRequest<TournamentParams>,
  reply: FastifyReply,
): Promise<void> => {
  getUserId(request);
  const participants = await participantService.listParticipants(request.params.id);
  await reply.status(200).send({ data: participants });
};

export const withdrawParticipant = async (
  request: FastifyRequest<ParticipantParams>,
  reply: FastifyReply,
): Promise<void> => {
  const callerId = getUserId(request);
  const participant = await participantService.withdrawParticipant(
    callerId,
    request.params.id,
    request.params.participantId,
  );
  await reply.status(200).send({ data: { participant } });
};
