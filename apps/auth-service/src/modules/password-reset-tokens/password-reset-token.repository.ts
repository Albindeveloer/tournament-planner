import { pool } from '../../infrastructure/database/postgres.js';

export type PasswordResetTokenRecord = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
};

export class PasswordResetTokenRepository {
  async create(params: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<PasswordResetTokenRecord> {
    const result = await pool.query<PasswordResetTokenRecord>(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, token_hash, expires_at, used_at, created_at`,
      [params.userId, params.tokenHash, params.expiresAt],
    );
    const row = result.rows[0];
    if (!row) throw new Error('Failed to create password reset token');
    return row;
  }

  async findByHash(hash: string): Promise<PasswordResetTokenRecord | null> {
    const result = await pool.query<PasswordResetTokenRecord>(
      `SELECT id, user_id, token_hash, expires_at, used_at, created_at
       FROM password_reset_tokens
       WHERE token_hash = $1`,
      [hash],
    );
    return result.rows[0] ?? null;
  }

  async markAsUsed(id: string): Promise<void> {
    await pool.query(
      `UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`,
      [id],
    );
  }
}

export const passwordResetTokenRepository = new PasswordResetTokenRepository();
