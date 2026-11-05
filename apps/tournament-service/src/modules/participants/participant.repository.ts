import { pool } from '../../infrastructure/database/postgres.js';

export type Participant = {
  id: string;
  tournament_id: string;
  user_id: string;
  status: string;
  withdrawn_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type CreateParticipantParams = {
  tournamentId: string;
  userId: string;
};

export class ParticipantRepository {
  async create(params: CreateParticipantParams): Promise<Participant> {
    const result = await pool.query<Participant>(
      `INSERT INTO tournament_participants (tournament_id, user_id)
       VALUES ($1, $2)
       RETURNING *`,
      [params.tournamentId, params.userId],
    );
    return result.rows[0] as Participant;
  }

  async findByTournamentId(tournamentId: string): Promise<Participant[]> {
    const result = await pool.query<Participant>(
      `SELECT * FROM tournament_participants WHERE tournament_id = $1 ORDER BY created_at ASC`,
      [tournamentId],
    );
    return result.rows;
  }

  async findById(id: string): Promise<Participant | null> {
    const result = await pool.query<Participant>(
      `SELECT * FROM tournament_participants WHERE id = $1`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  async findByTournamentAndUser(tournamentId: string, userId: string): Promise<Participant | null> {
    const result = await pool.query<Participant>(
      `SELECT * FROM tournament_participants WHERE tournament_id = $1 AND user_id = $2`,
      [tournamentId, userId],
    );
    return result.rows[0] ?? null;
  }

  async countApproved(tournamentId: string): Promise<number> {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM tournament_participants
       WHERE tournament_id = $1 AND status = 'APPROVED'`,
      [tournamentId],
    );
    return parseInt(result.rows[0]?.count ?? '0', 10);
  }

  async withdraw(id: string): Promise<Participant | null> {
    const result = await pool.query<Participant>(
      `UPDATE tournament_participants
       SET status = 'WITHDRAWN', withdrawn_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id],
    );
    return result.rows[0] ?? null;
  }
}

export const participantRepository = new ParticipantRepository();
