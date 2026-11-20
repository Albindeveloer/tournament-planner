import { teamMemberRepository, TeamMember } from './team-member.repository.js';
import { teamRepository } from './team.repository.js';
import { participantRepository } from '../participants/participant.repository.js';
import { tournamentRepository, Tournament } from '../tournaments/tournament.repository.js';
import { AppError } from '../../middleware/app-error.js';

const TEAM_FORMATION_STATUSES = new Set(['REGISTRATION_CLOSED', 'TEAM_FORMATION']);

function deriveTeamCapacity(tournament: Tournament): number {
  const { team_size, substitutes_enabled } = tournament;
  if (team_size === 1) return 1;
  return team_size + (substitutes_enabled ? 1 : 0);
}

function mapConstraintError(constraint: string | undefined): AppError {
  if (constraint === 'uq_team_members_captain') {
    return new AppError('CAPTAIN_ALREADY_ASSIGNED', 409, 'This team already has a captain');
  }
  if (constraint === 'uq_team_members_substitute') {
    return new AppError('SUBSTITUTE_ALREADY_ASSIGNED', 409, 'This team already has a substitute');
  }
  // UNIQUE(participant_id) — participant already on a team in this tournament
  return new AppError('ALREADY_IN_TEAM', 409, 'This participant is already assigned to a team in this tournament');
}

async function resolveContext(tournamentId: string, teamId: string, callerId: string) {
  const tournament = await tournamentRepository.findById(tournamentId);
  if (!tournament) {
    throw new AppError('TOURNAMENT_NOT_FOUND', 404, 'Tournament not found');
  }

  if (tournament.owner_id !== callerId) {
    throw new AppError('FORBIDDEN', 403, 'Only the tournament owner can manage team members');
  }

  if (!TEAM_FORMATION_STATUSES.has(tournament.status)) {
    throw new AppError(
      'INVALID_TOURNAMENT_STATUS',
      409,
      'Team members can only be managed when registration is closed',
    );
  }

  const team = await teamRepository.findById(teamId);
  if (!team || team.tournament_id !== tournamentId) {
    throw new AppError('TEAM_NOT_FOUND', 404, 'Team not found');
  }

  return tournament;
}

export class TeamMemberService {
  async listMembers(tournamentId: string, teamId: string): Promise<TeamMember[]> {
    const tournament = await tournamentRepository.findById(tournamentId);
    if (!tournament) {
      throw new AppError('TOURNAMENT_NOT_FOUND', 404, 'Tournament not found');
    }

    const team = await teamRepository.findById(teamId);
    if (!team || team.tournament_id !== tournamentId) {
      throw new AppError('TEAM_NOT_FOUND', 404, 'Team not found');
    }

    return teamMemberRepository.findByTeamId(teamId);
  }

  async addMember(
    callerId: string,
    tournamentId: string,
    teamId: string,
    participantId: string,
    memberRole: string,
    squadStatus: string,
  ): Promise<TeamMember> {
    const tournament = await resolveContext(tournamentId, teamId, callerId);

    const participant = await participantRepository.findById(participantId);
    if (!participant || participant.tournament_id !== tournamentId || participant.status !== 'APPROVED') {
      throw new AppError('PARTICIPANT_NOT_FOUND', 404, 'Participant not found or not approved in this tournament');
    }

    const capacity = deriveTeamCapacity(tournament);
    const currentCount = await teamMemberRepository.countByTeamId(teamId);
    if (currentCount >= capacity) {
      throw new AppError('TEAM_FULL', 409, 'Team has reached maximum capacity');
    }

    try {
      return await teamMemberRepository.create({ teamId, participantId, memberRole, squadStatus });
    } catch (err: unknown) {
      const pgErr = err as { code?: string; constraint?: string };
      if (pgErr.code === '23505') {
        throw mapConstraintError(pgErr.constraint);
      }
      if (pgErr.code === '23514') {
        throw new AppError('CAPTAIN_CANNOT_BE_SUBSTITUTE', 409, 'A captain must have squad status MAIN');
      }
      throw err;
    }
  }

  async updateMember(
    callerId: string,
    tournamentId: string,
    teamId: string,
    memberId: string,
    memberRole?: string,
    squadStatus?: string,
  ): Promise<TeamMember> {
    await resolveContext(tournamentId, teamId, callerId);

    const member = await teamMemberRepository.findById(memberId);
    if (!member || member.team_id !== teamId) {
      throw new AppError('TEAM_MEMBER_NOT_FOUND', 404, 'Team member not found');
    }

    try {
      const updated = await teamMemberRepository.update(memberId, { memberRole, squadStatus });
      return updated!;
    } catch (err: unknown) {
      const pgErr = err as { code?: string; constraint?: string };
      if (pgErr.code === '23505') {
        throw mapConstraintError(pgErr.constraint);
      }
      if (pgErr.code === '23514') {
        throw new AppError('CAPTAIN_CANNOT_BE_SUBSTITUTE', 409, 'A captain must have squad status MAIN');
      }
      throw err;
    }
  }

  async removeMember(
    callerId: string,
    tournamentId: string,
    teamId: string,
    memberId: string,
  ): Promise<void> {
    await resolveContext(tournamentId, teamId, callerId);

    const member = await teamMemberRepository.findById(memberId);
    if (!member || member.team_id !== teamId) {
      throw new AppError('TEAM_MEMBER_NOT_FOUND', 404, 'Team member not found');
    }

    await teamMemberRepository.remove(memberId);
  }
}

export const teamMemberService = new TeamMemberService();
