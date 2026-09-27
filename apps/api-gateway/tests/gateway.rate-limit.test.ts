import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/app.js';
import { createFakeUpstream } from './helpers/fake-upstream.js';

// Each test builds its own fresh app so in-memory rate limit counters
// do not bleed between tests.

describe('Gateway — Rate Limiting', () => {
  it('allows requests under the limit through to the upstream', async () => {
    const fakeAuth = await createFakeUpstream([
      { method: 'POST', url: '/api/v1/auth/login', response: { data: { access_token: 'tok' } } },
    ]);
    const app = await buildApp({ serviceUrls: { auth: fakeAuth.baseUrl } });
    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'a@b.com', password: 'password123' },
    });

    expect(response.statusCode).toBe(200);

    await app.close();
    await fakeAuth.close();
  });

  it('returns 429 RATE_LIMIT_EXCEEDED after exceeding the limit', async () => {
    const fakeAuth = await createFakeUpstream([
      { method: 'POST', url: '/api/v1/auth/login', response: { data: { access_token: 'tok' } } },
    ]);
    const app = await buildApp({ serviceUrls: { auth: fakeAuth.baseUrl } });
    await app.ready();

    // Fire 10 requests to exhaust the limit (max: 10 per minute).
    for (let i = 0; i < 10; i++) {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'a@b.com', password: 'password123' },
      });
    }

    // The 11th request must be rate limited.
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'a@b.com', password: 'password123' },
    });

    expect(response.statusCode).toBe(429);

    await app.close();
    await fakeAuth.close();
  });

  it('rate limit error response follows the API error contract', async () => {
    const fakeAuth = await createFakeUpstream([
      { method: 'POST', url: '/api/v1/auth/login', response: { data: {} } },
    ]);
    const app = await buildApp({ serviceUrls: { auth: fakeAuth.baseUrl } });
    await app.ready();

    for (let i = 0; i < 10; i++) {
      await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: 'a@b.com', password: 'pass' } });
    }

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'a@b.com', password: 'pass' },
    });

    const body = response.json<{ error: { code: string; message: string; details: null } }>();
    expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(typeof body.error.message).toBe('string');
    expect(body.error.details).toBeNull();

    await app.close();
    await fakeAuth.close();
  });

  it('does not rate limit routes outside the sensitive set', async () => {
    // /health is not in the rate-limited paths — exhausting auth limit
    // must not block health checks.
    const fakeAuth = await createFakeUpstream([
      { method: 'POST', url: '/api/v1/auth/login', response: { data: {} } },
    ]);
    const app = await buildApp({ serviceUrls: { auth: fakeAuth.baseUrl } });
    await app.ready();

    for (let i = 0; i < 11; i++) {
      await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: 'a@b.com', password: 'pass' } });
    }

    const healthResponse = await app.inject({ method: 'GET', url: '/health' });
    expect(healthResponse.statusCode).toBe(200);

    await app.close();
    await fakeAuth.close();
  });
});
