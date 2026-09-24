import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { pool } from '../src/infrastructure/database/postgres.js';
import { authService } from '../src/modules/auth/auth.service.js';

const app = buildApp();

const VALID_PASSWORD = 'SecurePassword123!';
const NEW_PASSWORD = 'NewSecurePassword456!';

const registerUser = async (email = 'player@example.com') => {
  await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email, password: VALID_PASSWORD, first_name: 'Player' },
  });
};

const loginUser = async (email = 'player@example.com', password = VALID_PASSWORD) => {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email, password },
  });
  return response.json().data as {
    user: { id: string; email: string };
    access_token: string;
    refresh_token: string;
  };
};

beforeAll(async () => {
  await app.ready();
});

beforeEach(async () => {
  await pool.query('DELETE FROM password_reset_tokens;');
  await pool.query('DELETE FROM refresh_tokens;');
  await pool.query('DELETE FROM users;');
});

afterAll(async () => {
  await app.close();
  await pool.end();
});

// ============================================================
// POST /api/v1/auth/forgot-password
// ============================================================

describe('POST /api/v1/auth/forgot-password', () => {
  it('should return 202 when the email exists', async () => {
    await registerUser();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/forgot-password',
      payload: { email: 'player@example.com' },
    });

    expect(response.statusCode).toBe(202);
  });

  it('should return 202 even when the email does not exist (no enumeration)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/forgot-password',
      payload: { email: 'unknown@example.com' },
    });

    expect(response.statusCode).toBe(202);
  });

  it('should store a hashed token — never the plaintext', async () => {
    await registerUser();
    const plaintext = await authService.forgotPassword('player@example.com');

    expect(plaintext).not.toBeNull();

    const result = await pool.query(
      `SELECT token_hash FROM password_reset_tokens`,
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].token_hash).not.toBe(plaintext);
    expect(result.rows[0].token_hash).toHaveLength(64); // SHA-256 hex
  });

  it('should reject a missing email field', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/forgot-password',
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });

  it('should reject an invalid email format', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/forgot-password',
      payload: { email: 'not-an-email' },
    });

    expect(response.statusCode).toBe(400);
  });
});

// ============================================================
// POST /api/v1/auth/reset-password
// ============================================================

describe('POST /api/v1/auth/reset-password', () => {
  it('should reset the password with a valid token', async () => {
    await registerUser();
    const plaintext = await authService.forgotPassword('player@example.com');

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/reset-password',
      payload: { token: plaintext, new_password: NEW_PASSWORD },
    });

    expect(response.statusCode).toBe(200);
  });

  it('should allow login with the new password after reset', async () => {
    await registerUser();
    const plaintext = await authService.forgotPassword('player@example.com');

    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/reset-password',
      payload: { token: plaintext, new_password: NEW_PASSWORD },
    });

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'player@example.com', password: NEW_PASSWORD },
    });

    expect(loginResponse.statusCode).toBe(200);
    expect(loginResponse.json().data.access_token).toBeTruthy();
  });

  it('should reject login with the old password after reset', async () => {
    await registerUser();
    const plaintext = await authService.forgotPassword('player@example.com');

    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/reset-password',
      payload: { token: plaintext, new_password: NEW_PASSWORD },
    });

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'player@example.com', password: VALID_PASSWORD },
    });

    expect(loginResponse.statusCode).toBe(401);
  });

  it('should invalidate existing refresh sessions after reset', async () => {
    await registerUser();
    const { refresh_token } = await loginUser();

    const plaintext = await authService.forgotPassword('player@example.com');
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/reset-password',
      payload: { token: plaintext, new_password: NEW_PASSWORD },
    });

    // The old refresh token must now be revoked
    const refreshResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refresh_token },
    });

    expect(refreshResponse.statusCode).toBe(401);
  });

  it('should reject a token that has already been used', async () => {
    await registerUser();
    const plaintext = await authService.forgotPassword('player@example.com');

    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/reset-password',
      payload: { token: plaintext, new_password: NEW_PASSWORD },
    });

    // Second use of the same token
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/reset-password',
      payload: { token: plaintext, new_password: 'AnotherPassword789!' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('INVALID_RESET_TOKEN');
  });

  it('should reject an invalid (unknown) token', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/reset-password',
      payload: { token: 'completely-fake-token', new_password: NEW_PASSWORD },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('INVALID_RESET_TOKEN');
  });

  it('should reject a password shorter than 8 characters', async () => {
    await registerUser();
    const plaintext = await authService.forgotPassword('player@example.com');

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/reset-password',
      payload: { token: plaintext, new_password: 'short' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should reject a missing token field', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/reset-password',
      payload: { new_password: NEW_PASSWORD },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should reject a missing new_password field', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/reset-password',
      payload: { token: 'some-token' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should reject an expired reset token', async () => {
    await registerUser();
    const plaintext = await authService.forgotPassword('player@example.com');

    // Manually expire the token in the database.
    await pool.query(
      `UPDATE password_reset_tokens SET expires_at = NOW() - INTERVAL '1 second'`,
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/reset-password',
      payload: { token: plaintext, new_password: NEW_PASSWORD },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('INVALID_RESET_TOKEN');
  });

  it('should mark the reset token as used in the database after successful reset', async () => {
    await registerUser();
    const plaintext = await authService.forgotPassword('player@example.com');

    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/reset-password',
      payload: { token: plaintext, new_password: NEW_PASSWORD },
    });

    const result = await pool.query(
      `SELECT used_at FROM password_reset_tokens`,
    );

    expect(result.rows[0].used_at).not.toBeNull();
  });
});
