# Auth API

Service: Auth Service
Base prefix: `/api/v1/auth`

Source of truth: `docs/PROJECT-HANDOVER.md` §22, §27

---

## Global API Conventions

- All responses use `snake_case` JSON.
- Single resource responses: `{ "data": {} }`
- Collection responses: `{ "data": [], "pagination": { "page", "limit", "total", "totalPages" } }`
- Error responses: `{ "error": { "code", "message", "details" } }`
- `password_hash` is never included in any response.
- Raw PostgreSQL errors must never reach the client.

---

## POST /api/v1/auth/register

**Purpose:** Create a new user account.

**Authentication required:** No

**Request body:**

```json
{
  "email": "player@example.com",
  "password": "SecurePassword123!",
  "first_name": "Player",
  "last_name": "One"
}
```

**Validation:**

| Field | Rules |
|---|---|
| `email` | Required, valid email format, max 255 characters |
| `password` | Required, 8–128 characters |
| `first_name` | Required, 1–100 characters |
| `last_name` | Optional, max 100 characters |

Unknown fields are rejected (HTTP 400).

**Success response:** HTTP 201

```json
{
  "data": {
    "user": {
      "id": "uuid",
      "email": "player@example.com",
      "first_name": "Player",
      "last_name": "One",
      "status": "ACTIVE",
      "email_verified": false,
      "last_login_at": null,
      "created_at": "...",
      "updated_at": "..."
    }
  }
}
```

**Error responses:**

| Status | Code | Condition |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid/missing fields or unknown fields |
| 409 | `EMAIL_ALREADY_EXISTS` | Email already registered |

---

## POST /api/v1/auth/login

**Purpose:** Authenticate a user and issue tokens.

**Authentication required:** No

**Returns:** JWT access token + refresh token (exact response structure to be finalized during M6.5 implementation).

**Error responses:**

| Status | Code | Condition |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing or invalid fields |
| 401 | `INVALID_CREDENTIALS` | Email not found or password incorrect |
| 401 | `ACCOUNT_SUSPENDED` / `ACCOUNT_DEACTIVATED` | Account not active |

> **Not yet finalized:** Exact response body structure for login. To be defined during M6.5.

---

## POST /api/v1/auth/refresh

**Purpose:** Obtain a new access token using a valid refresh token.

**Authentication required:** Refresh token required.

**Behavior:**
- Refresh token is rotated on each use (new token issued, old token revoked).
- Expired or revoked tokens are rejected.

> **Not yet finalized:** Exact request/response structure. To be defined during M6.6.

---

## POST /api/v1/auth/logout

**Purpose:** Invalidate the current refresh token/session.

**Authentication required:** Refresh token required.

**Behavior:** Revokes the provided refresh token. Subsequent refresh attempts with that token fail.

> **Not yet finalized:** Exact request/response structure. To be defined during M6.6.

---

## POST /api/v1/auth/forgot-password

**Purpose:** Request a password reset link/token.

**Authentication required:** No

**Security rule:** Always returns HTTP 202 regardless of whether the email exists. This prevents account enumeration.

> **Not yet finalized:** Exact request/response structure and delivery mechanism. To be defined during M6.7.

---

## POST /api/v1/auth/reset-password

**Purpose:** Reset the user's password using a valid reset token.

**Authentication required:** No (reset token acts as temporary credential)

**Behavior:**
- Reset token is validated (not expired, not already used).
- Password is updated and hashed.
- All existing refresh sessions for the user are invalidated.

> **Not yet finalized:** Exact request/response structure. To be defined during M6.7.

---

## GET /api/v1/auth/me

**Purpose:** Return the currently authenticated user's information.

**Authentication required:** Yes (valid access token)

**Success response:** HTTP 200

```json
{
  "data": {
    "user": {
      "id": "uuid",
      "email": "player@example.com",
      "first_name": "Player",
      "last_name": "One",
      "status": "ACTIVE",
      "email_verified": false,
      "last_login_at": "...",
      "created_at": "...",
      "updated_at": "..."
    }
  }
}
```

`password_hash` is never included.

---

## JWT Design

| Property | Value |
|---|---|
| Algorithm | — (not specified in handover, standard RS256 or HS256) |
| Claims | `sub` (user ID), `iat`, `exp` |
| Access token lifetime | 15 minutes (example; configurable) |
| Refresh token lifetime | 7 days (example; configurable) |

Refresh tokens are stored as hashes only. Plaintext refresh tokens are never persisted.
