import { FastifyReply, FastifyRequest } from 'fastify';
import { auctionService, CreateAuctionInput, UpdateAuctionInput } from './auction.service.js';
import { AppError } from '../../middleware/app-error.js';

type CreateAuctionRequest = { Body: CreateAuctionInput };
type GetAuctionRequest = { Params: { id: string } };
type UpdateAuctionRequest = { Params: { id: string }; Body: UpdateAuctionInput };

function getUserId(request: FastifyRequest): string {
  const userId = request.headers['x-user-id'];
  if (!userId || typeof userId !== 'string') {
    throw new AppError('UNAUTHORIZED', 401, 'Authentication required');
  }
  return userId;
}

export const createAuctionHandler = async (
  request: FastifyRequest<CreateAuctionRequest>,
  reply: FastifyReply,
): Promise<void> => {
  getUserId(request);
  const auction = await auctionService.createAuction(request.body);
  await reply.status(201).send({ data: { auction } });
};

export const getAuctionHandler = async (
  request: FastifyRequest<GetAuctionRequest>,
  reply: FastifyReply,
): Promise<void> => {
  getUserId(request);
  const auction = await auctionService.getAuction(request.params.id);
  await reply.status(200).send({ data: { auction } });
};

export const updateAuctionHandler = async (
  request: FastifyRequest<UpdateAuctionRequest>,
  reply: FastifyReply,
): Promise<void> => {
  getUserId(request);
  const auction = await auctionService.updateAuction(request.params.id, request.body);
  await reply.status(200).send({ data: { auction } });
};
