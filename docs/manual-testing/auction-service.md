# Auction Service — Manual Testing Guide

---

## Part 1 — Automated Tests

### Step 1 — Apply migrations to the test database

Run this once. Without it the tests will fail with a "table does not exist" error.

```powershell
$env:NODE_ENV = "test"
npm run migrate --workspace=@tournament-planner/auction-service
$env:NODE_ENV = "development"
```

You should see:
```
Applying migration: 001_create_auction_tables.sql
Migration applied: 001_create_auction_tables.sql
Database migrations completed successfully.
```

### Step 2 — Run the tests

```powershell
npm test --workspace=@tournament-planner/auction-service
```

Expected output:
```
Test Files  1 passed (1)
      Tests  15 passed (15)
```

---

## Part 2 — Manual Testing in Postman

### Step 1 — Apply migrations to the dev database

Run this once before starting the services:

```powershell
npm run migrate --workspace=@tournament-planner/auction-service
```

You should see:
```
Applying migration: 001_create_auction_tables.sql
Migration applied: 001_create_auction_tables.sql
Database migrations completed successfully.
```

---

### Step 2 — Start all required services

Open **four separate terminals** in the project root and run one command in each:

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
npm run dev --workspace=@tournament-planner/auction-service
```

**Terminal 4:**
```powershell
npm run dev --workspace=@tournament-planner/api-gateway
```

Wait until all four show a "listening on port" message before opening Postman.

| Service | Port |
|---|---|
| API Gateway | 3000 |
| Auth Service | 3001 |
| Tournament Service | 3002 |
| Auction Service | 3003 |

---

### Step 3 — Postman environment setup

You already have the **Api Gateway Local** environment with `gateway_url = http://localhost:3000`.

**For auction testing, use the `Api Gateway Local` environment.**

All auction requests go through the gateway. Do not call the auction service directly on port 3003 during manual testing.

#### Add the auction_id variable

1. In Postman, click **Environments** in the left sidebar.
2. Open **Api Gateway Local**.
3. Click **Add a new variable** at the bottom of the variable list and add this row:

| Variable | Initial Value | Current Value |
|---|---|---|
| `auction_id` | *(leave empty)* | *(leave empty)* |

4. Click **Save**.

Your `Api Gateway Local` environment now includes:

| Variable | Purpose |
|---|---|
| `gateway_url` | `http://localhost:3000` |
| `access_token` | Filled automatically by the Login request |
| `auction_id` | Filled automatically after Create Auction (see Request 1) |

> **Tip:** Every test in Part 2 assumes you run **Request 1 — Create Auction** first so that `auction_id` is populated. If you restart Postman or clear the environment, run Request 1 again before the GET/PATCH requests.

---

### Step 4 — Add an Auction Service folder to the collection

1. In Postman, click **Collections** in the left sidebar.
2. Open the **turnament-planner** collection.
3. Open the **API Gateway** folder inside it.
4. Right-click **API Gateway** → **Add Folder**. Name it **Auction Service**.

Your collection structure should now look like:

```
turnament-planner/
├── Auth Service/
├── API Gateway/
│   ├── Public Routes — No Token Required/
│   ├── Authentication Middleware/
│   ├── Tournament Service/
│   └── Auction Service/          ← newly added
```

---

### Step 5 — Get a valid access token

Select the **Api Gateway Local** environment from the environment dropdown (top-right corner of Postman).

In the collection, go to **API Gateway → Public Routes — No Token Required → Login** and send it.

If the request succeeds, `access_token` and `refresh_token` are saved to your `Api Gateway Local` environment automatically.

> If Login returns `401 INVALID_CREDENTIALS`, update the password in the Login body to match what is in the database, or re-register.

---

### Step 6 — Add the auction requests

Add each request below to the **API Gateway → Auction Service** folder.

For every request in this folder:
- Select environment: **Api Gateway Local**
- Authorization tab → Type: **Bearer Token** → Token: `{{access_token}}`

---

## Auction Creation

#### Request 1 — Create Auction (Minimal)

| Field | Value |
|---|---|
| Name | `Create Auction` |
| Method | `POST` |
| URL | `{{gateway_url}}/api/v1/auctions` |

Authorization: Bearer Token → `{{access_token}}`.

Body → raw → JSON:
```json
{
  "tournament_id": "00000000-0000-0000-0000-000000000002"
}
```

> This UUID represents a tournament. It does not need to exist in `tournament_db` — the auction service stores it as a cross-service reference with no FK constraint.

Scripts → Post-response:
```javascript
const body = pm.response.json();
if (body.data && body.data.auction) {
  pm.environment.set("auction_id", body.data.auction.id);
}
```

Expected response — **201 Created**:
```json
{
  "data": {
    "auction": {
      "id": "<uuid>",
      "tournament_id": "00000000-0000-0000-0000-000000000002",
      "status": "DRAFT",
      "bid_increment": 1,
      "created_at": "<timestamp>",
      "updated_at": "<timestamp>"
    }
  }
}
```

**What to verify:**
- `status` is `DRAFT` — always, regardless of input
- `bid_increment` is `1` — the default when not provided
- `auction_id` is now saved — open the `Api Gateway Local` environment and confirm the Current Value column shows a UUID

---

#### Request 2 — Create Auction (With bid_increment)

Duplicate Request 1. Name it `Create Auction (Custom Increment)`.

Use a **different** `tournament_id` (since only one auction is allowed per tournament):

Body → raw → JSON:
```json
{
  "tournament_id": "00000000-0000-0000-0000-000000000003",
  "bid_increment": 5.50
}
```

Expected response — **201 Created**:
```json
{
  "data": {
    "auction": {
      "tournament_id": "00000000-0000-0000-0000-000000000003",
      "status": "DRAFT",
      "bid_increment": 5.5,
      ...
    }
  }
}
```

**What to verify:**
- `bid_increment` is `5.5` (not `5.50` — trailing zeros are stripped when parsed to float)
- `status` is `DRAFT`

---

#### Request 3 — No Token → 401

Duplicate Request 1. Name it `Create Auction — No Token`.

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

#### Request 4 — Missing tournament_id → 400

Duplicate Request 1. Name it `Create Auction — Missing tournament_id`.

Body → raw → JSON:
```json
{
  "bid_increment": 5
}
```

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

#### Request 5 — Invalid tournament_id (not UUID) → 400

Duplicate Request 1. Name it `Create Auction — Invalid tournament_id`.

Body → raw → JSON:
```json
{
  "tournament_id": "not-a-valid-uuid"
}
```

Expected: **400 Bad Request** with `VALIDATION_ERROR`.

> `tournament_id` must be a UUID format (`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`). The route schema enforces `format: "uuid"`.

---

#### Request 6 — bid_increment Zero → 400

Duplicate Request 1. Name it `Create Auction — bid_increment Zero`.

Body → raw → JSON:
```json
{
  "tournament_id": "00000000-0000-0000-0000-000000000004",
  "bid_increment": 0
}
```

Expected: **400 Bad Request** with `VALIDATION_ERROR`.

> `bid_increment` must be `>= 0.01`. Zero and negative values are rejected at the route schema level before they reach the database.

---

#### Request 7 — Negative bid_increment → 400

Duplicate Request 6. Name it `Create Auction — Negative bid_increment`.

Body → raw → JSON:
```json
{
  "tournament_id": "00000000-0000-0000-0000-000000000004",
  "bid_increment": -10
}
```

Expected: **400 Bad Request** with `VALIDATION_ERROR`.

---

#### Request 8 — Unknown Field → 400

Duplicate Request 1. Name it `Create Auction — Extra Field`.

Body → raw → JSON:
```json
{
  "tournament_id": "00000000-0000-0000-0000-000000000005",
  "status": "IN_PROGRESS"
}
```

Expected: **400 Bad Request** with `VALIDATION_ERROR`.

> `additionalProperties: false` is enforced. You cannot inject `status` or any field not explicitly in the schema. Auction status is controlled only through lifecycle endpoints (future milestones).

---

#### Request 9 — Duplicate tournament_id → 409

> **Pre-condition:** Request 1 must have been sent so an auction already exists for tournament `00000000-0000-0000-0000-000000000002`.

Duplicate Request 1. Name it `Create Auction — Duplicate`.

Send it again **without changing the tournament_id**.

Expected: **409 Conflict**
```json
{
  "error": {
    "code": "AUCTION_ALREADY_EXISTS",
    "message": "An auction already exists for this tournament",
    "details": null
  }
}
```

> The `UNIQUE(tournament_id)` constraint on the `auctions` table enforces one auction per tournament. The PostgreSQL error code `23505` (unique violation) is caught at the service layer and translated into this application error. The database constraint is the final protection — no race condition can create two auctions for the same tournament.

---

## Get Auction

#### Request 10 — Get Auction

| Field | Value |
|---|---|
| Name | `Get Auction` |
| Method | `GET` |
| URL | `{{gateway_url}}/api/v1/auctions/{{auction_id}}` |

No body. Authorization: Bearer Token → `{{access_token}}`.

Expected response — **200 OK**:
```json
{
  "data": {
    "auction": {
      "id": "{{auction_id}}",
      "tournament_id": "00000000-0000-0000-0000-000000000002",
      "status": "DRAFT",
      "bid_increment": 1,
      "created_at": "<timestamp>",
      "updated_at": "<timestamp>"
    }
  }
}
```

**What to verify:**
- `id` matches `auction_id` in your environment
- All fields are present
- `bid_increment` is a number, not a string

> **Why bid_increment is a number:** The database stores `bid_increment` as `NUMERIC(10, 2)`. PostgreSQL's `pg` driver returns NUMERIC columns as strings by default to preserve arbitrary precision. The auction repository explicitly parses it to a JavaScript float before returning the row, so the API response always contains a number.

---

#### Request 11 — Get Auction — Not Found → 404

Duplicate Request 10. Name it `Get Auction — Not Found`.

Change the URL to:
```
{{gateway_url}}/api/v1/auctions/00000000-0000-0000-0000-000000000099
```

Expected: **404 Not Found**
```json
{
  "error": {
    "code": "AUCTION_NOT_FOUND",
    "message": "Auction not found",
    "details": null
  }
}
```

---

#### Request 12 — Get Auction — No Token → 401

Duplicate Request 10. Name it `Get Auction — No Token`.

Authorization tab → Type: **No Auth**.

Expected: **401 Unauthorized** with `UNAUTHORIZED`.

---

#### Request 13 — Get Auction — Invalid UUID in Path → 400

Duplicate Request 10. Name it `Get Auction — Invalid UUID`.

Change the URL to:
```
{{gateway_url}}/api/v1/auctions/not-a-uuid
```

Expected: **400 Bad Request** with `VALIDATION_ERROR`.

> The `:id` path parameter is validated as `format: "uuid"`. An invalid UUID is rejected before the request reaches the service layer.

---

## Update Auction

#### Request 14 — Update bid_increment (DRAFT)

| Field | Value |
|---|---|
| Name | `Update Auction` |
| Method | `PATCH` |
| URL | `{{gateway_url}}/api/v1/auctions/{{auction_id}}` |

Authorization: Bearer Token → `{{access_token}}`.

Body → raw → JSON:
```json
{
  "bid_increment": 10
}
```

Expected response — **200 OK**:
```json
{
  "data": {
    "auction": {
      "id": "{{auction_id}}",
      "tournament_id": "00000000-0000-0000-0000-000000000002",
      "status": "DRAFT",
      "bid_increment": 10,
      "created_at": "<timestamp>",
      "updated_at": "<timestamp>"
    }
  }
}
```

**What to verify:**
- `bid_increment` changed to `10`
- `status` is still `DRAFT` — PATCH cannot change auction status
- `updated_at` is newer than before

---

#### Request 15 — Update bid_increment to Decimal

Duplicate Request 14. Name it `Update Auction — Decimal Increment`.

Body → raw → JSON:
```json
{
  "bid_increment": 2.50
}
```

Expected: **200 OK** — `bid_increment` is `2.5` in the response.

> The database stores `NUMERIC(10, 2)` so `2.50` is stored precisely. The service returns it as the float `2.5` after parsing.

---

#### Request 16 — Update Auction — Unknown Field → 400

Duplicate Request 14. Name it `Update Auction — Extra Field`.

Body → raw → JSON:
```json
{
  "status": "READY"
}
```

Expected: **400 Bad Request** with `VALIDATION_ERROR`.

> `status` is not in the allowed PATCH body. `additionalProperties: false` enforces this. Auction status transitions happen through dedicated lifecycle endpoints (ready, start, cancel) which are part of future milestones.

---

#### Request 17 — Update Auction — bid_increment Zero → 400

Duplicate Request 14. Name it `Update Auction — bid_increment Zero`.

Body → raw → JSON:
```json
{
  "bid_increment": 0
}
```

Expected: **400 Bad Request** with `VALIDATION_ERROR`.

---

#### Request 18 — Update Auction — Not Found → 404

Duplicate Request 14. Name it `Update Auction — Not Found`.

Change the URL to:
```
{{gateway_url}}/api/v1/auctions/00000000-0000-0000-0000-000000000099
```

Body → raw → JSON:
```json
{
  "bid_increment": 5
}
```

Expected: **404 Not Found**
```json
{
  "error": {
    "code": "AUCTION_NOT_FOUND",
    "message": "Auction not found",
    "details": null
  }
}
```

---

#### Request 19 — Update Auction — Not DRAFT → 409

This test requires manually advancing the auction status in the database.

> **Pre-condition:** Run this SQL in your database client (pgAdmin or psql) against `auction_db`:
> ```sql
> UPDATE auctions SET status = 'READY' WHERE id = '<paste your auction_id here>';
> ```

Then send:

| Field | Value |
|---|---|
| Name | `Update Auction — Not DRAFT` |
| Method | `PATCH` |
| URL | `{{gateway_url}}/api/v1/auctions/{{auction_id}}` |

Body → raw → JSON:
```json
{
  "bid_increment": 20
}
```

Expected: **409 Conflict**
```json
{
  "error": {
    "code": "AUCTION_NOT_MODIFIABLE",
    "message": "Auction can only be modified while in DRAFT status",
    "details": null
  }
}
```

> **Why:** Once an auction leaves `DRAFT`, the configuration is locked. Bidders are registered and rounds are set up against the agreed `bid_increment`. Changing it mid-auction would invalidate all active bids and participant expectations.

> **After this test:** Reset the status back to `DRAFT` so subsequent requests work normally:
> ```sql
> UPDATE auctions SET status = 'DRAFT' WHERE id = '<your auction_id>';
> ```

---

#### Request 20 — Update Auction — No Token → 401

Duplicate Request 14. Name it `Update Auction — No Token`.

Authorization tab → Type: **No Auth**.

Expected: **401 Unauthorized** with `UNAUTHORIZED`.

---

## Architecture Note — Cross-Service Ownership

At this milestone, the auction service does not verify that the caller is the tournament owner. The `auctions` table stores only `tournament_id` as a cross-service reference — there is no `owner_id` column. Verifying tournament ownership would require a synchronous REST call to the Tournament Service, which is not wired up yet.

This means:
- Any authenticated user can create an auction for any `tournament_id` UUID.
- Authorization is intentionally deferred until cross-service communication is implemented in a later milestone.
- The automated tests confirm all other business rules (validation, uniqueness, status guards) work correctly.

This is a known, deliberate limitation at this stage of the implementation. In production, ownership would be enforced before creating the auction.

---

## Summary Table

| # | Name | Method | URL | Expected |
|---|---|---|---|---|
| 1 | Create Auction | POST | `/api/v1/auctions` | 201 |
| 2 | Create Auction (Custom Increment) | POST | `/api/v1/auctions` | 201 |
| 3 | Create Auction — No Token | POST | `/api/v1/auctions` | 401 |
| 4 | Create Auction — Missing tournament_id | POST | `/api/v1/auctions` | 400 |
| 5 | Create Auction — Invalid tournament_id | POST | `/api/v1/auctions` | 400 |
| 6 | Create Auction — bid_increment Zero | POST | `/api/v1/auctions` | 400 |
| 7 | Create Auction — Negative bid_increment | POST | `/api/v1/auctions` | 400 |
| 8 | Create Auction — Extra Field | POST | `/api/v1/auctions` | 400 |
| 9 | Create Auction — Duplicate | POST | `/api/v1/auctions` | 409 |
| 10 | Get Auction | GET | `/api/v1/auctions/{{auction_id}}` | 200 |
| 11 | Get Auction — Not Found | GET | `/api/v1/auctions/<uuid>` | 404 |
| 12 | Get Auction — No Token | GET | `/api/v1/auctions/{{auction_id}}` | 401 |
| 13 | Get Auction — Invalid UUID | GET | `/api/v1/auctions/not-a-uuid` | 400 |
| 14 | Update Auction | PATCH | `/api/v1/auctions/{{auction_id}}` | 200 |
| 15 | Update Auction — Decimal Increment | PATCH | `/api/v1/auctions/{{auction_id}}` | 200 |
| 16 | Update Auction — Extra Field | PATCH | `/api/v1/auctions/{{auction_id}}` | 400 |
| 17 | Update Auction — bid_increment Zero | PATCH | `/api/v1/auctions/{{auction_id}}` | 400 |
| 18 | Update Auction — Not Found | PATCH | `/api/v1/auctions/<uuid>` | 404 |
| 19 | Update Auction — Not DRAFT | PATCH | `/api/v1/auctions/{{auction_id}}` | 409 |
| 20 | Update Auction — No Token | PATCH | `/api/v1/auctions/{{auction_id}}` | 401 |
