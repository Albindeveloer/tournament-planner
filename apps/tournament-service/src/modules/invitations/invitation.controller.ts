import { FastifyReply, FastifyRequest } from 'fastify';
import { invitationService } from './invitation.service.js';
import { AppError } from '../../middleware/app-error.js';

function getUserId(request: FastifyRequest): string {
  const userId = request.headers['x-user-id'];
  if (!userId || typeof userId !== 'string') {
    throw new AppError('UNAUTHORIZED', 401, 'Authentication required');
  }
  return userId;
}

type TournamentParams = { Params: { id: string } };
type InvitationParams = { Params: { id: string; invitationId: string } };
type CreateInvitationBody = { Body: { invitee_id: string } };
type UpdateInvitationBody = { Body: { status: string } };

export const createInvitation = async (
  request: FastifyRequest<TournamentParams & CreateInvitationBody>,
  reply: FastifyReply,
): Promise<void> => {
  const callerId = getUserId(request);
  const invitation = await invitationService.createInvitation(
    callerId,
    request.params.id,
    request.body.invitee_id,
  );
  await reply.status(201).send({ data: { invitation } });
};

export const listInvitations = async (
  request: FastifyRequest<TournamentParams>,
  reply: FastifyReply,
): Promise<void> => {
  const callerId = getUserId(request);
  const invitations = await invitationService.listInvitations(callerId, request.params.id);
  await reply.status(200).send({ data: invitations });
};

export const updateInvitation = async (
  request: FastifyRequest<InvitationParams & UpdateInvitationBody>,
  reply: FastifyReply,
): Promise<void> => {
  const callerId = getUserId(request);
  const invitation = await invitationService.updateInvitation(
    callerId,
    request.params.id,
    request.params.invitationId,
    request.body.status,
  );
  await reply.status(200).send({ data: { invitation } });
};
