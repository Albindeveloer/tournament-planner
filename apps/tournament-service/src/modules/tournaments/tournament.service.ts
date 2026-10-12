import { tournamentRepository, Tournament } from './tournament.repository.js';
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
}

export const tournamentService = new TournamentService();
