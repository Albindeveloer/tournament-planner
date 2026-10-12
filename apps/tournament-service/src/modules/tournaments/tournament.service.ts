import {
  tournamentRepository,
  Tournament,
  FindAllParams,
  UpdateTournamentParams,
} from './tournament.repository.js';
import { AppError } from '../../middleware/app-error.js';

export type CreateTournamentInput = {
  name: string;
  description?: string;
  game: string;
  format: string;
  team_size: number;
  number_of_teams: number;
  substitutes_enabled?: boolean;
  team_formation_mode?: string;
  registration_start_at?: string;
  registration_end_at?: string;
};

export type UpdateTournamentInput = {
  name?: string;
  description?: string;
  game?: string;
  format?: string;
  team_size?: number;
  number_of_teams?: number;
  substitutes_enabled?: boolean;
  team_formation_mode?: string;
  registration_start_at?: string;
  registration_end_at?: string;
};

export type ListTournamentsInput = {
  page: number;
  limit: number;
  owner_id?: string;
};

// Terminal statuses — no modifications allowed at all
const IMMUTABLE_STATUSES = ['COMPLETED', 'CANCELLED'];

// Statuses where structural fields cannot change (everything beyond DRAFT)
const STRUCTURAL_LOCKED_STATUSES = [
  'REGISTRATION_OPEN',
  'REGISTRATION_CLOSED',
  'TEAM_FORMATION',
  'TEAMS_FINALIZED',
  'FIXTURES_GENERATED',
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
];

// Fields that affect capacity and team-formation — locked once registration opens
const STRUCTURAL_FIELDS: Array<keyof UpdateTournamentInput> = [
  'team_size',
  'number_of_teams',
  'substitutes_enabled',
  'team_formation_mode',
];

export class TournamentService {
  async createTournament(ownerId: string, input: CreateTournamentInput): Promise<Tournament> {
    const registrationStartAt = input.registration_start_at
      ? new Date(input.registration_start_at)
      : null;
    const registrationEndAt = input.registration_end_at
      ? new Date(input.registration_end_at)
      : null;

    if (registrationStartAt && registrationEndAt && registrationEndAt <= registrationStartAt) {
      throw new AppError(
        'INVALID_REGISTRATION_DATES',
        400,
        'registration_end_at must be after registration_start_at',
      );
    }

    return tournamentRepository.create({
      ownerId,
      name: input.name.trim(),
      description: input.description?.trim() ?? null,
      game: input.game,
      format: input.format,
      teamSize: input.team_size,
      numberOfTeams: input.number_of_teams,
      substitutesEnabled: input.substitutes_enabled ?? false,
      teamFormationMode: input.team_formation_mode ?? 'MANUAL',
      registrationStartAt,
      registrationEndAt,
    });
  }

  async getTournament(id: string): Promise<Tournament> {
    const tournament = await tournamentRepository.findById(id);
    if (!tournament) {
      throw new AppError('TOURNAMENT_NOT_FOUND', 404, 'Tournament not found');
    }
    return tournament;
  }

  async listTournaments(input: ListTournamentsInput): Promise<{ tournaments: Tournament[]; total: number }> {
    const params: FindAllParams = { page: input.page, limit: input.limit };
    if (input.owner_id !== undefined) params.ownerId = input.owner_id;
    return tournamentRepository.findAll(params);
  }

  async updateTournament(callerId: string, id: string, input: UpdateTournamentInput): Promise<Tournament> {
    const tournament = await tournamentRepository.findById(id);
    if (!tournament) {
      throw new AppError('TOURNAMENT_NOT_FOUND', 404, 'Tournament not found');
    }

    if (tournament.owner_id !== callerId) {
      throw new AppError('FORBIDDEN', 403, 'Only the tournament owner can modify this tournament');
    }

    if (IMMUTABLE_STATUSES.includes(tournament.status)) {
      throw new AppError(
        'TOURNAMENT_NOT_MODIFIABLE',
        409,
        `Tournament cannot be modified in ${tournament.status} status`,
      );
    }

    if (STRUCTURAL_LOCKED_STATUSES.includes(tournament.status)) {
      const lockedAttempted = STRUCTURAL_FIELDS.filter((f) => input[f] !== undefined);
      if (lockedAttempted.length > 0) {
        throw new AppError(
          'CONFIGURATION_LOCKED',
          409,
          `Cannot change ${lockedAttempted.join(', ')} once registration has opened`,
        );
      }
    }

    // Compare effective dates: use new value if provided, otherwise the stored value
    const effectiveStart =
      input.registration_start_at !== undefined
        ? (input.registration_start_at ? new Date(input.registration_start_at) : null)
        : tournament.registration_start_at;
    const effectiveEnd =
      input.registration_end_at !== undefined
        ? (input.registration_end_at ? new Date(input.registration_end_at) : null)
        : tournament.registration_end_at;

    if (effectiveStart && effectiveEnd && effectiveEnd <= effectiveStart) {
      throw new AppError(
        'INVALID_REGISTRATION_DATES',
        400,
        'registration_end_at must be after registration_start_at',
      );
    }

    const updateParams: UpdateTournamentParams = {};
    if (input.name !== undefined) updateParams.name = input.name.trim();
    if (input.description !== undefined) updateParams.description = input.description.trim() || null;
    if (input.game !== undefined) updateParams.game = input.game;
    if (input.format !== undefined) updateParams.format = input.format;
    if (input.team_size !== undefined) updateParams.teamSize = input.team_size;
    if (input.number_of_teams !== undefined) updateParams.numberOfTeams = input.number_of_teams;
    if (input.substitutes_enabled !== undefined) updateParams.substitutesEnabled = input.substitutes_enabled;
    if (input.team_formation_mode !== undefined) updateParams.teamFormationMode = input.team_formation_mode;
    if (input.registration_start_at !== undefined) {
      updateParams.registrationStartAt = input.registration_start_at
        ? new Date(input.registration_start_at)
        : null;
    }
    if (input.registration_end_at !== undefined) {
      updateParams.registrationEndAt = input.registration_end_at
        ? new Date(input.registration_end_at)
        : null;
    }

    const updated = await tournamentRepository.update(id, updateParams);

    // update() returns null only if the WHERE clause matched nothing — already checked above
    return updated!;
  }
}

export const tournamentService = new TournamentService();
