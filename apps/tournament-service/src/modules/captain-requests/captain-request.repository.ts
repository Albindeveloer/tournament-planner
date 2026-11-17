import { pool } from '../../infrastructure/database/postgres.js';

export type CaptainRequest = {
  id: string;
  tournament_id: string;
  participant_id: string;
  status: string;
  created_at: Date;
  updated_at: Date;
};

export type CreateCaptainRequestParams = {
  tournamentId: string;
  participantId: string;
};

export class CaptainRequestRepository {
  async create(params: CreateCaptainRequestParams): Promise<CaptainRequest> {
    const result = await pool.query<CaptainRequest>(
      `INSERT INTO captain_requests (tournament_id, participant_id)
       VALUES ($1, $2)
       RETURNING *`,
      [params.tournamentId, params.participantId],
    );
    return result.rows[0] as CaptainRequest;
  }

  async findById(id: string): Promise<CaptainRequest | null> {
    const result = await pool.query<CaptainRequest>(
      `SELECT * FROM captain_requests WHERE id = $1`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  async findByTournamentId(tournamentId: string): Promise<CaptainRequest[]> {
    const result = await pool.query<CaptainRequest>(
      `SELECT * FROM captain_requests WHERE tournament_id = $1 ORDER BY created_at ASC`,
      [tournamentId],
    );
    return result.rows;
  }

  async findByTournamentAndParticipant(
    tournamentId: string,
    participantId: string,
  ): Promise<CaptainRequest | null> {
    const result = await pool.query<CaptainRequest>(
      `SELECT * FROM captain_requests
       WHERE tournament_id = $1 AND participant_id = $2`,
      [tournamentId, participantId],
    );
    return result.rows[0] ?? null;
  }

  async updateStatus(id: string, status: string): Promise<CaptainRequest | null> {
    const result = await pool.query<CaptainRequest>(
      `UPDATE captain_requests
       SET status = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, status],
    );
    return result.rows[0] ?? null;
  }
}

export const captainRequestRepository = new CaptainRequestRepository();
