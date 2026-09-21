import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { pool } from '../src/infrastructure/database/postgres.js';

const app = buildApp();

const VALID_PASSWORD = 'SecurePassword123!';

const registerUser = async (overrides: Record<string, unknown> = {}) => {
  return app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      email: 'player@example.com',
      password: VALID_PASSWORD,
      first_name: 'Player',
      last_name: 'One',
      ...overrides,
    },
  });
};

beforeAll(async () => {
  await app.ready();
});

beforeEach(async () => {
  await pool.query('DELETE FROM users;');
});

afterAll(async () => {
  await app.close();
  await pool.end();
});

describe('POST /api/v1/auth/login', () => {
  it('should login with valid credentials and return an access token', async () => {
    await registerUser();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'player@example.com', password: VALID_PASSWORD },
    });

    expect(response.statusCode).toBe(200);

    const body = response.json();
    expect(body.data.access_token).toEqual(expect.any(String));
    expect(body.data.token_type).toBe('Bearer');
    expect(body.data.user.email).toBe('player@example.com');
    expect(body.data.user.status).toBe('ACTIVE');
  });

  it('should not return password_hash in the response', async () => {
    await registerUser();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'player@example.com', password: VALID_PASSWORD },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.user).not.toHaveProperty('password_hash');
    expect(response.json().data.user).not.toHaveProperty('password');
  });

  it('should include the user id as the sub claim in the access token', async () => {
    await registerUser();

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'player@example.com', password: VALID_PASSWORD },
    });

    expect(loginResponse.statusCode).toBe(200);

    const body = loginResponse.json();
    const token = body.data.access_token;
    const userId = body.data.user.id;

    // Decode the JWT payload (middle segment) to inspect claims
    const payloadBase64 = token.split('.')[1];
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));

    expect(payload.sub).toBe(userId);
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('should normalize email to lowercase for login', async () => {
    await registerUser({ email: 'player@example.com' });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'PLAYER@EXAMPLE.COM', password: VALID_PASSWORD },
    });

    expect(response.statusCode).toBe(200);
  });

  it('should return 401 for a wrong password', async () => {
    await registerUser();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'player@example.com', password: 'WrongPassword123!' },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
        details: null,
      },
    });
  });

  it('should return 401 for an unknown email', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'nobody@example.com', password: VALID_PASSWORD },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
        details: null,
      },
    });
  });

  it('should return the same error for unknown email and wrong password (no enumeration)', async () => {
    await registerUser();

    const wrongPassword = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'player@example.com', password: 'WrongPassword123!' },
    });

    const unknownEmail = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'nobody@example.com', password: VALID_PASSWORD },
    });

    expect(wrongPassword.statusCode).toBe(unknownEmail.statusCode);
    expect(wrongPassword.json().error.code).toBe(unknownEmail.json().error.code);
    expect(wrongPassword.json().error.message).toBe(unknownEmail.json().error.message);
  });

  it('should return 403 for a suspended user', async () => {
    await registerUser();
    await pool.query(`UPDATE users SET status = 'SUSPENDED' WHERE email = 'player@example.com'`);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'player@example.com', password: VALID_PASSWORD },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('ACCOUNT_INACTIVE');
  });

  it('should return 403 for a deactivated user', async () => {
    await registerUser();
    await pool.query(`UPDATE users SET status = 'DEACTIVATED' WHERE email = 'player@example.com'`);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'player@example.com', password: VALID_PASSWORD },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('ACCOUNT_INACTIVE');
  });

  it('should return 400 for an invalid email format', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'not-an-email', password: VALID_PASSWORD },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 for a password shorter than 8 characters', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'player@example.com', password: '1234567' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 for unknown fields in the request body', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'player@example.com', password: VALID_PASSWORD, role: 'ADMIN' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
  });
});
