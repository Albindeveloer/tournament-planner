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
Test Files  2 passed (2)
      Tests  37 passed (37)
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

#### Add the tournament_id variable

1. In Postman, click **Environments** in the left sidebar.
2. Open **Api Gateway Local**.
3. Click **Add a new variable** at the bottom of the variable list.
4. Set:
   - Variable: `tournament_id`
   - Initial Value: *(leave empty)*
   - Current Value: *(leave empty)*
5. Click **Save**.

Your `Api Gateway Local` environment now has these variables:

| Variable | Purpose |
|---|---|
| `gateway_url` | `http://localhost:3000` |
| `access_token` | Filled automatically by the Login request |
| `refresh_token` | Filled automatically by the Login request |
| `reset_token` | Filled automatically by the Forgot Password request |
| `tournament_id` | Filled automatically after Create Tournament |

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
25. Update Tournament — Structural Fields Locked   → 409 CONFIGURATION_LOCKED (requires DB change)
26. Update Tournament — Name Still Editable        → 200 (requires status = REGISTRATION_OPEN in DB)
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
- A new tournament always starts as `DRAFT`. Status transitions (open registration, close, cancel) will be added as new requests when M8.5 is implemented.
- `status` cannot be set via `POST` or `PATCH` body — it is always controlled through dedicated lifecycle endpoints.
- The structural field lock (Requests 25–26) requires manually setting the DB status because lifecycle transition endpoints don't exist yet. Once M8.5 is done you will be able to use the API instead.
- Test database: `tournament_test_db` — used only by `npm test`. Manual Postman testing always uses `tournament_db`.
