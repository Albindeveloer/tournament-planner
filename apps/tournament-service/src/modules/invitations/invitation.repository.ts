import { pool } from '../../infrastructure/database/postgres.js';

export type Invitation = {
  id: string;
  tournament_id: string;
  invitee_id: string;
  status: string;
  expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type CreateInvitationParams = {
  tournamentId: string;
  inviteeId: string;
};

export class InvitationRepository {
  async create(params: CreateInvitationParams): Promise<Invitation> {
    const result = await pool.query<Invitation>(
      `INSERT INTO invitations (tournament_id, invitee_id)
       VALUES ($1, $2)
       RETURNING *`,
      [params.tournamentId, params.inviteeId],
    );
    return result.rows[0] as Invitation;
  }

  async findById(id: string): Promise<Invitation | null> {
    const result = await pool.query<Invitation>(
      `SELECT * FROM invitations WHERE id = $1`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  async findByTournamentId(tournamentId: string): Promise<Invitation[]> {
    const result = await pool.query<Invitation>(
      `SELECT * FROM invitations WHERE tournament_id = $1 ORDER BY created_at ASC`,
      [tournamentId],
    );
    return result.rows;
  }

  async findPendingByTournamentAndInvitee(
    tournamentId: string,
    inviteeId: string,
  ): Promise<Invitation | null> {
    const result = await pool.query<Invitation>(
      `SELECT * FROM invitations
       WHERE tournament_id = $1 AND invitee_id = $2 AND status = 'PENDING'`,
      [tournamentId, inviteeId],
    );
    return result.rows[0] ?? null;
  }

  async updateStatus(id: string, status: string): Promise<Invitation | null> {
    const result = await pool.query<Invitation>(
      `UPDATE invitations
       SET status = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, status],
    );
    return result.rows[0] ?? null;
  }
}

export const invitationRepository = new InvitationRepository();
