import { FastifyReply, FastifyRequest } from 'fastify';
import { teamMemberService } from './team-member.service.js';
import { AppError } from '../../middleware/app-error.js';

function getUserId(request: FastifyRequest): string {
  const userId = request.headers['x-user-id'];
  if (!userId || typeof userId !== 'string') {
    throw new AppError('UNAUTHORIZED', 401, 'Authentication required');
  }
  return userId;
}

type MemberParams = { Params: { id: string; teamId: string } };
type MemberIdParams = { Params: { id: string; teamId: string; memberId: string } };
type AddMemberBody = { Body: { participant_id: string; member_role: string; squad_status: string } };
type UpdateMemberBody = { Body: { member_role?: string; squad_status?: string } };

export const listMembers = async (
  request: FastifyRequest<MemberParams>,
  reply: FastifyReply,
): Promise<void> => {
  const members = await teamMemberService.listMembers(request.params.id, request.params.teamId);
  await reply.status(200).send({ data: members });
};

export const addMember = async (
  request: FastifyRequest<MemberParams & AddMemberBody>,
  reply: FastifyReply,
): Promise<void> => {
  const callerId = getUserId(request);
  const { participant_id, member_role, squad_status } = request.body;
  const member = await teamMemberService.addMember(
    callerId,
    request.params.id,
    request.params.teamId,
    participant_id,
    member_role,
    squad_status,
  );
  await reply.status(201).send({ data: { member } });
};

export const updateMember = async (
  request: FastifyRequest<MemberIdParams & UpdateMemberBody>,
  reply: FastifyReply,
): Promise<void> => {
  const callerId = getUserId(request);
  const { member_role, squad_status } = request.body;
  const member = await teamMemberService.updateMember(
    callerId,
    request.params.id,
    request.params.teamId,
    request.params.memberId,
    member_role,
    squad_status,
  );
  await reply.status(200).send({ data: { member } });
};

export const removeMember = async (
  request: FastifyRequest<MemberIdParams>,
  reply: FastifyReply,
): Promise<void> => {
  const callerId = getUserId(request);
  await teamMemberService.removeMember(
    callerId,
    request.params.id,
    request.params.teamId,
    request.params.memberId,
  );
  await reply.status(204).send();
};
