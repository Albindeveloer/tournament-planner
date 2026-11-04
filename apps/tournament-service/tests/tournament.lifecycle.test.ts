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
const OTHER_USER_ID = '00000000-0000-0000-0000-000000000002';
const NON_EXISTENT_ID = '00000000-0000-0000-0000-000000000099';

const validBody = {
  name: 'Weekend Cup',
  game: 'EFOOTBALL',
  format: 'KNOCKOUT',
  team_size: 4,
  number_of_teams: 8,
};

async function createTournament(overrides: Record<string, unknown> = {}) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/tournaments',
    headers: { 'x-user-id': OWNER_ID },
    payload: { ...validBody, ...overrides },
  });
  expect(response.statusCode).toBe(201);
  return response.json().data.tournament;
}

async function setStatus(tournamentId: string, status: string) {
  await pool.query(`UPDATE tournaments SET status = $1 WHERE id = $2`, [status, tournamentId]);
}

// ─── Open Registration ────────────────────────────────────────────────────────

describe('POST /api/v1/tournaments/:id/open', () => {
  it('should transition DRAFT → REGISTRATION_OPEN and return the updated tournament', async () => {
    const tournament = await createTournament();

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${tournament.id}/open`,
      headers: { 'x-user-id': OWNER_ID },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data.tournament.status).toBe('REGISTRATION_OPEN');
    expect(body.data.tournament.id).toBe(tournament.id);
  });

  it('should return 409 INVALID_STATUS_TRANSITION when not in DRAFT', async () => {
    const tournament = await createTournament();
    await setStatus(tournament.id, 'REGISTRATION_OPEN');

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${tournament.id}/open`,
      headers: { 'x-user-id': OWNER_ID },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('should return 403 FORBIDDEN when caller is not the owner', async () => {
    const tournament = await createTournament();

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${tournament.id}/open`,
      headers: { 'x-user-id': OTHER_USER_ID },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('FORBIDDEN');
  });

  it('should return 404 TOURNAMENT_NOT_FOUND for unknown id', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${NON_EXISTENT_ID}/open`,
      headers: { 'x-user-id': OWNER_ID },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('TOURNAMENT_NOT_FOUND');
  });
});

// ─── Close Registration ───────────────────────────────────────────────────────

describe('POST /api/v1/tournaments/:id/close', () => {
  it('should transition REGISTRATION_OPEN → REGISTRATION_CLOSED and return the updated tournament', async () => {
    const tournament = await createTournament();
    await setStatus(tournament.id, 'REGISTRATION_OPEN');

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${tournament.id}/close`,
      headers: { 'x-user-id': OWNER_ID },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.tournament.status).toBe('REGISTRATION_CLOSED');
  });

  it('should return 409 INVALID_STATUS_TRANSITION when still in DRAFT', async () => {
    const tournament = await createTournament();

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${tournament.id}/close`,
      headers: { 'x-user-id': OWNER_ID },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('should return 403 FORBIDDEN when caller is not the owner', async () => {
    const tournament = await createTournament();
    await setStatus(tournament.id, 'REGISTRATION_OPEN');

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${tournament.id}/close`,
      headers: { 'x-user-id': OTHER_USER_ID },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('FORBIDDEN');
  });
});

// ─── Cancel Tournament ────────────────────────────────────────────────────────

describe('POST /api/v1/tournaments/:id/cancel', () => {
  it('should cancel a DRAFT tournament', async () => {
    const tournament = await createTournament();

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${tournament.id}/cancel`,
      headers: { 'x-user-id': OWNER_ID },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.tournament.status).toBe('CANCELLED');
  });

  it('should cancel a REGISTRATION_OPEN tournament', async () => {
    const tournament = await createTournament();
    await setStatus(tournament.id, 'REGISTRATION_OPEN');

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${tournament.id}/cancel`,
      headers: { 'x-user-id': OWNER_ID },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.tournament.status).toBe('CANCELLED');
  });

  it('should return 409 INVALID_STATUS_TRANSITION when already CANCELLED', async () => {
    const tournament = await createTournament();
    await setStatus(tournament.id, 'CANCELLED');

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${tournament.id}/cancel`,
      headers: { 'x-user-id': OWNER_ID },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('should return 409 INVALID_STATUS_TRANSITION when already COMPLETED', async () => {
    const tournament = await createTournament();
    await setStatus(tournament.id, 'COMPLETED');

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${tournament.id}/cancel`,
      headers: { 'x-user-id': OWNER_ID },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('should return 403 FORBIDDEN when caller is not the owner', async () => {
    const tournament = await createTournament();

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${tournament.id}/cancel`,
      headers: { 'x-user-id': OTHER_USER_ID },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('FORBIDDEN');
  });
});
