import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { pool } from '../src/infrastructure/database/postgres.js';

const app = buildApp();

const VALID_PASSWORD = 'SecurePassword123!';

const registerAndLogin = async (email = 'player@example.com') => {
  await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email, password: VALID_PASSWORD, first_name: 'Player' },
  });

  const loginResponse = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email, password: VALID_PASSWORD },
  });

  return loginResponse.json().data as {
    user: { id: string; email: string };
    access_token: string;
    refresh_token: string;
    token_type: string;
  };
};

beforeAll(async () => {
  await app.ready();
});

beforeEach(async () => {
  await pool.query('DELETE FROM refresh_tokens;');
  await pool.query('DELETE FROM users;');
});

afterAll(async () => {
  await app.close();
  await pool.end();
});

describe('POST /api/v1/auth/login — refresh token in response', () => {
  it('should include a refresh_token in the login response', async () => {
    const data = await registerAndLogin();

    expect(data.refresh_token).toEqual(expect.any(String));
    expect(data.refresh_token.length).toBeGreaterThan(0);
    expect(data.access_token).toEqual(expect.any(String));
    expect(data.token_type).toBe('Bearer');
  });

  it('should not store the plaintext refresh token in the database', async () => {
    const data = await registerAndLogin();

    const result = await pool.query(
      `SELECT token_hash FROM refresh_tokens WHERE user_id = $1`,
      [data.user.id],
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].token_hash).not.toBe(data.refresh_token);
  });
});

describe('POST /api/v1/auth/refresh', () => {
  it('should issue a new access token and refresh token for a valid refresh token', async () => {
    const data = await registerAndLogin();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refresh_token: data.refresh_token },
    });

    expect(response.statusCode).toBe(200);

    const body = response.json();
    expect(body.data.access_token).toEqual(expect.any(String));
    expect(body.data.refresh_token).toEqual(expect.any(String));
    expect(body.data.token_type).toBe('Bearer');
    expect(body.data.user.id).toBe(data.user.id);
  });

  it('should rotate the token — the old refresh token must be invalid after refresh', async () => {
    const data = await registerAndLogin();

    // First refresh — should succeed
    const firstRefresh = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refresh_token: data.refresh_token },
    });
    expect(firstRefresh.statusCode).toBe(200);

    // Using the original token again — should fail (it was rotated out)
    const reuse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refresh_token: data.refresh_token },
    });
    expect(reuse.statusCode).toBe(401);
    expect(reuse.json().error.code).toBe('INVALID_REFRESH_TOKEN');
  });

  it('should return a new usable refresh token after rotation', async () => {
    const data = await registerAndLogin();

    const firstRefresh = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refresh_token: data.refresh_token },
    });
    const newToken = firstRefresh.json().data.refresh_token as string;

    // The new token should work
    const secondRefresh = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refresh_token: newToken },
    });
    expect(secondRefresh.statusCode).toBe(200);
  });

  it('should revoke all user sessions when a revoked token is reused (reuse detection)', async () => {
    const data = await registerAndLogin();

    // Rotate once — original token becomes revoked
    const firstRefresh = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refresh_token: data.refresh_token },
    });
    const newToken = firstRefresh.json().data.refresh_token as string;

    // Present the revoked original token — triggers reuse detection
    const reuseResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refresh_token: data.refresh_token },
    });
    expect(reuseResponse.statusCode).toBe(401);

    // The new token from the first rotation should also now be invalid
    const validTokenAfterDetection = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refresh_token: newToken },
    });
    expect(validTokenAfterDetection.statusCode).toBe(401);
  });

  it('should return 401 for an invalid (non-existent) refresh token', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refresh_token: 'completely-invalid-token-that-does-not-exist' },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid or expired refresh token',
        details: null,
      },
    });
  });

  it('should return 401 for an expired refresh token', async () => {
    const data = await registerAndLogin();

    // Manually expire the token in the DB
    await pool.query(
      `UPDATE refresh_tokens SET expires_at = NOW() - INTERVAL '1 second' WHERE user_id = $1`,
      [data.user.id],
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refresh_token: data.refresh_token },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('INVALID_REFRESH_TOKEN');
  });

  it('should return 400 for a missing refresh_token field', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/v1/auth/logout', () => {
  it('should revoke the refresh token and return 204', async () => {
    const data = await registerAndLogin();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      payload: { refresh_token: data.refresh_token },
    });

    expect(response.statusCode).toBe(204);
  });

  it('should make the refresh token invalid after logout', async () => {
    const data = await registerAndLogin();

    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      payload: { refresh_token: data.refresh_token },
    });

    const refreshAttempt = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refresh_token: data.refresh_token },
    });

    expect(refreshAttempt.statusCode).toBe(401);
    expect(refreshAttempt.json().error.code).toBe('INVALID_REFRESH_TOKEN');
  });

  it('should be idempotent — repeated logout returns 204', async () => {
    const data = await registerAndLogin();

    const first = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      payload: { refresh_token: data.refresh_token },
    });
    expect(first.statusCode).toBe(204);

    const second = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      payload: { refresh_token: data.refresh_token },
    });
    expect(second.statusCode).toBe(204);
  });

  it('should return 204 for an unknown token (graceful logout)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      payload: { refresh_token: 'token-that-does-not-exist-anywhere' },
    });

    expect(response.statusCode).toBe(204);
  });

  it('should return 400 for a missing refresh_token field', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
  });
});
