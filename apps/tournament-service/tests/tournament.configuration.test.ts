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

// ---------------------------------------------------------------------------
// GET /api/v1/tournaments/:id
// ---------------------------------------------------------------------------

describe('GET /api/v1/tournaments/:id', () => {
  it('should return 200 with the tournament for an authenticated user', async () => {
    const created = await createTournament();

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/tournaments/${created.id}`,
      headers: { 'x-user-id': OWNER_ID },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data.tournament.id).toBe(created.id);
    expect(body.data.tournament.name).toBe('Weekend Cup');
    expect(body.data.tournament.status).toBe('DRAFT');
  });

  it('should return 401 when x-user-id header is missing', async () => {
    const created = await createTournament();

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/tournaments/${created.id}`,
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('UNAUTHORIZED');
  });

  it('should return 404 for a non-existent tournament', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/tournaments/${NON_EXISTENT_ID}`,
      headers: { 'x-user-id': OWNER_ID },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('TOURNAMENT_NOT_FOUND');
  });

  it('should return 400 for an invalid UUID', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/tournaments/not-a-uuid',
      headers: { 'x-user-id': OWNER_ID },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should allow a non-owner authenticated user to read the tournament', async () => {
    const created = await createTournament();

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/tournaments/${created.id}`,
      headers: { 'x-user-id': OTHER_USER_ID },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.tournament.id).toBe(created.id);
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/tournaments (list)
// ---------------------------------------------------------------------------

describe('GET /api/v1/tournaments', () => {
  it('should return 200 with all tournaments and pagination', async () => {
    await createTournament({ name: 'Cup A' });
    await createTournament({ name: 'Cup B' });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/tournaments',
      headers: { 'x-user-id': OWNER_ID },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toHaveLength(2);
    expect(body.pagination).toMatchObject({ page: 1, limit: 20, total: 2, totalPages: 1 });
  });

  it('should return 401 when x-user-id header is missing', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/tournaments',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('UNAUTHORIZED');
  });

  it('should return empty list when no tournaments exist', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/tournaments',
      headers: { 'x-user-id': OWNER_ID },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toHaveLength(0);
    expect(body.pagination.total).toBe(0);
  });

  it('should filter by owner when ?owner_id=me', async () => {
    await createTournament({ name: 'My Cup' });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/tournaments?owner_id=me',
      headers: { 'x-user-id': OWNER_ID },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe('My Cup');
    expect(body.data[0].owner_id).toBe(OWNER_ID);
  });

  it('should return empty list for ?owner_id=me when caller owns nothing', async () => {
    await createTournament({ name: 'Not My Cup' });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/tournaments?owner_id=me',
      headers: { 'x-user-id': OTHER_USER_ID },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toHaveLength(0);
  });

  it('should respect page and limit query params', async () => {
    await createTournament({ name: 'Cup 1' });
    await createTournament({ name: 'Cup 2' });
    await createTournament({ name: 'Cup 3' });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/tournaments?page=1&limit=2',
      headers: { 'x-user-id': OWNER_ID },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toHaveLength(2);
    expect(body.pagination).toMatchObject({ page: 1, limit: 2, total: 3, totalPages: 2 });
  });

  it('should return 400 for limit exceeding 100', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/tournaments?limit=200',
      headers: { 'x-user-id': OWNER_ID },
    });

    expect(response.statusCode).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/tournaments/:id
// ---------------------------------------------------------------------------

describe('PATCH /api/v1/tournaments/:id', () => {
  it('should update name and return 200 with updated tournament', async () => {
    const created = await createTournament();

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${created.id}`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { name: 'Updated Cup' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data.tournament.name).toBe('Updated Cup');
    expect(body.data.tournament.id).toBe(created.id);
  });

  it('should update multiple fields in a single PATCH', async () => {
    const created = await createTournament();

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${created.id}`,
      headers: { 'x-user-id': OWNER_ID },
      payload: {
        name: 'Pro League Cup',
        description: 'A serious tournament',
        team_size: 2,
        number_of_teams: 4,
        substitutes_enabled: true,
        team_formation_mode: 'AUCTION',
      },
    });

    expect(response.statusCode).toBe(200);
    const t = response.json().data.tournament;
    expect(t.name).toBe('Pro League Cup');
    expect(t.description).toBe('A serious tournament');
    expect(t.team_size).toBe(2);
    expect(t.number_of_teams).toBe(4);
    expect(t.substitutes_enabled).toBe(true);
    expect(t.team_formation_mode).toBe('AUCTION');
  });

  it('should set description to null when provided as empty string', async () => {
    const created = await createTournament({ description: 'Some description' });

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${created.id}`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { description: '' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.tournament.description).toBeNull();
  });

  it('should not change unspecified fields', async () => {
    const created = await createTournament({ description: 'Keep me' });

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${created.id}`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { name: 'New Name Only' },
    });

    expect(response.statusCode).toBe(200);
    const t = response.json().data.tournament;
    expect(t.name).toBe('New Name Only');
    expect(t.description).toBe('Keep me');
    expect(t.team_size).toBe(4);
  });

  it('should return 401 when x-user-id header is missing', async () => {
    const created = await createTournament();

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${created.id}`,
      payload: { name: 'Unauthorized' },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('UNAUTHORIZED');
  });

  it('should return 403 when caller is not the tournament owner', async () => {
    const created = await createTournament();

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${created.id}`,
      headers: { 'x-user-id': OTHER_USER_ID },
      payload: { name: 'Forbidden Update' },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('FORBIDDEN');
  });

  it('should return 404 for a non-existent tournament', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${NON_EXISTENT_ID}`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { name: 'Ghost Tournament' },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('TOURNAMENT_NOT_FOUND');
  });

  it('should return 400 for unknown body fields', async () => {
    const created = await createTournament();

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${created.id}`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { name: 'Valid', status: 'CANCELLED' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should return 400 for invalid registration date range', async () => {
    const created = await createTournament();

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${created.id}`,
      headers: { 'x-user-id': OWNER_ID },
      payload: {
        registration_start_at: '2026-12-01T00:00:00Z',
        registration_end_at: '2026-11-01T00:00:00Z',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('INVALID_REGISTRATION_DATES');
  });

  it('should lock structural fields once status moves past DRAFT', async () => {
    const created = await createTournament();

    // Manually advance the tournament status beyond DRAFT
    await pool.query(
      `UPDATE tournaments SET status = 'REGISTRATION_OPEN' WHERE id = $1`,
      [created.id],
    );

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${created.id}`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { team_size: 2 },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('CONFIGURATION_LOCKED');
  });

  it('should still allow name/description updates after DRAFT', async () => {
    const created = await createTournament();

    await pool.query(
      `UPDATE tournaments SET status = 'REGISTRATION_OPEN' WHERE id = $1`,
      [created.id],
    );

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${created.id}`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { name: 'Updated After Open', description: 'Still editable' },
    });

    expect(response.statusCode).toBe(200);
    const t = response.json().data.tournament;
    expect(t.name).toBe('Updated After Open');
  });

  it('should return 409 when tournament is COMPLETED', async () => {
    const created = await createTournament();

    await pool.query(
      `UPDATE tournaments SET status = 'COMPLETED' WHERE id = $1`,
      [created.id],
    );

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${created.id}`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { name: 'Cannot Update Completed' },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('TOURNAMENT_NOT_MODIFIABLE');
  });

  it('should return 409 when tournament is CANCELLED', async () => {
    const created = await createTournament();

    await pool.query(
      `UPDATE tournaments SET status = 'CANCELLED' WHERE id = $1`,
      [created.id],
    );

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${created.id}`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { name: 'Cannot Update Cancelled' },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('TOURNAMENT_NOT_MODIFIABLE');
  });
});
