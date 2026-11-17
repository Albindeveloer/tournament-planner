import { teamRepository, Team } from './team.repository.js';
import { tournamentRepository } from '../tournaments/tournament.repository.js';
import { AppError } from '../../middleware/app-error.js';

const TEAM_FORMATION_STATUSES = new Set(['REGISTRATION_CLOSED', 'TEAM_FORMATION']);

export class TeamService {
  async createTeam(callerId: string, tournamentId: string, name: string): Promise<Team> {
    const tournament = await tournamentRepository.findById(tournamentId);
    if (!tournament) {
      throw new AppError('TOURNAMENT_NOT_FOUND', 404, 'Tournament not found');
    }

    if (tournament.owner_id !== callerId) {
      throw new AppError('FORBIDDEN', 403, 'Only the tournament owner can create teams');
    }

    if (!TEAM_FORMATION_STATUSES.has(tournament.status)) {
      throw new AppError(
        'INVALID_TOURNAMENT_STATUS',
        409,
        'Teams can only be created when registration is closed',
      );
    }

    try {
      return await teamRepository.create({ tournamentId, name });
    } catch (err: unknown) {
      if ((err as { code?: string }).code === '23505') {
        throw new AppError('TEAM_NAME_TAKEN', 409, 'A team with that name already exists in this tournament');
      }
      throw err;
    }
  }

  async listTeams(tournamentId: string): Promise<Team[]> {
    const tournament = await tournamentRepository.findById(tournamentId);
    if (!tournament) {
      throw new AppError('TOURNAMENT_NOT_FOUND', 404, 'Tournament not found');
    }

    return teamRepository.findByTournamentId(tournamentId);
  }

  async getTeam(tournamentId: string, teamId: string): Promise<Team> {
    const tournament = await tournamentRepository.findById(tournamentId);
    if (!tournament) {
      throw new AppError('TOURNAMENT_NOT_FOUND', 404, 'Tournament not found');
    }

    const team = await teamRepository.findById(teamId);
    if (!team || team.tournament_id !== tournamentId) {
      throw new AppError('TEAM_NOT_FOUND', 404, 'Team not found');
    }

    return team;
  }

  async updateTeam(
    callerId: string,
    tournamentId: string,
    teamId: string,
    name: string,
  ): Promise<Team> {
    const tournament = await tournamentRepository.findById(tournamentId);
    if (!tournament) {
      throw new AppError('TOURNAMENT_NOT_FOUND', 404, 'Tournament not found');
    }

    if (tournament.owner_id !== callerId) {
      throw new AppError('FORBIDDEN', 403, 'Only the tournament owner can update teams');
    }

    if (!TEAM_FORMATION_STATUSES.has(tournament.status)) {
      throw new AppError(
        'INVALID_TOURNAMENT_STATUS',
        409,
        'Teams can only be updated when registration is closed',
      );
    }

    const team = await teamRepository.findById(teamId);
    if (!team || team.tournament_id !== tournamentId) {
      throw new AppError('TEAM_NOT_FOUND', 404, 'Team not found');
    }

    try {
      return (await teamRepository.update(teamId, { name }))!;
    } catch (err: unknown) {
      if ((err as { code?: string }).code === '23505') {
        throw new AppError('TEAM_NAME_TAKEN', 409, 'A team with that name already exists in this tournament');
      }
      throw err;
    }
  }
}

export const teamService = new TeamService();
