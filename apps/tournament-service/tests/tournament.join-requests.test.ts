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
const PLAYER_ID = '00000000-0000-0000-0000-000000000002';
const OTHER_ID  = '00000000-0000-0000-0000-000000000003';
const NON_EXISTENT_ID = '00000000-0000-0000-0000-000000000099';

const validBody = {
  name: 'Weekend Cup',
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

async function insertApprovedParticipant(tournamentId: string, userId: string) {
  await pool.query(
    `INSERT INTO tournament_participants (tournament_id, user_id) VALUES ($1, $2)`,
    [tournamentId, userId],
  );
}

async function submitJoinRequest(tournamentId: string, userId: string = PLAYER_ID) {
  const response = await app.inject({
    method: 'POST',
    url: `/api/v1/tournaments/${tournamentId}/join-requests`,
    headers: { 'x-user-id': userId },
  });
  expect(response.statusCode).toBe(201);
  return response.json().data.join_request;
}

// ─── POST /api/v1/tournaments/:id/join-requests ───────────────────────────────

describe('POST /api/v1/tournaments/:id/join-requests', () => {
  it('should create a join request and return 201', async () => {
    const tournament = await createTournament();
    await openRegistration(tournament.id);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${tournament.id}/join-requests`,
      headers: { 'x-user-id': PLAYER_ID },
    });

    expect(response.statusCode).toBe(201);
    const { join_request } = response.json().data;
    expect(join_request.tournament_id).toBe(tournament.id);
    expect(join_request.user_id).toBe(PLAYER_ID);
    expect(join_request.status).toBe('PENDING');
  });

  it('should return 404 for non-existent tournament', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${NON_EXISTENT_ID}/join-requests`,
      headers: { 'x-user-id': PLAYER_ID },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('TOURNAMENT_NOT_FOUND');
  });

  it('should return 409 when registration is not open', async () => {
    const tournament = await createTournament();

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${tournament.id}/join-requests`,
      headers: { 'x-user-id': PLAYER_ID },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('REGISTRATION_NOT_OPEN');
  });

  it('should return 409 when owner tries to join their own tournament', async () => {
    const tournament = await createTournament();
    await openRegistration(tournament.id);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${tournament.id}/join-requests`,
      headers: { 'x-user-id': OWNER_ID },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('CANNOT_JOIN_OWN_TOURNAMENT');
  });

  it('should return 409 when user is already an approved participant', async () => {
    const tournament = await createTournament();
    await openRegistration(tournament.id);
    await insertApprovedParticipant(tournament.id, PLAYER_ID);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${tournament.id}/join-requests`,
      headers: { 'x-user-id': PLAYER_ID },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('ALREADY_A_PARTICIPANT');
  });

  it('should return 409 when a pending join request already exists', async () => {
    const tournament = await createTournament();
    await openRegistration(tournament.id);
    await submitJoinRequest(tournament.id, PLAYER_ID);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${tournament.id}/join-requests`,
      headers: { 'x-user-id': PLAYER_ID },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('PENDING_JOIN_REQUEST_EXISTS');
  });
});

// ─── GET /api/v1/tournaments/:id/join-requests ────────────────────────────────

describe('GET /api/v1/tournaments/:id/join-requests', () => {
  it('should return join requests for the owner', async () => {
    const tournament = await createTournament();
    await openRegistration(tournament.id);
    await submitJoinRequest(tournament.id, PLAYER_ID);
    await submitJoinRequest(tournament.id, OTHER_ID);

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/tournaments/${tournament.id}/join-requests`,
      headers: { 'x-user-id': OWNER_ID },
    });

    expect(response.statusCode).toBe(200);
    const list = response.json().data;
    expect(list).toHaveLength(2);
    expect(list[0].status).toBe('PENDING');
  });

  it('should return 403 for non-owner', async () => {
    const tournament = await createTournament();

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/tournaments/${tournament.id}/join-requests`,
      headers: { 'x-user-id': PLAYER_ID },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('FORBIDDEN');
  });

  it('should return 404 for non-existent tournament', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/tournaments/${NON_EXISTENT_ID}/join-requests`,
      headers: { 'x-user-id': OWNER_ID },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('TOURNAMENT_NOT_FOUND');
  });
});

// ─── PATCH /api/v1/tournaments/:id/join-requests/:joinRequestId ──────────────

describe('PATCH /api/v1/tournaments/:id/join-requests/:joinRequestId — approve', () => {
  it('should approve a join request and create an approved participant', async () => {
    const tournament = await createTournament();
    await openRegistration(tournament.id);
    const joinRequest = await submitJoinRequest(tournament.id, PLAYER_ID);

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${tournament.id}/join-requests/${joinRequest.id}`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { status: 'APPROVED' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.join_request.status).toBe('APPROVED');

    const participantResult = await pool.query(
      `SELECT * FROM tournament_participants WHERE tournament_id = $1 AND user_id = $2`,
      [tournament.id, PLAYER_ID],
    );
    expect(participantResult.rows).toHaveLength(1);
    expect(participantResult.rows[0].status).toBe('APPROVED');
  });

  it('should return 403 when non-owner tries to approve', async () => {
    const tournament = await createTournament();
    await openRegistration(tournament.id);
    const joinRequest = await submitJoinRequest(tournament.id, PLAYER_ID);

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${tournament.id}/join-requests/${joinRequest.id}`,
      headers: { 'x-user-id': OTHER_ID },
      payload: { status: 'APPROVED' },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('FORBIDDEN');
  });

  it('should return 409 when tournament is full at approval time', async () => {
    // number_of_teams=2, team_size=1 → capacity=2
    const tournament = await createTournament({ number_of_teams: 2, team_size: 1 });
    await openRegistration(tournament.id);

    // Fill capacity
    await insertApprovedParticipant(tournament.id, OTHER_ID);
    await insertApprovedParticipant(tournament.id, '00000000-0000-0000-0000-000000000004');

    const joinRequest = await submitJoinRequest(tournament.id, PLAYER_ID);

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${tournament.id}/join-requests/${joinRequest.id}`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { status: 'APPROVED' },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('TOURNAMENT_FULL');
  });
});

describe('PATCH /api/v1/tournaments/:id/join-requests/:joinRequestId — reject', () => {
  it('should reject a join request', async () => {
    const tournament = await createTournament();
    await openRegistration(tournament.id);
    const joinRequest = await submitJoinRequest(tournament.id, PLAYER_ID);

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${tournament.id}/join-requests/${joinRequest.id}`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { status: 'REJECTED' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.join_request.status).toBe('REJECTED');
  });

  it('should return 403 when non-owner tries to reject', async () => {
    const tournament = await createTournament();
    await openRegistration(tournament.id);
    const joinRequest = await submitJoinRequest(tournament.id, PLAYER_ID);

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${tournament.id}/join-requests/${joinRequest.id}`,
      headers: { 'x-user-id': OTHER_ID },
      payload: { status: 'REJECTED' },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('FORBIDDEN');
  });
});

describe('PATCH /api/v1/tournaments/:id/join-requests/:joinRequestId — cancel', () => {
  it('should allow the requesting player to cancel their own join request', async () => {
    const tournament = await createTournament();
    await openRegistration(tournament.id);
    const joinRequest = await submitJoinRequest(tournament.id, PLAYER_ID);

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${tournament.id}/join-requests/${joinRequest.id}`,
      headers: { 'x-user-id': PLAYER_ID },
      payload: { status: 'CANCELLED' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.join_request.status).toBe('CANCELLED');
  });

  it('should return 403 when a different user tries to cancel', async () => {
    const tournament = await createTournament();
    await openRegistration(tournament.id);
    const joinRequest = await submitJoinRequest(tournament.id, PLAYER_ID);

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${tournament.id}/join-requests/${joinRequest.id}`,
      headers: { 'x-user-id': OTHER_ID },
      payload: { status: 'CANCELLED' },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('FORBIDDEN');
  });
});

describe('PATCH /api/v1/tournaments/:id/join-requests/:joinRequestId — shared guards', () => {
  it('should return 404 for non-existent tournament', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${NON_EXISTENT_ID}/join-requests/${NON_EXISTENT_ID}`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { status: 'APPROVED' },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('TOURNAMENT_NOT_FOUND');
  });

  it('should return 404 for non-existent join request', async () => {
    const tournament = await createTournament();

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${tournament.id}/join-requests/${NON_EXISTENT_ID}`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { status: 'APPROVED' },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('JOIN_REQUEST_NOT_FOUND');
  });

  it('should return 409 when join request is not in PENDING status', async () => {
    const tournament = await createTournament();
    await openRegistration(tournament.id);
    const joinRequest = await submitJoinRequest(tournament.id, PLAYER_ID);

    // Reject it first
    await pool.query(`UPDATE join_requests SET status = 'REJECTED' WHERE id = $1`, [joinRequest.id]);

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${tournament.id}/join-requests/${joinRequest.id}`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { status: 'APPROVED' },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('JOIN_REQUEST_NOT_PENDING');
  });
});
