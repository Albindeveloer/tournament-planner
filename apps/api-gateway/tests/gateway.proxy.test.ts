import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app.js';
import { createFakeUpstream, FakeUpstream } from './helpers/fake-upstream.js';

describe('Gateway — Route Forwarding', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let fakeAuth: FakeUpstream;
  let fakeTournament: FakeUpstream;

  beforeAll(async () => {
    fakeAuth = await createFakeUpstream([
      {
        method: 'GET',
        url: '/api/v1/auth/me',
        response: { data: { user: { id: 'u1', email: 'test@example.com' } } },
      },
    ]);

    fakeTournament = await createFakeUpstream([
      {
        method: 'GET',
        url: '/api/v1/tournaments',
        response: { data: { tournaments: [] } },
      },
    ]);

    app = await buildApp({
      serviceUrls: {
        auth: fakeAuth.baseUrl,
        tournament: fakeTournament.baseUrl,
      },
    });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await fakeAuth.close();
    await fakeTournament.close();
  });

  it('forwards GET /api/v1/auth/me to the auth service', async () => {
    const token = app.jwt.sign({ sub: 'user-123' });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<{ data: { user: { id: string } } }>();
    expect(body.data.user.id).toBe('u1');
  });

  it('forwards GET /api/v1/tournaments to the tournament service', async () => {
    const token = app.jwt.sign({ sub: 'user-123' });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/tournaments',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
  });

  it('forwards x-request-id header to the upstream service', async () => {
    const token = app.jwt.sign({ sub: 'user-123' });

    await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: `Bearer ${token}` },
    });

    const last = fakeAuth.received.at(-1);
    expect(last).toBeDefined();
    expect(typeof last!.headers['x-request-id']).toBe('string');
    expect((last!.headers['x-request-id'] as string).length).toBeGreaterThan(0);
  });

  it('injects x-user-id header with the authenticated user ID', async () => {
    const token = app.jwt.sign({ sub: 'user-abc' });

    await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: `Bearer ${token}` },
    });

    const last = fakeAuth.received.at(-1);
    expect(last).toBeDefined();
    expect(last!.headers['x-user-id']).toBe('user-abc');
  });

  it('does not inject x-user-id on public (unauthenticated) routes', async () => {
    // /api/v1/auth/login is a public route — no JWT required, so no x-user-id
    const fakeAuthWithLogin = await createFakeUpstream([
      { method: 'POST', url: '/api/v1/auth/login', response: { data: { access_token: 'tok' } } },
    ]);

    const localApp = await buildApp({ serviceUrls: { auth: fakeAuthWithLogin.baseUrl } });
    await localApp.ready();

    await localApp.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'a@b.com', password: 'password123' },
    });

    const last = fakeAuthWithLogin.received.at(-1);
    expect(last).toBeDefined();
    expect(last!.headers['x-user-id']).toBeUndefined();

    await localApp.close();
    await fakeAuthWithLogin.close();
  });

  it('echoes x-request-id in the response to the caller', async () => {
    const token = app.jwt.sign({ sub: 'user-123' });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.headers['x-request-id']).toBeDefined();
    expect(typeof response.headers['x-request-id']).toBe('string');
  });
});
