# Auth Service — Manual Testing Guide

## Prerequisites

1. Docker infrastructure is running:
   ```
   docker compose up -d
   ```
   from the `infrastructure/` folder.

2. Auth Service is running:
   ```
   npm run dev --workspace=@tournament-planner/auth-service
   ```

3. Migrations have been applied:
   ```
   npm run migrate --workspace=@tournament-planner/auth-service
   ```

**Base URL:** `http://localhost:3001`

---

## Postman Setup

### 1. Create an Environment

In Postman: **Environments → +** (New Environment). Name it `Auth Service Local`.

Add these variables:

| Variable | Initial Value | Current Value |
|---|---|---|
| `base_url` | `http://localhost:3001` | `http://localhost:3001` |
| `access_token` | *(leave empty)* | *(filled automatically after login)* |
| `refresh_token` | *(leave empty)* | *(filled automatically after login)* |
| `reset_token` | *(leave empty)* | *(filled automatically after forgot-password)* |

Click **Save**, then select this environment from the dropdown in the top-right corner of Postman.

---

### 2. Create a Collection

Click **Collections → +** → **Blank Collection**. Name it `Auth Service`.

Add each request below to this collection. All URLs use `{{base_url}}` so you never hardcode the port.

---

### 3. Saving Tokens Automatically

In newer Postman (v10+): open a request → click the **Scripts** tab → click **Post-response**.

In older Postman: open a request → click the **Tests** tab.

Paste the script there. It runs automatically after every response and saves the tokens into your environment variables — no manual copy-pasting needed.

---

### 4. Requests

#### Register

| Field | Value |
|---|---|
| Method | `POST` |
| URL | `{{base_url}}/api/v1/auth/register` |
| Body (raw JSON) | see below |

```json
{
  "email": "player@example.com",
  "password": "SecurePassword123!",
  "first_name": "Player",
  "last_name": "One"
}
```

Expected: `201 Created`

---

#### Login

| Field | Value |
|---|---|
| Method | `POST` |
| URL | `{{base_url}}/api/v1/auth/login` |
| Body (raw JSON) | see below |

```json
{
  "email": "player@example.com",
  "password": "SecurePassword123!"
}
```

**Scripts → Post-response** (saves tokens automatically):

```javascript
const body = pm.response.json();
pm.environment.set("access_token", body.data.access_token);
pm.environment.set("refresh_token", body.data.refresh_token);
```

Expected: `200 OK` — check the response contains `access_token`, `refresh_token`, `token_type: "Bearer"`, no `password_hash`.

**Tip:** Copy the `access_token` and paste it into [jwt.io](https://jwt.io). The decoded payload should contain only `sub` (user UUID), `iat`, and `exp`. No email, name, or roles.

---

#### GET /me

| Field | Value |
|---|---|
| Method | `GET` |
| URL | `{{base_url}}/api/v1/auth/me` |
| Authorization tab | Type: **Bearer Token**, Token: `{{access_token}}` |

Expected: `200 OK` — same user object as login, no `password_hash`.

To test the error case: clear the Authorization field → expect `401 UNAUTHORIZED`.

---

#### Refresh

| Field | Value |
|---|---|
| Method | `POST` |
| URL | `{{base_url}}/api/v1/auth/refresh` |
| Body (raw JSON) | see below |

```json
{
  "refresh_token": "{{refresh_token}}"
}
```

**Scripts → Post-response** (saves the new rotated tokens):

```javascript
const body = pm.response.json();
pm.environment.set("access_token", body.data.access_token);
pm.environment.set("refresh_token", body.data.refresh_token);
```

Expected: `200 OK` — brand-new `access_token` and `refresh_token`.

---

#### Logout

| Field | Value |
|---|---|
| Method | `POST` |
| URL | `{{base_url}}/api/v1/auth/logout` |
| Body (raw JSON) | see below |

```json
{
  "refresh_token": "{{refresh_token}}"
}
```

Expected: `204 No Content` (empty body).

After this, run Refresh again with the same token — you should get `401 INVALID_REFRESH_TOKEN`.

---

#### Forgot Password

| Field | Value |
|---|---|
| Method | `POST` |
| URL | `{{base_url}}/api/v1/auth/forgot-password` |
| Body (raw JSON) | see below |

```json
{
  "email": "player@example.com"
}
```

**Scripts → Post-response** (saves the reset token — dev mode only):

```javascript
const body = pm.response.json();
if (body.data && body.data.reset_token) {
  pm.environment.set("reset_token", body.data.reset_token);
}
```

Expected: `202 Accepted`. In development mode the response body includes `data.reset_token`. In production the body is empty (token is delivered by email).

---

#### Reset Password

| Field | Value |
|---|---|
| Method | `POST` |
| URL | `{{base_url}}/api/v1/auth/reset-password` |
| Body (raw JSON) | see below |

```json
{
  "token": "{{reset_token}}",
  "new_password": "NewSecurePassword456!"
}
```

Expected: `200 OK` with `"message": "Password has been reset successfully"`.

---

### 5. Suggested Testing Order

Run the requests in this sequence to walk the complete auth lifecycle:

```
1.  Register
2.  Login                         → tokens saved to environment
3.  GET /me                       → 200, user returned
4.  Refresh                       → new tokens saved
5.  GET /me                       → 200, new access_token works
6.  Logout
7.  Refresh                       → 401 (session ended)
8.  Login again                   → new session
9.  Forgot Password               → reset_token saved
10. Reset Password
11. Login (old password)          → 401
12. Login (new password)          → 200
13. Refresh (pre-reset token)     → 401 (revoked by reset)
14. Reset Password (same token)   → 400 (one-time use only)
```

---

## 1. Register a User

**POST** `/api/v1/auth/register`

```json
{
  "email": "player@example.com",
  "password": "SecurePassword123!",
  "first_name": "Player",
  "last_name": "One"
}
```

**Expected:** `201 Created`

```json
{
  "data": {
    "user": {
      "id": "<uuid>",
      "email": "player@example.com",
      "first_name": "Player",
      "last_name": "One",
      "status": "ACTIVE",
      "email_verified": false,
      "last_login_at": null,
      "created_at": "<timestamp>",
      "updated_at": "<timestamp>"
    }
  }
}
```

**Verify:**
- No `password_hash` or `password` in the response
- `email` is stored as lowercase (try sending `PLAYER@EXAMPLE.COM`)

**Error cases:**

| Input | Expected |
|---|---|
| Duplicate email | `409 EMAIL_ALREADY_EXISTS` |
| Invalid email format | `400 VALIDATION_ERROR` |
| Password shorter than 8 characters | `400 VALIDATION_ERROR` |
| Missing `first_name` | `400 VALIDATION_ERROR` |
| Unknown extra field (e.g. `"role": "ADMIN"`) | `400 VALIDATION_ERROR` |

---

## 2. Login

**POST** `/api/v1/auth/login`

```json
{
  "email": "player@example.com",
  "password": "SecurePassword123!"
}
```

**Expected:** `200 OK`

```json
{
  "data": {
    "user": { ... },
    "access_token": "<jwt>",
    "refresh_token": "<opaque-token>",
    "token_type": "Bearer"
  }
}
```

**Save both tokens** — you will need them for the steps below.

**Verify:**
- No `password_hash` in `data.user`
- Decode `access_token` at [jwt.io](https://jwt.io) — payload should contain only `sub` (user UUID), `iat`, `exp`. No email, name, or roles.
- `refresh_token` is a long opaque string (not a JWT)

**Error cases:**

| Input | Expected |
|---|---|
| Wrong password | `401 INVALID_CREDENTIALS` |
| Unknown email | `401 INVALID_CREDENTIALS` (same message — no account enumeration) |
| Suspended account | `403 ACCOUNT_INACTIVE` |
| Deactivated account | `403 ACCOUNT_INACTIVE` |
| Invalid email format | `400 VALIDATION_ERROR` |
| Password shorter than 8 characters | `400 VALIDATION_ERROR` |
| Unknown extra field | `400 VALIDATION_ERROR` |

---

## 3. Get Current User (GET /me)

**GET** `/api/v1/auth/me`

Set the `Authorization` header to `Bearer <access_token from login>`.

**Expected:** `200 OK`

```json
{
  "data": {
    "user": {
      "id": "<uuid>",
      "email": "player@example.com",
      "first_name": "Player",
      "last_name": "One",
      "status": "ACTIVE",
      "email_verified": false,
      "last_login_at": null,
      "created_at": "<timestamp>",
      "updated_at": "<timestamp>"
    }
  }
}
```

**Verify:**
- No `password_hash` or `password` in the response
- The `id` matches the one returned by login

**Error cases:**

| Input | Expected |
|---|---|
| No `Authorization` header | `401 UNAUTHORIZED` |
| `Authorization: Bearer invalid.token.here` | `401 UNAUTHORIZED` |
| Valid token, but account suspended in DB | `403 ACCOUNT_INACTIVE` |

---

## 4. Refresh Token

**POST** `/api/v1/auth/refresh`

```json
{
  "refresh_token": "<refresh_token from login>"
}
```

**Expected:** `200 OK` — a brand new `access_token` and a brand new `refresh_token`

```json
{
  "data": {
    "user": { ... },
    "access_token": "<new-jwt>",
    "refresh_token": "<new-opaque-token>",
    "token_type": "Bearer"
  }
}
```

**Save the new `refresh_token`.**

### Token Rotation

Use the **original** `refresh_token` from login again:

**POST** `/api/v1/auth/refresh`

```json
{
  "refresh_token": "<original refresh_token>"
}
```

**Expected:** `401 INVALID_REFRESH_TOKEN` — the original token was rotated out and is now invalid.

### Reuse Detection

This simulates a stolen token being replayed after rotation.

1. Login → get `token_A`
2. POST `/refresh` with `token_A` → get `token_B`
3. POST `/refresh` with `token_A` (revoked) → `401` AND the entire session is invalidated
4. POST `/refresh` with `token_B` (should now also be invalid) → `401`

**Error cases:**

| Input | Expected |
|---|---|
| Expired token (manually set `expires_at` in past via DB) | `401 INVALID_REFRESH_TOKEN` |
| Completely unknown token string | `401 INVALID_REFRESH_TOKEN` |
| Missing `refresh_token` field | `400 VALIDATION_ERROR` |

---

## 5. Logout

**POST** `/api/v1/auth/logout`

```json
{
  "refresh_token": "<refresh_token>"
}
```

**Expected:** `204 No Content` (empty body)

### Verify the Token Is Invalidated

After logout, attempt a refresh with the same token:

**POST** `/api/v1/auth/refresh`

```json
{
  "refresh_token": "<same token>"
}
```

**Expected:** `401 INVALID_REFRESH_TOKEN`

### Idempotency

Call logout a second time with the same already-revoked token:

**Expected:** `204 No Content` — logout never errors even for an already-revoked or unknown token.

**Error cases:**

| Input | Expected |
|---|---|
| Missing `refresh_token` field | `400 VALIDATION_ERROR` |
| Completely unknown token string | `204 No Content` (graceful) |

---

## 6. Password Reset

### 5.1 Forgot Password

**POST** `/api/v1/auth/forgot-password`

```json
{
  "email": "player@example.com"
}
```

**Expected:** `202 Accepted`

In `development` mode the response includes the reset token (so it can be tested without an email service). In production this field is absent — the token would be delivered by email.

```json
{
  "data": {
    "reset_token": "<opaque-token>"
  }
}
```

**Save `reset_token`** — you need it for the next step.

**Verify:**
- Sending an **unknown email** also returns `202` with no body — the response never reveals whether the account exists.

**Error cases:**

| Input | Expected |
|---|---|
| Invalid email format | `400 VALIDATION_ERROR` |
| Missing `email` field | `400 VALIDATION_ERROR` |

---

### 5.2 Reset Password

**POST** `/api/v1/auth/reset-password`

```json
{
  "token": "<reset_token from 5.1>",
  "new_password": "NewSecurePassword456!"
}
```

**Expected:** `200 OK`

```json
{
  "data": {
    "message": "Password has been reset successfully"
  }
}
```

---

### 5.3 Verify the new password works

**POST** `/api/v1/auth/login`

```json
{
  "email": "player@example.com",
  "password": "NewSecurePassword456!"
}
```

**Expected:** `200 OK`

---

### 5.4 Verify the old password no longer works

**POST** `/api/v1/auth/login`

```json
{
  "email": "player@example.com",
  "password": "SecurePassword123!"
}
```

**Expected:** `401 INVALID_CREDENTIALS`

---

### 5.5 Verify existing refresh sessions are invalidated

Before running forgot-password, login to get a refresh token. After the reset completes, attempt to use that token:

**POST** `/api/v1/auth/refresh`

```json
{
  "refresh_token": "<refresh_token obtained before the reset>"
}
```

**Expected:** `401 INVALID_REFRESH_TOKEN` — password reset revokes all active sessions.

---

### 5.6 Verify the reset token is one-time-use

Attempt to use the same reset token a second time:

**POST** `/api/v1/auth/reset-password`

```json
{
  "token": "<same reset_token>",
  "new_password": "AnotherPassword789!"
}
```

**Expected:** `400 INVALID_RESET_TOKEN`

**Error cases:**

| Input | Expected |
|---|---|
| Unknown / fake token | `400 INVALID_RESET_TOKEN` |
| Already-used token | `400 INVALID_RESET_TOKEN` |
| `new_password` shorter than 8 characters | `400 VALIDATION_ERROR` |
| Missing `token` field | `400 VALIDATION_ERROR` |
| Missing `new_password` field | `400 VALIDATION_ERROR` |

---

## 7. Full Flow (Reference)

Run through the complete auth lifecycle end-to-end:

```
POST /register              → 201
POST /login                 → 200, save access_token + refresh_token
GET  /me                    → 200, user returned (Bearer access_token)
POST /refresh               → 200, save new access_token + new refresh_token
GET  /me                    → 200, still works with new access_token
POST /logout                → 204
POST /refresh               → 401  (session ended)
```

Password reset flow:

```
POST /login                 → 200, save refresh_token
POST /forgot-password       → 202, save reset_token (dev mode)
POST /reset-password        → 200
POST /login (old password)  → 401
POST /login (new password)  → 200
POST /refresh (old token)   → 401  (session invalidated by reset)
POST /reset-password        → 400  (token already used)
```

---

## 8. Health Check

**GET** `http://localhost:3001/health`

**Expected:** `200 OK`

```json
{
  "data": {
    "service": "auth-service",
    "status": "ok"
  }
}
```

---

## Notes

- The `access_token` is a short-lived JWT (15 minutes by default). Downstream services and the API Gateway will verify it.
- The `refresh_token` is an opaque random string. Only its SHA-256 hash is stored in the database — the plaintext is never persisted.
- Refresh token rotation is transactional — the old token is revoked and the new token is inserted atomically.
- Test database: `auth_test_db` (used by `npm test`). Manual testing uses `auth_db`.
