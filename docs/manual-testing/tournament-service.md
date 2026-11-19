# Tournament Service — Manual Testing Guide

---

## Part 1 — Automated Tests

### Step 1 — Apply migrations to the test database

Run this once. Without it the tests will fail with a "table does not exist" error.

```powershell
$env:NODE_ENV = "test"
npm run migrate --workspace=@tournament-planner/tournament-service
$env:NODE_ENV = "development"
```

You should see:
```
Applying migration: 001_create_tournament_tables.sql
Migration applied: 001_create_tournament_tables.sql
Database migrations completed successfully.
```

### Step 2 — Run the tests

```powershell
npm test --workspace=@tournament-planner/tournament-service
```

Expected output:
```
Test Files  10 passed (10)
      Tests  172 passed (172)
```

---

## Part 2 — Manual Testing in Postman

### Step 1 — Apply migrations to the dev database

Run this once before starting the services:

```powershell
npm run migrate --workspace=@tournament-planner/tournament-service
```

You should see:
```
Applying migration: 001_create_tournament_tables.sql
Migration applied: 001_create_tournament_tables.sql
Database migrations completed successfully.
```

---

### Step 2 — Start all services

Open **three separate terminals** in the project root and run one command in each:

**Terminal 1:**
```powershell
npm run dev --workspace=@tournament-planner/auth-service
```

**Terminal 2:**
```powershell
npm run dev --workspace=@tournament-planner/tournament-service
```

**Terminal 3:**
```powershell
npm run dev --workspace=@tournament-planner/api-gateway
```

Wait until all three show a "listening on port" message before opening Postman.

---

### Step 3 — Postman environment setup

You already have two environments:

| Environment | Variable | Value | Used for |
|---|---|---|---|
| Auth Service Local | `base_url` | `http://localhost:3001` | Direct auth service calls |
| Api Gateway Local | `gateway_url` | `http://localhost:3000` | All gateway calls |

**For tournament testing, use the `Api Gateway Local` environment.**

All tournament requests go through the gateway. Do not use `Auth Service Local` for tournament testing.

#### Add the tournament_id and participant_id variables

1. In Postman, click **Environments** in the left sidebar.
2. Open **Api Gateway Local**.
3. Click **Add a new variable** at the bottom of the variable list and add these rows:

| Variable | Initial Value | Current Value |
|---|---|---|
| `tournament_id` | *(leave empty)* | *(leave empty)* |
| `participant_id` | *(leave empty)* | *(leave empty)* |
| `invitation_id` | *(leave empty)* | *(leave empty)* |
| `join_request_id` | *(leave empty)* | *(leave empty)* |
| `captain_request_id` | *(leave empty)* | *(leave empty)* |
| `team_id` | *(leave empty)* | *(leave empty)* |
| `member_id` | *(leave empty)* | *(leave empty)* |

4. Click **Save**.

Your `Api Gateway Local` environment now has these variables:

| Variable | Purpose |
|---|---|
| `gateway_url` | `http://localhost:3000` |
| `access_token` | Filled automatically by the Login request |
| `refresh_token` | Filled automatically by the Login request |
| `reset_token` | Filled automatically by the Forgot Password request |
| `tournament_id` | Filled automatically after Create Tournament |
| `participant_id` | Filled manually after seeding a participant via SQL (see Request 36) |
| `invitation_id` | Filled automatically after Create Invitation (see Request 40) |
| `join_request_id` | Filled automatically after Submit Join Request (see Request 58) |
| `captain_request_id` | Filled automatically after Submit Captain Request (see Request 74) |
| `team_id` | Filled automatically after Create Team (see Request 87) |
| `member_id` | Filled automatically after Add Team Member (see Request 100) |

> **Tip:** Every test in Part 2 assumes you run **Request 1 — Create Tournament** first so that `tournament_id` is populated. If you restart Postman or clear the environment, run Request 1 again before the GET/PATCH requests.

---

### Step 4 — Add a Tournament Service folder to the collection

1. In Postman, click **Collections** in the left sidebar.
2. Open the **turnament-planner** collection.
3. Open the **API Gateway** folder inside it.
4. Right-click **API Gateway** → **Add Folder**. Name it **Tournament Service**.

Your collection structure should now look like:

```
turnament-planner/
├── Auth Service/
│   ├── Register
│   ├── login
│   ├── Refresh
│   ├── Logout
│   ├── forgot password
│   ├── Rest password
│   └── GET /me
└── API Gateway/
    ├── Public Routes — No Token Required/
    ├── Authentication Middleware/
    └── Tournament Service/          ← newly added
```

---

### Step 5 — Get a valid access token

Select the **Api Gateway Local** environment from the environment dropdown (top-right corner of Postman).

In the collection, go to **API Gateway → Public Routes — No Token Required → Login** and send it.

If the request succeeds, `access_token` and `refresh_token` are saved to your `Api Gateway Local` environment automatically. You can verify by opening the environment and checking the Current Value column.

> If Login returns `401 INVALID_CREDENTIALS`, your current password in the Login body may differ from what is in the database. Update the password in the Login body to match, or re-register with a fresh account.

---

### Step 6 — Add the tournament requests

Add each request below to the **API Gateway → Tournament Service** folder.

For every request in this folder:
- Select environment: **Api Gateway Local**
- Authorization tab → Type: **Bearer Token** → Token: `{{access_token}}`

---

#### Request 1 — Create Tournament (Minimal)

| Field | Value |
|---|---|
| Name | `Create Tournament` |
| Method | `POST` |
| URL | `{{gateway_url}}/api/v1/tournaments` |

Body → raw → JSON:
```json
{
  "name": "Weekend Cup",
  "game": "EFOOTBALL",
  "format": "KNOCKOUT",
  "team_size": 4,
  "number_of_teams": 8
}
```

Scripts → Post-response:
```javascript
const body = pm.response.json();
if (body.data && body.data.tournament) {
  pm.environment.set("tournament_id", body.data.tournament.id);
}
```

Expected response — **201 Created**:
```json
{
  "data": {
    "tournament": {
      "id": "<uuid>",
      "owner_id": "<your user uuid>",
      "name": "Weekend Cup",
      "description": null,
      "game": "EFOOTBALL",
      "format": "KNOCKOUT",
      "team_size": 4,
      "number_of_teams": 8,
      "substitutes_enabled": false,
      "team_formation_mode": "MANUAL",
      "status": "DRAFT",
      "registration_start_at": null,
      "registration_end_at": null,
      "created_at": "<timestamp>",
      "updated_at": "<timestamp>"
    }
  }
}
```

**What to verify:**
- `status` is `DRAFT` — always, regardless of what you send
- `owner_id` matches your user. To confirm: paste your `access_token` into [jwt.io](https://jwt.io) — the `sub` field in the decoded payload is your user ID
- `substitutes_enabled` is `false` (the default when not sent)
- `team_formation_mode` is `"MANUAL"` (the default when not sent)
- `tournament_id` is now saved — open the `Api Gateway Local` environment and confirm the Current Value column shows a UUID

---

#### Request 2 — Create Tournament (All Fields)

Duplicate Request 1. Name it `Create Tournament (Full)`.

Body → raw → JSON:
```json
{
  "name": "Champions League 2026",
  "description": "The biggest eFootball tournament of the year",
  "game": "EFOOTBALL",
  "format": "KNOCKOUT",
  "team_size": 2,
  "number_of_teams": 16,
  "substitutes_enabled": true,
  "team_formation_mode": "AUCTION",
  "registration_start_at": "2026-11-01T10:00:00Z",
  "registration_end_at": "2026-11-14T23:59:59Z"
}
```

Expected: **201 Created** — all provided fields are reflected in the response including `description`, `substitutes_enabled: true`, `team_formation_mode: "AUCTION"`, and the registration dates.

---

#### Request 3 — No Token → 401

Duplicate Request 1. Name it `Create Tournament — No Token`.

Authorization tab → Type: **No Auth**.

Expected: **401 Unauthorized**
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required",
    "details": null
  }
}
```

---

#### Request 4 — Invalid Game → 400

Duplicate Request 1. Name it `Create Tournament — Invalid Game`.

Change body: `"game": "FIFA"`

Expected: **400 Bad Request**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [...]
  }
}
```

---

#### Request 5 — Invalid Format → 400

Duplicate Request 1. Name it `Create Tournament — Invalid Format`.

Change body: `"format": "LEAGUE"`

Expected: **400 Bad Request** with `VALIDATION_ERROR`.

> LEAGUE is in the database schema for future use but is not accepted by the API in the current MVP. Only `KNOCKOUT` is allowed.

---

#### Request 6 — Invalid Team Size → 400

Duplicate Request 1. Name it `Create Tournament — Invalid Team Size`.

Change body: `"team_size": 5`

Expected: **400 Bad Request** with `VALIDATION_ERROR`.

> Valid values are 1, 2, 3, 4.

---

#### Request 7 — Too Few Teams → 400

Duplicate Request 1. Name it `Create Tournament — Too Few Teams`.

Change body: `"number_of_teams": 1`

Expected: **400 Bad Request** with `VALIDATION_ERROR`.

> Minimum is 2.

---

#### Request 8 — End Date Before Start Date → 400

Duplicate Request 1. Name it `Create Tournament — Invalid Dates`.

Body → raw → JSON:
```json
{
  "name": "Weekend Cup",
  "game": "EFOOTBALL",
  "format": "KNOCKOUT",
  "team_size": 4,
  "number_of_teams": 8,
  "registration_start_at": "2026-12-10T00:00:00Z",
  "registration_end_at": "2026-12-01T00:00:00Z"
}
```

Expected: **400 Bad Request**
```json
{
  "error": {
    "code": "INVALID_REGISTRATION_DATES",
    "message": "registration_end_at must be after registration_start_at",
    "details": null
  }
}
```

> This error code is different from `VALIDATION_ERROR` because this is a business rule (end must be after start), not a schema format error. The service checks it after the schema passes.

---

#### Request 9 — Missing Required Field → 400

Duplicate Request 1. Name it `Create Tournament — Missing Field`.

Remove `"game"` from the body entirely.

Expected: **400 Bad Request** with `VALIDATION_ERROR`.

---

#### Request 10 — Unknown Extra Field → 400

Duplicate Request 1. Name it `Create Tournament — Extra Field`.

Add `"status": "REGISTRATION_OPEN"` to the body.

Expected: **400 Bad Request** with `VALIDATION_ERROR`.

> `additionalProperties: false` is enforced. You cannot inject `status`, `owner_id`, or any field not explicitly in the schema.

---

#### Request 11 — Get Tournament

| Field | Value |
|---|---|
| Name | `Get Tournament` |
| Method | `GET` |
| URL | `{{gateway_url}}/api/v1/tournaments/{{tournament_id}}` |

No body. Authorization: Bearer Token → `{{access_token}}`.

Expected response — **200 OK**:
```json
{
  "data": {
    "tournament": {
      "id": "{{tournament_id}}",
      "owner_id": "<your user uuid>",
      "name": "Weekend Cup",
      "description": null,
      "game": "EFOOTBALL",
      "format": "KNOCKOUT",
      "team_size": 4,
      "number_of_teams": 8,
      "substitutes_enabled": false,
      "team_formation_mode": "MANUAL",
      "status": "DRAFT",
      "registration_start_at": null,
      "registration_end_at": null,
      "created_at": "<timestamp>",
      "updated_at": "<timestamp>"
    }
  }
}
```

**What to verify:**
- The response contains all tournament fields
- `status` is `DRAFT`
- `id` matches `tournament_id` in your environment

---

#### Request 12 — Get Tournament — Not Found → 404

Duplicate Request 11. Name it `Get Tournament — Not Found`.

Change the URL to:
```
{{gateway_url}}/api/v1/tournaments/00000000-0000-0000-0000-000000000099
```

Expected: **404 Not Found**
```json
{
  "error": {
    "code": "TOURNAMENT_NOT_FOUND",
    "message": "Tournament not found",
    "details": null
  }
}
```

---

#### Request 13 — Get Tournament — No Token → 401

Duplicate Request 11. Name it `Get Tournament — No Token`.

Authorization tab → Type: **No Auth**.

Expected: **401 Unauthorized** with `UNAUTHORIZED`.

---

#### Request 14 — List Tournaments

| Field | Value |
|---|---|
| Name | `List Tournaments` |
| Method | `GET` |
| URL | `{{gateway_url}}/api/v1/tournaments` |

No body. Authorization: Bearer Token → `{{access_token}}`.

Expected response — **200 OK**:
```json
{
  "data": [
    {
      "id": "<uuid>",
      "name": "Weekend Cup",
      ...
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

**What to verify:**
- `data` is an array (even if it has only one item)
- `pagination.total` matches the number of tournaments you have created
- Items are sorted newest first

---

#### Request 15 — List Tournaments — My Tournaments Only

Duplicate Request 14. Name it `List My Tournaments`.

Change the URL to:
```
{{gateway_url}}/api/v1/tournaments?owner_id=me
```

Expected: **200 OK** — `data` contains only tournaments where `owner_id` matches your user UUID.

> `owner_id=me` is resolved by the service to the caller's user ID from the `x-user-id` header. You never need to paste your own UUID into the URL.

---

#### Request 16 — List Tournaments — Pagination

Duplicate Request 14. Name it `List Tournaments — Page 1 Limit 1`.

Change the URL to:
```
{{gateway_url}}/api/v1/tournaments?page=1&limit=1
```

Expected: **200 OK**
- `data` has exactly 1 item (even if you have more tournaments)
- `pagination.limit` is `1`
- `pagination.totalPages` equals the total number of tournaments you have created

---

#### Request 17 — List Tournaments — Limit Too High → 400

Duplicate Request 14. Name it `List Tournaments — Limit Too High`.

Change the URL to:
```
{{gateway_url}}/api/v1/tournaments?limit=200
```

Expected: **400 Bad Request** with `VALIDATION_ERROR`.

> Maximum allowed `limit` is 100.

---

#### Request 18 — Update Tournament (Partial)

| Field | Value |
|---|---|
| Name | `Update Tournament` |
| Method | `PATCH` |
| URL | `{{gateway_url}}/api/v1/tournaments/{{tournament_id}}` |

Authorization: Bearer Token → `{{access_token}}`.

Body → raw → JSON:
```json
{
  "name": "Weekend Cup — Updated",
  "description": "Now with a description",
  "team_size": 2,
  "number_of_teams": 4,
  "substitutes_enabled": true,
  "team_formation_mode": "AUCTION"
}
```

Expected response — **200 OK**:
```json
{
  "data": {
    "tournament": {
      "id": "{{tournament_id}}",
      "name": "Weekend Cup — Updated",
      "description": "Now with a description",
      "team_size": 2,
      "number_of_teams": 4,
      "substitutes_enabled": true,
      "team_formation_mode": "AUCTION",
      "status": "DRAFT",
      ...
    }
  }
}
```

**What to verify:**
- Only the fields you sent have changed
- `status` is still `DRAFT` — PATCH cannot change lifecycle status
- `updated_at` is newer than `created_at`

---

#### Request 19 — Update Tournament — Name Only

Duplicate Request 18. Name it `Update Tournament — Name Only`.

Body → raw → JSON:
```json
{
  "name": "Renamed Cup"
}
```

Expected: **200 OK** — only `name` changes. All other fields (description, team_size, etc.) keep their existing values.

> This confirms partial update behaviour. Sending only the fields you want to change is the whole point of PATCH.

---

#### Request 20 — Update Tournament — Clear Description

Duplicate Request 18. Name it `Update Tournament — Clear Description`.

Body → raw → JSON:
```json
{
  "description": ""
}
```

Expected: **200 OK** — `description` in the response is `null`.

> An empty string is trimmed and stored as null. This is the correct way to clear the description field.

---

#### Request 21 — Update Tournament — No Token → 401

Duplicate Request 18. Name it `Update Tournament — No Token`.

Authorization tab → Type: **No Auth**.

Expected: **401 Unauthorized** with `UNAUTHORIZED`.

---

#### Request 22 — Update Tournament — Unknown Field → 400

Duplicate Request 18. Name it `Update Tournament — Extra Field`.

Body → raw → JSON:
```json
{
  "name": "Valid Name",
  "status": "CANCELLED"
}
```

Expected: **400 Bad Request** with `VALIDATION_ERROR`.

> `status` is not in the allowed PATCH body. Tournament status is controlled only through lifecycle endpoints (M8.5), never through PATCH.

---

#### Request 23 — Update Tournament — Invalid Dates → 400

Duplicate Request 18. Name it `Update Tournament — Invalid Dates`.

Body → raw → JSON:
```json
{
  "registration_start_at": "2026-12-10T00:00:00Z",
  "registration_end_at": "2026-12-01T00:00:00Z"
}
```

Expected: **400 Bad Request**
```json
{
  "error": {
    "code": "INVALID_REGISTRATION_DATES",
    "message": "registration_end_at must be after registration_start_at",
    "details": null
  }
}
```

---

#### Request 24 — Update Tournament — Structural Fields Locked After DRAFT → 409

This test requires manually advancing the tournament status in the database.

> **Pre-condition:** Run this SQL in your database client (pgAdmin or psql) against `tournament_db`:
> ```sql
> UPDATE tournaments SET status = 'REGISTRATION_OPEN' WHERE id = '<paste your tournament_id here>';
> ```

Then send:

| Field | Value |
|---|---|
| Name | `Update Tournament — Structural Fields Locked` |
| Method | `PATCH` |
| URL | `{{gateway_url}}/api/v1/tournaments/{{tournament_id}}` |

Body → raw → JSON:
```json
{
  "team_size": 3
}
```

Expected: **409 Conflict**
```json
{
  "error": {
    "code": "CONFIGURATION_LOCKED",
    "message": "Cannot change team_size once registration has opened",
    "details": null
  }
}
```

> **Why:** Once players can register, changing `team_size`, `number_of_teams`, `substitutes_enabled`, or `team_formation_mode` would invalidate the capacity expectations you already communicated to participants. These four fields are locked the moment the tournament leaves `DRAFT`.

> **After this test:** Reset the status back to `DRAFT` so subsequent requests work normally:
> ```sql
> UPDATE tournaments SET status = 'DRAFT' WHERE id = '<your tournament_id>';
> ```

---

#### Request 25 — Update Tournament — Name Still Editable After DRAFT

Run this after Request 24 has confirmed the lock. The tournament status should still be `REGISTRATION_OPEN` in the database (or reset it to `REGISTRATION_OPEN` again).

Body → raw → JSON:
```json
{
  "name": "Name Change Is Still Allowed"
}
```

Expected: **200 OK** — name updates successfully even though registration is open.

> `name` and `description` are never locked — they do not affect participant capacity or team formation.

> **After this test:** Reset the tournament back to `DRAFT` so the lifecycle requests below work from a clean state:
> ```sql
> UPDATE tournaments SET status = 'DRAFT' WHERE id = '<your tournament_id>';
> ```

---

#### Request 26 — Open Registration

| Field | Value |
|---|---|
| Name | `Open Registration` |
| Method | `POST` |
| URL | `{{gateway_url}}/api/v1/tournaments/{{tournament_id}}/open` |

No body. Authorization: Bearer Token → `{{access_token}}`.

Expected response — **200 OK**:
```json
{
  "data": {
    "tournament": {
      "id": "{{tournament_id}}",
      "status": "REGISTRATION_OPEN",
      ...
    }
  }
}
```

**What to verify:**
- `status` changed from `DRAFT` to `REGISTRATION_OPEN`
- All other fields are unchanged
- `updated_at` is newer than before

---

#### Request 27 — Open Registration — Wrong Status → 409

Duplicate Request 26. Name it `Open Registration — Wrong Status`.

Send it again **without resetting the status**. The tournament is now already `REGISTRATION_OPEN`.

Expected: **409 Conflict**
```json
{
  "error": {
    "code": "INVALID_STATUS_TRANSITION",
    "message": "Cannot open registration from status REGISTRATION_OPEN",
    "details": null
  }
}
```

> Open registration is only valid from `DRAFT`. Calling it again has no effect on the data — the service rejects it cleanly.

---

#### Request 28 — Open Registration — Not Owner → 403

> **Pre-condition:** Reset the tournament to `DRAFT` in the database:
> ```sql
> UPDATE tournaments SET status = 'DRAFT' WHERE id = '<your tournament_id>';
> ```

Create a new request:

| Field | Value |
|---|---|
| Name | `Open Registration — Not Owner` |
| Method | `POST` |
| URL | `{{gateway_url}}/api/v1/tournaments/{{tournament_id}}/open` |

Authorization tab → Type: **Bearer Token** → Token: use a **different user's** access token (register a second account to get one).

Expected: **403 Forbidden**
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Only the tournament owner can perform this action",
    "details": null
  }
}
```

> If you do not have a second account, you can confirm this behaviour is covered by the automated tests (test: "should return 403 FORBIDDEN when caller is not the owner").

---

#### Request 29 — Close Registration

> **Pre-condition:** The tournament must be in `REGISTRATION_OPEN`. Either run Request 26 again, or set it via SQL:
> ```sql
> UPDATE tournaments SET status = 'REGISTRATION_OPEN' WHERE id = '<your tournament_id>';
> ```

| Field | Value |
|---|---|
| Name | `Close Registration` |
| Method | `POST` |
| URL | `{{gateway_url}}/api/v1/tournaments/{{tournament_id}}/close` |

No body. Authorization: Bearer Token → `{{access_token}}`.

Expected response — **200 OK**:
```json
{
  "data": {
    "tournament": {
      "id": "{{tournament_id}}",
      "status": "REGISTRATION_CLOSED",
      ...
    }
  }
}
```

**What to verify:**
- `status` changed to `REGISTRATION_CLOSED`

---

#### Request 30 — Close Registration — Wrong Status → 409

Duplicate Request 29. Name it `Close Registration — Wrong Status`.

> **Pre-condition:** Reset the tournament to `DRAFT` (not `REGISTRATION_OPEN`):
> ```sql
> UPDATE tournaments SET status = 'DRAFT' WHERE id = '<your tournament_id>';
> ```

Expected: **409 Conflict**
```json
{
  "error": {
    "code": "INVALID_STATUS_TRANSITION",
    "message": "Cannot close registration from status DRAFT",
    "details": null
  }
}
```

> Close registration is only valid from `REGISTRATION_OPEN`. Calling it from `DRAFT` (or any other status) is rejected.

---

#### Request 31 — Cancel Tournament

> **Pre-condition:** The tournament must not be in a terminal status (`COMPLETED` or `CANCELLED`). If it is, run Request 1 to create a fresh tournament and copy the new `tournament_id` into your environment, or reset via SQL:
> ```sql
> UPDATE tournaments SET status = 'DRAFT' WHERE id = '<your tournament_id>';
> ```

| Field | Value |
|---|---|
| Name | `Cancel Tournament` |
| Method | `POST` |
| URL | `{{gateway_url}}/api/v1/tournaments/{{tournament_id}}/cancel` |

No body. Authorization: Bearer Token → `{{access_token}}`.

Expected response — **200 OK**:
```json
{
  "data": {
    "tournament": {
      "id": "{{tournament_id}}",
      "status": "CANCELLED",
      ...
    }
  }
}
```

**What to verify:**
- `status` is `CANCELLED`
- The tournament can be cancelled from any non-terminal status (`DRAFT`, `REGISTRATION_OPEN`, `REGISTRATION_CLOSED`, etc.)

---

#### Request 32 — Cancel Tournament — Already Cancelled → 409

Duplicate Request 31. Name it `Cancel Tournament — Already Cancelled`.

Send it again **without resetting the status**. The tournament is now already `CANCELLED`.

Expected: **409 Conflict**
```json
{
  "error": {
    "code": "INVALID_STATUS_TRANSITION",
    "message": "Cannot cancel a tournament with status CANCELLED",
    "details": null
  }
}
```

> `CANCELLED` and `COMPLETED` are terminal states — no further transitions are allowed.

---

#### Request 33 — List Participants (empty)

> **Pre-condition:** Create a fresh tournament (run Request 1). The `tournament_id` variable is populated.

| Field | Value |
|---|---|
| Name | `List Participants` |
| Method | `GET` |
| URL | `{{gateway_url}}/api/v1/tournaments/{{tournament_id}}/participants` |

No body. Authorization: Bearer Token → `{{access_token}}`.

Expected response — **200 OK**:
```json
{
  "data": []
}
```

**What to verify:**
- `data` is an empty array — no participants yet. Participants are added through invitations (M8.7) or join requests (M8.8), not through this endpoint.
- The response is `200`, not `404` — the tournament exists, it just has no participants.

---

#### Request 34 — List Participants — Tournament Not Found → 404

Duplicate Request 33. Name it `List Participants — Not Found`.

Change the URL to:
```
{{gateway_url}}/api/v1/tournaments/00000000-0000-0000-0000-000000000099/participants
```

Expected: **404 Not Found**
```json
{
  "error": {
    "code": "TOURNAMENT_NOT_FOUND",
    "message": "Tournament not found",
    "details": null
  }
}
```

---

#### Request 35 — List Participants — No Token → 401

Duplicate Request 33. Name it `List Participants — No Token`.

Authorization tab → Type: **No Auth**.

Expected: **401 Unauthorized** with `UNAUTHORIZED`.

---

#### Request 36 — Withdraw Participant (by participant)

There is no HTTP endpoint yet to add a participant directly — that comes in M8.7 (invitations) and M8.8 (join requests). For now, seed one manually via SQL.

> **Pre-condition:** Run this SQL in your database client against `tournament_db`. Replace `<your_tournament_id>` with the value from your `tournament_id` environment variable, and replace `<any_user_uuid>` with any valid UUID (it represents a second user ID — it does not need to exist in `auth_db` because there is no cross-service FK):
> ```sql
> INSERT INTO tournament_participants (tournament_id, user_id)
> VALUES ('<your_tournament_id>', 'aaaaaaaa-0000-0000-0000-000000000001')
> RETURNING id;
> ```
>
> Copy the returned `id` and paste it into the `participant_id` variable in your **Api Gateway Local** environment.

Create a new request:

| Field | Value |
|---|---|
| Name | `Withdraw Participant` |
| Method | `POST` |
| URL | `{{gateway_url}}/api/v1/tournaments/{{tournament_id}}/participants/{{participant_id}}/withdraw` |

No body. Authorization: Bearer Token → `{{access_token}}`.

> **Important:** `{{access_token}}` belongs to your logged-in user (the tournament owner). But the participant `user_id` we inserted (`aaaaaaaa-0000-0000-0000-000000000001`) is a different user. This request succeeds because **the owner is allowed to withdraw any participant**. See Request 37 for why this is intentional.

Expected response — **200 OK**:
```json
{
  "data": {
    "participant": {
      "id": "{{participant_id}}",
      "tournament_id": "{{tournament_id}}",
      "user_id": "aaaaaaaa-0000-0000-0000-000000000001",
      "status": "WITHDRAWN",
      "withdrawn_at": "<timestamp>",
      "created_at": "<timestamp>",
      "updated_at": "<timestamp>"
    }
  }
}
```

**What to verify:**
- `status` is `WITHDRAWN`
- `withdrawn_at` is set to a timestamp (it was `null` before)
- `updated_at` is newer than `created_at`

---

#### Request 37 — Withdraw Participant — Third Party → 403

> **Pre-condition:** Seed a fresh participant (re-run the SQL from Request 36 to get a new APPROVED row, or reset the previous one):
> ```sql
> UPDATE tournament_participants SET status = 'APPROVED', withdrawn_at = NULL WHERE id = '<your_participant_id>';
> ```
>
> Or insert a new row and update `participant_id` in your environment.

Duplicate Request 36. Name it `Withdraw Participant — Third Party`.

Authorization tab → Type: **Bearer Token** → Token: use a **different user's** access token (register a second account, log in, copy that `access_token`).

The second user is neither the participant (`aaaaaaaa-...`) nor the tournament owner — they should be blocked.

Expected: **403 Forbidden**
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Only the participant or tournament owner can withdraw a participant",
    "details": null
  }
}
```

> If you do not have a second account, this case is fully covered by the automated tests.

---

#### Request 38 — Withdraw Participant — Already Withdrawn → 409

> **Pre-condition:** Run Request 36 successfully so the participant is already `WITHDRAWN`.

Duplicate Request 36. Name it `Withdraw Participant — Already Withdrawn`.

Send it again **without resetting the participant status**. The participant is already `WITHDRAWN`.

Expected: **409 Conflict**
```json
{
  "error": {
    "code": "PARTICIPANT_ALREADY_WITHDRAWN",
    "message": "Participant has already withdrawn",
    "details": null
  }
}
```

> Withdrawing twice is a no-op in intent, but the service rejects it cleanly rather than silently succeeding.

---

#### Request 39 — Withdraw Participant — Tournament Cancelled → 409

> **Pre-condition:**
> 1. Seed a fresh APPROVED participant (SQL from Request 36 — reset status or insert new row).
> 2. Cancel the tournament via SQL:
>    ```sql
>    UPDATE tournaments SET status = 'CANCELLED' WHERE id = '<your_tournament_id>';
>    ```

Duplicate Request 36. Name it `Withdraw Participant — Tournament Cancelled`.

Expected: **409 Conflict**
```json
{
  "error": {
    "code": "TOURNAMENT_NOT_MODIFIABLE",
    "message": "Cannot withdraw from a tournament with status CANCELLED",
    "details": null
  }
}
```

> CANCELLED and COMPLETED are terminal states. Participants cannot be withdrawn from a finished tournament.

> **After this test:** Reset the tournament back to a non-terminal status so Request 33 and further tests still work:
> ```sql
> UPDATE tournaments SET status = 'DRAFT' WHERE id = '<your_tournament_id>';
> ```

---

---

#### Request 40 — Create Invitation

> **Pre-condition:** Create a fresh tournament (run Request 1). Open registration via Request 26 or:
> ```sql
> UPDATE tournaments SET status = 'REGISTRATION_OPEN' WHERE id = '<your_tournament_id>';
> ```

| Field | Value |
|---|---|
| Name | `Create Invitation` |
| Method | `POST` |
| URL | `{{gateway_url}}/api/v1/tournaments/{{tournament_id}}/invitations` |

Authorization: Bearer Token → `{{access_token}}`.

Body → raw → JSON:
```json
{
  "invitee_id": "bbbbbbbb-0000-0000-0000-000000000001"
}
```

> This UUID represents a second user. It does not need to exist in `auth_db` — there is no cross-service FK.

Scripts → Post-response:
```javascript
const body = pm.response.json();
if (body.data && body.data.invitation) {
  pm.environment.set("invitation_id", body.data.invitation.id);
}
```

Expected response — **201 Created**:
```json
{
  "data": {
    "invitation": {
      "id": "<uuid>",
      "tournament_id": "{{tournament_id}}",
      "invitee_id": "bbbbbbbb-0000-0000-0000-000000000001",
      "status": "PENDING",
      "expires_at": null,
      "created_at": "<timestamp>",
      "updated_at": "<timestamp>"
    }
  }
}
```

**What to verify:**
- `status` is `PENDING`
- `invitation_id` is now saved — open the `Api Gateway Local` environment and confirm the Current Value column shows a UUID

---

#### Request 41 — Create Invitation — Not Owner → 403

Duplicate Request 40. Name it `Create Invitation — Not Owner`.

Authorization tab → Type: **Bearer Token** → Token: use a **different user's** access token.

Expected: **403 Forbidden**
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Only the tournament owner can send invitations",
    "details": null
  }
}
```

---

#### Request 42 — Create Invitation — Tournament Not Found → 404

Duplicate Request 40. Name it `Create Invitation — Not Found`.

Change the URL to:
```
{{gateway_url}}/api/v1/tournaments/00000000-0000-0000-0000-000000000099/invitations
```

Expected: **404 Not Found**
```json
{
  "error": {
    "code": "TOURNAMENT_NOT_FOUND",
    "message": "Tournament not found",
    "details": null
  }
}
```

---

#### Request 43 — Create Invitation — Registration Not Open → 409

> **Pre-condition:** Reset the tournament to `DRAFT`:
> ```sql
> UPDATE tournaments SET status = 'DRAFT' WHERE id = '<your_tournament_id>';
> ```

Duplicate Request 40. Name it `Create Invitation — Registration Not Open`.

Expected: **409 Conflict**
```json
{
  "error": {
    "code": "REGISTRATION_NOT_OPEN",
    "message": "Invitations can only be sent when registration is open",
    "details": null
  }
}
```

> **After this test:** Set the tournament back to `REGISTRATION_OPEN` before continuing:
> ```sql
> UPDATE tournaments SET status = 'REGISTRATION_OPEN' WHERE id = '<your_tournament_id>';
> ```

---

#### Request 44 — Create Invitation — Self-Invite → 409

Duplicate Request 40. Name it `Create Invitation — Self Invite`.

Change the body `invitee_id` to your own user UUID (the same user who owns the tournament). To find your UUID: paste your `access_token` into [jwt.io](https://jwt.io) — the `sub` field is your user ID.

Expected: **409 Conflict**
```json
{
  "error": {
    "code": "CANNOT_INVITE_SELF",
    "message": "Owner cannot invite themselves",
    "details": null
  }
}
```

---

#### Request 45 — Create Invitation — Already a Participant → 409

> **Pre-condition:** Seed an APPROVED participant with the same user UUID you are about to invite:
> ```sql
> INSERT INTO tournament_participants (tournament_id, user_id)
> VALUES ('<your_tournament_id>', 'bbbbbbbb-0000-0000-0000-000000000001');
> ```

Duplicate Request 40. Name it `Create Invitation — Already Participant`.

Expected: **409 Conflict**
```json
{
  "error": {
    "code": "ALREADY_A_PARTICIPANT",
    "message": "User is already an approved participant",
    "details": null
  }
}
```

> **After this test:** Delete that participant row so it does not interfere with subsequent requests:
> ```sql
> DELETE FROM tournament_participants WHERE tournament_id = '<your_tournament_id>' AND user_id = 'bbbbbbbb-0000-0000-0000-000000000001';
> ```

---

#### Request 46 — Create Invitation — Duplicate Pending → 409

> **Pre-condition:** Run Request 40 to create a PENDING invitation. `invitation_id` is now set.

Duplicate Request 40. Name it `Create Invitation — Duplicate Pending`.

Send it again **without cancelling the existing invitation**.

Expected: **409 Conflict**
```json
{
  "error": {
    "code": "PENDING_INVITATION_EXISTS",
    "message": "A pending invitation already exists for this user",
    "details": null
  }
}
```

> The partial unique index (`WHERE status = 'PENDING'`) enforces this. Once the existing invitation is cancelled or rejected, the owner can send a new one.

---

#### Request 47 — List Invitations

| Field | Value |
|---|---|
| Name | `List Invitations` |
| Method | `GET` |
| URL | `{{gateway_url}}/api/v1/tournaments/{{tournament_id}}/invitations` |

No body. Authorization: Bearer Token → `{{access_token}}`.

Expected response — **200 OK**:
```json
{
  "data": [
    {
      "id": "{{invitation_id}}",
      "tournament_id": "{{tournament_id}}",
      "invitee_id": "bbbbbbbb-0000-0000-0000-000000000001",
      "status": "PENDING",
      "expires_at": null,
      "created_at": "<timestamp>",
      "updated_at": "<timestamp>"
    }
  ]
}
```

**What to verify:**
- `data` is an array containing the invitation you created in Request 40
- All returned items belong to this tournament

---

#### Request 48 — List Invitations — Not Owner → 403

Duplicate Request 47. Name it `List Invitations — Not Owner`.

Authorization tab → Type: **Bearer Token** → Token: use a **different user's** access token.

Expected: **403 Forbidden**
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Only the tournament owner can list invitations",
    "details": null
  }
}
```

---

#### Request 49 — List Invitations — Tournament Not Found → 404

Duplicate Request 47. Name it `List Invitations — Not Found`.

Change the URL to:
```
{{gateway_url}}/api/v1/tournaments/00000000-0000-0000-0000-000000000099/invitations
```

Expected: **404 Not Found** with `TOURNAMENT_NOT_FOUND`.

---

#### Request 50 — Accept Invitation

> **Pre-condition:** A PENDING invitation must exist for user `bbbbbbbb-0000-0000-0000-000000000001`. Run Request 40 if `invitation_id` is not set or was already acted on.

| Field | Value |
|---|---|
| Name | `Accept Invitation` |
| Method | `PATCH` |
| URL | `{{gateway_url}}/api/v1/tournaments/{{tournament_id}}/invitations/{{invitation_id}}` |

Authorization tab → Type: **Bearer Token** → Token: use the **invitee's** access token (register as `bbbbbbbb-...` or use a second account whose UUID you placed in the invitation body).

Body → raw → JSON:
```json
{
  "status": "ACCEPTED"
}
```

Expected response — **200 OK**:
```json
{
  "data": {
    "invitation": {
      "id": "{{invitation_id}}",
      "tournament_id": "{{tournament_id}}",
      "invitee_id": "<invitee uuid>",
      "status": "ACCEPTED",
      "expires_at": null,
      "created_at": "<timestamp>",
      "updated_at": "<timestamp>"
    }
  }
}
```

**What to verify:**
- `status` is `ACCEPTED`
- Run Request 33 (List Participants) — the invitee now appears as an `APPROVED` participant
- `updated_at` is newer than `created_at`

> **Why this matters:** Accepting an invitation is the primary way players become participants in an invitation-only tournament. The service atomically updates the invitation status and creates the participant row.

---

#### Request 51 — Reject Invitation

> **Pre-condition:** Create a fresh PENDING invitation (run Request 40 again after cancelling or accepting the previous one, or use a new invitee UUID).

Duplicate Request 50. Name it `Reject Invitation`.

Body → raw → JSON:
```json
{
  "status": "REJECTED"
}
```

Authorization: use the **invitee's** token.

Expected response — **200 OK**:
```json
{
  "data": {
    "invitation": {
      "status": "REJECTED",
      ...
    }
  }
}
```

**What to verify:**
- `status` is `REJECTED`
- Running List Participants (Request 33) confirms **no new participant was created** — rejection does not add the user

---

#### Request 52 — Cancel Invitation (by owner)

> **Pre-condition:** Create a fresh PENDING invitation (run Request 40).

| Field | Value |
|---|---|
| Name | `Cancel Invitation` |
| Method | `PATCH` |
| URL | `{{gateway_url}}/api/v1/tournaments/{{tournament_id}}/invitations/{{invitation_id}}` |

Authorization: Bearer Token → `{{access_token}}` (the **owner's** token).

Body → raw → JSON:
```json
{
  "status": "CANCELLED"
}
```

Expected response — **200 OK**:
```json
{
  "data": {
    "invitation": {
      "status": "CANCELLED",
      ...
    }
  }
}
```

**What to verify:**
- `status` is `CANCELLED`
- Run Request 40 again with the same `invitee_id` — it should now succeed with 201 (the CANCELLED invitation does not block re-inviting)

---

#### Request 53 — Update Invitation — Not Pending → 409

> **Pre-condition:** Run Request 51 or 52 so the invitation is no longer PENDING.

Duplicate Request 50. Name it `Update Invitation — Not Pending`.

Expected: **409 Conflict**
```json
{
  "error": {
    "code": "INVITATION_NOT_PENDING",
    "message": "Invitation cannot be updated from status REJECTED",
    "details": null
  }
}
```

> Once an invitation reaches any terminal status (ACCEPTED, REJECTED, CANCELLED), it cannot be updated again.

---

#### Request 54 — Accept Invitation — Not the Invitee → 403

> **Pre-condition:** Create a fresh PENDING invitation (run Request 40).

Duplicate Request 50. Name it `Accept Invitation — Not Invitee`.

Authorization: Bearer Token → `{{access_token}}` (the **owner's** token, not the invitee).

Body:
```json
{
  "status": "ACCEPTED"
}
```

Expected: **403 Forbidden**
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Only the invited user can accept or reject an invitation",
    "details": null
  }
}
```

> Only the specific invitee can accept or reject. The owner cannot accept on their behalf.

---

#### Request 55 — Cancel Invitation — Not the Owner → 403

> **Pre-condition:** A PENDING invitation must still exist (from Request 40 or a fresh one).

Duplicate Request 52. Name it `Cancel Invitation — Not Owner`.

Authorization tab → Type: **Bearer Token** → Token: use the **invitee's** access token.

Body:
```json
{
  "status": "CANCELLED"
}
```

Expected: **403 Forbidden**
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Only the tournament owner can cancel an invitation",
    "details": null
  }
}
```

---

#### Request 56 — Update Invitation — Not Found → 404

| Field | Value |
|---|---|
| Name | `Update Invitation — Not Found` |
| Method | `PATCH` |
| URL | `{{gateway_url}}/api/v1/tournaments/{{tournament_id}}/invitations/00000000-0000-0000-0000-000000000099` |

Authorization: Bearer Token → `{{access_token}}`.

Body:
```json
{
  "status": "ACCEPTED"
}
```

Expected: **404 Not Found**
```json
{
  "error": {
    "code": "INVITATION_NOT_FOUND",
    "message": "Invitation not found",
    "details": null
  }
}
```

---

#### Request 57 — Re-invite After Cancel → 201

> **Pre-condition:** Cancel an invitation (run Request 52). The invitee now has a CANCELLED invitation.

Duplicate Request 40. Name it `Re-invite After Cancel`.

Send it with the same `invitee_id`.

Expected: **201 Created** — a new PENDING invitation is created.

> This confirms the partial unique index design: only one PENDING invitation is blocked per invitee, but once the previous one is cancelled the owner can send a fresh invitation.

---

---

#### Request 58 — Submit Join Request

> **Pre-condition:** Create a fresh tournament (run Request 1). Open registration via Request 26 or:
> ```sql
> UPDATE tournaments SET status = 'REGISTRATION_OPEN' WHERE id = '<your_tournament_id>';
> ```
>
> This request must be sent with a **different user's** access token — not the owner's. Register a second account and log in as that user to get a second `access_token`. Alternatively, see Request 61 to understand what happens when the owner tries to join.

| Field | Value |
|---|---|
| Name | `Submit Join Request` |
| Method | `POST` |
| URL | `{{gateway_url}}/api/v1/tournaments/{{tournament_id}}/join-requests` |

Authorization: Bearer Token → second user's `access_token` (not the owner).

No body — the player's identity comes from the `x-user-id` header injected by the gateway.

Scripts → Post-response:
```javascript
const body = pm.response.json();
if (body.data && body.data.join_request) {
  pm.environment.set("join_request_id", body.data.join_request.id);
}
```

Expected response — **201 Created**:
```json
{
  "data": {
    "join_request": {
      "id": "<uuid>",
      "tournament_id": "{{tournament_id}}",
      "user_id": "<second user uuid>",
      "status": "PENDING",
      "created_at": "<timestamp>",
      "updated_at": "<timestamp>"
    }
  }
}
```

**What to verify:**
- `status` is `PENDING`
- `user_id` matches the second user's UUID (not the owner's)
- `join_request_id` is now saved — open the `Api Gateway Local` environment and confirm the Current Value column shows a UUID

---

#### Request 59 — Submit Join Request — Tournament Not Found → 404

Duplicate Request 58. Name it `Submit Join Request — Not Found`.

Change the URL to:
```
{{gateway_url}}/api/v1/tournaments/00000000-0000-0000-0000-000000000099/join-requests
```

Expected: **404 Not Found**
```json
{
  "error": {
    "code": "TOURNAMENT_NOT_FOUND",
    "message": "Tournament not found",
    "details": null
  }
}
```

---

#### Request 60 — Submit Join Request — Registration Not Open → 409

> **Pre-condition:** Reset the tournament to `DRAFT`:
> ```sql
> UPDATE tournaments SET status = 'DRAFT' WHERE id = '<your_tournament_id>';
> ```

Duplicate Request 58. Name it `Submit Join Request — Registration Not Open`.

Expected: **409 Conflict**
```json
{
  "error": {
    "code": "REGISTRATION_NOT_OPEN",
    "message": "Join requests can only be submitted when registration is open",
    "details": null
  }
}
```

> **After this test:** Set the tournament back to `REGISTRATION_OPEN` before continuing:
> ```sql
> UPDATE tournaments SET status = 'REGISTRATION_OPEN' WHERE id = '<your_tournament_id>';
> ```

---

#### Request 61 — Submit Join Request — Owner Cannot Join Own Tournament → 409

Duplicate Request 58. Name it `Submit Join Request — Owner Blocked`.

Authorization tab → Type: **Bearer Token** → Token: `{{access_token}}` (the **owner's** token).

Expected: **409 Conflict**
```json
{
  "error": {
    "code": "CANNOT_JOIN_OWN_TOURNAMENT",
    "message": "The tournament owner cannot submit a join request",
    "details": null
  }
}
```

> This is the symmetric rule to the invitation self-invite guard. The owner runs the tournament — they cannot be a participant in it.

---

#### Request 62 — Submit Join Request — Already a Participant → 409

> **Pre-condition:** Seed an APPROVED participant row for the second user:
> ```sql
> INSERT INTO tournament_participants (tournament_id, user_id)
> VALUES ('<your_tournament_id>', '<second user uuid>');
> ```

Duplicate Request 58. Name it `Submit Join Request — Already Participant`.

Authorization: second user's token.

Expected: **409 Conflict**
```json
{
  "error": {
    "code": "ALREADY_A_PARTICIPANT",
    "message": "User is already an approved participant",
    "details": null
  }
}
```

> **After this test:** Delete that participant row so it does not interfere with subsequent requests:
> ```sql
> DELETE FROM tournament_participants WHERE tournament_id = '<your_tournament_id>' AND user_id = '<second user uuid>';
> ```

---

#### Request 63 — Submit Join Request — Duplicate Pending → 409

> **Pre-condition:** Run Request 58 to create a PENDING join request. `join_request_id` is now set.

Duplicate Request 58. Name it `Submit Join Request — Duplicate Pending`.

Send it again **without cancelling the existing request**.

Expected: **409 Conflict**
```json
{
  "error": {
    "code": "PENDING_JOIN_REQUEST_EXISTS",
    "message": "A pending join request already exists for this user",
    "details": null
  }
}
```

> The partial unique index (`WHERE status = 'PENDING'`) enforces this. Once the existing request is rejected or cancelled, the player can submit a new one.

---

#### Request 64 — List Join Requests

| Field | Value |
|---|---|
| Name | `List Join Requests` |
| Method | `GET` |
| URL | `{{gateway_url}}/api/v1/tournaments/{{tournament_id}}/join-requests` |

No body. Authorization: Bearer Token → `{{access_token}}` (the **owner's** token).

Expected response — **200 OK**:
```json
{
  "data": [
    {
      "id": "{{join_request_id}}",
      "tournament_id": "{{tournament_id}}",
      "user_id": "<second user uuid>",
      "status": "PENDING",
      "created_at": "<timestamp>",
      "updated_at": "<timestamp>"
    }
  ]
}
```

**What to verify:**
- `data` is an array containing the join request submitted in Request 58
- All items belong to this tournament

---

#### Request 65 — List Join Requests — Not Owner → 403

Duplicate Request 64. Name it `List Join Requests — Not Owner`.

Authorization tab → Type: **Bearer Token** → Token: use the **second user's** access token (the same user who submitted the join request).

Expected: **403 Forbidden**
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Only the tournament owner can list join requests",
    "details": null
  }
}
```

---

#### Request 66 — List Join Requests — Tournament Not Found → 404

Duplicate Request 64. Name it `List Join Requests — Not Found`.

Change the URL to:
```
{{gateway_url}}/api/v1/tournaments/00000000-0000-0000-0000-000000000099/join-requests
```

Expected: **404 Not Found** with `TOURNAMENT_NOT_FOUND`.

---

#### Request 67 — Approve Join Request

> **Pre-condition:** A PENDING join request must exist (`join_request_id` is set from Request 58). The tournament must be in `REGISTRATION_OPEN`.

| Field | Value |
|---|---|
| Name | `Approve Join Request` |
| Method | `PATCH` |
| URL | `{{gateway_url}}/api/v1/tournaments/{{tournament_id}}/join-requests/{{join_request_id}}` |

Authorization: Bearer Token → `{{access_token}}` (the **owner's** token).

Body → raw → JSON:
```json
{
  "status": "APPROVED"
}
```

Expected response — **200 OK**:
```json
{
  "data": {
    "join_request": {
      "id": "{{join_request_id}}",
      "tournament_id": "{{tournament_id}}",
      "user_id": "<second user uuid>",
      "status": "APPROVED",
      "created_at": "<timestamp>",
      "updated_at": "<timestamp>"
    }
  }
}
```

**What to verify:**
- `status` is `APPROVED`
- Run Request 33 (List Participants) — the second user now appears as an `APPROVED` participant
- `updated_at` is newer than `created_at`

> **Why this matters:** Approving a join request is the public-link equivalent of accepting an invitation. The service atomically updates the join request status and creates the participant row via the same `approveParticipant` method used by the invitation flow — the capacity check runs in the same place for both paths.

---

#### Request 68 — Reject Join Request

> **Pre-condition:** Create a fresh PENDING join request (run Request 58 with a user that has no existing pending request, or cancel the previous one and re-submit).

| Field | Value |
|---|---|
| Name | `Reject Join Request` |
| Method | `PATCH` |
| URL | `{{gateway_url}}/api/v1/tournaments/{{tournament_id}}/join-requests/{{join_request_id}}` |

Authorization: Bearer Token → `{{access_token}}` (the **owner's** token).

Body → raw → JSON:
```json
{
  "status": "REJECTED"
}
```

Expected response — **200 OK**:
```json
{
  "data": {
    "join_request": {
      "status": "REJECTED",
      ...
    }
  }
}
```

**What to verify:**
- `status` is `REJECTED`
- Running List Participants (Request 33) confirms **no new participant was created** — rejection does not add the user
- The player can submit a new join request after rejection (the partial unique index only blocks PENDING duplicates)

---

#### Request 69 — Cancel Join Request (by the requesting player)

> **Pre-condition:** Create a fresh PENDING join request (run Request 58).

| Field | Value |
|---|---|
| Name | `Cancel Join Request` |
| Method | `PATCH` |
| URL | `{{gateway_url}}/api/v1/tournaments/{{tournament_id}}/join-requests/{{join_request_id}}` |

Authorization tab → Type: **Bearer Token** → Token: use the **second user's** access token (the player who submitted the request).

Body → raw → JSON:
```json
{
  "status": "CANCELLED"
}
```

Expected response — **200 OK**:
```json
{
  "data": {
    "join_request": {
      "status": "CANCELLED",
      ...
    }
  }
}
```

**What to verify:**
- `status` is `CANCELLED`
- Run Request 58 again with the same user — it should succeed with 201 (the CANCELLED request does not block re-applying)

> This is the inverse of the invitation cancel: here it is the **player** who cancels, not the owner. If the owner wants to remove a pending request they must reject it (Request 68).

---

#### Request 70 — Approve Join Request — Not Owner → 403

> **Pre-condition:** A PENDING join request must exist.

Duplicate Request 67. Name it `Approve Join Request — Not Owner`.

Authorization tab → Type: **Bearer Token** → Token: use the **second user's** access token (the same user who submitted the request).

Body:
```json
{
  "status": "APPROVED"
}
```

Expected: **403 Forbidden**
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Only the tournament owner can approve or reject join requests",
    "details": null
  }
}
```

---

#### Request 71 — Cancel Join Request — Not the Requester → 403

> **Pre-condition:** A PENDING join request must exist from the second user.

| Field | Value |
|---|---|
| Name | `Cancel Join Request — Not Requester` |
| Method | `PATCH` |
| URL | `{{gateway_url}}/api/v1/tournaments/{{tournament_id}}/join-requests/{{join_request_id}}` |

Authorization: Bearer Token → `{{access_token}}` (the **owner's** token — a different user from the requester).

Body:
```json
{
  "status": "CANCELLED"
}
```

Expected: **403 Forbidden**
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Only the requesting user can cancel their join request",
    "details": null
  }
}
```

> Only the player who submitted the request can cancel it. The owner must use `REJECTED` to remove a pending request.

---

#### Request 72 — Update Join Request — Not Pending → 409

> **Pre-condition:** Run Request 68 or 69 so the join request is no longer PENDING.

Duplicate Request 67. Name it `Update Join Request — Not Pending`.

Expected: **409 Conflict**
```json
{
  "error": {
    "code": "JOIN_REQUEST_NOT_PENDING",
    "message": "Join request cannot be updated from status REJECTED",
    "details": null
  }
}
```

> Once a join request reaches any terminal status (APPROVED, REJECTED, CANCELLED), it cannot be updated again.

---

#### Request 73 — Update Join Request — Not Found → 404

| Field | Value |
|---|---|
| Name | `Update Join Request — Not Found` |
| Method | `PATCH` |
| URL | `{{gateway_url}}/api/v1/tournaments/{{tournament_id}}/join-requests/00000000-0000-0000-0000-000000000099` |

Authorization: Bearer Token → `{{access_token}}`.

Body:
```json
{
  "status": "APPROVED"
}
```

Expected: **404 Not Found**
```json
{
  "error": {
    "code": "JOIN_REQUEST_NOT_FOUND",
    "message": "Join request not found",
    "details": null
  }
}
```

---

---

#### Request 74 — Submit Captain Request

> **Pre-condition:** Create a fresh tournament (run Request 1). Open registration (Request 26 or SQL). The request must come from an **approved participant** — not the owner.
>
> Seed an approved participant for the second user:
> ```sql
> INSERT INTO tournament_participants (tournament_id, user_id)
> VALUES ('<your_tournament_id>', '<second user uuid>');
> ```
>
> This request must be sent with the **second user's** access token.

| Field | Value |
|---|---|
| Name | `Submit Captain Request` |
| Method | `POST` |
| URL | `{{gateway_url}}/api/v1/tournaments/{{tournament_id}}/captain-requests` |

Authorization: Bearer Token → second user's `access_token`.

No body — the participant is identified by the `x-user-id` header injected by the gateway.

Scripts → Post-response:
```javascript
const body = pm.response.json();
if (body.data && body.data.captain_request) {
  pm.environment.set("captain_request_id", body.data.captain_request.id);
}
```

Expected response — **201 Created**:
```json
{
  "data": {
    "captain_request": {
      "id": "<uuid>",
      "tournament_id": "{{tournament_id}}",
      "participant_id": "<participant uuid>",
      "status": "PENDING",
      "created_at": "<timestamp>",
      "updated_at": "<timestamp>"
    }
  }
}
```

**What to verify:**
- `status` is `PENDING`
- `participant_id` is the participant's row UUID (not the user's UUID — it references `tournament_participants.id`)
- `captain_request_id` is now saved — open the `Api Gateway Local` environment and confirm the Current Value column shows a UUID

> **Why `participant_id` and not `user_id`?** Unlike join requests, a captain request references the `tournament_participants` row rather than the raw user UUID. This enforces that only approved participants can express interest, and the unique constraint (`UNIQUE(tournament_id, participant_id)`) lives on the participant record — not the user identity.

---

#### Request 75 — Submit Captain Request — Tournament Not Found → 404

Duplicate Request 74. Name it `Submit Captain Request — Not Found`.

Change the URL to:
```
{{gateway_url}}/api/v1/tournaments/00000000-0000-0000-0000-000000000099/captain-requests
```

Expected: **404 Not Found**
```json
{
  "error": {
    "code": "TOURNAMENT_NOT_FOUND",
    "message": "Tournament not found",
    "details": null
  }
}
```

---

#### Request 76 — Submit Captain Request — Registration Not Open → 409

> **Pre-condition:** Reset the tournament to `DRAFT`:
> ```sql
> UPDATE tournaments SET status = 'DRAFT' WHERE id = '<your_tournament_id>';
> ```

Duplicate Request 74. Name it `Submit Captain Request — Registration Not Open`.

Expected: **409 Conflict**
```json
{
  "error": {
    "code": "REGISTRATION_NOT_OPEN",
    "message": "Captain requests can only be submitted when registration is open",
    "details": null
  }
}
```

> **After this test:** Set the tournament back to `REGISTRATION_OPEN` before continuing:
> ```sql
> UPDATE tournaments SET status = 'REGISTRATION_OPEN' WHERE id = '<your_tournament_id>';
> ```

---

#### Request 77 — Submit Captain Request — Not a Participant → 403

Duplicate Request 74. Name it `Submit Captain Request — Not Participant`.

Authorization tab → Type: **Bearer Token** → Token: `{{access_token}}` (the **owner's** token — the owner is not a participant).

Expected: **403 Forbidden**
```json
{
  "error": {
    "code": "NOT_A_PARTICIPANT",
    "message": "Only approved participants can submit a captain request",
    "details": null
  }
}
```

> This also fires for any user who is not in `tournament_participants` for this tournament with status `APPROVED` — not just the owner.

---

#### Request 78 — Submit Captain Request — Duplicate → 409

> **Pre-condition:** Run Request 74 so a captain request already exists. `captain_request_id` is set.

Duplicate Request 74. Name it `Submit Captain Request — Duplicate`.

Send it again **without cancelling or rejecting the existing request**.

Expected: **409 Conflict**
```json
{
  "error": {
    "code": "CAPTAIN_REQUEST_ALREADY_EXISTS",
    "message": "A captain request already exists for this participant",
    "details": null
  }
}
```

> **Why is this different from join requests?** Join requests use a *partial* unique index on `PENDING` only — a player can re-request after rejection. Captain requests use a *full* unique constraint on `(tournament_id, participant_id)` — once a request exists (in any status), it cannot be re-submitted. This is by design: the captain request is an interest/audit record, not a repeated application flow. See Request 85 for confirmation that this also blocks re-submission after cancellation.

---

#### Request 79 — List Captain Requests

| Field | Value |
|---|---|
| Name | `List Captain Requests` |
| Method | `GET` |
| URL | `{{gateway_url}}/api/v1/tournaments/{{tournament_id}}/captain-requests` |

No body. Authorization: Bearer Token → `{{access_token}}` (the **owner's** token).

Expected response — **200 OK**:
```json
{
  "data": [
    {
      "id": "{{captain_request_id}}",
      "tournament_id": "{{tournament_id}}",
      "participant_id": "<participant uuid>",
      "status": "PENDING",
      "created_at": "<timestamp>",
      "updated_at": "<timestamp>"
    }
  ]
}
```

**What to verify:**
- `data` is an array containing the captain request submitted in Request 74
- All items belong to this tournament

---

#### Request 80 — List Captain Requests — Not Owner → 403

Duplicate Request 79. Name it `List Captain Requests — Not Owner`.

Authorization tab → Type: **Bearer Token** → Token: use the **second user's** access token.

Expected: **403 Forbidden**
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Only the tournament owner can list captain requests",
    "details": null
  }
}
```

---

#### Request 81 — Reject Captain Request (by owner)

> **Pre-condition:** A PENDING captain request must exist (`captain_request_id` is set from Request 74).

| Field | Value |
|---|---|
| Name | `Reject Captain Request` |
| Method | `PATCH` |
| URL | `{{gateway_url}}/api/v1/tournaments/{{tournament_id}}/captain-requests/{{captain_request_id}}` |

Authorization: Bearer Token → `{{access_token}}` (the **owner's** token).

Body → raw → JSON:
```json
{
  "status": "REJECTED"
}
```

Expected response — **200 OK**:
```json
{
  "data": {
    "captain_request": {
      "id": "{{captain_request_id}}",
      "tournament_id": "{{tournament_id}}",
      "participant_id": "<participant uuid>",
      "status": "REJECTED",
      "created_at": "<timestamp>",
      "updated_at": "<timestamp>"
    }
  }
}
```

**What to verify:**
- `status` is `REJECTED`
- `updated_at` is newer than `created_at`

> Rejecting a captain request does not remove the user as a participant. They remain an approved participant — the owner simply indicated they will not be captain.

---

#### Request 82 — Cancel Captain Request (by participant)

> **Pre-condition:** Create a fresh PENDING captain request. If you just ran Request 81, you need to seed a new captain request. Because the full unique constraint blocks re-submission, the easiest way is to create a **new participant** (a third user), seed them as approved, and have them submit a captain request:
> ```sql
> INSERT INTO tournament_participants (tournament_id, user_id)
> VALUES ('<your_tournament_id>', 'cccccccc-0000-0000-0000-000000000001');
> ```
> Then run Request 74 as that third user and save the new `captain_request_id`.

| Field | Value |
|---|---|
| Name | `Cancel Captain Request` |
| Method | `PATCH` |
| URL | `{{gateway_url}}/api/v1/tournaments/{{tournament_id}}/captain-requests/{{captain_request_id}}` |

Authorization tab → Type: **Bearer Token** → Token: use the **participant's** access token (the user who submitted the captain request).

Body → raw → JSON:
```json
{
  "status": "CANCELLED"
}
```

Expected response — **200 OK**:
```json
{
  "data": {
    "captain_request": {
      "status": "CANCELLED",
      ...
    }
  }
}
```

**What to verify:**
- `status` is `CANCELLED`

---

#### Request 83 — Update Captain Request — Not Pending → 409

> **Pre-condition:** Run Request 81 or 82 so the captain request is no longer PENDING.

Duplicate Request 81. Name it `Update Captain Request — Not Pending`.

Expected: **409 Conflict**
```json
{
  "error": {
    "code": "CAPTAIN_REQUEST_NOT_PENDING",
    "message": "Captain request cannot be updated from status REJECTED",
    "details": null
  }
}
```

---

#### Request 84 — Update Captain Request — Not Found → 404

| Field | Value |
|---|---|
| Name | `Update Captain Request — Not Found` |
| Method | `PATCH` |
| URL | `{{gateway_url}}/api/v1/tournaments/{{tournament_id}}/captain-requests/00000000-0000-0000-0000-000000000099` |

Authorization: Bearer Token → `{{access_token}}`.

Body → raw → JSON:
```json
{
  "status": "REJECTED"
}
```

Expected: **404 Not Found**
```json
{
  "error": {
    "code": "CAPTAIN_REQUEST_NOT_FOUND",
    "message": "Captain request not found",
    "details": null
  }
}
```

---

#### Request 85 — Re-submit After Cancellation → 409 (Full UNIQUE)

> **Pre-condition:** Run Request 82 so the participant's captain request is `CANCELLED`.

Duplicate Request 74. Name it `Submit Captain Request — Blocked After Cancel`.

Send it with the **same participant's** access token.

Expected: **409 Conflict**
```json
{
  "error": {
    "code": "CAPTAIN_REQUEST_ALREADY_EXISTS",
    "message": "A captain request already exists for this participant",
    "details": null
  }
}
```

> This confirms the full `UNIQUE(tournament_id, participant_id)` constraint. Unlike join requests (partial index on PENDING), a cancelled captain request permanently blocks re-submission. The cancelled record stays in the database as an audit trail.

---

---

---

#### Request 87 — Create Team

> **Pre-condition:** Create a fresh tournament (run Request 1). Close registration via Request 29 or:
> ```sql
> UPDATE tournaments SET status = 'REGISTRATION_CLOSED' WHERE id = '<your_tournament_id>';
> ```

| Field | Value |
|---|---|
| Name | `Create Team` |
| Method | `POST` |
| URL | `{{gateway_url}}/api/v1/tournaments/{{tournament_id}}/teams` |

Authorization: Bearer Token → `{{access_token}}`.

Body → raw → JSON:
```json
{
  "name": "Team Alpha"
}
```

Scripts → Post-response:
```javascript
const body = pm.response.json();
if (body.data && body.data.team) {
  pm.environment.set("team_id", body.data.team.id);
}
```

Expected response — **201 Created**:
```json
{
  "data": {
    "team": {
      "id": "<uuid>",
      "tournament_id": "{{tournament_id}}",
      "name": "Team Alpha",
      "status": "FORMING",
      "created_at": "<timestamp>",
      "updated_at": "<timestamp>"
    }
  }
}
```

**What to verify:**
- `status` is `FORMING` — the initial status for all newly created teams
- `tournament_id` matches your environment variable
- `team_id` is now saved — open the `Api Gateway Local` environment and confirm the Current Value column shows a UUID

---

#### Request 88 — Create Team — Not Owner → 403

Duplicate Request 87. Name it `Create Team — Not Owner`.

Authorization tab → Type: **Bearer Token** → Token: use a **different user's** access token.

Expected: **403 Forbidden**
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Only the tournament owner can create teams",
    "details": null
  }
}
```

---

#### Request 89 — Create Team — Wrong Status → 409

> **Pre-condition:** Create a fresh tournament (run Request 1). The tournament is in `DRAFT` status.

Duplicate Request 87. Name it `Create Team — Wrong Status`.

Use the new tournament's ID (update `tournament_id` in your environment or change the URL directly).

Expected: **409 Conflict**
```json
{
  "error": {
    "code": "INVALID_TOURNAMENT_STATUS",
    "message": "Teams can only be created when registration is closed",
    "details": null
  }
}
```

> Teams can only be created when the tournament is in `REGISTRATION_CLOSED` or `TEAM_FORMATION`. Any earlier status (DRAFT, REGISTRATION_OPEN) is rejected.

---

#### Request 90 — Create Team — Duplicate Name → 409

> **Pre-condition:** Run Request 87 so "Team Alpha" already exists.

Duplicate Request 87. Name it `Create Team — Duplicate Name`.

Send it again **with the same name** without changing anything.

Expected: **409 Conflict**
```json
{
  "error": {
    "code": "TEAM_NAME_TAKEN",
    "message": "A team with that name already exists in this tournament",
    "details": null
  }
}
```

> Team names must be unique within a tournament. The same name is allowed in a different tournament — the uniqueness is scoped per tournament.

---

#### Request 91 — Create Team — Tournament Not Found → 404

Duplicate Request 87. Name it `Create Team — Not Found`.

Change the URL to:
```
{{gateway_url}}/api/v1/tournaments/00000000-0000-0000-0000-000000000099/teams
```

Expected: **404 Not Found**
```json
{
  "error": {
    "code": "TOURNAMENT_NOT_FOUND",
    "message": "Tournament not found",
    "details": null
  }
}
```

---

#### Request 92 — List Teams

> **Pre-condition:** Run Request 87 to create at least one team. `tournament_id` and `team_id` are set.

| Field | Value |
|---|---|
| Name | `List Teams` |
| Method | `GET` |
| URL | `{{gateway_url}}/api/v1/tournaments/{{tournament_id}}/teams` |

No body. Authorization: Bearer Token → `{{access_token}}`.

Expected response — **200 OK**:
```json
{
  "data": [
    {
      "id": "{{team_id}}",
      "tournament_id": "{{tournament_id}}",
      "name": "Team Alpha",
      "status": "FORMING",
      "created_at": "<timestamp>",
      "updated_at": "<timestamp>"
    }
  ]
}
```

**What to verify:**
- `data` is an array
- Each team belongs to `{{tournament_id}}`
- Create a second team ("Team Beta") via Request 87, then run List Teams again — the array should show both

---

#### Request 93 — List Teams — Tournament Not Found → 404

Duplicate Request 92. Name it `List Teams — Not Found`.

Change the URL to:
```
{{gateway_url}}/api/v1/tournaments/00000000-0000-0000-0000-000000000099/teams
```

Expected: **404 Not Found** with `TOURNAMENT_NOT_FOUND`.

---

#### Request 94 — Get Team

| Field | Value |
|---|---|
| Name | `Get Team` |
| Method | `GET` |
| URL | `{{gateway_url}}/api/v1/tournaments/{{tournament_id}}/teams/{{team_id}}` |

No body. Authorization: Bearer Token → `{{access_token}}`.

Expected response — **200 OK**:
```json
{
  "data": {
    "team": {
      "id": "{{team_id}}",
      "tournament_id": "{{tournament_id}}",
      "name": "Team Alpha",
      "status": "FORMING",
      "created_at": "<timestamp>",
      "updated_at": "<timestamp>"
    }
  }
}
```

**What to verify:**
- `id` matches `team_id` in your environment
- `tournament_id` matches your tournament

---

#### Request 95 — Get Team — Not Found → 404

Duplicate Request 94. Name it `Get Team — Not Found`.

Change the URL to:
```
{{gateway_url}}/api/v1/tournaments/{{tournament_id}}/teams/00000000-0000-0000-0000-000000000099
```

Expected: **404 Not Found**
```json
{
  "error": {
    "code": "TEAM_NOT_FOUND",
    "message": "Team not found",
    "details": null
  }
}
```

> This also fires when the team ID is valid but belongs to a different tournament — the service checks both existence and tournament ownership.

---

#### Request 96 — Update Team Name

> **Pre-condition:** Run Request 87. `team_id` is set and the tournament is `REGISTRATION_CLOSED`.

| Field | Value |
|---|---|
| Name | `Update Team` |
| Method | `PATCH` |
| URL | `{{gateway_url}}/api/v1/tournaments/{{tournament_id}}/teams/{{team_id}}` |

Authorization: Bearer Token → `{{access_token}}`.

Body → raw → JSON:
```json
{
  "name": "Team Omega"
}
```

Expected response — **200 OK**:
```json
{
  "data": {
    "team": {
      "id": "{{team_id}}",
      "tournament_id": "{{tournament_id}}",
      "name": "Team Omega",
      "status": "FORMING",
      "created_at": "<timestamp>",
      "updated_at": "<timestamp>"
    }
  }
}
```

**What to verify:**
- `name` is now `"Team Omega"`
- `status` is still `FORMING` — PATCH cannot change team status
- `updated_at` is newer than `created_at`

---

#### Request 97 — Update Team — Not Owner → 403

Duplicate Request 96. Name it `Update Team — Not Owner`.

Authorization tab → Type: **Bearer Token** → Token: use a **different user's** access token.

Expected: **403 Forbidden**
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Only the tournament owner can update teams",
    "details": null
  }
}
```

---

#### Request 98 — Update Team — Wrong Status → 409

> **Pre-condition:** Create a fresh tournament (run Request 1). Do **not** close registration — leave it in `DRAFT`.

Duplicate Request 96. Name it `Update Team — Wrong Status`.

Update the URL to use the new tournament's ID (or update `tournament_id`), and use any team UUID in the path (even a non-existent one — the status check fires before the team lookup).

Expected: **409 Conflict**
```json
{
  "error": {
    "code": "INVALID_TOURNAMENT_STATUS",
    "message": "Teams can only be updated when registration is closed",
    "details": null
  }
}
```

---

#### Request 99 — Update Team — Duplicate Name → 409

> **Pre-condition:** Create two teams in the same tournament — "Team Alpha" and "Team Beta" (run Request 87 twice with different names). `team_id` should be set to Team Beta's ID.

Duplicate Request 96. Name it `Update Team — Duplicate Name`.

Body → raw → JSON:
```json
{
  "name": "Team Alpha"
}
```

Expected: **409 Conflict**
```json
{
  "error": {
    "code": "TEAM_NAME_TAKEN",
    "message": "A team with that name already exists in this tournament",
    "details": null
  }
}
```

---

---

#### Request 100 — Add Team Member

> **Pre-condition:** Create a fresh tournament (run Request 1). Close registration (Request 29 or SQL). Create a team (Request 87 — `team_id` saved). Seed an approved participant:
> ```sql
> INSERT INTO tournament_participants (tournament_id, user_id)
> VALUES ('<your_tournament_id>', 'aaaaaaaa-0000-0000-0000-000000000001')
> RETURNING id;
> ```
> Copy the returned `id` — you will paste it into the body below.

| Field | Value |
|---|---|
| Name | `Add Team Member` |
| Method | `POST` |
| URL | `{{gateway_url}}/api/v1/tournaments/{{tournament_id}}/teams/{{team_id}}/members` |

Authorization: Bearer Token → `{{access_token}}`.

Body → raw → JSON:
```json
{
  "participant_id": "<participant uuid from SQL above>",
  "member_role": "PLAYER",
  "squad_status": "MAIN"
}
```

Scripts → Post-response:
```javascript
const body = pm.response.json();
if (body.data && body.data.member) {
  pm.environment.set("member_id", body.data.member.id);
}
```

Expected response — **201 Created**:
```json
{
  "data": {
    "member": {
      "id": "<uuid>",
      "team_id": "{{team_id}}",
      "participant_id": "<participant uuid>",
      "member_role": "PLAYER",
      "squad_status": "MAIN",
      "created_at": "<timestamp>",
      "updated_at": "<timestamp>"
    }
  }
}
```

**What to verify:**
- `member_role` is `PLAYER` and `squad_status` is `MAIN`
- `team_id` matches your environment variable
- `member_id` is now saved — open the `Api Gateway Local` environment and confirm the Current Value column shows a UUID

---

#### Request 101 — Add Team Member — Not Owner → 403

Duplicate Request 100. Name it `Add Team Member — Not Owner`.

Authorization tab → Type: **Bearer Token** → Token: use a **different user's** access token.

Expected: **403 Forbidden**
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Only the tournament owner can manage team members",
    "details": null
  }
}
```

---

#### Request 102 — Add Team Member — Wrong Tournament Status → 409

> **Pre-condition:** Create a fresh tournament (run Request 1). Do **not** close registration — leave it in `DRAFT`.

Duplicate Request 100. Name it `Add Team Member — Wrong Status`.

Update the URL to use the new tournament's ID. Use any team UUID and participant UUID in the body.

Expected: **409 Conflict**
```json
{
  "error": {
    "code": "INVALID_TOURNAMENT_STATUS",
    "message": "Team members can only be managed when registration is closed",
    "details": null
  }
}
```

> Team member management is only allowed in `REGISTRATION_CLOSED` or `TEAM_FORMATION`.

---

#### Request 103 — Add Team Member — Participant Not Found → 404

> **Pre-condition:** Tournament is `REGISTRATION_CLOSED`. `team_id` is set.

Duplicate Request 100. Name it `Add Team Member — Participant Not Found`.

Change the body:
```json
{
  "participant_id": "00000000-0000-0000-0000-000000000099",
  "member_role": "PLAYER",
  "squad_status": "MAIN"
}
```

Expected: **404 Not Found**
```json
{
  "error": {
    "code": "PARTICIPANT_NOT_FOUND",
    "message": "Participant not found or not approved in this tournament",
    "details": null
  }
}
```

> This also fires when the participant UUID exists but belongs to a different tournament.

---

#### Request 104 — Add Team Member — Team Full → 409

> **Pre-condition:** Tournament was created with `team_size: 2` and `substitutes_enabled: false` (capacity = 2 per team). Seed two approved participants and add both to the team using Request 100 twice. Then seed a third participant.

Duplicate Request 100. Name it `Add Team Member — Team Full`.

Use the third participant's ID in the body.

Expected: **409 Conflict**
```json
{
  "error": {
    "code": "TEAM_FULL",
    "message": "Team has reached maximum capacity",
    "details": null
  }
}
```

> Per-team capacity = `team_size` + 1 (if `substitutes_enabled` and `team_size > 1`). For a 2v2 without substitutes, that is 2.

---

#### Request 105 — Add Team Member — Already In a Team → 409

> **Pre-condition:** Run Request 100 to add participant A to Team Alpha. Create a second team ("Team Beta") via Request 87 and save that `team_id` temporarily.

Duplicate Request 100. Name it `Add Team Member — Already In Team`.

Change the URL `{{team_id}}` to Team Beta's ID, but keep `participant_id` the same (participant A, who is already on Team Alpha).

Expected: **409 Conflict**
```json
{
  "error": {
    "code": "ALREADY_IN_TEAM",
    "message": "This participant is already assigned to a team in this tournament",
    "details": null
  }
}
```

> A participant can only belong to one team per tournament. The DB enforces this with a `UNIQUE(participant_id)` constraint on `team_members`.

---

#### Request 106 — Add Team Member — Captain Already Assigned → 409

> **Pre-condition:** Seed a participant and add them as `CAPTAIN`/`MAIN` using Request 100. Then seed a second participant.

Duplicate Request 100. Name it `Add Team Member — Captain Already Assigned`.

Use the second participant's ID in the body with:
```json
{
  "participant_id": "<second participant uuid>",
  "member_role": "CAPTAIN",
  "squad_status": "MAIN"
}
```

Expected: **409 Conflict**
```json
{
  "error": {
    "code": "CAPTAIN_ALREADY_ASSIGNED",
    "message": "This team already has a captain",
    "details": null
  }
}
```

> There is exactly one captain per team, enforced by a partial unique index on `(team_id) WHERE member_role = 'CAPTAIN'`.

---

#### Request 107 — Add Team Member — Substitute Already Assigned → 409

> **Pre-condition:** Create a tournament with `substitutes_enabled: true` and `team_size: 2` (capacity = 3). Seed two participants. Add one as `PLAYER`/`MAIN` and one as `PLAYER`/`SUBSTITUTE`. Then seed a third participant.

Duplicate Request 100. Name it `Add Team Member — Substitute Already Assigned`.

Use the third participant's ID with:
```json
{
  "participant_id": "<third participant uuid>",
  "member_role": "PLAYER",
  "squad_status": "SUBSTITUTE"
}
```

Expected: **409 Conflict**
```json
{
  "error": {
    "code": "SUBSTITUTE_ALREADY_ASSIGNED",
    "message": "This team already has a substitute",
    "details": null
  }
}
```

> There is at most one substitute per team, enforced by a partial unique index on `(team_id) WHERE squad_status = 'SUBSTITUTE'`.

---

#### Request 108 — Add Team Member — Captain as Substitute → 409

> **Pre-condition:** Tournament is `REGISTRATION_CLOSED`. `team_id` is set. Seed an approved participant.

Duplicate Request 100. Name it `Add Team Member — Captain as Substitute`.

Body:
```json
{
  "participant_id": "<participant uuid>",
  "member_role": "CAPTAIN",
  "squad_status": "SUBSTITUTE"
}
```

Expected: **409 Conflict**
```json
{
  "error": {
    "code": "CAPTAIN_CANNOT_BE_SUBSTITUTE",
    "message": "A captain must have squad status MAIN",
    "details": null
  }
}
```

> This is enforced at the database level by a `CHECK(member_role != 'CAPTAIN' OR squad_status = 'MAIN')` constraint. A captain must always be a main squad player.

---

#### Request 109 — List Team Members

| Field | Value |
|---|---|
| Name | `List Team Members` |
| Method | `GET` |
| URL | `{{gateway_url}}/api/v1/tournaments/{{tournament_id}}/teams/{{team_id}}/members` |

No body. Authorization: Bearer Token → `{{access_token}}`.

Expected response — **200 OK**:
```json
{
  "data": [
    {
      "id": "{{member_id}}",
      "team_id": "{{team_id}}",
      "participant_id": "<participant uuid>",
      "member_role": "PLAYER",
      "squad_status": "MAIN",
      "created_at": "<timestamp>",
      "updated_at": "<timestamp>"
    }
  ]
}
```

**What to verify:**
- `data` is an array
- Each member's `team_id` matches `{{team_id}}`
- An empty team returns `[]`, not 404

---

#### Request 110 — List Team Members — Tournament Not Found → 404

Duplicate Request 109. Name it `List Team Members — Not Found`.

Change the URL to:
```
{{gateway_url}}/api/v1/tournaments/00000000-0000-0000-0000-000000000099/teams/00000000-0000-0000-0000-000000000099/members
```

Expected: **404 Not Found**
```json
{
  "error": {
    "code": "TOURNAMENT_NOT_FOUND",
    "message": "Tournament not found",
    "details": null
  }
}
```

---

#### Request 111 — Update Team Member (promote to captain)

> **Pre-condition:** Run Request 100 to add participant A as `PLAYER`/`MAIN`. `member_id` is saved.

| Field | Value |
|---|---|
| Name | `Update Team Member` |
| Method | `PATCH` |
| URL | `{{gateway_url}}/api/v1/tournaments/{{tournament_id}}/teams/{{team_id}}/members/{{member_id}}` |

Authorization: Bearer Token → `{{access_token}}`.

Body → raw → JSON:
```json
{
  "member_role": "CAPTAIN"
}
```

Expected response — **200 OK**:
```json
{
  "data": {
    "member": {
      "id": "{{member_id}}",
      "team_id": "{{team_id}}",
      "participant_id": "<participant uuid>",
      "member_role": "CAPTAIN",
      "squad_status": "MAIN",
      "created_at": "<timestamp>",
      "updated_at": "<timestamp>"
    }
  }
}
```

**What to verify:**
- `member_role` is now `CAPTAIN`
- `squad_status` is unchanged (`MAIN`) — PATCH only updates the fields you send
- `updated_at` is newer than `created_at`

> You can also send only `squad_status` to change a member's squad assignment without touching their role.

---

#### Request 112 — Update Team Member — Not Owner → 403

Duplicate Request 111. Name it `Update Team Member — Not Owner`.

Authorization tab → Type: **Bearer Token** → Token: use a **different user's** access token.

Expected: **403 Forbidden**
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Only the tournament owner can manage team members",
    "details": null
  }
}
```

---

#### Request 113 — Update Team Member — Not Found → 404

Duplicate Request 111. Name it `Update Team Member — Not Found`.

Change the URL to:
```
{{gateway_url}}/api/v1/tournaments/{{tournament_id}}/teams/{{team_id}}/members/00000000-0000-0000-0000-000000000099
```

Expected: **404 Not Found**
```json
{
  "error": {
    "code": "TEAM_MEMBER_NOT_FOUND",
    "message": "Team member not found",
    "details": null
  }
}
```

---

#### Request 114 — Update Team Member — Captain Already Assigned → 409

> **Pre-condition:** Add two participants to the team. Promote the first to `CAPTAIN` via Request 111. `member_id` should be set to the **second** member's ID (a `PLAYER`).

Duplicate Request 111. Name it `Update Team Member — Captain Already Assigned`.

Body:
```json
{
  "member_role": "CAPTAIN"
}
```

Expected: **409 Conflict**
```json
{
  "error": {
    "code": "CAPTAIN_ALREADY_ASSIGNED",
    "message": "This team already has a captain",
    "details": null
  }
}
```

> To reassign the captain: first demote the current captain to `PLAYER` (send `{ "member_role": "PLAYER" }` on the current captain's record), then promote the new one.

---

#### Request 115 — Remove Team Member

> **Pre-condition:** Run Request 100 to add a participant. `member_id` is saved.

| Field | Value |
|---|---|
| Name | `Remove Team Member` |
| Method | `DELETE` |
| URL | `{{gateway_url}}/api/v1/tournaments/{{tournament_id}}/teams/{{team_id}}/members/{{member_id}}` |

No body. Authorization: Bearer Token → `{{access_token}}`.

Expected response — **204 No Content** (empty body).

**What to verify:**
- Response is `204` with no body
- Run Request 109 (List Team Members) — the member is gone
- The participant still exists in `tournament_participants` — removing from a team does not withdraw them from the tournament
- You can re-add the same participant to this team (or any other team) after removal — the `UNIQUE(participant_id)` constraint is released

---

#### Request 116 — Remove Team Member — Not Owner → 403

Duplicate Request 115. Name it `Remove Team Member — Not Owner`.

Authorization tab → Type: **Bearer Token** → Token: use a **different user's** access token.

Expected: **403 Forbidden**
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Only the tournament owner can manage team members",
    "details": null
  }
}
```

---

#### Request 117 — Remove Team Member — Not Found → 404

Duplicate Request 115. Name it `Remove Team Member — Not Found`.

Change the URL to:
```
{{gateway_url}}/api/v1/tournaments/{{tournament_id}}/teams/{{team_id}}/members/00000000-0000-0000-0000-000000000099
```

Expected: **404 Not Found**
```json
{
  "error": {
    "code": "TEAM_MEMBER_NOT_FOUND",
    "message": "Team member not found",
    "details": null
  }
}
```

---

---

#### Request 118 — Finalize Teams (success)

This is the main lifecycle step that closes team formation. All teams must be fully staffed with the right number of members and exactly one captain before the tournament can progress.

> **Pre-condition:** You need a tournament that is fully assembled and ready to finalize. The simplest setup is a 1v1 tournament with 2 teams — each team needs exactly 1 CAPTAIN/MAIN member.
>
> Run this setup SQL against `tournament_db`:
> ```sql
> -- Use the tournament_id already in your environment (must be REGISTRATION_CLOSED)
> UPDATE tournaments SET status = 'REGISTRATION_CLOSED', team_size = 1, number_of_teams = 2 WHERE id = '<your_tournament_id>';
>
> -- Seed two approved participants
> INSERT INTO tournament_participants (tournament_id, user_id)
> VALUES ('<your_tournament_id>', 'aaaaaaaa-0000-0000-0000-000000000001'),
>        ('<your_tournament_id>', 'bbbbbbbb-0000-0000-0000-000000000001')
> RETURNING id;
> ```
> Copy both returned participant IDs — you will need them below.
>
> Then create two teams (run Request 87 twice — name them "Alpha" and "Beta"). Note both team IDs.
>
> Add one CAPTAIN/MAIN member to each team (run Request 100 twice — once per team, once per participant, using `member_role: "CAPTAIN"` and `squad_status: "MAIN"`).

| Field | Value |
|---|---|
| Name | `Finalize Teams` |
| Method | `POST` |
| URL | `{{gateway_url}}/api/v1/tournaments/{{tournament_id}}/finalize-teams` |

No body. Authorization: Bearer Token → `{{access_token}}`.

Expected response — **200 OK**:
```json
{
  "data": {
    "tournament": {
      "id": "{{tournament_id}}",
      "status": "TEAMS_FINALIZED",
      "team_size": 1,
      "number_of_teams": 2,
      ...
    }
  }
}
```

**What to verify:**
- `status` is `TEAMS_FINALIZED`
- `updated_at` is newer than before
- Run Request 92 (List Teams) — both teams now show `"status": "READY"` instead of `"FORMING"`

> **Why this matters:** This is the gate between team formation and competition setup. The service atomically validates every team, then updates all teams to READY and the tournament to TEAMS_FINALIZED in a single database transaction. If anything is wrong with any team, the entire operation is rejected — the tournament stays in its current status and no team is changed.

---

#### Request 119 — Finalize Teams — Not Owner → 403

Duplicate Request 118. Name it `Finalize Teams — Not Owner`.

> **Pre-condition:** Same fully-assembled tournament from Request 118 (re-run setup if already finalized).

Authorization tab → Type: **Bearer Token** → Token: use a **different user's** access token.

Expected: **403 Forbidden**
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Only the tournament owner can finalize teams",
    "details": null
  }
}
```

---

#### Request 120 — Finalize Teams — Tournament Not Found → 404

Duplicate Request 118. Name it `Finalize Teams — Not Found`.

Change the URL to:
```
{{gateway_url}}/api/v1/tournaments/00000000-0000-0000-0000-000000000099/finalize-teams
```

Expected: **404 Not Found**
```json
{
  "error": {
    "code": "TOURNAMENT_NOT_FOUND",
    "message": "Tournament not found",
    "details": null
  }
}
```

---

#### Request 121 — Finalize Teams — Wrong Status → 409

> **Pre-condition:** Create a fresh tournament (run Request 1). Leave it in `DRAFT` — do not close registration.

Duplicate Request 118. Name it `Finalize Teams — Wrong Status`.

Update the URL to use the new `tournament_id` in `DRAFT` status.

Expected: **409 Conflict**
```json
{
  "error": {
    "code": "INVALID_STATUS_TRANSITION",
    "message": "Cannot finalize teams from status DRAFT",
    "details": null
  }
}
```

> Finalization is only allowed from `REGISTRATION_CLOSED` or `TEAM_FORMATION`. Any earlier status is rejected.

---

#### Request 122 — Finalize Teams — Not Enough Teams → 409

> **Pre-condition:** A tournament with `number_of_teams: 2` but only 1 team created.
>
> ```sql
> UPDATE tournaments SET status = 'REGISTRATION_CLOSED', team_size = 1, number_of_teams = 2 WHERE id = '<your_tournament_id>';
> ```
>
> Create only **one** team (run Request 87 once). Seed one participant and add them as CAPTAIN/MAIN (Request 100). Do not create a second team.

Duplicate Request 118. Name it `Finalize Teams — Not Enough Teams`.

Expected: **409 Conflict**
```json
{
  "error": {
    "code": "TEAMS_INCOMPLETE",
    "message": "Expected 2 teams but found 1",
    "details": null
  }
}
```

---

#### Request 123 — Finalize Teams — Team Missing Members → 409

> **Pre-condition:** A tournament with `team_size: 2` (each team needs 2 members), 2 teams created, but one team has only 1 member.
>
> ```sql
> UPDATE tournaments SET status = 'REGISTRATION_CLOSED', team_size = 2, number_of_teams = 2 WHERE id = '<your_tournament_id>';
> ```
>
> Seed 3 participants. Create 2 teams. Add 2 members to Team Alpha (1 CAPTAIN/MAIN + 1 PLAYER/MAIN). Add only 1 member to Team Beta (1 CAPTAIN/MAIN — missing the second PLAYER/MAIN).

Duplicate Request 118. Name it `Finalize Teams — Team Missing Members`.

Expected: **409 Conflict**
```json
{
  "error": {
    "code": "TEAMS_INCOMPLETE",
    "message": "Each team must have exactly 2 member(s)",
    "details": null
  }
}
```

> The required member count per team is `team_size` + 1 (if `substitutes_enabled` and `team_size > 1`). For a 2v2 without substitutes, that is 2.

---

#### Request 124 — Finalize Teams — Team Missing Captain → 409

> **Pre-condition:** A tournament with `team_size: 1`, 2 teams, all members present — but one team has a `PLAYER` instead of a `CAPTAIN`.
>
> ```sql
> UPDATE tournaments SET status = 'REGISTRATION_CLOSED', team_size = 1, number_of_teams = 2 WHERE id = '<your_tournament_id>';
> ```
>
> Seed 2 participants. Create 2 teams. Add 1 CAPTAIN/MAIN to Team Alpha. Add 1 **PLAYER/MAIN** (not CAPTAIN) to Team Beta.

Duplicate Request 118. Name it `Finalize Teams — Team Missing Captain`.

Expected: **409 Conflict**
```json
{
  "error": {
    "code": "TEAMS_INCOMPLETE",
    "message": "Each team must have exactly one captain",
    "details": null
  }
}
```

> Every team must have exactly one CAPTAIN before finalization. The captain is what identifies the team leader for the competition phase (lineup submissions, result confirmations).

---

#### Request 125 — Finalize Teams — Non-Power-of-Two Team Count → 409

> **Pre-condition:** A tournament with `number_of_teams: 3` (not a power of 2 — invalid for KNOCKOUT), all 3 teams fully assembled with 1 CAPTAIN/MAIN each.
>
> ```sql
> UPDATE tournaments SET status = 'REGISTRATION_CLOSED', team_size = 1, number_of_teams = 3 WHERE id = '<your_tournament_id>';
> ```
>
> Seed 3 participants. Create 3 teams. Add 1 CAPTAIN/MAIN to each.

Duplicate Request 118. Name it `Finalize Teams — Non-Power-of-Two`.

Expected: **409 Conflict**
```json
{
  "error": {
    "code": "INVALID_TEAM_COUNT",
    "message": "Knockout tournaments require a power-of-two number of teams (2, 4, 8, 16…)",
    "details": null
  }
}
```

> KNOCKOUT brackets cannot have byes in the current MVP, so valid team counts are 2, 4, 8, 16, etc. 3, 5, 6, 7, 9, … are all rejected.

---

#### Request 126 — Finalize Teams — Already Finalized → 409

> **Pre-condition:** Run Request 118 successfully. The tournament is now `TEAMS_FINALIZED`.

Duplicate Request 118. Name it `Finalize Teams — Already Finalized`.

Send it again **without resetting the status**.

Expected: **409 Conflict**
```json
{
  "error": {
    "code": "INVALID_STATUS_TRANSITION",
    "message": "Cannot finalize teams from status TEAMS_FINALIZED",
    "details": null
  }
}
```

> `TEAMS_FINALIZED` is not in the allowed source statuses. The endpoint is idempotent-safe — calling it twice gives a clear error rather than silently re-running validation.

---

### Step 7 — Run through the full sequence

Work through the requests in this order to cover all scenarios:

```
--- Create ---
1.  Login (API Gateway → Public Routes → Login)   → access_token saved
2.  Create Tournament                              → 201, tournament_id saved
3.  Create Tournament (Full)                       → 201, all optional fields present
4.  Create Tournament — No Token                   → 401 UNAUTHORIZED
5.  Create Tournament — Invalid Game               → 400 VALIDATION_ERROR
6.  Create Tournament — Invalid Format             → 400 VALIDATION_ERROR
7.  Create Tournament — Invalid Team Size          → 400 VALIDATION_ERROR
8.  Create Tournament — Too Few Teams              → 400 VALIDATION_ERROR
9.  Create Tournament — Invalid Dates              → 400 INVALID_REGISTRATION_DATES
10. Create Tournament — Missing Field              → 400 VALIDATION_ERROR
11. Create Tournament — Extra Field                → 400 VALIDATION_ERROR

--- GET single ---
12. Get Tournament                                 → 200, full tournament object
13. Get Tournament — Not Found                     → 404 TOURNAMENT_NOT_FOUND
14. Get Tournament — No Token                      → 401 UNAUTHORIZED

--- GET list ---
15. List Tournaments                               → 200, data array + pagination
16. List My Tournaments (?owner_id=me)             → 200, only your tournaments
17. List Tournaments — Page 1 Limit 1             → 200, 1 item, pagination correct
18. List Tournaments — Limit Too High              → 400 VALIDATION_ERROR

--- PATCH ---
19. Update Tournament                              → 200, multiple fields updated
20. Update Tournament — Name Only                  → 200, only name changed
21. Update Tournament — Clear Description          → 200, description is null
22. Update Tournament — No Token                   → 401 UNAUTHORIZED
23. Update Tournament — Extra Field                → 400 VALIDATION_ERROR
24. Update Tournament — Invalid Dates              → 400 INVALID_REGISTRATION_DATES
25. Update Tournament — Structural Fields Locked   → 409 CONFIGURATION_LOCKED (requires DB reset to REGISTRATION_OPEN)
26. Update Tournament — Name Still Editable        → 200 (tournament still at REGISTRATION_OPEN)
    [Reset status to DRAFT before continuing]

--- Lifecycle ---
27. Open Registration                              → 200, status = REGISTRATION_OPEN
28. Open Registration — Wrong Status               → 409 INVALID_STATUS_TRANSITION (already open)
    [Reset status to DRAFT via SQL for next test]
29. Open Registration — Not Owner                  → 403 FORBIDDEN (different user's token)
    [Set status to REGISTRATION_OPEN via SQL or run request 27]
30. Close Registration                             → 200, status = REGISTRATION_CLOSED
    [Reset status to DRAFT via SQL]
31. Close Registration — Wrong Status              → 409 INVALID_STATUS_TRANSITION (not open)
    [Reset status to DRAFT via SQL]
32. Cancel Tournament                              → 200, status = CANCELLED
33. Cancel Tournament — Already Cancelled          → 409 INVALID_STATUS_TRANSITION (terminal)
    [Reset status to DRAFT via SQL before participant tests]

--- Participants ---
34. List Participants                              → 200, empty data array
35. List Participants — Not Found                  → 404 TOURNAMENT_NOT_FOUND
36. List Participants — No Token                   → 401 UNAUTHORIZED
    [Seed a participant via SQL — copy returned id into participant_id env variable]
37. Withdraw Participant                           → 200, status = WITHDRAWN, withdrawn_at set
38. Withdraw Participant — Third Party             → 403 FORBIDDEN (different user, not owner)
    [Reset participant to APPROVED via SQL for next test]
39. Withdraw Participant — Already Withdrawn       → 409 PARTICIPANT_ALREADY_WITHDRAWN (run after 37)
    [Seed fresh participant via SQL]
40. Withdraw Participant — Tournament Cancelled    → 409 TOURNAMENT_NOT_MODIFIABLE (cancel tournament via SQL first)
    [Reset tournament to REGISTRATION_OPEN via SQL after]

--- Invitations ---
41. Create Invitation                              → 201, invitation_id saved, status = PENDING
42. Create Invitation — Not Owner                  → 403 FORBIDDEN
43. Create Invitation — Not Found                  → 404 TOURNAMENT_NOT_FOUND
44. Create Invitation — Registration Not Open      → 409 REGISTRATION_NOT_OPEN (reset to DRAFT first, restore after)
45. Create Invitation — Self Invite                → 409 CANNOT_INVITE_SELF
46. Create Invitation — Already Participant        → 409 ALREADY_A_PARTICIPANT (seed participant first, clean up after)
47. Create Invitation — Duplicate Pending          → 409 PENDING_INVITATION_EXISTS (send 41 twice)
48. List Invitations                               → 200, array with the pending invitation
49. List Invitations — Not Owner                   → 403 FORBIDDEN
50. List Invitations — Not Found                   → 404 TOURNAMENT_NOT_FOUND
51. Accept Invitation                              → 200, status = ACCEPTED; participant appears in List Participants
52. Reject Invitation                              → 200, status = REJECTED; no participant created
    [Create fresh invitation for next test]
53. Cancel Invitation                              → 200, status = CANCELLED (owner's token)
54. Update Invitation — Not Pending                → 409 INVITATION_NOT_PENDING (send after 52 or 53)
55. Accept Invitation — Not Invitee                → 403 FORBIDDEN (owner token tries to accept)
56. Cancel Invitation — Not Owner                  → 403 FORBIDDEN (invitee token tries to cancel)
57. Update Invitation — Not Found                  → 404 INVITATION_NOT_FOUND
58. Re-invite After Cancel                         → 201 (cancel first via 53, then re-invite same user)

--- Join Requests ---
    [Pre-condition: tournament is REGISTRATION_OPEN; use second user's token for requests marked (player)]
59. Submit Join Request                            → 201, join_request_id saved, status = PENDING  (player)
60. Submit Join Request — Not Found                → 404 TOURNAMENT_NOT_FOUND
61. Submit Join Request — Registration Not Open    → 409 REGISTRATION_NOT_OPEN (reset to DRAFT first, restore after)
62. Submit Join Request — Owner Blocked            → 409 CANNOT_JOIN_OWN_TOURNAMENT (owner's token)
63. Submit Join Request — Already Participant      → 409 ALREADY_A_PARTICIPANT (seed participant first, clean up after)
64. Submit Join Request — Duplicate Pending        → 409 PENDING_JOIN_REQUEST_EXISTS (send 59 twice)
65. List Join Requests                             → 200, array with the pending request (owner's token)
66. List Join Requests — Not Owner                 → 403 FORBIDDEN (player's token)
67. List Join Requests — Not Found                 → 404 TOURNAMENT_NOT_FOUND
68. Approve Join Request                           → 200, status = APPROVED; player appears in List Participants (owner's token)
    [Create fresh join request for next tests]
69. Reject Join Request                            → 200, status = REJECTED; no participant created (owner's token)
    [Create fresh join request for next tests]
70. Cancel Join Request                            → 200, status = CANCELLED (player's token)
71. Approve Join Request — Not Owner               → 403 FORBIDDEN (player's token tries to approve)
72. Cancel Join Request — Not Requester            → 403 FORBIDDEN (owner's token tries to cancel)
73. Update Join Request — Not Pending              → 409 JOIN_REQUEST_NOT_PENDING (run after 69 or 70)
74. Update Join Request — Not Found                → 404 JOIN_REQUEST_NOT_FOUND

--- Captain Requests ---
    [Pre-condition: tournament is REGISTRATION_OPEN; second user is an APPROVED participant]
75. Submit Captain Request                         → 201, captain_request_id saved, status = PENDING  (player)
76. Submit Captain Request — Not Found             → 404 TOURNAMENT_NOT_FOUND
77. Submit Captain Request — Registration Not Open → 409 REGISTRATION_NOT_OPEN (reset to DRAFT first, restore after)
78. Submit Captain Request — Not Participant       → 403 NOT_A_PARTICIPANT (owner's token)
79. Submit Captain Request — Duplicate             → 409 CAPTAIN_REQUEST_ALREADY_EXISTS (send 75 twice)
80. List Captain Requests                          → 200, array with the pending request (owner's token)
81. List Captain Requests — Not Owner              → 403 FORBIDDEN (player's token)
82. Reject Captain Request                         → 200, status = REJECTED (owner's token)
    [Seed a new participant / captain request for next test]
83. Cancel Captain Request                         → 200, status = CANCELLED (participant's token)
84. Update Captain Request — Not Pending           → 409 CAPTAIN_REQUEST_NOT_PENDING (run after 82 or 83)
85. Update Captain Request — Not Found             → 404 CAPTAIN_REQUEST_NOT_FOUND
86. Re-submit After Cancellation                   → 409 CAPTAIN_REQUEST_ALREADY_EXISTS (full UNIQUE blocks re-submit)

--- Teams ---
    [Pre-condition: tournament is REGISTRATION_CLOSED; use owner's token]
87. Create Team                                    → 201, team_id saved, status = FORMING
88. Create Team — Not Owner                        → 403 FORBIDDEN
89. Create Team — Wrong Status                     → 409 INVALID_TOURNAMENT_STATUS (use DRAFT tournament)
90. Create Team — Duplicate Name                   → 409 TEAM_NAME_TAKEN (send 87 twice with same name)
91. Create Team — Not Found                        → 404 TOURNAMENT_NOT_FOUND
92. List Teams                                     → 200, array of teams
93. List Teams — Not Found                         → 404 TOURNAMENT_NOT_FOUND
94. Get Team                                       → 200, single team object
95. Get Team — Not Found                           → 404 TEAM_NOT_FOUND
96. Update Team                                    → 200, name updated, status unchanged
97. Update Team — Not Owner                        → 403 FORBIDDEN
98. Update Team — Wrong Status                     → 409 INVALID_TOURNAMENT_STATUS (use DRAFT tournament)
99. Update Team — Duplicate Name                   → 409 TEAM_NAME_TAKEN (rename Team Beta to existing Team Alpha)

--- Team Members ---
    [Pre-condition: tournament is REGISTRATION_CLOSED; team exists (team_id saved); seed approved participants via SQL; use owner's token]
100. Add Team Member                               → 201, member_id saved, member_role=PLAYER, squad_status=MAIN
101. Add Team Member — Not Owner                   → 403 FORBIDDEN
102. Add Team Member — Wrong Status                → 409 INVALID_TOURNAMENT_STATUS (use DRAFT tournament)
103. Add Team Member — Participant Not Found        → 404 PARTICIPANT_NOT_FOUND (use non-existent participant UUID)
104. Add Team Member — Team Full                   → 409 TEAM_FULL (fill team to capacity, then try one more)
105. Add Team Member — Already In Team             → 409 ALREADY_IN_TEAM (add same participant to a second team)
106. Add Team Member — Captain Already Assigned    → 409 CAPTAIN_ALREADY_ASSIGNED (add second CAPTAIN to team)
107. Add Team Member — Substitute Already Assigned → 409 SUBSTITUTE_ALREADY_ASSIGNED (add second SUBSTITUTE; tournament needs substitutes_enabled: true)
108. Add Team Member — Captain as Substitute       → 409 CAPTAIN_CANNOT_BE_SUBSTITUTE (member_role=CAPTAIN, squad_status=SUBSTITUTE)
109. List Team Members                             → 200, array of members
110. List Team Members — Not Found                 → 404 TOURNAMENT_NOT_FOUND
111. Update Team Member (promote to captain)       → 200, member_role=CAPTAIN, squad_status unchanged
112. Update Team Member — Not Owner                → 403 FORBIDDEN
113. Update Team Member — Not Found                → 404 TEAM_MEMBER_NOT_FOUND
114. Update Team Member — Captain Already Assigned → 409 CAPTAIN_ALREADY_ASSIGNED (promote second member when captain already exists)
115. Remove Team Member                            → 204 (no body); member gone from list; participant still in tournament
116. Remove Team Member — Not Owner                → 403 FORBIDDEN
117. Remove Team Member — Not Found                → 404 TEAM_MEMBER_NOT_FOUND

--- Finalize Teams ---
    [Pre-condition: tournament is REGISTRATION_CLOSED or TEAM_FORMATION; all teams fully assembled (correct member count + 1 captain each)]
118. Finalize Teams                                → 200, tournament status = TEAMS_FINALIZED; all teams status = READY
119. Finalize Teams — Not Owner                    → 403 FORBIDDEN (different user's token)
120. Finalize Teams — Not Found                    → 404 TOURNAMENT_NOT_FOUND (non-existent UUID)
121. Finalize Teams — Wrong Status                 → 409 INVALID_STATUS_TRANSITION (use a DRAFT tournament)
122. Finalize Teams — Not Enough Teams             → 409 TEAMS_INCOMPLETE (create only 1 of 2 required teams)
123. Finalize Teams — Team Missing Members         → 409 TEAMS_INCOMPLETE (team_size=2 but team has only 1 member)
124. Finalize Teams — Team Missing Captain         → 409 TEAMS_INCOMPLETE (all members are PLAYER, none CAPTAIN)
125. Finalize Teams — Non-Power-of-Two             → 409 INVALID_TEAM_COUNT (number_of_teams=3, format=KNOCKOUT)
126. Finalize Teams — Already Finalized            → 409 INVALID_STATUS_TRANSITION (run 118 twice)
```

---

## Health Check

Hit the tournament service directly (bypassing the gateway) to confirm it is running:

**GET** `http://localhost:3002/health`

Expected: **200 OK**
```json
{
  "data": {
    "service": "tournament-service",
    "status": "ok"
  }
}
```

> Use this when something is not working — it tells you whether the problem is the tournament service itself or the gateway in front of it.

---

## Notes

- **Always use `Api Gateway Local`** as the active environment when testing tournament endpoints.
- The gateway injects `x-user-id` after verifying the JWT. The tournament service reads that header as `owner_id`. Never set `x-user-id` manually in Postman.
- A new tournament always starts as `DRAFT`. Use the dedicated lifecycle endpoints (`/open`, `/close`, `/cancel`) to advance the status — never via the PATCH body.
- `status` cannot be set via `POST` or `PATCH` body — it is always controlled through the three lifecycle endpoints.
- The structural field lock (Requests 25–26) still requires a manual DB reset to `REGISTRATION_OPEN` because the lifecycle endpoints intentionally enforce strict ordering — you must open first, then the lock applies automatically.
- Test database: `tournament_test_db` — used only by `npm test`. Manual Postman testing always uses `tournament_db`.
