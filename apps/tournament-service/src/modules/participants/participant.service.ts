import { participantRepository, Participant } from './participant.repository.js';
import { tournamentRepository, Tournament } from '../tournaments/tournament.repository.js';
import { AppError } from '../../middleware/app-error.js';

const TERMINAL_STATUSES = ['COMPLETED', 'CANCELLED'];

function deriveCapacity(tournament: Tournament): number {
  const { number_of_teams, team_size, substitutes_enabled } = tournament;
  // 1v1 tournaments never use substitutes regardless of the setting
  if (team_size === 1) return number_of_teams;
  return number_of_teams * (team_size + (substitutes_enabled ? 1 : 0));
}

export class ParticipantService {
  async listParticipants(tournamentId: string): Promise<Participant[]> {
    const tournament = await tournamentRepository.findById(tournamentId);
    if (!tournament) {
      throw new AppError('TOURNAMENT_NOT_FOUND', 404, 'Tournament not found');
    }
    return participantRepository.findByTournamentId(tournamentId);
  }

  async approveParticipant(callerId: string, tournamentId: string, userId: string): Promise<Participant> {
    const tournament = await tournamentRepository.findById(tournamentId);
    if (!tournament) {
      throw new AppError('TOURNAMENT_NOT_FOUND', 404, 'Tournament not found');
    }

    if (tournament.owner_id !== callerId) {
      throw new AppError('FORBIDDEN', 403, 'Only the tournament owner can approve participants');
    }

    if (tournament.status !== 'REGISTRATION_OPEN') {
      throw new AppError(
        'REGISTRATION_NOT_OPEN',
        409,
        'Participants can only be approved when registration is open',
      );
    }

    const existing = await participantRepository.findByTournamentAndUser(tournamentId, userId);
    if (existing && existing.status === 'APPROVED') {
      throw new AppError('ALREADY_A_PARTICIPANT', 409, 'User is already an approved participant');
    }

    const capacity = deriveCapacity(tournament);
    const currentCount = await participantRepository.countApproved(tournamentId);
    if (currentCount >= capacity) {
      throw new AppError('TOURNAMENT_FULL', 409, 'Tournament has reached maximum participant capacity');
    }

    return participantRepository.create({ tournamentId, userId });
  }

  async withdrawParticipant(
    callerId: string,
    tournamentId: string,
    participantId: string,
  ): Promise<Participant> {
    const tournament = await tournamentRepository.findById(tournamentId);
    if (!tournament) {
      throw new AppError('TOURNAMENT_NOT_FOUND', 404, 'Tournament not found');
    }

    if (TERMINAL_STATUSES.includes(tournament.status)) {
      throw new AppError(
        'TOURNAMENT_NOT_MODIFIABLE',
        409,
        `Cannot withdraw from a tournament with status ${tournament.status}`,
      );
    }

    const participant = await participantRepository.findById(participantId);
    if (!participant || participant.tournament_id !== tournamentId) {
      throw new AppError('PARTICIPANT_NOT_FOUND', 404, 'Participant not found in this tournament');
    }

    if (participant.user_id !== callerId && tournament.owner_id !== callerId) {
      throw new AppError(
        'FORBIDDEN',
        403,
        'Only the participant or tournament owner can withdraw a participant',
      );
    }

    if (participant.status === 'WITHDRAWN') {
      throw new AppError('PARTICIPANT_ALREADY_WITHDRAWN', 409, 'Participant has already withdrawn');
    }

    return (await participantRepository.withdraw(participantId))!;
  }
}

export const participantService = new ParticipantService();
