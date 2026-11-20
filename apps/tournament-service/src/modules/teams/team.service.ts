import { teamRepository, Team } from './team.repository.js';
import { tournamentRepository, Tournament } from '../tournaments/tournament.repository.js';
import { pool } from '../../infrastructure/database/postgres.js';
import { AppError } from '../../middleware/app-error.js';

const TEAM_FORMATION_STATUSES = new Set(['REGISTRATION_CLOSED', 'TEAM_FORMATION']);

function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

function deriveTeamCapacity(t: Tournament): number {
  if (t.team_size === 1) return 1;
  return t.team_size + (t.substitutes_enabled ? 1 : 0);
}

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

  async finalizeTeams(callerId: string, tournamentId: string): Promise<Tournament> {
    const tournament = await tournamentRepository.findById(tournamentId);
    if (!tournament) {
      throw new AppError('TOURNAMENT_NOT_FOUND', 404, 'Tournament not found');
    }
    if (tournament.owner_id !== callerId) {
      throw new AppError('FORBIDDEN', 403, 'Only the tournament owner can finalize teams');
    }
    if (!TEAM_FORMATION_STATUSES.has(tournament.status)) {
      throw new AppError(
        'INVALID_STATUS_TRANSITION',
        409,
        `Cannot finalize teams from status ${tournament.status}`,
      );
    }

    const teams = await teamRepository.findByTournamentId(tournamentId);
    if (teams.length !== tournament.number_of_teams) {
      throw new AppError(
        'TEAMS_INCOMPLETE',
        409,
        `Expected ${tournament.number_of_teams} teams but found ${teams.length}`,
      );
    }

    if (tournament.format === 'KNOCKOUT' && !isPowerOfTwo(tournament.number_of_teams)) {
      throw new AppError(
        'INVALID_TEAM_COUNT',
        409,
        'Knockout tournaments require a power-of-two number of teams (2, 4, 8, 16…)',
      );
    }

    const capacity = deriveTeamCapacity(tournament);
    const summaries = await teamRepository.findTeamSummaries(tournamentId);

    for (const summary of summaries) {
      if (summary.member_count !== capacity) {
        throw new AppError(
          'TEAMS_INCOMPLETE',
          409,
          `Each team must have exactly ${capacity} member(s)`,
        );
      }
      if (summary.captain_count !== 1) {
        throw new AppError('TEAMS_INCOMPLETE', 409, 'Each team must have exactly one captain');
      }
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE teams SET status = 'READY', updated_at = NOW() WHERE tournament_id = $1`,
        [tournamentId],
      );
      const result = await client.query<Tournament>(
        `UPDATE tournaments SET status = 'TEAMS_FINALIZED', updated_at = NOW() WHERE id = $1 RETURNING *`,
        [tournamentId],
      );
      await client.query('COMMIT');
      return result.rows[0] as Tournament;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
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
