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

describe('GET /api/v1/auth/me', () => {
  it('should return the authenticated user for a valid access token', async () => {
    const { user, access_token } = await registerAndLogin();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { Authorization: `Bearer ${access_token}` },
    });

    expect(response.statusCode).toBe(200);

    const body = response.json();
    expect(body.data.user.id).toBe(user.id);
    expect(body.data.user.email).toBe(user.email);
    expect(body.data.user.status).toBe('ACTIVE');
  });

  it('should not return password_hash in the response', async () => {
    const { access_token } = await registerAndLogin();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { Authorization: `Bearer ${access_token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.user).not.toHaveProperty('password_hash');
    expect(response.json().data.user).not.toHaveProperty('password');
  });

  it('should return 401 when no Authorization header is provided', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('UNAUTHORIZED');
  });

  it('should return 401 for a malformed token', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { Authorization: 'Bearer this.is.not.a.valid.jwt' },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('UNAUTHORIZED');
  });

  it('should return 401 for an expired access token', async () => {
    const { user } = await registerAndLogin();

    // Set exp 60 seconds in the past — token is already expired at signing time.
    const now = Math.floor(Date.now() / 1000);
    const expiredToken = app.jwt.sign({ sub: user.id, exp: now - 60 });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { Authorization: `Bearer ${expiredToken}` },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('UNAUTHORIZED');
  });

  it('should return 401 for a token signed with a wrong secret', async () => {
    // A structurally valid JWT but signed with a different secret — signature check fails.
    const fakeToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
      '.eyJzdWIiOiJmYWtlLXVzZXItaWQifQ' +
      '.INVALIDSIGNATURE_wrongsecret_tampered';

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { Authorization: `Bearer ${fakeToken}` },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('UNAUTHORIZED');
  });

  it('should return 403 when the account is suspended after token issuance', async () => {
    const { access_token } = await registerAndLogin();

    // Suspend the account between login and GET /me.
    await pool.query(`UPDATE users SET status = 'SUSPENDED' WHERE email = 'player@example.com'`);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { Authorization: `Bearer ${access_token}` },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('ACCOUNT_INACTIVE');
  });
});
