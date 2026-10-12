import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { pool } from '../src/infrastructure/database/postgres.js';

const app = buildApp();

beforeAll(async () => {
  await app.ready();
});

beforeEach(async () => {
  await pool.query('DELETE FROM tournaments;');
});

afterAll(async () => {
  await app.close();
  await pool.end();
});

const OWNER_ID = '00000000-0000-0000-0000-000000000001';

const validBody = {
  name: 'Weekend Cup',
  game: 'EFOOTBALL',
  format: 'KNOCKOUT',
  team_size: 4,
  number_of_teams: 8,
};

describe('POST /api/v1/tournaments', () => {
  it('should create a tournament and return 201', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/tournaments',
      headers: { 'x-user-id': OWNER_ID },
      payload: validBody,
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.data.tournament).toMatchObject({
      owner_id: OWNER_ID,
      name: 'Weekend Cup',
      game: 'EFOOTBALL',
      format: 'KNOCKOUT',
      team_size: 4,
      number_of_teams: 8,
      substitutes_enabled: false,
      team_formation_mode: 'MANUAL',
      status: 'DRAFT',
      description: null,
      registration_start_at: null,
      registration_end_at: null,
    });
    expect(body.data.tournament.id).toEqual(expect.any(String));
    expect(body.data.tournament.created_at).toEqual(expect.any(String));
    expect(body.data.tournament.updated_at).toEqual(expect.any(String));
  });

  it('should accept all optional fields', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/tournaments',
      headers: { 'x-user-id': OWNER_ID },
      payload: {
        ...validBody,
        description: 'A great tournament',
        substitutes_enabled: true,
        team_formation_mode: 'AUCTION',
        registration_start_at: '2026-11-01T10:00:00Z',
        registration_end_at: '2026-11-07T10:00:00Z',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.data.tournament).toMatchObject({
      description: 'A great tournament',
      substitutes_enabled: true,
      team_formation_mode: 'AUCTION',
      status: 'DRAFT',
    });
    expect(body.data.tournament.registration_start_at).not.toBeNull();
    expect(body.data.tournament.registration_end_at).not.toBeNull();
  });

  it('should always set status to DRAFT regardless of request', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/tournaments',
      headers: { 'x-user-id': OWNER_ID },
      payload: validBody,
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().data.tournament.status).toBe('DRAFT');
  });

  it('should set owner_id from x-user-id header, not the body', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/tournaments',
      headers: { 'x-user-id': OWNER_ID },
      payload: validBody,
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().data.tournament.owner_id).toBe(OWNER_ID);
  });

  it('should return 401 if x-user-id header is missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/tournaments',
      payload: validBody,
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('UNAUTHORIZED');
  });

  it('should return 400 for invalid game value', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/tournaments',
      headers: { 'x-user-id': OWNER_ID },
      payload: { ...validBody, game: 'FIFA' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 for format other than KNOCKOUT', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/tournaments',
      headers: { 'x-user-id': OWNER_ID },
      payload: { ...validBody, format: 'LEAGUE' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 for team_size outside 1-4', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/tournaments',
      headers: { 'x-user-id': OWNER_ID },
      payload: { ...validBody, team_size: 5 },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 if number_of_teams is less than 2', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/tournaments',
      headers: { 'x-user-id': OWNER_ID },
      payload: { ...validBody, number_of_teams: 1 },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 if registration_end_at is not after registration_start_at', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/tournaments',
      headers: { 'x-user-id': OWNER_ID },
      payload: {
        ...validBody,
        registration_start_at: '2026-11-07T10:00:00Z',
        registration_end_at: '2026-11-01T10:00:00Z',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('INVALID_REGISTRATION_DATES');
  });

  it('should return 400 if required fields are missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/tournaments',
      headers: { 'x-user-id': OWNER_ID },
      payload: { name: 'Incomplete Tournament' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 if unknown fields are sent in the body', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/tournaments',
      headers: { 'x-user-id': OWNER_ID },
      payload: { ...validBody, extra_field: 'not allowed' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
  });
});
