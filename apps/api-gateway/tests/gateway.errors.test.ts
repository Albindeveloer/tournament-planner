import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app.js';
import { createFakeUpstream, FakeUpstream } from './helpers/fake-upstream.js';

describe('Gateway — Error Handling', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let fakeAuth: FakeUpstream;

  beforeAll(async () => {
    fakeAuth = await createFakeUpstream([
      { method: 'GET', url: '/api/v1/auth/me', response: { data: { user: {} } } },
    ]);
    app = await buildApp({ serviceUrls: { auth: fakeAuth.baseUrl } });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await fakeAuth.close();
  });

  it('returns 404 NOT_FOUND for routes that do not match any proxy prefix', async () => {
    const token = app.jwt.sign({ sub: 'user-123' });
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/unknown-service',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(404);
    const body = response.json<{ error: { code: string; message: string; details: null } }>();
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.details).toBeNull();
  });

  it('does not expose internal route details in the 404 response', async () => {
    const token = app.jwt.sign({ sub: 'user-123' });
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/unknown-service',
      headers: { authorization: `Bearer ${token}` },
    });
    // Fastify's default "Route GET /path not found" leaks routing info.
    // The custom setNotFoundHandler must suppress it.
    expect(response.body).not.toContain('Route');
    expect(response.body).not.toContain('not found');
  });

  it('returns 503 SERVICE_UNAVAILABLE when an upstream service is unreachable', async () => {
    // Port 1 on localhost is always closed — guaranteed ECONNREFUSED.
    const appWithDownService = await buildApp({
      serviceUrls: { auth: 'http://127.0.0.1:1' },
    });
    await appWithDownService.ready();

    const token = appWithDownService.jwt.sign({ sub: 'user-123' });
    const response = await appWithDownService.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(503);
    const body = response.json<{ error: { code: string; message: string; details: null } }>();
    expect(body.error.code).toBe('SERVICE_UNAVAILABLE');
    expect(body.error.details).toBeNull();

    await appWithDownService.close();
  });

  it('503 response does not expose internal service details', async () => {
    const appWithDownService = await buildApp({
      serviceUrls: { auth: 'http://127.0.0.1:1' },
    });
    await appWithDownService.ready();

    const token = appWithDownService.jwt.sign({ sub: 'user-123' });
    const response = await appWithDownService.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: `Bearer ${token}` },
    });

    // Must not reveal the upstream URL or port.
    expect(response.body).not.toContain('127.0.0.1');
    expect(response.body).not.toContain('ECONNREFUSED');

    await appWithDownService.close();
  });
});
