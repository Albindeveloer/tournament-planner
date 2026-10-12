import { pool } from '../../infrastructure/database/postgres.js';

export type Tournament = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  game: string;
  format: string;
  team_size: number;
  number_of_teams: number;
  substitutes_enabled: boolean;
  team_formation_mode: string;
  status: string;
  registration_start_at: Date | null;
  registration_end_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type CreateTournamentParams = {
  ownerId: string;
  name: string;
  description: string | null;
  game: string;
  format: string;
  teamSize: number;
  numberOfTeams: number;
  substitutesEnabled: boolean;
  teamFormationMode: string;
  registrationStartAt: Date | null;
  registrationEndAt: Date | null;
};

export class TournamentRepository {
  async create(params: CreateTournamentParams): Promise<Tournament> {
    const result = await pool.query<Tournament>(
      `INSERT INTO tournaments (
        owner_id, name, description, game, format, team_size, number_of_teams,
        substitutes_enabled, team_formation_mode, registration_start_at, registration_end_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        params.ownerId,
        params.name,
        params.description,
        params.game,
        params.format,
        params.teamSize,
        params.numberOfTeams,
        params.substitutesEnabled,
        params.teamFormationMode,
        params.registrationStartAt,
        params.registrationEndAt,
      ],
    );
    return result.rows[0] as Tournament;
  }

  async findById(id: string): Promise<Tournament | null> {
    const result = await pool.query<Tournament>(
      `SELECT * FROM tournaments WHERE id = $1`,
      [id],
    );
    return result.rows[0] ?? null;
  }
}

export const tournamentRepository = new TournamentRepository();
