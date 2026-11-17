import { FastifyReply, FastifyRequest } from 'fastify';
import { captainRequestService } from './captain-request.service.js';
import { AppError } from '../../middleware/app-error.js';

function getUserId(request: FastifyRequest): string {
  const userId = request.headers['x-user-id'];
  if (!userId || typeof userId !== 'string') {
    throw new AppError('UNAUTHORIZED', 401, 'Authentication required');
  }
  return userId;
}

type TournamentParams = { Params: { id: string } };
type CaptainRequestParams = { Params: { id: string; captainRequestId: string } };
type UpdateCaptainRequestBody = { Body: { status: string } };

export const createCaptainRequest = async (
  request: FastifyRequest<TournamentParams>,
  reply: FastifyReply,
): Promise<void> => {
  const callerId = getUserId(request);
  const captainRequest = await captainRequestService.createCaptainRequest(callerId, request.params.id);
  await reply.status(201).send({ data: { captain_request: captainRequest } });
};

export const listCaptainRequests = async (
  request: FastifyRequest<TournamentParams>,
  reply: FastifyReply,
): Promise<void> => {
  const callerId = getUserId(request);
  const captainRequests = await captainRequestService.listCaptainRequests(callerId, request.params.id);
  await reply.status(200).send({ data: captainRequests });
};

export const updateCaptainRequest = async (
  request: FastifyRequest<CaptainRequestParams & UpdateCaptainRequestBody>,
  reply: FastifyReply,
): Promise<void> => {
  const callerId = getUserId(request);
  const captainRequest = await captainRequestService.updateCaptainRequest(
    callerId,
    request.params.id,
    request.params.captainRequestId,
    request.body.status,
  );
  await reply.status(200).send({ data: { captain_request: captainRequest } });
};
