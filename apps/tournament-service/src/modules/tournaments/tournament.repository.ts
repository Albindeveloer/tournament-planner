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

export type UpdateTournamentParams = {
  name?: string;
  description?: string | null;
  game?: string;
  format?: string;
  teamSize?: number;
  numberOfTeams?: number;
  substitutesEnabled?: boolean;
  teamFormationMode?: string;
  registrationStartAt?: Date | null;
  registrationEndAt?: Date | null;
};

export type FindAllParams = {
  page: number;
  limit: number;
  ownerId?: string;
};

export type TournamentList = {
  tournaments: Tournament[];
  total: number;
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

  async findAll({ page, limit, ownerId }: FindAllParams): Promise<TournamentList> {
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (ownerId !== undefined) {
      params.push(ownerId);
      conditions.push(`owner_id = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM tournaments ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

    params.push(limit);
    const limitParam = params.length;
    params.push(offset);
    const offsetParam = params.length;

    const tournamentsResult = await pool.query<Tournament>(
      `SELECT * FROM tournaments ${whereClause} ORDER BY created_at DESC LIMIT $${limitParam} OFFSET $${offsetParam}`,
      params,
    );

    return { tournaments: tournamentsResult.rows, total };
  }

  async update(id: string, params: UpdateTournamentParams): Promise<Tournament | null> {
    const fields: string[] = [];
    const values: unknown[] = [];

    const addField = (column: string, value: unknown): void => {
      values.push(value);
      fields.push(`${column} = $${values.length}`);
    };

    if (params.name !== undefined) addField('name', params.name);
    if (params.description !== undefined) addField('description', params.description);
    if (params.game !== undefined) addField('game', params.game);
    if (params.format !== undefined) addField('format', params.format);
    if (params.teamSize !== undefined) addField('team_size', params.teamSize);
    if (params.numberOfTeams !== undefined) addField('number_of_teams', params.numberOfTeams);
    if (params.substitutesEnabled !== undefined) addField('substitutes_enabled', params.substitutesEnabled);
    if (params.teamFormationMode !== undefined) addField('team_formation_mode', params.teamFormationMode);
    if (params.registrationStartAt !== undefined) addField('registration_start_at', params.registrationStartAt);
    if (params.registrationEndAt !== undefined) addField('registration_end_at', params.registrationEndAt);

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const result = await pool.query<Tournament>(
      `UPDATE tournaments SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
      values,
    );

    return result.rows[0] ?? null;
  }
}

export const tournamentRepository = new TournamentRepository();
