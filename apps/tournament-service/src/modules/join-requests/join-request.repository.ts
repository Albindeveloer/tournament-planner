import { pool } from '../../infrastructure/database/postgres.js';

export type JoinRequest = {
  id: string;
  tournament_id: string;
  user_id: string;
  status: string;
  created_at: Date;
  updated_at: Date;
};

export type CreateJoinRequestParams = {
  tournamentId: string;
  userId: string;
};

export class JoinRequestRepository {
  async create(params: CreateJoinRequestParams): Promise<JoinRequest> {
    const result = await pool.query<JoinRequest>(
      `INSERT INTO join_requests (tournament_id, user_id)
       VALUES ($1, $2)
       RETURNING *`,
      [params.tournamentId, params.userId],
    );
    return result.rows[0] as JoinRequest;
  }

  async findById(id: string): Promise<JoinRequest | null> {
    const result = await pool.query<JoinRequest>(
      `SELECT * FROM join_requests WHERE id = $1`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  async findByTournamentId(tournamentId: string): Promise<JoinRequest[]> {
    const result = await pool.query<JoinRequest>(
      `SELECT * FROM join_requests WHERE tournament_id = $1 ORDER BY created_at ASC`,
      [tournamentId],
    );
    return result.rows;
  }

  async findPendingByTournamentAndUser(
    tournamentId: string,
    userId: string,
  ): Promise<JoinRequest | null> {
    const result = await pool.query<JoinRequest>(
      `SELECT * FROM join_requests
       WHERE tournament_id = $1 AND user_id = $2 AND status = 'PENDING'`,
      [tournamentId, userId],
    );
    return result.rows[0] ?? null;
  }

  async updateStatus(id: string, status: string): Promise<JoinRequest | null> {
    const result = await pool.query<JoinRequest>(
      `UPDATE join_requests
       SET status = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, status],
    );
    return result.rows[0] ?? null;
  }
}

export const joinRequestRepository = new JoinRequestRepository();
