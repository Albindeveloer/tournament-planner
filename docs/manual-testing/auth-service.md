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

## 3. Refresh Token

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

## 4. Logout

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

## 5. Password Reset

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

## 6. Full Flow (Happy Path)

Run through the complete auth lifecycle end-to-end:

```
POST /register              → 201
POST /login                 → 200, save access_token + refresh_token
POST /refresh               → 200, save new access_token + new refresh_token
POST /refresh               → 200, rotate again
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

## 7. Health Check

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
