import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app.js';
import { createFakeUpstream, FakeUpstream } from './helpers/fake-upstream.js';

describe('Gateway — Authentication Middleware', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let fakeAuth: FakeUpstream;

  beforeAll(async () => {
    fakeAuth = await createFakeUpstream([
      { method: 'POST', url: '/api/v1/auth/register', response: { data: { user: {} } } },
      { method: 'POST', url: '/api/v1/auth/login', response: { data: { access_token: 'tok' } } },
      { method: 'POST', url: '/api/v1/auth/refresh', response: { data: { access_token: 'tok' } } },
      { method: 'POST', url: '/api/v1/auth/forgot-password', statusCode: 202 },
      { method: 'POST', url: '/api/v1/auth/reset-password', response: { data: {} } },
      { method: 'GET', url: '/api/v1/auth/me', response: { data: { user: { id: 'u1' } } } },
    ]);

    app = await buildApp({ serviceUrls: { auth: fakeAuth.baseUrl } });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await fakeAuth.close();
  });

  // --- Public routes — no token required ---

  it('allows POST /api/v1/auth/register without a token', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'a@b.com', password: 'password123', first_name: 'Test' },
    });
    expect(response.statusCode).toBe(200);
  });

  it('allows POST /api/v1/auth/login without a token', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'a@b.com', password: 'password123' },
    });
    expect(response.statusCode).toBe(200);
  });

  it('allows POST /api/v1/auth/refresh without a token', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refresh_token: 'some-refresh-token' },
    });
    expect(response.statusCode).toBe(200);
  });

  it('allows POST /api/v1/auth/forgot-password without a token', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/forgot-password',
      payload: { email: 'a@b.com' },
    });
    expect(response.statusCode).toBe(202);
  });

  it('allows POST /api/v1/auth/reset-password without a token', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/reset-password',
      payload: { token: 'reset-tok', new_password: 'newpassword123' },
    });
    expect(response.statusCode).toBe(200);
  });

  // --- Protected routes — valid token required ---

  it('rejects GET /api/v1/auth/me with no Authorization header', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/auth/me' });

    expect(response.statusCode).toBe(401);
    const body = response.json<{ error: { code: string } }>();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a malformed Bearer token', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: 'Bearer this.is.not.a.jwt' },
    });

    expect(response.statusCode).toBe(401);
    const body = response.json<{ error: { code: string } }>();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a token signed with the wrong secret', async () => {
    // Sign with a different secret — gateway must reject it.
    const wrongSecretApp = await buildApp({ serviceUrls: { auth: fakeAuth.baseUrl } });
    await wrongSecretApp.ready();
    // Force a different signing secret by patching env — easier to just build a
    // separate app and steal its jwt.sign, but that would use the same secret.
    // Instead, sign a raw JWT with the wrong secret using Node crypto.
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sub: 'u1', iat: Math.floor(Date.now() / 1000) })).toString('base64url');
    const fakeSignature = Buffer.from('wrong-signature').toString('base64url');
    const wrongToken = `${header}.${payload}.${fakeSignature}`;
    await wrongSecretApp.close();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: `Bearer ${wrongToken}` },
    });

    expect(response.statusCode).toBe(401);
    const body = response.json<{ error: { code: string } }>();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('forwards the request when a valid token is provided', async () => {
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
});
