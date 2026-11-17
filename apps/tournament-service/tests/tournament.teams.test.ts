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
const OTHER_ID  = '00000000-0000-0000-0000-000000000002';
const NON_EXISTENT_ID = '00000000-0000-0000-0000-000000000099';

const tournamentBody = {
  name: 'Teams Cup',
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
    payload: { ...tournamentBody, ...overrides },
  });
  expect(response.statusCode).toBe(201);
  return response.json().data.tournament;
}

async function closeRegistration(tournamentId: string) {
  await pool.query(`UPDATE tournaments SET status = 'REGISTRATION_CLOSED' WHERE id = $1`, [tournamentId]);
}

async function createTeam(tournamentId: string, name: string, userId: string = OWNER_ID) {
  const response = await app.inject({
    method: 'POST',
    url: `/api/v1/tournaments/${tournamentId}/teams`,
    headers: { 'x-user-id': userId },
    payload: { name },
  });
  expect(response.statusCode).toBe(201);
  return response.json().data.team;
}

// ─── POST /api/v1/tournaments/:id/teams ──────────────────────────────────────

describe('POST /api/v1/tournaments/:id/teams', () => {
  it('should create a team and return 201', async () => {
    const tournament = await createTournament();
    await closeRegistration(tournament.id);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${tournament.id}/teams`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { name: 'Team Alpha' },
    });

    expect(response.statusCode).toBe(201);
    const { team } = response.json().data;
    expect(team.tournament_id).toBe(tournament.id);
    expect(team.name).toBe('Team Alpha');
    expect(team.status).toBe('FORMING');
    expect(team.id).toBeDefined();
  });

  it('should return 404 when tournament does not exist', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${NON_EXISTENT_ID}/teams`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { name: 'Team Alpha' },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('TOURNAMENT_NOT_FOUND');
  });

  it('should return 403 when caller is not the owner', async () => {
    const tournament = await createTournament();
    await closeRegistration(tournament.id);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${tournament.id}/teams`,
      headers: { 'x-user-id': OTHER_ID },
      payload: { name: 'Team Alpha' },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('FORBIDDEN');
  });

  it('should return 409 when tournament is not in a team-formation status', async () => {
    const tournament = await createTournament();
    // Status is DRAFT — not REGISTRATION_CLOSED or TEAM_FORMATION

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${tournament.id}/teams`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { name: 'Team Alpha' },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('INVALID_TOURNAMENT_STATUS');
  });

  it('should return 409 when a team with the same name already exists', async () => {
    const tournament = await createTournament();
    await closeRegistration(tournament.id);
    await createTeam(tournament.id, 'Team Alpha');

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${tournament.id}/teams`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { name: 'Team Alpha' },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('TEAM_NAME_TAKEN');
  });

  it('should allow team creation when tournament status is TEAM_FORMATION', async () => {
    const tournament = await createTournament();
    await pool.query(`UPDATE tournaments SET status = 'TEAM_FORMATION' WHERE id = $1`, [tournament.id]);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/tournaments/${tournament.id}/teams`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { name: 'Team Beta' },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().data.team.status).toBe('FORMING');
  });
});

// ─── GET /api/v1/tournaments/:id/teams ───────────────────────────────────────

describe('GET /api/v1/tournaments/:id/teams', () => {
  it('should return an empty array when no teams exist', async () => {
    const tournament = await createTournament();

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/tournaments/${tournament.id}/teams`,
      headers: { 'x-user-id': OWNER_ID },
    });

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.json().data)).toBe(true);
    expect(response.json().data).toHaveLength(0);
  });

  it('should return all teams for the tournament', async () => {
    const tournament = await createTournament();
    await closeRegistration(tournament.id);
    await createTeam(tournament.id, 'Team Alpha');
    await createTeam(tournament.id, 'Team Beta');

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/tournaments/${tournament.id}/teams`,
      headers: { 'x-user-id': OWNER_ID },
    });

    expect(response.statusCode).toBe(200);
    const teams = response.json().data;
    expect(teams).toHaveLength(2);
    expect(teams.map((t: { name: string }) => t.name).sort()).toEqual(['Team Alpha', 'Team Beta']);
  });

  it('should return 404 when tournament does not exist', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/tournaments/${NON_EXISTENT_ID}/teams`,
      headers: { 'x-user-id': OWNER_ID },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('TOURNAMENT_NOT_FOUND');
  });
});

// ─── GET /api/v1/tournaments/:id/teams/:teamId ───────────────────────────────

describe('GET /api/v1/tournaments/:id/teams/:teamId', () => {
  it('should return a specific team', async () => {
    const tournament = await createTournament();
    await closeRegistration(tournament.id);
    const created = await createTeam(tournament.id, 'Team Alpha');

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/tournaments/${tournament.id}/teams/${created.id}`,
      headers: { 'x-user-id': OWNER_ID },
    });

    expect(response.statusCode).toBe(200);
    const { team } = response.json().data;
    expect(team.id).toBe(created.id);
    expect(team.name).toBe('Team Alpha');
  });

  it('should return 404 when team does not exist', async () => {
    const tournament = await createTournament();

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/tournaments/${tournament.id}/teams/${NON_EXISTENT_ID}`,
      headers: { 'x-user-id': OWNER_ID },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('TEAM_NOT_FOUND');
  });

  it('should return 404 when team belongs to a different tournament', async () => {
    const t1 = await createTournament();
    const t2 = await createTournament({ name: 'Other Cup' });
    await closeRegistration(t1.id);
    await closeRegistration(t2.id);
    const teamInT1 = await createTeam(t1.id, 'Team Alpha');

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/tournaments/${t2.id}/teams/${teamInT1.id}`,
      headers: { 'x-user-id': OWNER_ID },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('TEAM_NOT_FOUND');
  });
});

// ─── PATCH /api/v1/tournaments/:id/teams/:teamId ─────────────────────────────

describe('PATCH /api/v1/tournaments/:id/teams/:teamId', () => {
  it('should update a team name and return the updated team', async () => {
    const tournament = await createTournament();
    await closeRegistration(tournament.id);
    const team = await createTeam(tournament.id, 'Team Alpha');

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${tournament.id}/teams/${team.id}`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { name: 'Team Omega' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.team.name).toBe('Team Omega');
    expect(response.json().data.team.id).toBe(team.id);
  });

  it('should return 403 when caller is not the owner', async () => {
    const tournament = await createTournament();
    await closeRegistration(tournament.id);
    const team = await createTeam(tournament.id, 'Team Alpha');

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${tournament.id}/teams/${team.id}`,
      headers: { 'x-user-id': OTHER_ID },
      payload: { name: 'Team Omega' },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('FORBIDDEN');
  });

  it('should return 409 when the new name is already taken', async () => {
    const tournament = await createTournament();
    await closeRegistration(tournament.id);
    await createTeam(tournament.id, 'Team Alpha');
    const teamB = await createTeam(tournament.id, 'Team Beta');

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${tournament.id}/teams/${teamB.id}`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { name: 'Team Alpha' },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('TEAM_NAME_TAKEN');
  });

  it('should return 409 when tournament is not in a team-formation status', async () => {
    const tournament = await createTournament();
    // Status is DRAFT

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${tournament.id}/teams/${NON_EXISTENT_ID}`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { name: 'Team Omega' },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('INVALID_TOURNAMENT_STATUS');
  });

  it('should return 404 when team does not exist', async () => {
    const tournament = await createTournament();
    await closeRegistration(tournament.id);

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tournaments/${tournament.id}/teams/${NON_EXISTENT_ID}`,
      headers: { 'x-user-id': OWNER_ID },
      payload: { name: 'Team Omega' },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('TEAM_NOT_FOUND');
  });
});
