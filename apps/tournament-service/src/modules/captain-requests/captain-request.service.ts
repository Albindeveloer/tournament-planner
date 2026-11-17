import { captainRequestRepository, CaptainRequest } from './captain-request.repository.js';
import { tournamentRepository } from '../tournaments/tournament.repository.js';
import { participantRepository } from '../participants/participant.repository.js';
import { AppError } from '../../middleware/app-error.js';

export class CaptainRequestService {
  async createCaptainRequest(callerId: string, tournamentId: string): Promise<CaptainRequest> {
    const tournament = await tournamentRepository.findById(tournamentId);
    if (!tournament) {
      throw new AppError('TOURNAMENT_NOT_FOUND', 404, 'Tournament not found');
    }

    if (tournament.status !== 'REGISTRATION_OPEN') {
      throw new AppError(
        'REGISTRATION_NOT_OPEN',
        409,
        'Captain requests can only be submitted when registration is open',
      );
    }

    const participant = await participantRepository.findByTournamentAndUser(tournamentId, callerId);
    if (!participant || participant.status !== 'APPROVED') {
      throw new AppError(
        'NOT_A_PARTICIPANT',
        403,
        'Only approved participants can submit a captain request',
      );
    }

    const existing = await captainRequestRepository.findByTournamentAndParticipant(
      tournamentId,
      participant.id,
    );
    if (existing) {
      throw new AppError(
        'CAPTAIN_REQUEST_ALREADY_EXISTS',
        409,
        'A captain request already exists for this participant',
      );
    }

    return captainRequestRepository.create({ tournamentId, participantId: participant.id });
  }

  async listCaptainRequests(callerId: string, tournamentId: string): Promise<CaptainRequest[]> {
    const tournament = await tournamentRepository.findById(tournamentId);
    if (!tournament) {
      throw new AppError('TOURNAMENT_NOT_FOUND', 404, 'Tournament not found');
    }

    if (tournament.owner_id !== callerId) {
      throw new AppError('FORBIDDEN', 403, 'Only the tournament owner can list captain requests');
    }

    return captainRequestRepository.findByTournamentId(tournamentId);
  }

  async updateCaptainRequest(
    callerId: string,
    tournamentId: string,
    captainRequestId: string,
    newStatus: string,
  ): Promise<CaptainRequest> {
    const tournament = await tournamentRepository.findById(tournamentId);
    if (!tournament) {
      throw new AppError('TOURNAMENT_NOT_FOUND', 404, 'Tournament not found');
    }

    const captainRequest = await captainRequestRepository.findById(captainRequestId);
    if (!captainRequest || captainRequest.tournament_id !== tournamentId) {
      throw new AppError('CAPTAIN_REQUEST_NOT_FOUND', 404, 'Captain request not found');
    }

    if (captainRequest.status !== 'PENDING') {
      throw new AppError(
        'CAPTAIN_REQUEST_NOT_PENDING',
        409,
        `Captain request cannot be updated from status ${captainRequest.status}`,
      );
    }

    if (newStatus === 'REJECTED') {
      if (tournament.owner_id !== callerId) {
        throw new AppError('FORBIDDEN', 403, 'Only the tournament owner can reject captain requests');
      }
    } else if (newStatus === 'CANCELLED') {
      // Resolve the participant to verify the caller owns this request
      const participant = await participantRepository.findById(captainRequest.participant_id);
      if (!participant || participant.user_id !== callerId) {
        throw new AppError('FORBIDDEN', 403, 'Only the requesting participant can cancel their captain request');
      }
    }

    return (await captainRequestRepository.updateStatus(captainRequestId, newStatus))!;
  }
}

export const captainRequestService = new CaptainRequestService();
