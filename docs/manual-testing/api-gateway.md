# API Gateway — Manual Testing Guide

## Prerequisites

1. Docker infrastructure is running:
   ```
   docker compose up -d
   ```

2. Auth Service is running (the only upstream service currently implemented):
   ```
   npm run dev --workspace=@tournament-planner/auth-service
   ```

3. Auth Service migrations have been applied:
   ```
   npm run migrate --workspace=@tournament-planner/auth-service
   ```

4. API Gateway is running:
   ```
   npm run dev --workspace=@tournament-planner/api-gateway
   ```

**Gateway URL:** `http://localhost:3000`  
**Auth Service URL (upstream):** `http://localhost:3001`

> All client requests go to the **gateway on port 3000**. The gateway forwards them to the upstream service. You should never call the auth service directly during gateway testing — the whole point is to verify the gateway layer.

---

## Postman Setup

### 1. Create an Environment

In Postman: **Environments → +** (New Environment). Name it `API Gateway Local`.

Add these variables:

| Variable | Initial Value | Current Value |
|---|---|---|
| `gateway_url` | `http://localhost:3000` | `http://localhost:3000` |
| `access_token` | *(leave empty)* | *(filled automatically after login)* |
| `refresh_token` | *(leave empty)* | *(filled automatically after login)* |
| `reset_token` | *(leave empty)* | *(filled automatically after forgot-password)* |

Click **Save**, then select this environment from the top-right dropdown in Postman.

---

### 2. Create a Collection

Click **Collections → +** → **Blank Collection**. Name it `API Gateway`.

Add each request below to this collection. All URLs use `{{gateway_url}}` — never hardcode the port.

---

### 3. Saving Tokens Automatically

In newer Postman (v10+): open a request → click the **Scripts** tab → click **Post-response**.

In older Postman: open a request → click the **Tests** tab.

Paste the script there. It runs automatically after every response and saves tokens into your environment — no manual copy-pasting needed.

---

### 4. Suggested Testing Order

Run the requests in this sequence to cover all gateway features:

```
1.  Health Check                            → 200, gateway is alive
2.  Register (via gateway)                  → 201, public route passes through
3.  Login (via gateway)                     → 200, tokens saved
4.  GET /auth/me — no token                 → 401, gateway rejects unauthenticated request
5.  GET /auth/me — bad token                → 401, gateway rejects invalid JWT
6.  GET /auth/me — valid token              → 200, gateway forwards request and injects x-user-id
7.  Check x-request-id in response headers → gateway echoes a UUID on every response
8.  POST /auth/login × 11                   → 429 on the 11th, rate limit triggered
9.  GET unknown route (with valid token)    → 404, custom not-found response
10. Auth service stopped → GET /auth/me     → 503, gateway handles upstream failure
```

---

## 1. Health Check

**GET** `{{gateway_url}}/health`

No headers required.

**Expected:** `200 OK`

```json
{
  "data": {
    "service": "api-gateway",
    "status": "ok"
  }
}
```

**Verify:**
- This endpoint is gateway-owned — it does not proxy to any upstream service
- No `Authorization` header is required (health is always public)
- Response contains an `x-request-id` header (a UUID) — the gateway attaches this to every response

---

## 2. Public Routes — No Token Required

The gateway allows the five auth routes through without a JWT. This verifies the gateway is not blocking legitimate unauthenticated users.

### Register

| Field | Value |
|---|---|
| Method | `POST` |
| URL | `{{gateway_url}}/api/v1/auth/register` |
| Body (raw JSON) | see below |

```json
{
  "email": "player@example.com",
  "password": "SecurePassword123!",
  "first_name": "Player",
  "last_name": "One"
}
```

**Expected:** `201 Created` — the gateway forwarded the request to the auth service and returned its response transparently.

**What this tests at the gateway layer:** Public route bypass is working. The gateway did not reject the request due to a missing `Authorization` header.

---

### Login

| Field | Value |
|---|---|
| Method | `POST` |
| URL | `{{gateway_url}}/api/v1/auth/login` |
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

**Expected:** `200 OK` — `access_token` and `refresh_token` saved to your environment.

---

### Other Public Routes

These routes are also public at the gateway — confirm each returns a gateway-forwarded response (not a `401`) even without a token:

| Request | Expected |
|---|---|
| `POST {{gateway_url}}/api/v1/auth/refresh` with `{"refresh_token":"{{refresh_token}}"}` | `200 OK` |
| `POST {{gateway_url}}/api/v1/auth/forgot-password` with `{"email":"player@example.com"}` | `202 Accepted` |

---

## 3. Authentication Middleware

This is the gateway's primary job. Every non-public route requires a valid access JWT. The gateway verifies it before forwarding anything upstream.

### 3.1 Request Rejected — No Token

| Field | Value |
|---|---|
| Method | `GET` |
| URL | `{{gateway_url}}/api/v1/auth/me` |
| Authorization | *(none)* |

**Expected:** `401 Unauthorized`

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required",
    "details": null
  }
}
```

**What this tests:** The gateway stopped the request before it reached the auth service. The upstream service never received anything.

---

### 3.2 Request Rejected — Invalid Token

| Field | Value |
|---|---|
| Method | `GET` |
| URL | `{{gateway_url}}/api/v1/auth/me` |
| Authorization | `Bearer this.is.not.a.jwt` |

**Expected:** `401 Unauthorized` — same error shape as above.

---

### 3.3 Request Rejected — Expired Token

Use the token from login but wait 15 minutes (or manually corrupt the last few characters of the JWT).

**Expected:** `401 Unauthorized`

---

### 3.4 Request Accepted — Valid Token

| Field | Value |
|---|---|
| Method | `GET` |
| URL | `{{gateway_url}}/api/v1/auth/me` |
| Authorization tab | Type: **Bearer Token**, Token: `{{access_token}}` |

**Expected:** `200 OK` — the auth service returns the user profile.

```json
{
  "data": {
    "user": {
      "id": "<uuid>",
      "email": "player@example.com",
      "first_name": "Player",
      "last_name": "One",
      "status": "ACTIVE"
    }
  }
}
```

**What this tests:** The gateway verified the JWT, extracted the `sub` (user ID), injected it as `x-user-id` on the forwarded request, and the upstream responded correctly.

---

## 4. Request Correlation (x-request-id)

Every response the gateway sends — success or error — must include an `x-request-id` header containing a UUID.

### 4.1 Verify on a Successful Response

Send `GET {{gateway_url}}/api/v1/auth/me` with a valid token.

In Postman, click **Headers** in the response panel. Confirm:

| Header | Expected |
|---|---|
| `x-request-id` | A UUID string (e.g. `a1b2c3d4-e5f6-...`) |

---

### 4.2 Verify on a 401 Response

Send `GET {{gateway_url}}/api/v1/auth/me` with no token.

**Expected:** `401` AND the response still contains `x-request-id` in the response headers.

---

### 4.3 Verify the ID Changes Per Request

Send the same request twice. The `x-request-id` value must be different each time — it is generated fresh per request.

---

### 4.4 Verify the ID Is Forwarded Upstream

This is visible indirectly: the auth service logs will show the same `x-request-id` that appeared in the Postman response. Check the auth service terminal output after sending a request — the `reqId` in its logs should match the `x-request-id` in the Postman response header.

---

## 5. Rate Limiting

The gateway limits the five auth endpoints to **10 requests per IP per minute**. Requests above the limit are rejected with `429`. This does not affect other routes (e.g. `/health`, `/api/v1/tournaments`).

### 5.1 Exhaust the Limit

Use Postman's **Collection Runner** (or just click Send 11 times quickly) for:

| Field | Value |
|---|---|
| Method | `POST` |
| URL | `{{gateway_url}}/api/v1/auth/login` |
| Body | `{"email":"player@example.com","password":"SecurePassword123!"}` |

Send **11 requests** in quick succession.

**Expected:**
- Requests 1–10: `200 OK` (or `401 INVALID_CREDENTIALS` depending on credentials — the status code from the upstream is irrelevant; what matters is that the gateway let them through)
- Request 11: `429 Too Many Requests`

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded, retry in 1 minute",
    "details": null
  }
}
```

---

### 5.2 Verify Other Routes Are Not Affected

After exhausting the rate limit on `/api/v1/auth/login`, immediately send:

**GET** `{{gateway_url}}/health`

**Expected:** `200 OK` — `/health` is not in the rate-limited set so it is unaffected.

---

### 5.3 Rate Limit Resets

Wait 1 minute, then send a login request again.

**Expected:** `200 OK` (or upstream auth response) — the counter has reset and requests are allowed through again.

---

## 6. 404 — Unknown Route

The gateway only knows about five service prefixes: `/api/v1/auth`, `/api/v1/tournaments`, `/api/v1/auctions`, `/api/v1/competitions`, `/api/v1/notifications`. A path that does not match any prefix returns a clean 404.

| Field | Value |
|---|---|
| Method | `GET` |
| URL | `{{gateway_url}}/api/v1/completely-unknown` |
| Authorization tab | Type: **Bearer Token**, Token: `{{access_token}}` |

**Expected:** `404 Not Found`

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "The requested resource does not exist",
    "details": null
  }
}
```

**Verify:**
- The body does not contain the text `Route` or `not found` — Fastify's default error message leaks internal routing details; the gateway suppresses it
- The response still contains `x-request-id` in the headers

---

## 7. 503 — Upstream Service Unreachable

When an upstream service is down or unreachable, the gateway must return a clean `503` rather than exposing internal connection details.

### 7.1 Stop the Auth Service

In the terminal running the auth service, press `Ctrl+C` to stop it.

### 7.2 Send a Request

| Field | Value |
|---|---|
| Method | `GET` |
| URL | `{{gateway_url}}/api/v1/auth/me` |
| Authorization tab | Type: **Bearer Token**, Token: `{{access_token}}` |

**Expected:** `503 Service Unavailable`

```json
{
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "The requested service is currently unavailable",
    "details": null
  }
}
```

**Verify:**
- The body does not contain `127.0.0.1`, `localhost`, `3001`, or `ECONNREFUSED` — the gateway shields the client from internal topology
- The gateway itself is still running and healthy: `GET {{gateway_url}}/health` still returns `200`

### 7.3 Restart the Auth Service

```
npm run dev --workspace=@tournament-planner/auth-service
```

Verify requests succeed again.

---

## 8. Full Flow (Reference)

Run through all gateway capabilities end-to-end:

```
GET  /health                        → 200, gateway alive (no token needed)
POST /api/v1/auth/register          → 201, public route passes through
POST /api/v1/auth/login             → 200, tokens saved to environment
GET  /api/v1/auth/me (no token)     → 401, gateway rejects unauthenticated
GET  /api/v1/auth/me (valid token)  → 200, gateway forwards, x-user-id injected upstream
                                        check x-request-id in response headers
POST /api/v1/auth/login × 11       → 429 on 11th (RATE_LIMIT_EXCEEDED)
GET  /health                        → 200, rate limit did not affect /health
GET  /api/v1/completely-unknown     → 404 (NOT_FOUND, no internal detail leaked)
Stop auth service
GET  /api/v1/auth/me (valid token)  → 503 (SERVICE_UNAVAILABLE, no internal detail leaked)
GET  /health                        → 200, gateway itself is still running
Restart auth service
GET  /api/v1/auth/me (valid token)  → 200, back to normal
```

---

## Notes

- The gateway runs on port `3000`. The auth service runs on port `3001`. All Postman requests go to port `3000` only.
- The gateway verifies the JWT using the same `JWT_ACCESS_SECRET` as the auth service. Both services must have the same secret in their `.env` files — if they differ, all protected requests will return `401`.
- Rate limiting is per-IP, in-memory. Restarting the gateway resets all counters.
- The `x-user-id` header injected by the gateway is trusted internally by upstream services. It is set only after JWT verification — unauthenticated requests never carry it.
- Currently only the auth service is implemented. Requests to `/api/v1/tournaments`, `/api/v1/auctions`, `/api/v1/competitions`, and `/api/v1/notifications` will return `503` until those services are built.
