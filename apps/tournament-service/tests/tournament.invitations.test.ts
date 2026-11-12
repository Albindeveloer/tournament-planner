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
const INVITEE_ID = '00000000-0000-0000-0000-000000000002';
const OTHER_USER_ID = '00000000-0000-0000-0000-000000000003';
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
  await pool.query(
    `INSERT INTO tournament_participants (tournament_id, user_id) VALUES ($1, $2)`,
    [tournamentId, userId],
  );
}

async function createInvitation(tournamentId: string, inviteeId: string = INVITEE_ID) {
  const response = await app.inject({
    method: 'POST',
    url: `/api/v1/tournaments/${tournamentId}/invitations`,
    headers: { 'x-user-id': OWNER_ID },
    payload: { invitee_id: inviteeId },
  });
  expect(response.statusCode).toBe(201);
  return response.json().data.invitation;
}

// ─── POST /api/v1/tournaments/:id/invitations ─────────────────────────────────

describe('POST /api/v1/tournaments/:id/invitations', () => {
  it('should create an invitation and return 201', async () => {
    const tournament = await createTournament();
    await openRegistration(tournament.id);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${tournament.id}/invitations`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { invitee_id: INVITEE_ID },
    });

    expect(response.statusCode).toBe(201);
    const { invitation } = response.json().data;
    expect(invitation.tournament_id).toBe(tournament.id);
    expect(invitation.invitee_id).toBe(INVITEE_ID);
    expect(invitation.status).toBe('PENDING');
  });

  it('should return 403 when caller is not the tournament owner', async () => {
    const tournament = await createTournament();
    await openRegistration(tournament.id);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${tournament.id}/invitations`,
      headers: { 'x-user-id': OTHER_USER_ID },
      payload: { invitee_id: INVITEE_ID },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('FORBIDDEN');
  });

  it('should return 404 when tournament does not exist', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${NON_EXISTENT_ID}/invitations`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { invitee_id: INVITEE_ID },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('TOURNAMENT_NOT_FOUND');
  });

  it('should return 409 when registration is not open', async () => {
    const tournament = await createTournament();

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${tournament.id}/invitations`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { invitee_id: INVITEE_ID },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('REGISTRATION_NOT_OPEN');
  });

  it('should return 409 when owner tries to invite themselves', async () => {
    const tournament = await createTournament();
    await openRegistration(tournament.id);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${tournament.id}/invitations`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { invitee_id: OWNER_ID },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('CANNOT_INVITE_SELF');
  });

  it('should return 409 when invitee is already an approved participant', async () => {
    const tournament = await createTournament();
    await openRegistration(tournament.id);
    await insertParticipant(tournament.id, INVITEE_ID);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${tournament.id}/invitations`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { invitee_id: INVITEE_ID },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('ALREADY_A_PARTICIPANT');
  });

  it('should return 409 when a pending invitation already exists', async () => {
    const tournament = await createTournament();
    await openRegistration(tournament.id);
    await createInvitation(tournament.id);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${tournament.id}/invitations`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { invitee_id: INVITEE_ID },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('PENDING_INVITATION_EXISTS');
  });
});

// ─── GET /api/v1/tournaments/:id/invitations ──────────────────────────────────

describe('GET /api/v1/tournaments/:id/invitations', () => {
  it('should return an empty array when no invitations exist', async () => {
    const tournament = await createTournament();

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/tournaments/${tournament.id}/invitations`,
      headers: { 'x-user-id': OWNER_ID },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual([]);
  });

  it('should return all invitations for the tournament', async () => {
    const tournament = await createTournament();
    await openRegistration(tournament.id);
    await createInvitation(tournament.id, INVITEE_ID);
    await createInvitation(tournament.id, OTHER_USER_ID);

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/tournaments/${tournament.id}/invitations`,
      headers: { 'x-user-id': OWNER_ID },
    });

    expect(response.statusCode).toBe(200);
    const data = response.json().data;
    expect(data).toHaveLength(2);
    expect(data.every((i: { status: string }) => i.status === 'PENDING')).toBe(true);
  });

  it('should return 403 when caller is not the owner', async () => {
    const tournament = await createTournament();

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/tournaments/${tournament.id}/invitations`,
      headers: { 'x-user-id': OTHER_USER_ID },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('FORBIDDEN');
  });

  it('should return 404 when tournament does not exist', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/tournaments/${NON_EXISTENT_ID}/invitations`,
      headers: { 'x-user-id': OWNER_ID },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('TOURNAMENT_NOT_FOUND');
  });
});

// ─── PATCH /api/v1/tournaments/:id/invitations/:invitationId ─────────────────

describe('PATCH /api/v1/tournaments/:id/invitations/:invitationId', () => {
  it('should allow invitee to accept and create a participant', async () => {
    const tournament = await createTournament();
    await openRegistration(tournament.id);
    const invitation = await createInvitation(tournament.id);

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${tournament.id}/invitations/${invitation.id}`,
      headers: { 'x-user-id': INVITEE_ID },
      payload: { status: 'ACCEPTED' },
    });

    expect(response.statusCode).toBe(200);
    const updated = response.json().data.invitation;
    expect(updated.status).toBe('ACCEPTED');

    const participants = await pool.query(
      `SELECT * FROM tournament_participants WHERE tournament_id = $1 AND user_id = $2`,
      [tournament.id, INVITEE_ID],
    );
    expect(participants.rows).toHaveLength(1);
    expect(participants.rows[0].status).toBe('APPROVED');
  });

  it('should allow invitee to reject the invitation', async () => {
    const tournament = await createTournament();
    await openRegistration(tournament.id);
    const invitation = await createInvitation(tournament.id);

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${tournament.id}/invitations/${invitation.id}`,
      headers: { 'x-user-id': INVITEE_ID },
      payload: { status: 'REJECTED' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.invitation.status).toBe('REJECTED');
  });

  it('should allow owner to cancel the invitation', async () => {
    const tournament = await createTournament();
    await openRegistration(tournament.id);
    const invitation = await createInvitation(tournament.id);

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${tournament.id}/invitations/${invitation.id}`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { status: 'CANCELLED' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.invitation.status).toBe('CANCELLED');
  });

  it('should return 404 when invitation does not exist', async () => {
    const tournament = await createTournament();

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${tournament.id}/invitations/${NON_EXISTENT_ID}`,
      headers: { 'x-user-id': INVITEE_ID },
      payload: { status: 'ACCEPTED' },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('INVITATION_NOT_FOUND');
  });

  it('should return 409 when invitation is not pending', async () => {
    const tournament = await createTournament();
    await openRegistration(tournament.id);
    const invitation = await createInvitation(tournament.id);

    await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${tournament.id}/invitations/${invitation.id}`,
      headers: { 'x-user-id': INVITEE_ID },
      payload: { status: 'REJECTED' },
    });

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${tournament.id}/invitations/${invitation.id}`,
      headers: { 'x-user-id': INVITEE_ID },
      payload: { status: 'ACCEPTED' },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('INVITATION_NOT_PENDING');
  });

  it('should return 403 when non-invitee tries to accept', async () => {
    const tournament = await createTournament();
    await openRegistration(tournament.id);
    const invitation = await createInvitation(tournament.id);

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${tournament.id}/invitations/${invitation.id}`,
      headers: { 'x-user-id': OTHER_USER_ID },
      payload: { status: 'ACCEPTED' },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('FORBIDDEN');
  });

  it('should return 403 when owner tries to accept (only invitee can accept)', async () => {
    const tournament = await createTournament();
    await openRegistration(tournament.id);
    const invitation = await createInvitation(tournament.id);

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${tournament.id}/invitations/${invitation.id}`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { status: 'ACCEPTED' },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('FORBIDDEN');
  });

  it('should return 403 when invitee tries to cancel (only owner can cancel)', async () => {
    const tournament = await createTournament();
    await openRegistration(tournament.id);
    const invitation = await createInvitation(tournament.id);

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${tournament.id}/invitations/${invitation.id}`,
      headers: { 'x-user-id': INVITEE_ID },
      payload: { status: 'CANCELLED' },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('FORBIDDEN');
  });

  it('should return 409 when accepting but tournament is full', async () => {
    const tournament = await createTournament({
      team_size: 1,
      number_of_teams: 2,
      substitutes_enabled: false,
    });
    await openRegistration(tournament.id);
    await insertParticipant(tournament.id, OTHER_USER_ID);
    await insertParticipant(tournament.id, '00000000-0000-0000-0000-000000000005');

    const invitation = await createInvitation(tournament.id);

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${tournament.id}/invitations/${invitation.id}`,
      headers: { 'x-user-id': INVITEE_ID },
      payload: { status: 'ACCEPTED' },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('TOURNAMENT_FULL');
  });

  it('should allow re-invite after a cancelled invitation', async () => {
    const tournament = await createTournament();
    await openRegistration(tournament.id);
    const invitation = await createInvitation(tournament.id);

    await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${tournament.id}/invitations/${invitation.id}`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { status: 'CANCELLED' },
    });

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${tournament.id}/invitations`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { invitee_id: INVITEE_ID },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().data.invitation.status).toBe('PENDING');
  });
});
