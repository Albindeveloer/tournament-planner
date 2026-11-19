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
const USER_D   = '00000000-0000-0000-0000-000000000005';
const OTHER_ID = '00000000-0000-0000-0000-000000000006';
const NON_EXISTENT_ID = '00000000-0000-0000-0000-000000000099';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function createTournament(overrides: Record<string, unknown> = {}) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/tournaments',
    headers: { 'x-user-id': OWNER_ID },
    payload: {
      name: 'Finals Cup',
      game: 'EFOOTBALL',
      format: 'KNOCKOUT',
      team_size: 1,
      number_of_teams: 2,
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
    `INSERT INTO tournament_participants (tournament_id, user_id) VALUES ($1, $2) RETURNING id`,
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
  memberRole: string,
  squadStatus: string,
) {
  const response = await app.inject({
    method: 'POST',
    url: `/api/v1/tournaments/${tournamentId}/teams/${teamId}/members`,
    headers: { 'x-user-id': OWNER_ID },
    payload: { participant_id: participantId, member_role: memberRole, squad_status: squadStatus },
  });
  expect(response.statusCode).toBe(201);
}

async function finalize(tournamentId: string, callerId = OWNER_ID) {
  return app.inject({
    method: 'POST',
    url: `/api/v1/tournaments/${tournamentId}/finalize-teams`,
    headers: { 'x-user-id': callerId },
  });
}

// Build a fully-formed 1v1 tournament with 2 teams ready for finalization.
// team_size=1 → each team needs exactly 1 CAPTAIN/MAIN member.
async function buildReadyTournament(status: string = 'REGISTRATION_CLOSED') {
  const t = await createTournament({ team_size: 1, number_of_teams: 2 });
  await setStatus(t.id, status);
  const pA = await addParticipant(t.id, USER_A);
  const pB = await addParticipant(t.id, USER_B);
  const teamAlpha = await createTeam(t.id, 'Alpha');
  const teamBeta  = await createTeam(t.id, 'Beta');
  await addMember(t.id, teamAlpha, pA, 'CAPTAIN', 'MAIN');
  await addMember(t.id, teamBeta,  pB, 'CAPTAIN', 'MAIN');
  return t;
}

// ─── POST /api/v1/tournaments/:id/finalize-teams ──────────────────────────────

describe('POST /:id/finalize-teams', () => {
  it('should finalize from REGISTRATION_CLOSED — 200, tournament TEAMS_FINALIZED, teams READY', async () => {
    const t = await buildReadyTournament('REGISTRATION_CLOSED');

    const response = await finalize(t.id);

    expect(response.statusCode).toBe(200);
    const { tournament } = response.json().data;
    expect(tournament.status).toBe('TEAMS_FINALIZED');

    // Verify teams are READY in the database
    const { rows } = await pool.query<{ status: string }>(
      `SELECT status FROM teams WHERE tournament_id = $1`,
      [t.id],
    );
    expect(rows.every((r) => r.status === 'READY')).toBe(true);
  });

  it('should finalize from TEAM_FORMATION — 200, tournament TEAMS_FINALIZED', async () => {
    const t = await buildReadyTournament('TEAM_FORMATION');

    const response = await finalize(t.id);

    expect(response.statusCode).toBe(200);
    expect(response.json().data.tournament.status).toBe('TEAMS_FINALIZED');
  });

  it('should return 404 when tournament does not exist', async () => {
    const response = await finalize(NON_EXISTENT_ID);

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('TOURNAMENT_NOT_FOUND');
  });

  it('should return 403 when caller is not the owner', async () => {
    const t = await buildReadyTournament();

    const response = await finalize(t.id, OTHER_ID);

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('FORBIDDEN');
  });

  it('should return 409 INVALID_STATUS_TRANSITION when tournament is in DRAFT', async () => {
    const t = await createTournament();
    // Status is DRAFT — no teams created

    const response = await finalize(t.id);

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('should return 409 INVALID_STATUS_TRANSITION when already TEAMS_FINALIZED', async () => {
    const t = await buildReadyTournament();
    await finalize(t.id); // first finalization succeeds

    const response = await finalize(t.id);

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('should return 409 TEAMS_INCOMPLETE when fewer teams exist than number_of_teams', async () => {
    const t = await createTournament({ team_size: 1, number_of_teams: 2 });
    await setStatus(t.id, 'REGISTRATION_CLOSED');
    const pA = await addParticipant(t.id, USER_A);
    const teamAlpha = await createTeam(t.id, 'Alpha');
    await addMember(t.id, teamAlpha, pA, 'CAPTAIN', 'MAIN');
    // Only 1 team created; 2 required

    const response = await finalize(t.id);

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('TEAMS_INCOMPLETE');
  });

  it('should return 409 TEAMS_INCOMPLETE when a team does not have enough members', async () => {
    // 2v2 tournament — each team needs 2 members
    const t = await createTournament({ team_size: 2, number_of_teams: 2 });
    await setStatus(t.id, 'REGISTRATION_CLOSED');
    const pA = await addParticipant(t.id, USER_A);
    const pB = await addParticipant(t.id, USER_B);
    const pC = await addParticipant(t.id, USER_C);
    // 4th participant intentionally omitted
    const teamAlpha = await createTeam(t.id, 'Alpha');
    const teamBeta  = await createTeam(t.id, 'Beta');
    // Alpha has 2 members (captain + player) ✓
    await addMember(t.id, teamAlpha, pA, 'CAPTAIN', 'MAIN');
    await addMember(t.id, teamAlpha, pB, 'PLAYER',  'MAIN');
    // Beta has only 1 member ✗
    await addMember(t.id, teamBeta, pC, 'CAPTAIN', 'MAIN');

    const response = await finalize(t.id);

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('TEAMS_INCOMPLETE');
  });

  it('should return 409 TEAMS_INCOMPLETE when a team has no captain', async () => {
    const t = await createTournament({ team_size: 1, number_of_teams: 2 });
    await setStatus(t.id, 'REGISTRATION_CLOSED');
    const pA = await addParticipant(t.id, USER_A);
    const pB = await addParticipant(t.id, USER_B);
    const teamAlpha = await createTeam(t.id, 'Alpha');
    const teamBeta  = await createTeam(t.id, 'Beta');
    await addMember(t.id, teamAlpha, pA, 'CAPTAIN', 'MAIN'); // captain ✓
    await addMember(t.id, teamBeta,  pB, 'PLAYER',  'MAIN'); // no captain ✗

    const response = await finalize(t.id);

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('TEAMS_INCOMPLETE');
  });

  it('should return 409 INVALID_TEAM_COUNT when number_of_teams is not a power of two', async () => {
    // 3 teams — not a power of 2 → invalid for KNOCKOUT
    const t = await createTournament({ team_size: 1, number_of_teams: 3 });
    await setStatus(t.id, 'REGISTRATION_CLOSED');
    const pA = await addParticipant(t.id, USER_A);
    const pB = await addParticipant(t.id, USER_B);
    const pC = await addParticipant(t.id, USER_C);
    const teamA = await createTeam(t.id, 'Alpha');
    const teamB = await createTeam(t.id, 'Beta');
    const teamC = await createTeam(t.id, 'Gamma');
    await addMember(t.id, teamA, pA, 'CAPTAIN', 'MAIN');
    await addMember(t.id, teamB, pB, 'CAPTAIN', 'MAIN');
    await addMember(t.id, teamC, pC, 'CAPTAIN', 'MAIN');

    const response = await finalize(t.id);

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('INVALID_TEAM_COUNT');
  });
});
