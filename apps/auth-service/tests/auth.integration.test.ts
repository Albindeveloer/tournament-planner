/**
 * M6.8.3 — Auth Service Integration Validation
 *
 * These tests validate the complete authentication lifecycles as connected
 * flows — not individual endpoints in isolation. Each test exercises a full
 * user journey from start to finish through the real database.
 */
import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { pool } from '../src/infrastructure/database/postgres.js';
import { authService } from '../src/modules/auth/auth.service.js';

const app = buildApp();

const VALID_PASSWORD = 'SecurePassword123!';
const NEW_PASSWORD = 'NewSecurePassword456!';

beforeAll(async () => {
  await app.ready();
});

beforeEach(async () => {
  await pool.query('DELETE FROM password_reset_tokens;');
  await pool.query('DELETE FROM refresh_tokens;');
  await pool.query('DELETE FROM users;');
});

afterAll(async () => {
  await app.close();
  await pool.end();
});

describe('Auth Service — Integration: complete session lifecycle', () => {
  it('Flow A: Register → Login → GET /me → Refresh → GET /me (new token) → Logout → Refresh fails', async () => {
    // 1. Register a new user.
    const register = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'player@example.com', password: VALID_PASSWORD, first_name: 'Player' },
    });
    expect(register.statusCode).toBe(201);

    // 2. Login — get an access token and a refresh token.
    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'player@example.com', password: VALID_PASSWORD },
    });
    expect(login.statusCode).toBe(200);

    const { access_token, refresh_token: firstRefreshToken, user } = login.json().data as {
      user: { id: string };
      access_token: string;
      refresh_token: string;
    };

    // 3. Use the access token to call GET /me — verifies the JWT and user lookup.
    const me = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { Authorization: `Bearer ${access_token}` },
    });
    expect(me.statusCode).toBe(200);
    expect(me.json().data.user.id).toBe(user.id);

    // 4. Refresh the session — the original refresh token is rotated out.
    const refresh = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refresh_token: firstRefreshToken },
    });
    expect(refresh.statusCode).toBe(200);

    const { access_token: newAccessToken, refresh_token: newRefreshToken } = refresh.json().data as {
      access_token: string;
      refresh_token: string;
    };

    // 5. The new access token must also authenticate correctly.
    const meAfterRefresh = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { Authorization: `Bearer ${newAccessToken}` },
    });
    expect(meAfterRefresh.statusCode).toBe(200);

    // 6. Logout using the new refresh token.
    const logout = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      payload: { refresh_token: newRefreshToken },
    });
    expect(logout.statusCode).toBe(204);

    // 7. After logout, the revoked refresh token must be rejected.
    const refreshAfterLogout = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refresh_token: newRefreshToken },
    });
    expect(refreshAfterLogout.statusCode).toBe(401);
    expect(refreshAfterLogout.json().error.code).toBe('INVALID_REFRESH_TOKEN');
  });
});

describe('Auth Service — Integration: complete password reset lifecycle', () => {
  it('Flow B: Register → Login → Forgot Password → Reset → Old session invalid → New password works', async () => {
    // 1. Register a new user.
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'player@example.com', password: VALID_PASSWORD, first_name: 'Player' },
    });

    // 2. Login to establish a refresh-token session before the password reset.
    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'player@example.com', password: VALID_PASSWORD },
    });
    expect(login.statusCode).toBe(200);

    const { refresh_token } = login.json().data as { refresh_token: string };

    // 3. Trigger a password reset and obtain the plaintext token.
    //    In production this token would be delivered via email. Tests get it directly
    //    from the service layer, consistent with the rest of the password-reset test suite.
    const resetToken = await authService.forgotPassword('player@example.com');
    expect(resetToken).not.toBeNull();

    // 4. Reset the password using the token.
    const reset = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/reset-password',
      payload: { token: resetToken!, new_password: NEW_PASSWORD },
    });
    expect(reset.statusCode).toBe(200);

    // 5. The refresh session that existed before the reset must now be revoked.
    const refreshAfterReset = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refresh_token },
    });
    expect(refreshAfterReset.statusCode).toBe(401);
    expect(refreshAfterReset.json().error.code).toBe('INVALID_REFRESH_TOKEN');

    // 6. The old password must now be rejected.
    const loginOldPassword = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'player@example.com', password: VALID_PASSWORD },
    });
    expect(loginOldPassword.statusCode).toBe(401);

    // 7. The new password must allow a fresh login.
    const loginNewPassword = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'player@example.com', password: NEW_PASSWORD },
    });
    expect(loginNewPassword.statusCode).toBe(200);
    expect(loginNewPassword.json().data.access_token).toBeTruthy();
  });
});
