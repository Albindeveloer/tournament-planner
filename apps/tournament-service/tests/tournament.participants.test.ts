import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { pool } from '../src/infrastructure/database/postgres.js';
import { participantService } from '../src/modules/participants/participant.service.js';

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
const USER_1_ID = '00000000-0000-0000-0000-000000000002';
const USER_2_ID = '00000000-0000-0000-0000-000000000003';
const USER_3_ID = '00000000-0000-0000-0000-000000000004';
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

async function insertParticipant(tournamentId: string, userId: string) {
  const result = await pool.query(
    `INSERT INTO tournament_participants (tournament_id, user_id) VALUES ($1, $2) RETURNING *`,
    [tournamentId, userId],
  );
  return result.rows[0];
}

// ─── GET participants ─────────────────────────────────────────────────────────

describe('GET /api/v1/tournaments/:id/participants', () => {
  it('should return an empty array when no participants exist', async () => {
    const tournament = await createTournament();

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/tournaments/${tournament.id}/participants`,
      headers: { 'x-user-id': OWNER_ID },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toEqual([]);
  });

  it('should return all participants for a tournament', async () => {
    const tournament = await createTournament();
    await insertParticipant(tournament.id, USER_1_ID);
    await insertParticipant(tournament.id, USER_2_ID);

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/tournaments/${tournament.id}/participants`,
      headers: { 'x-user-id': OWNER_ID },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toHaveLength(2);
    expect(body.data[0].user_id).toBe(USER_1_ID);
    expect(body.data[1].user_id).toBe(USER_2_ID);
    expect(body.data[0].status).toBe('APPROVED');
  });

  it('should return 404 for a non-existent tournament', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/tournaments/${NON_EXISTENT_ID}/participants`,
      headers: { 'x-user-id': OWNER_ID },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('TOURNAMENT_NOT_FOUND');
  });

  it('should return 401 when no auth header is provided', async () => {
    const tournament = await createTournament();

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/tournaments/${tournament.id}/participants`,
    });

    expect(response.statusCode).toBe(401);
  });
});

// ─── Withdraw participant ─────────────────────────────────────────────────────

describe('POST /api/v1/tournaments/:id/participants/:participantId/withdraw', () => {
  it('should allow the participant to withdraw themselves', async () => {
    const tournament = await createTournament();
    const participant = await insertParticipant(tournament.id, USER_1_ID);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${tournament.id}/participants/${participant.id}/withdraw`,
      headers: { 'x-user-id': USER_1_ID },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data.participant.status).toBe('WITHDRAWN');
    expect(body.data.participant.withdrawn_at).not.toBeNull();
  });

  it('should allow the tournament owner to withdraw a participant', async () => {
    const tournament = await createTournament();
    const participant = await insertParticipant(tournament.id, USER_1_ID);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${tournament.id}/participants/${participant.id}/withdraw`,
      headers: { 'x-user-id': OWNER_ID },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.participant.status).toBe('WITHDRAWN');
  });

  it('should return 403 when a third party tries to withdraw someone else', async () => {
    const tournament = await createTournament();
    const participant = await insertParticipant(tournament.id, USER_1_ID);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${tournament.id}/participants/${participant.id}/withdraw`,
      headers: { 'x-user-id': USER_2_ID },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('FORBIDDEN');
  });

  it('should return 409 when the participant has already withdrawn', async () => {
    const tournament = await createTournament();
    const participant = await insertParticipant(tournament.id, USER_1_ID);

    // First withdrawal succeeds
    await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${tournament.id}/participants/${participant.id}/withdraw`,
      headers: { 'x-user-id': USER_1_ID },
    });

    // Second withdrawal fails
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${tournament.id}/participants/${participant.id}/withdraw`,
      headers: { 'x-user-id': USER_1_ID },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('PARTICIPANT_ALREADY_WITHDRAWN');
  });

  it('should return 404 for a non-existent tournament', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${NON_EXISTENT_ID}/participants/${NON_EXISTENT_ID}/withdraw`,
      headers: { 'x-user-id': USER_1_ID },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('TOURNAMENT_NOT_FOUND');
  });

  it('should return 404 when participantId does not exist in this tournament', async () => {
    const tournament = await createTournament();

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${tournament.id}/participants/${NON_EXISTENT_ID}/withdraw`,
      headers: { 'x-user-id': OWNER_ID },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('PARTICIPANT_NOT_FOUND');
  });

  it('should return 409 when the tournament is COMPLETED', async () => {
    const tournament = await createTournament();
    const participant = await insertParticipant(tournament.id, USER_1_ID);
    await pool.query(`UPDATE tournaments SET status = 'COMPLETED' WHERE id = $1`, [tournament.id]);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${tournament.id}/participants/${participant.id}/withdraw`,
      headers: { 'x-user-id': USER_1_ID },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('TOURNAMENT_NOT_MODIFIABLE');
  });

  it('should return 409 when the tournament is CANCELLED', async () => {
    const tournament = await createTournament();
    const participant = await insertParticipant(tournament.id, USER_1_ID);
    await pool.query(`UPDATE tournaments SET status = 'CANCELLED' WHERE id = $1`, [tournament.id]);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${tournament.id}/participants/${participant.id}/withdraw`,
      headers: { 'x-user-id': USER_1_ID },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('TOURNAMENT_NOT_MODIFIABLE');
  });
});

// ─── approveParticipant service (no HTTP endpoint yet — tested directly) ──────

describe('participantService.approveParticipant', () => {
  it('should create an APPROVED participant', async () => {
    const tournament = await createTournament();
    await openRegistration(tournament.id);

    const participant = await participantService.approveParticipant(OWNER_ID, tournament.id, USER_1_ID);

    expect(participant.tournament_id).toBe(tournament.id);
    expect(participant.user_id).toBe(USER_1_ID);
    expect(participant.status).toBe('APPROVED');
    expect(participant.withdrawn_at).toBeNull();
  });

  it('should enforce capacity — rejects when tournament is full', async () => {
    // team_size=1, number_of_teams=2 → capacity = 2
    const tournament = await createTournament({ team_size: 1, number_of_teams: 2 });
    await openRegistration(tournament.id);

    await participantService.approveParticipant(OWNER_ID, tournament.id, USER_1_ID);
    await participantService.approveParticipant(OWNER_ID, tournament.id, USER_2_ID);

    await expect(
      participantService.approveParticipant(OWNER_ID, tournament.id, USER_3_ID),
    ).rejects.toMatchObject({ code: 'TOURNAMENT_FULL', statusCode: 409 });
  });

  it('should factor in substitutes when calculating capacity', async () => {
    // team_size=2, number_of_teams=2, substitutes_enabled → capacity = 2 * (2+1) = 6
    const tournament = await createTournament({
      team_size: 2,
      number_of_teams: 2,
      substitutes_enabled: true,
    });
    await openRegistration(tournament.id);

    // Fill the tournament to capacity (6 users)
    const userIds = [
      USER_1_ID,
      USER_2_ID,
      USER_3_ID,
      '00000000-0000-0000-0000-000000000005',
      '00000000-0000-0000-0000-000000000006',
      '00000000-0000-0000-0000-000000000007',
    ];
    for (const uid of userIds) {
      await participantService.approveParticipant(OWNER_ID, tournament.id, uid);
    }

    // 7th user exceeds capacity
    await expect(
      participantService.approveParticipant(OWNER_ID, tournament.id, '00000000-0000-0000-0000-000000000008'),
    ).rejects.toMatchObject({ code: 'TOURNAMENT_FULL' });
  });

  it('should return 409 ALREADY_A_PARTICIPANT for a duplicate approval', async () => {
    const tournament = await createTournament();
    await openRegistration(tournament.id);

    await participantService.approveParticipant(OWNER_ID, tournament.id, USER_1_ID);

    await expect(
      participantService.approveParticipant(OWNER_ID, tournament.id, USER_1_ID),
    ).rejects.toMatchObject({ code: 'ALREADY_A_PARTICIPANT', statusCode: 409 });
  });

  it('should return 409 REGISTRATION_NOT_OPEN when tournament is in DRAFT', async () => {
    const tournament = await createTournament(); // status = DRAFT

    await expect(
      participantService.approveParticipant(OWNER_ID, tournament.id, USER_1_ID),
    ).rejects.toMatchObject({ code: 'REGISTRATION_NOT_OPEN', statusCode: 409 });
  });

  it('should return 403 FORBIDDEN when caller is not the owner', async () => {
    const tournament = await createTournament();
    await openRegistration(tournament.id);

    await expect(
      participantService.approveParticipant(USER_1_ID, tournament.id, USER_2_ID),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', statusCode: 403 });
  });

  it('should return 404 for a non-existent tournament', async () => {
    await expect(
      participantService.approveParticipant(OWNER_ID, NON_EXISTENT_ID, USER_1_ID),
    ).rejects.toMatchObject({ code: 'TOURNAMENT_NOT_FOUND', statusCode: 404 });
  });
});
