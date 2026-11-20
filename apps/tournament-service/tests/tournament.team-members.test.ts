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
const USER_A   = '00000000-0000-0000-0000-000000000002';
const USER_B   = '00000000-0000-0000-0000-000000000003';
const USER_C   = '00000000-0000-0000-0000-000000000004';
const OTHER_ID = '00000000-0000-0000-0000-000000000005';
const NON_EXISTENT_ID = '00000000-0000-0000-0000-000000000099';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function createTournament(overrides: Record<string, unknown> = {}) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/tournaments',
    headers: { 'x-user-id': OWNER_ID },
    payload: {
      name: 'Members Cup',
      game: 'EFOOTBALL',
      format: 'KNOCKOUT',
      team_size: 2,
      number_of_teams: 4,
      ...overrides,
    },
  });
  expect(response.statusCode).toBe(201);
  return response.json().data.tournament;
}

async function setStatus(tournamentId: string, status: string) {
  await pool.query(`UPDATE tournaments SET status = $2 WHERE id = $1`, [tournamentId, status]);
}

async function addParticipant(tournamentId: string, userId: string): Promise<string> {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO tournament_participants (tournament_id, user_id)
     VALUES ($1, $2) RETURNING id`,
    [tournamentId, userId],
  );
  return result.rows[0]!.id;
}

async function createTeam(tournamentId: string, name: string): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: `/api/v1/tournaments/${tournamentId}/teams`,
    headers: { 'x-user-id': OWNER_ID },
    payload: { name },
  });
  expect(response.statusCode).toBe(201);
  return response.json().data.team.id;
}

async function addMember(
  tournamentId: string,
  teamId: string,
  participantId: string,
  memberRole: string = 'PLAYER',
  squadStatus: string = 'MAIN',
) {
  const response = await app.inject({
    method: 'POST',
    url: `/api/v1/tournaments/${tournamentId}/teams/${teamId}/members`,
    headers: { 'x-user-id': OWNER_ID },
    payload: { participant_id: participantId, member_role: memberRole, squad_status: squadStatus },
  });
  expect(response.statusCode).toBe(201);
  return response.json().data.member;
}

// ─── POST /api/v1/tournaments/:id/teams/:teamId/members ───────────────────────

describe('POST /:id/teams/:teamId/members', () => {
  it('should add a member and return 201', async () => {
    const t = await createTournament();
    await setStatus(t.id, 'REGISTRATION_CLOSED');
    const participantId = await addParticipant(t.id, USER_A);
    const teamId = await createTeam(t.id, 'Team Alpha');

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${t.id}/teams/${teamId}/members`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { participant_id: participantId, member_role: 'PLAYER', squad_status: 'MAIN' },
    });

    expect(response.statusCode).toBe(201);
    const { member } = response.json().data;
    expect(member.team_id).toBe(teamId);
    expect(member.participant_id).toBe(participantId);
    expect(member.member_role).toBe('PLAYER');
    expect(member.squad_status).toBe('MAIN');
    expect(member.id).toBeDefined();
  });

  it('should return 404 when tournament does not exist', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${NON_EXISTENT_ID}/teams/${NON_EXISTENT_ID}/members`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { participant_id: NON_EXISTENT_ID, member_role: 'PLAYER', squad_status: 'MAIN' },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('TOURNAMENT_NOT_FOUND');
  });

  it('should return 403 when caller is not the owner', async () => {
    const t = await createTournament();
    await setStatus(t.id, 'REGISTRATION_CLOSED');
    const participantId = await addParticipant(t.id, USER_A);
    const teamId = await createTeam(t.id, 'Team Alpha');

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${t.id}/teams/${teamId}/members`,
      headers: { 'x-user-id': OTHER_ID },
      payload: { participant_id: participantId, member_role: 'PLAYER', squad_status: 'MAIN' },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('FORBIDDEN');
  });

  it('should return 409 when tournament is not in a team-formation status', async () => {
    const t = await createTournament();
    // Status is DRAFT
    const participantId = await addParticipant(t.id, USER_A);
    const teamId = await pool
      .query<{ id: string }>(`INSERT INTO teams (tournament_id, name) VALUES ($1, $2) RETURNING id`, [t.id, 'Team Alpha'])
      .then(r => r.rows[0]!.id);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${t.id}/teams/${teamId}/members`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { participant_id: participantId, member_role: 'PLAYER', squad_status: 'MAIN' },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('INVALID_TOURNAMENT_STATUS');
  });

  it('should return 404 when team belongs to a different tournament', async () => {
    const t1 = await createTournament();
    const t2 = await createTournament({ name: 'Other Cup' });
    await setStatus(t1.id, 'REGISTRATION_CLOSED');
    await setStatus(t2.id, 'REGISTRATION_CLOSED');
    const participantId = await addParticipant(t1.id, USER_A);
    const teamInT2 = await createTeam(t2.id, 'Team Alpha');

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${t1.id}/teams/${teamInT2}/members`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { participant_id: participantId, member_role: 'PLAYER', squad_status: 'MAIN' },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('TEAM_NOT_FOUND');
  });

  it('should return 404 when participant is not approved in this tournament', async () => {
    const t = await createTournament();
    await setStatus(t.id, 'REGISTRATION_CLOSED');
    const teamId = await createTeam(t.id, 'Team Alpha');

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${t.id}/teams/${teamId}/members`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { participant_id: NON_EXISTENT_ID, member_role: 'PLAYER', squad_status: 'MAIN' },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('PARTICIPANT_NOT_FOUND');
  });

  it('should return 404 when participant belongs to a different tournament', async () => {
    const t1 = await createTournament();
    const t2 = await createTournament({ name: 'Other Cup' });
    await setStatus(t1.id, 'REGISTRATION_CLOSED');
    await setStatus(t2.id, 'REGISTRATION_CLOSED');
    const participantInT2 = await addParticipant(t2.id, USER_A);
    const teamId = await createTeam(t1.id, 'Team Alpha');

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${t1.id}/teams/${teamId}/members`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { participant_id: participantInT2, member_role: 'PLAYER', squad_status: 'MAIN' },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('PARTICIPANT_NOT_FOUND');
  });

  it('should return 409 when team is full', async () => {
    // team_size=2, substitutes_enabled=false → capacity = 2
    const t = await createTournament({ substitutes_enabled: false });
    await setStatus(t.id, 'REGISTRATION_CLOSED');
    const pA = await addParticipant(t.id, USER_A);
    const pB = await addParticipant(t.id, USER_B);
    const pC = await addParticipant(t.id, USER_C);
    const teamId = await createTeam(t.id, 'Team Alpha');
    await addMember(t.id, teamId, pA);
    await addMember(t.id, teamId, pB);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${t.id}/teams/${teamId}/members`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { participant_id: pC, member_role: 'PLAYER', squad_status: 'MAIN' },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('TEAM_FULL');
  });

  it('should return 409 when participant is already in a team', async () => {
    const t = await createTournament();
    await setStatus(t.id, 'REGISTRATION_CLOSED');
    const pA = await addParticipant(t.id, USER_A);
    const teamA = await createTeam(t.id, 'Team Alpha');
    const teamB = await createTeam(t.id, 'Team Beta');
    await addMember(t.id, teamA, pA);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${t.id}/teams/${teamB}/members`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { participant_id: pA, member_role: 'PLAYER', squad_status: 'MAIN' },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('ALREADY_IN_TEAM');
  });

  it('should return 409 when team already has a captain', async () => {
    const t = await createTournament();
    await setStatus(t.id, 'REGISTRATION_CLOSED');
    const pA = await addParticipant(t.id, USER_A);
    const pB = await addParticipant(t.id, USER_B);
    const teamId = await createTeam(t.id, 'Team Alpha');
    await addMember(t.id, teamId, pA, 'CAPTAIN', 'MAIN');

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${t.id}/teams/${teamId}/members`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { participant_id: pB, member_role: 'CAPTAIN', squad_status: 'MAIN' },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('CAPTAIN_ALREADY_ASSIGNED');
  });

  it('should return 409 when team already has a substitute', async () => {
    // substitutes_enabled: true → capacity = team_size(2) + 1 = 3
    // so the third add reaches the DB, not the capacity guard
    const t = await createTournament({ substitutes_enabled: true });
    await setStatus(t.id, 'REGISTRATION_CLOSED');
    const pA = await addParticipant(t.id, USER_A);
    const pB = await addParticipant(t.id, USER_B);
    const pC = await addParticipant(t.id, USER_C);
    const teamId = await createTeam(t.id, 'Team Alpha');
    await addMember(t.id, teamId, pA, 'PLAYER', 'MAIN');
    await addMember(t.id, teamId, pB, 'PLAYER', 'SUBSTITUTE');

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${t.id}/teams/${teamId}/members`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { participant_id: pC, member_role: 'PLAYER', squad_status: 'SUBSTITUTE' },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('SUBSTITUTE_ALREADY_ASSIGNED');
  });

  it('should return 409 when captain is assigned as substitute', async () => {
    const t = await createTournament();
    await setStatus(t.id, 'REGISTRATION_CLOSED');
    const pA = await addParticipant(t.id, USER_A);
    const teamId = await createTeam(t.id, 'Team Alpha');

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${t.id}/teams/${teamId}/members`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { participant_id: pA, member_role: 'CAPTAIN', squad_status: 'SUBSTITUTE' },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('CAPTAIN_CANNOT_BE_SUBSTITUTE');
  });
});

// ─── GET /api/v1/tournaments/:id/teams/:teamId/members ────────────────────────

describe('GET /:id/teams/:teamId/members', () => {
  it('should return an empty array when no members exist', async () => {
    const t = await createTournament();
    await setStatus(t.id, 'REGISTRATION_CLOSED');
    const teamId = await createTeam(t.id, 'Team Alpha');

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/tournaments/${t.id}/teams/${teamId}/members`,
      headers: { 'x-user-id': OWNER_ID },
    });

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.json().data)).toBe(true);
    expect(response.json().data).toHaveLength(0);
  });

  it('should return all members for the team', async () => {
    const t = await createTournament();
    await setStatus(t.id, 'REGISTRATION_CLOSED');
    const pA = await addParticipant(t.id, USER_A);
    const pB = await addParticipant(t.id, USER_B);
    const teamId = await createTeam(t.id, 'Team Alpha');
    await addMember(t.id, teamId, pA, 'CAPTAIN', 'MAIN');
    await addMember(t.id, teamId, pB, 'PLAYER', 'SUBSTITUTE');

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/tournaments/${t.id}/teams/${teamId}/members`,
      headers: { 'x-user-id': OWNER_ID },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toHaveLength(2);
  });

  it('should return 404 when tournament does not exist', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/tournaments/${NON_EXISTENT_ID}/teams/${NON_EXISTENT_ID}/members`,
      headers: { 'x-user-id': OWNER_ID },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('TOURNAMENT_NOT_FOUND');
  });
});

// ─── PATCH /api/v1/tournaments/:id/teams/:teamId/members/:memberId ────────────

describe('PATCH /:id/teams/:teamId/members/:memberId', () => {
  it('should update member role and return the updated member', async () => {
    const t = await createTournament();
    await setStatus(t.id, 'REGISTRATION_CLOSED');
    const pA = await addParticipant(t.id, USER_A);
    const teamId = await createTeam(t.id, 'Team Alpha');
    const member = await addMember(t.id, teamId, pA, 'PLAYER', 'MAIN');

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${t.id}/teams/${teamId}/members/${member.id}`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { member_role: 'CAPTAIN' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.member.member_role).toBe('CAPTAIN');
    expect(response.json().data.member.squad_status).toBe('MAIN');
  });

  it('should return 403 when caller is not the owner', async () => {
    const t = await createTournament();
    await setStatus(t.id, 'REGISTRATION_CLOSED');
    const pA = await addParticipant(t.id, USER_A);
    const teamId = await createTeam(t.id, 'Team Alpha');
    const member = await addMember(t.id, teamId, pA);

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${t.id}/teams/${teamId}/members/${member.id}`,
      headers: { 'x-user-id': OTHER_ID },
      payload: { member_role: 'CAPTAIN' },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('FORBIDDEN');
  });

  it('should return 404 when member does not exist', async () => {
    const t = await createTournament();
    await setStatus(t.id, 'REGISTRATION_CLOSED');
    const teamId = await createTeam(t.id, 'Team Alpha');

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${t.id}/teams/${teamId}/members/${NON_EXISTENT_ID}`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { member_role: 'CAPTAIN' },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('TEAM_MEMBER_NOT_FOUND');
  });

  it('should return 409 when promoting a second captain', async () => {
    const t = await createTournament();
    await setStatus(t.id, 'REGISTRATION_CLOSED');
    const pA = await addParticipant(t.id, USER_A);
    const pB = await addParticipant(t.id, USER_B);
    const teamId = await createTeam(t.id, 'Team Alpha');
    await addMember(t.id, teamId, pA, 'CAPTAIN', 'MAIN');
    const memberB = await addMember(t.id, teamId, pB, 'PLAYER', 'MAIN');

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${t.id}/teams/${teamId}/members/${memberB.id}`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { member_role: 'CAPTAIN' },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('CAPTAIN_ALREADY_ASSIGNED');
  });
});

// ─── DELETE /api/v1/tournaments/:id/teams/:teamId/members/:memberId ───────────

describe('DELETE /:id/teams/:teamId/members/:memberId', () => {
  it('should remove a member and return 204', async () => {
    const t = await createTournament();
    await setStatus(t.id, 'REGISTRATION_CLOSED');
    const pA = await addParticipant(t.id, USER_A);
    const teamId = await createTeam(t.id, 'Team Alpha');
    const member = await addMember(t.id, teamId, pA);

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/tournaments/${t.id}/teams/${teamId}/members/${member.id}`,
      headers: { 'x-user-id': OWNER_ID },
    });

    expect(response.statusCode).toBe(204);

    // Verify participant can be re-added after removal (uniqueness released)
    const listResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/tournaments/${t.id}/teams/${teamId}/members`,
      headers: { 'x-user-id': OWNER_ID },
    });
    expect(listResponse.json().data).toHaveLength(0);
  });

  it('should return 403 when caller is not the owner', async () => {
    const t = await createTournament();
    await setStatus(t.id, 'REGISTRATION_CLOSED');
    const pA = await addParticipant(t.id, USER_A);
    const teamId = await createTeam(t.id, 'Team Alpha');
    const member = await addMember(t.id, teamId, pA);

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/tournaments/${t.id}/teams/${teamId}/members/${member.id}`,
      headers: { 'x-user-id': OTHER_ID },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('FORBIDDEN');
  });

  it('should return 404 when member does not exist', async () => {
    const t = await createTournament();
    await setStatus(t.id, 'REGISTRATION_CLOSED');
    const teamId = await createTeam(t.id, 'Team Alpha');

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/tournaments/${t.id}/teams/${teamId}/members/${NON_EXISTENT_ID}`,
      headers: { 'x-user-id': OWNER_ID },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('TEAM_MEMBER_NOT_FOUND');
  });
});
