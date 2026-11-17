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

const OWNER_ID  = '00000000-0000-0000-0000-000000000001';
const PLAYER_ID = '00000000-0000-0000-0000-000000000002';
const OTHER_ID  = '00000000-0000-0000-0000-000000000003';
const NON_EXISTENT_TOURNAMENT_ID = '00000000-0000-0000-0000-000000000099';

const validBody = {
  name: 'Captain Cup',
  game: 'EFOOTBALL',
  format: 'KNOCKOUT',
  team_size: 2,
  number_of_teams: 4,
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

async function openRegistration(tournamentId: string) {
  await pool.query(`UPDATE tournaments SET status = 'REGISTRATION_OPEN' WHERE id = $1`, [tournamentId]);
}

async function insertApprovedParticipant(tournamentId: string, userId: string): Promise<string> {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO tournament_participants (tournament_id, user_id) VALUES ($1, $2) RETURNING id`,
    [tournamentId, userId],
  );
  return result.rows[0]!.id;
}

async function submitCaptainRequest(tournamentId: string, userId: string = PLAYER_ID) {
  const response = await app.inject({
    method: 'POST',
    url: `/api/v1/tournaments/${tournamentId}/captain-requests`,
    headers: { 'x-user-id': userId },
  });
  expect(response.statusCode).toBe(201);
  return response.json().data.captain_request;
}

// ─── POST /api/v1/tournaments/:id/captain-requests ───────────────────────────

describe('POST /api/v1/tournaments/:id/captain-requests', () => {
  it('should create a captain request and return 201', async () => {
    const tournament = await createTournament();
    await openRegistration(tournament.id);
    await insertApprovedParticipant(tournament.id, PLAYER_ID);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${tournament.id}/captain-requests`,
      headers: { 'x-user-id': PLAYER_ID },
    });

    expect(response.statusCode).toBe(201);
    const { captain_request } = response.json().data;
    expect(captain_request.tournament_id).toBe(tournament.id);
    expect(captain_request.status).toBe('PENDING');
    expect(captain_request.participant_id).toBeDefined();
  });

  it('should return 404 when tournament does not exist', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${NON_EXISTENT_TOURNAMENT_ID}/captain-requests`,
      headers: { 'x-user-id': PLAYER_ID },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('TOURNAMENT_NOT_FOUND');
  });

  it('should return 409 when registration is not open', async () => {
    const tournament = await createTournament();
    // Status is DRAFT — registration not open
    await insertApprovedParticipant(tournament.id, PLAYER_ID);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${tournament.id}/captain-requests`,
      headers: { 'x-user-id': PLAYER_ID },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('REGISTRATION_NOT_OPEN');
  });

  it('should return 403 when caller is not an approved participant', async () => {
    const tournament = await createTournament();
    await openRegistration(tournament.id);
    // PLAYER_ID has no participant record

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${tournament.id}/captain-requests`,
      headers: { 'x-user-id': PLAYER_ID },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('NOT_A_PARTICIPANT');
  });

  it('should return 409 when a captain request already exists for this participant', async () => {
    const tournament = await createTournament();
    await openRegistration(tournament.id);
    await insertApprovedParticipant(tournament.id, PLAYER_ID);
    await submitCaptainRequest(tournament.id, PLAYER_ID);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${tournament.id}/captain-requests`,
      headers: { 'x-user-id': PLAYER_ID },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('CAPTAIN_REQUEST_ALREADY_EXISTS');
  });
});

// ─── GET /api/v1/tournaments/:id/captain-requests ────────────────────────────

describe('GET /api/v1/tournaments/:id/captain-requests', () => {
  it('should return captain requests for the owner', async () => {
    const tournament = await createTournament();
    await openRegistration(tournament.id);
    await insertApprovedParticipant(tournament.id, PLAYER_ID);
    await submitCaptainRequest(tournament.id, PLAYER_ID);

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/tournaments/${tournament.id}/captain-requests`,
      headers: { 'x-user-id': OWNER_ID },
    });

    expect(response.statusCode).toBe(200);
    const list = response.json().data;
    expect(Array.isArray(list)).toBe(true);
    expect(list).toHaveLength(1);
    expect(list[0].status).toBe('PENDING');
  });

  it('should return an empty array when there are no captain requests', async () => {
    const tournament = await createTournament();

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/tournaments/${tournament.id}/captain-requests`,
      headers: { 'x-user-id': OWNER_ID },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual([]);
  });

  it('should return 403 for non-owner', async () => {
    const tournament = await createTournament();

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/tournaments/${tournament.id}/captain-requests`,
      headers: { 'x-user-id': PLAYER_ID },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('FORBIDDEN');
  });
});

// ─── PATCH /api/v1/tournaments/:id/captain-requests/:captainRequestId ─────────

describe('PATCH /api/v1/tournaments/:id/captain-requests/:captainRequestId', () => {
  it('should allow the owner to reject a pending captain request', async () => {
    const tournament = await createTournament();
    await openRegistration(tournament.id);
    await insertApprovedParticipant(tournament.id, PLAYER_ID);
    const captainRequest = await submitCaptainRequest(tournament.id, PLAYER_ID);

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${tournament.id}/captain-requests/${captainRequest.id}`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { status: 'REJECTED' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.captain_request.status).toBe('REJECTED');
  });

  it('should allow the requesting participant to cancel their captain request', async () => {
    const tournament = await createTournament();
    await openRegistration(tournament.id);
    await insertApprovedParticipant(tournament.id, PLAYER_ID);
    const captainRequest = await submitCaptainRequest(tournament.id, PLAYER_ID);

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${tournament.id}/captain-requests/${captainRequest.id}`,
      headers: { 'x-user-id': PLAYER_ID },
      payload: { status: 'CANCELLED' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.captain_request.status).toBe('CANCELLED');
  });

  it('should return 403 when a non-owner tries to reject', async () => {
    const tournament = await createTournament();
    await openRegistration(tournament.id);
    await insertApprovedParticipant(tournament.id, PLAYER_ID);
    const captainRequest = await submitCaptainRequest(tournament.id, PLAYER_ID);

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${tournament.id}/captain-requests/${captainRequest.id}`,
      headers: { 'x-user-id': OTHER_ID },
      payload: { status: 'REJECTED' },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('FORBIDDEN');
  });

  it('should return 403 when a non-requester tries to cancel', async () => {
    const tournament = await createTournament();
    await openRegistration(tournament.id);
    await insertApprovedParticipant(tournament.id, PLAYER_ID);
    const captainRequest = await submitCaptainRequest(tournament.id, PLAYER_ID);

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${tournament.id}/captain-requests/${captainRequest.id}`,
      headers: { 'x-user-id': OTHER_ID },
      payload: { status: 'CANCELLED' },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('FORBIDDEN');
  });

  it('should return 409 when the captain request is not in PENDING status', async () => {
    const tournament = await createTournament();
    await openRegistration(tournament.id);
    await insertApprovedParticipant(tournament.id, PLAYER_ID);
    const captainRequest = await submitCaptainRequest(tournament.id, PLAYER_ID);

    // Owner rejects it first
    await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${tournament.id}/captain-requests/${captainRequest.id}`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { status: 'REJECTED' },
    });

    // Attempting to cancel an already-rejected request
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${tournament.id}/captain-requests/${captainRequest.id}`,
      headers: { 'x-user-id': PLAYER_ID },
      payload: { status: 'CANCELLED' },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('CAPTAIN_REQUEST_NOT_PENDING');
  });

  it('should return 404 when the captain request does not exist', async () => {
    const tournament = await createTournament();

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${tournament.id}/captain-requests/${NON_EXISTENT_TOURNAMENT_ID}`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { status: 'REJECTED' },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('CAPTAIN_REQUEST_NOT_FOUND');
  });

  it('should block re-submission after cancellation due to full UNIQUE constraint', async () => {
    const tournament = await createTournament();
    await openRegistration(tournament.id);
    await insertApprovedParticipant(tournament.id, PLAYER_ID);
    const captainRequest = await submitCaptainRequest(tournament.id, PLAYER_ID);

    // Cancel the request
    await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${tournament.id}/captain-requests/${captainRequest.id}`,
      headers: { 'x-user-id': PLAYER_ID },
      payload: { status: 'CANCELLED' },
    });

    // Try to re-submit — blocked by CAPTAIN_REQUEST_ALREADY_EXISTS (full UNIQUE, not partial)
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${tournament.id}/captain-requests`,
      headers: { 'x-user-id': PLAYER_ID },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('CAPTAIN_REQUEST_ALREADY_EXISTS');
  });
});
