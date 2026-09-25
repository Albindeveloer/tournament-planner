Tournament Planner — Development Progress

Project Status

Development phase: Implementation

The project requirements, architecture, database design, API design, business rules, lifecycle decisions, and implementation roadmap have already been finalized during the planning phase.

The complete project specification is available in:

"docs/PROJECT-HANDOVER.md"

---

Current Milestone

M6 — Implementation

---

Current Service

Auth Service

---

Completed Work

Project / Monorepo

- [x] Monorepo structure created
- [x] Root workspace configuration
- [x] Root tooling configuration

Local Infrastructure

- [x] Docker local infrastructure
- [x] PostgreSQL infrastructure
- [x] RabbitMQ infrastructure
- [x] Redis infrastructure where applicable

Auth Service Foundation

- [x] Fastify application setup
- [x] Server setup
- [x] PostgreSQL connection pool
- [x] Health endpoint
- [x] Error handling foundation
- [x] Graceful shutdown
- [x] TypeScript Node.js types/configuration

Auth Database

- [x] Auth database created
- [x] Initial schema/migrations
- [x] Migration runner
- [x] Migration tracking

Registration

- [x] Password hashing
- [x] User repository
- [x] Registration service
- [x] Registration controller
- [x] Registration route
- [x] Duplicate email handling (409 EMAIL_ALREADY_EXISTS)
- [x] Route schema field lengths corrected to match database (VARCHAR 100)
- [x] Registration tests (8/8 passed)
- [x] Typecheck passed

M6.4 User Registration — COMPLETED

Login + JWT

- [x] @fastify/jwt installed and registered in app.ts
- [x] LoginInput type added to auth.service.ts
- [x] loginUser method: email normalization, Argon2id verification, status check, same error for unknown email and wrong password
- [x] loginUser controller: signs access JWT with minimal payload { sub: user.id }
- [x] POST /login route with schema validation
- [x] Login tests (12/12 passed): valid login, wrong password, unknown email, enumeration check, suspended, deactivated, invalid email, short password, extra fields, token sub, no password_hash, email normalization
- [x] Typecheck passed
- [x] Registration tests still passing (8/8)

M6.5 Login + Access JWT — COMPLETED

Refresh Token Lifecycle and Logout

- [x] token.utils.ts: generateRefreshToken() (crypto.randomBytes), hashToken() (SHA-256), parseDurationToMs()
- [x] RefreshTokenRepository: create, findByHash, revokeById, revokeAllForUser, rotateToken (transactional BEGIN/COMMIT)
- [x] UserRepository: findById added
- [x] loginUser extended: generates refresh token on successful login, stores hash only (never plaintext)
- [x] refreshToken service method: validates token, reuse detection (revokes all user sessions on revoked token replay), expiry check, transactional rotation
- [x] logoutUser service method: revokes token, idempotent (no error for unknown/already-revoked token)
- [x] refreshToken and logout controllers added
- [x] POST /refresh and POST /logout routes with schema validation
- [x] vitest.config.ts: fileParallelism: false (integration tests share a database)
- [x] Refresh/logout tests (13/13 passed)
- [x] All 33 tests passing (8 registration + 12 login + 13 refresh/logout)
- [x] Typecheck passed

M6.6 Refresh Token Lifecycle and Logout — COMPLETED

Password Reset

- [x] PASSWORD_RESET_EXPIRES_IN added to env.ts, .env, .env.test, .env.example
- [x] PasswordResetTokenRepository: create, findByHash, markAsUsed
- [x] UserRepository: updatePassword added
- [x] forgotPassword service method: email normalization, silent 202 for unknown emails (no enumeration), stores hash only (never plaintext)
- [x] resetPassword service method: validates token existence, used_at, expiry; rehashes with Argon2id; marks token used; revokes all refresh sessions
- [x] forgotPassword and resetPassword controllers added
- [x] POST /forgot-password and POST /reset-password routes with schema validation
- [x] Dev-mode: forgot-password returns reset_token in response for local testing (omitted in production)
- [x] Password reset tests (11/11 passed): 202 for known/unknown email, hash-not-plaintext in DB, valid reset, new password works, old password rejected, refresh session invalidated, token reuse rejected, invalid token, password validation, token marked used_at
- [x] All 44 tests passing (8 registration + 12 login + 13 refresh/logout + 11 password reset)
- [x] Typecheck passed
- [x] Manual testing guide updated (docs/manual-testing/auth-service.md)

M6.7 Password Reset — COMPLETED

Auth Testing and Hardening

- [x] GET /me endpoint: getMe() in auth.service.ts, getMeHandler in auth.controller.ts, GET /me route registered in auth.route.ts
- [x] @fastify/jwt module augmentation: request.user.sub typed correctly after jwtVerify()
- [x] auth.me.test.ts (7 tests): valid token, no password_hash, no auth header, malformed token, expired token, wrong-secret token, suspended account after token issuance
- [x] auth.refresh-logout.test.ts: added suspended account during refresh test (account suspended after session established → 403 ACCOUNT_INACTIVE)
- [x] auth.password-reset.test.ts: added expired reset token test (manually expires token in DB → 400 INVALID_RESET_TOKEN)
- [x] auth.integration.test.ts: Flow A (Register → Login → GET /me → Refresh → GET /me → Logout → Refresh fails), Flow B (Register → Login → Reset Password → old session invalid → old password rejected → new password works)
- [x] All tests passing
- [x] Typecheck passed
- [x] Manual testing guide updated with Postman setup section (docs/manual-testing/auth-service.md)

M6.8 Auth Testing and Hardening — COMPLETED

API Gateway Foundation

- [x] Fastify application setup
- [x] Server setup with graceful shutdown
- [x] Health endpoint (GET /health)
- [x] Error handling foundation (AppError, error-handler)
- [x] TypeScript config
- [x] Environment config with all 5 service URLs validated at startup

M7.1 Gateway Foundation — COMPLETED
M7.2 Gateway Configuration — COMPLETED (folded into M7.1)

Request Routing

- [x] @fastify/http-proxy installed
- [x] registerProxyRoutes: all 5 service prefixes registered
- [x] /api/v1/auth/* → Auth Service (strips prefix, forwards to upstream /*)
- [x] /api/v1/tournaments/* → Tournament Service
- [x] /api/v1/auctions/* → Auction Service
- [x] /api/v1/competitions/* → Competition Service
- [x] /api/v1/notifications/* → Notification Service
- [x] Typecheck passed

M7.3 Request Routing — COMPLETED (rewritePrefix bug fixed: preserve full path)

Authentication Middleware

- [x] @fastify/jwt registered in app.ts with JWT_ACCESS_SECRET
- [x] request.userId decorator registered (null before auth, userId after)
- [x] authenticate hook: skips public paths, calls jwtVerify(), sets request.userId
- [x] Public paths: /health, /api/v1/auth/register, login, refresh, forgot-password, reset-password
- [x] All other routes require a valid access token (401 UNAUTHORIZED if missing/invalid)
- [x] rewriteRequestHeaders: injects x-user-id header for downstream services on authenticated requests
- [x] Global preHandler hook — applies to all proxy routes, one central location

M7.4 Authentication Middleware — COMPLETED

---

Current Task

M7.5 — Request ID / Correlation

---

---

Important Rules

- Do not restart completed work.
- Do not silently change finalized architecture.
- Do not introduce new requirements.
- Do not redesign service boundaries without discussion.
- Do not modify finalized database design without discussion.
- Do not modify finalized APIs without discussion.
- Do not assume documentation and code are identical; inspect the actual implementation.
- Update this file when a meaningful implementation milestone is completed.

---

Development Workflow

For each implementation task:

1. Read the relevant project documentation.
2. Inspect the existing implementation.
3. Identify the owning service.
4. Explain the implementation approach when necessary.
5. Implement the smallest appropriate change.
6. Run relevant tests.
7. Run TypeScript/type checks.
8. Review the resulting changes.
9. Update this progress file.
10. Create a Git commit when the task is complete.

---

Status Legend

- [x] Completed
- [ ] Pending
- [~] In progress
- [!] Blocked / requires decision

---

Notes

This file represents the current implementation state.

If this file conflicts with the actual codebase, inspect the code and documentation before making assumptions.
