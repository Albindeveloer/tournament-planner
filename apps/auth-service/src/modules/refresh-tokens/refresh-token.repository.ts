import { pool } from '../../infrastructure/database/postgres.js';

export type RefreshTokenRecord = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
  created_at: Date;
  last_used_at: Date | null;
};

export class RefreshTokenRepository {
  async create(params: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<RefreshTokenRecord> {
    const result = await pool.query<RefreshTokenRecord>(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, token_hash, expires_at, revoked_at, created_at, last_used_at`,
      [params.userId, params.tokenHash, params.expiresAt],
    );
    const row = result.rows[0];
    if (!row) throw new Error('Failed to create refresh token');
    return row;
  }

  async findByHash(hash: string): Promise<RefreshTokenRecord | null> {
    const result = await pool.query<RefreshTokenRecord>(
      `SELECT id, user_id, token_hash, expires_at, revoked_at, created_at, last_used_at
       FROM refresh_tokens
       WHERE token_hash = $1`,
      [hash],
    );
    return result.rows[0] ?? null;
  }

  async revokeById(id: string): Promise<void> {
    await pool.query(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1`,
      [id],
    );
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await pool.query(
      `UPDATE refresh_tokens
       SET revoked_at = NOW()
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId],
    );
  }

  // Atomically revokes the old token and inserts a new one in a single transaction.
  async rotateToken(
    oldTokenId: string,
    params: { userId: string; tokenHash: string; expiresAt: Date },
  ): Promise<RefreshTokenRecord> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE refresh_tokens
         SET revoked_at = NOW(), last_used_at = NOW()
         WHERE id = $1`,
        [oldTokenId],
      );

      const result = await client.query<RefreshTokenRecord>(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)
         RETURNING id, user_id, token_hash, expires_at, revoked_at, created_at, last_used_at`,
        [params.userId, params.tokenHash, params.expiresAt],
      );

      await client.query('COMMIT');

      const row = result.rows[0];
      if (!row) throw new Error('Failed to rotate refresh token');
      return row;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export const refreshTokenRepository = new RefreshTokenRepository();
