import { pool } from '../../infrastructure/database/postgres.js';

export type Team = {
  id: string;
  tournament_id: string;
  name: string;
  status: string;
  created_at: Date;
  updated_at: Date;
};

export type CreateTeamParams = {
  tournamentId: string;
  name: string;
};

export type UpdateTeamParams = {
  name?: string;
};

export class TeamRepository {
  async create(params: CreateTeamParams): Promise<Team> {
    const result = await pool.query<Team>(
      `INSERT INTO teams (tournament_id, name)
       VALUES ($1, $2)
       RETURNING *`,
      [params.tournamentId, params.name],
    );
    return result.rows[0] as Team;
  }

  async findByTournamentId(tournamentId: string): Promise<Team[]> {
    const result = await pool.query<Team>(
      `SELECT * FROM teams WHERE tournament_id = $1 ORDER BY created_at ASC`,
      [tournamentId],
    );
    return result.rows;
  }

  async findById(id: string): Promise<Team | null> {
    const result = await pool.query<Team>(
      `SELECT * FROM teams WHERE id = $1`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  async update(id: string, params: UpdateTeamParams): Promise<Team | null> {
    const result = await pool.query<Team>(
      `UPDATE teams
       SET name = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, params.name],
    );
    return result.rows[0] ?? null;
  }
}

export const teamRepository = new TeamRepository();
