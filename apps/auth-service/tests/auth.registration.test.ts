import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.js';
import { pool } from '../src/infrastructure/database/postgres.js';

const app = buildApp();

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

describe('POST /api/v1/auth/register', () => {
  it('should register a new user successfully', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'playertwo@example.com',
        password: 'SecurePassword123!',
        first_name: 'Player',
        last_name: 'Two',
      },
    });

    expect(response.statusCode).toBe(201);

    const body = response.json();

    expect(body.data.user).toMatchObject({
      email: 'playertwo@example.com',
      first_name: 'Player',
      last_name: 'Two',
      status: 'ACTIVE',
      email_verified: false,
      last_login_at: null,
    });

    expect(body.data.user.id).toEqual(expect.any(String));
    expect(body.data.user.created_at).toEqual(expect.any(String));
    expect(body.data.user.updated_at).toEqual(expect.any(String));

    expect(body.data.user).not.toHaveProperty('password_hash');
    expect(body.data.user).not.toHaveProperty('password');
  });

  it('should normalize the email to lowercase', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'PLAYERTWO@EXAMPLE.COM',
        password: 'SecurePassword123!',
        first_name: 'Player',
      },
    });

    expect(response.statusCode).toBe(201);

    const body = response.json();

    expect(body.data.user.email).toBe('playertwo@example.com');
  });

  it('should reject a duplicate email', async () => {
    const payload = {
      email: 'playertwo@example.com',
      password: 'SecurePassword123!',
      first_name: 'Player',
    };

    const firstResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload,
    });

    expect(firstResponse.statusCode).toBe(201);

    const secondResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload,
    });

    expect(secondResponse.statusCode).toBe(409);

    expect(secondResponse.json()).toEqual({
      error: {
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'An account with this email already exists',
        details: null,
      },
    });
  });

  it('should reject an invalid email', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'not-an-email',
        password: 'SecurePassword123!',
        first_name: 'Player',
      },
    });

    expect(response.statusCode).toBe(400);

    const body = response.json();

    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should reject a password shorter than 8 characters', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'playertwo@example.com',
        password: '1234567',
        first_name: 'Player',
      },
    });

    expect(response.statusCode).toBe(400);

    const body = response.json();

    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should reject a missing first_name', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'playertwo@example.com',
        password: 'SecurePassword123!',
      },
    });

    expect(response.statusCode).toBe(400);

    const body = response.json();

    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should reject unknown fields', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'playertwo@example.com',
        password: 'SecurePassword123!',
        first_name: 'Player',
        role: 'ADMIN',
      },
    });

    expect(response.statusCode).toBe(400);

    const body = response.json();

    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should store a hashed password', async () => {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      email: 'playertwo@example.com',
      password: 'SecurePassword123!',
      first_name: 'Player',
    },
  });

  expect(response.statusCode).toBe(201);

  const result = await pool.query<{
    password_hash: string;
  }>(
    `
      SELECT password_hash
      FROM users
      WHERE email = $1;
    `,
    ['playertwo@example.com'],
  );

  expect(result.rows).toHaveLength(1);

  const passwordHash = result.rows[0].password_hash;

  expect(passwordHash).not.toBe('SecurePassword123!');
  expect(passwordHash).toMatch(/^\$argon2/);
});

});