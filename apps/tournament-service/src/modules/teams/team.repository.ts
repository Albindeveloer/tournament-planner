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

export type TeamSummary = {
  team_id: string;
  member_count: number;
  captain_count: number;
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

  async findTeamSummaries(tournamentId: string): Promise<TeamSummary[]> {
    const result = await pool.query<{ team_id: string; member_count: string; captain_count: string }>(
      `SELECT t.id AS team_id,
              COUNT(tm.id) AS member_count,
              COUNT(CASE WHEN tm.member_role = 'CAPTAIN' THEN 1 END) AS captain_count
       FROM teams t
       LEFT JOIN team_members tm ON tm.team_id = t.id
       WHERE t.tournament_id = $1
       GROUP BY t.id`,
      [tournamentId],
    );
    return result.rows.map((r) => ({
      team_id: r.team_id,
      member_count: parseInt(r.member_count, 10),
      captain_count: parseInt(r.captain_count, 10),
    }));
  }
}

export const teamRepository = new TeamRepository();
