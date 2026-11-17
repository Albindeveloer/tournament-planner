import { FastifyReply, FastifyRequest } from 'fastify';
import { joinRequestService } from './join-request.service.js';
import { AppError } from '../../middleware/app-error.js';

function getUserId(request: FastifyRequest): string {
  const userId = request.headers['x-user-id'];
  if (!userId || typeof userId !== 'string') {
    throw new AppError('UNAUTHORIZED', 401, 'Authentication required');
  }
  return userId;
}

type TournamentParams = { Params: { id: string } };
type JoinRequestParams = { Params: { id: string; joinRequestId: string } };
type UpdateJoinRequestBody = { Body: { status: string } };

export const createJoinRequest = async (
  request: FastifyRequest<TournamentParams>,
  reply: FastifyReply,
): Promise<void> => {
  const callerId = getUserId(request);
  const joinRequest = await joinRequestService.createJoinRequest(callerId, request.params.id);
  await reply.status(201).send({ data: { join_request: joinRequest } });
};

export const listJoinRequests = async (
  request: FastifyRequest<TournamentParams>,
  reply: FastifyReply,
): Promise<void> => {
  const callerId = getUserId(request);
  const joinRequests = await joinRequestService.listJoinRequests(callerId, request.params.id);
  await reply.status(200).send({ data: joinRequests });
};

export const updateJoinRequest = async (
  request: FastifyRequest<JoinRequestParams & UpdateJoinRequestBody>,
  reply: FastifyReply,
): Promise<void> => {
  const callerId = getUserId(request);
  const joinRequest = await joinRequestService.updateJoinRequest(
    callerId,
    request.params.id,
    request.params.joinRequestId,
    request.body.status,
  );
  await reply.status(200).send({ data: { join_request: joinRequest } });
};
