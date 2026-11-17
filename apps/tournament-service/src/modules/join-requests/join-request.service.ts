import { joinRequestRepository, JoinRequest } from './join-request.repository.js';
import { tournamentRepository } from '../tournaments/tournament.repository.js';
import { participantRepository } from '../participants/participant.repository.js';
import { participantService } from '../participants/participant.service.js';
import { AppError } from '../../middleware/app-error.js';

export class JoinRequestService {
  async createJoinRequest(callerId: string, tournamentId: string): Promise<JoinRequest> {
    const tournament = await tournamentRepository.findById(tournamentId);
    if (!tournament) {
      throw new AppError('TOURNAMENT_NOT_FOUND', 404, 'Tournament not found');
    }

    if (tournament.status !== 'REGISTRATION_OPEN') {
      throw new AppError(
        'REGISTRATION_NOT_OPEN',
        409,
        'Join requests can only be submitted when registration is open',
      );
    }

    if (tournament.owner_id === callerId) {
      throw new AppError('CANNOT_JOIN_OWN_TOURNAMENT', 409, 'The tournament owner cannot submit a join request');
    }

    const existingParticipant = await participantRepository.findByTournamentAndUser(
      tournamentId,
      callerId,
    );
    if (existingParticipant && existingParticipant.status === 'APPROVED') {
      throw new AppError('ALREADY_A_PARTICIPANT', 409, 'User is already an approved participant');
    }

    const pendingRequest = await joinRequestRepository.findPendingByTournamentAndUser(
      tournamentId,
      callerId,
    );
    if (pendingRequest) {
      throw new AppError(
        'PENDING_JOIN_REQUEST_EXISTS',
        409,
        'A pending join request already exists for this user',
      );
    }

    return joinRequestRepository.create({ tournamentId, userId: callerId });
  }

  async listJoinRequests(callerId: string, tournamentId: string): Promise<JoinRequest[]> {
    const tournament = await tournamentRepository.findById(tournamentId);
    if (!tournament) {
      throw new AppError('TOURNAMENT_NOT_FOUND', 404, 'Tournament not found');
    }

    if (tournament.owner_id !== callerId) {
      throw new AppError('FORBIDDEN', 403, 'Only the tournament owner can list join requests');
    }

    return joinRequestRepository.findByTournamentId(tournamentId);
  }

  async updateJoinRequest(
    callerId: string,
    tournamentId: string,
    joinRequestId: string,
    newStatus: string,
  ): Promise<JoinRequest> {
    const tournament = await tournamentRepository.findById(tournamentId);
    if (!tournament) {
      throw new AppError('TOURNAMENT_NOT_FOUND', 404, 'Tournament not found');
    }

    const joinRequest = await joinRequestRepository.findById(joinRequestId);
    if (!joinRequest || joinRequest.tournament_id !== tournamentId) {
      throw new AppError('JOIN_REQUEST_NOT_FOUND', 404, 'Join request not found');
    }

    if (joinRequest.status !== 'PENDING') {
      throw new AppError(
        'JOIN_REQUEST_NOT_PENDING',
        409,
        `Join request cannot be updated from status ${joinRequest.status}`,
      );
    }

    if (newStatus === 'APPROVED' || newStatus === 'REJECTED') {
      if (tournament.owner_id !== callerId) {
        throw new AppError('FORBIDDEN', 403, 'Only the tournament owner can approve or reject join requests');
      }

      if (newStatus === 'APPROVED') {
        // Delegates to participantService which enforces capacity, deduplication, and registration-open guard
        await participantService.approveParticipant(callerId, tournamentId, joinRequest.user_id);
      }
    } else if (newStatus === 'CANCELLED') {
      if (joinRequest.user_id !== callerId) {
        throw new AppError('FORBIDDEN', 403, 'Only the requesting user can cancel their join request');
      }
    }

    return (await joinRequestRepository.updateStatus(joinRequestId, newStatus))!;
  }
}

export const joinRequestService = new JoinRequestService();
