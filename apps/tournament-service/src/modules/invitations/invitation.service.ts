import { invitationRepository, Invitation } from './invitation.repository.js';
import { tournamentRepository } from '../tournaments/tournament.repository.js';
import { participantRepository } from '../participants/participant.repository.js';
import { participantService } from '../participants/participant.service.js';
import { AppError } from '../../middleware/app-error.js';

export class InvitationService {
  async createInvitation(
    callerId: string,
    tournamentId: string,
    inviteeId: string,
  ): Promise<Invitation> {
    const tournament = await tournamentRepository.findById(tournamentId);
    if (!tournament) {
      throw new AppError('TOURNAMENT_NOT_FOUND', 404, 'Tournament not found');
    }

    if (tournament.owner_id !== callerId) {
      throw new AppError('FORBIDDEN', 403, 'Only the tournament owner can send invitations');
    }

    if (tournament.status !== 'REGISTRATION_OPEN') {
      throw new AppError(
        'REGISTRATION_NOT_OPEN',
        409,
        'Invitations can only be sent when registration is open',
      );
    }

    if (inviteeId === callerId) {
      throw new AppError('CANNOT_INVITE_SELF', 409, 'Owner cannot invite themselves');
    }

    const existingParticipant = await participantRepository.findByTournamentAndUser(
      tournamentId,
      inviteeId,
    );
    if (existingParticipant && existingParticipant.status === 'APPROVED') {
      throw new AppError('ALREADY_A_PARTICIPANT', 409, 'User is already an approved participant');
    }

    const pendingInvitation = await invitationRepository.findPendingByTournamentAndInvitee(
      tournamentId,
      inviteeId,
    );
    if (pendingInvitation) {
      throw new AppError(
        'PENDING_INVITATION_EXISTS',
        409,
        'A pending invitation already exists for this user',
      );
    }

    return invitationRepository.create({ tournamentId, inviteeId });
  }

  async listInvitations(callerId: string, tournamentId: string): Promise<Invitation[]> {
    const tournament = await tournamentRepository.findById(tournamentId);
    if (!tournament) {
      throw new AppError('TOURNAMENT_NOT_FOUND', 404, 'Tournament not found');
    }

    if (tournament.owner_id !== callerId) {
      throw new AppError('FORBIDDEN', 403, 'Only the tournament owner can list invitations');
    }

    return invitationRepository.findByTournamentId(tournamentId);
  }

  async updateInvitation(
    callerId: string,
    tournamentId: string,
    invitationId: string,
    newStatus: string,
  ): Promise<Invitation> {
    const tournament = await tournamentRepository.findById(tournamentId);
    if (!tournament) {
      throw new AppError('TOURNAMENT_NOT_FOUND', 404, 'Tournament not found');
    }

    const invitation = await invitationRepository.findById(invitationId);
    if (!invitation || invitation.tournament_id !== tournamentId) {
      throw new AppError('INVITATION_NOT_FOUND', 404, 'Invitation not found');
    }

    if (invitation.status !== 'PENDING') {
      throw new AppError(
        'INVITATION_NOT_PENDING',
        409,
        `Invitation cannot be updated from status ${invitation.status}`,
      );
    }

    if (newStatus === 'ACCEPTED' || newStatus === 'REJECTED') {
      if (invitation.invitee_id !== callerId) {
        throw new AppError('FORBIDDEN', 403, 'Only the invited user can accept or reject an invitation');
      }

      if (newStatus === 'ACCEPTED') {
        await participantService.addParticipantViaInvitation(tournamentId, callerId);
      }
    } else if (newStatus === 'CANCELLED') {
      if (tournament.owner_id !== callerId) {
        throw new AppError('FORBIDDEN', 403, 'Only the tournament owner can cancel an invitation');
      }
    }

    return (await invitationRepository.updateStatus(invitationId, newStatus))!;
  }
}

export const invitationService = new InvitationService();
