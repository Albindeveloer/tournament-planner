Tournament Planner — Implementation Roadmap

1. Purpose

This document is the master implementation roadmap for the Tournament Planner project.

It defines the complete ordered path from the beginning of project development through completion of the planned MVP.

It is intended to be used by Claude Code as the execution roadmap during implementation.

This document answers:

- What was planned first?
- What has already been completed?
- What should be implemented next?
- What are the dependencies between milestones?
- Which service owns each implementation?
- Which database is involved?
- Which APIs and business rules must be implemented?
- What must be tested before moving forward?
- What does "Done" mean for each milestone?
- What remains until the MVP is complete?

This is an implementation roadmap, not a replacement for the complete project handover or Claude instructions.

---

2. Relationship to Project Documentation

The project documentation has four distinct responsibilities.

Document| Purpose
"CLAUDE.md"| Rules and instructions for how Claude Code should work on the project
"PROJECT-HANDOVER.md"| Complete historical/project reference containing finalized requirements, architecture, decisions, schemas, APIs, and rationale
"PROGRESS.md"| Current implementation status and completed/pending work
"docs/IMPLEMENTATION-ROADMAP.md"| Complete ordered implementation plan from project beginning through MVP completion

Source-of-truth relationship

When working on the project:

1. "CLAUDE.md" defines how to work.
2. "PROJECT-HANDOVER.md" defines what has been decided.
3. "IMPLEMENTATION-ROADMAP.md" defines what should be implemented and in what order.
4. "PROGRESS.md" defines what has actually been completed.

If implementation progress differs from this roadmap, update "PROGRESS.md".

Do not silently redesign finalized architecture or requirements.

---

3. Current Implementation Position

The project has already completed the requirements/design phase and initial implementation foundation.

Completed design milestones

- M1 — Requirements and Product Scope
- M2 — Business Lifecycles and Domain Rules
- M3 — Database Architecture and Schema Design
- M4 — API Design
- M5 — Repository, Workspace, Infrastructure and Implementation Planning

Completed implementation milestones

- M6.1 — Common Project Foundation
- M6.2 — Auth Service Foundation
- M6.3 — Auth Database and Migrations
- M6.4 — User Registration

Current implementation position

The next implementation milestone is:

M6.5 — Login + Access JWT

After M6.5:

M6.6 — Refresh Token / Logout

Then:

M6.7 — Password Reset

Then:

M6.8 — Auth Testing / Hardening

After Auth Service is complete, implementation continues through:

M7  — API Gateway
M8  — Tournament Service
M9  — Auction Service
M10 — Competition / Match Service
M11 — Notification Service
M12 — Cross-Service Integration & RabbitMQ
M13 — Frontend Foundation
M14 — Frontend Authentication & Core Tournament Flows
M15 — Frontend Auction Flow
M16 — Frontend Competition / Match Flow
M17 — Frontend Notifications
M18 — End-to-End Integration
M19 — Security, Reliability, Observability & Hardening
M20 — Docker / Deployment Readiness
M21 — Final MVP Validation

The exact sub-milestone structure below is the execution plan.

---

4. Final Technology and Architecture Constraints

The implementation roadmap must preserve these finalized decisions.

Frontend

- React
- TypeScript

Backend

- Node.js
- TypeScript
- Fastify
- REST APIs

Architecture

- Microservices
- API Gateway
- Database-per-service
- RabbitMQ for asynchronous communication
- Redis only if a finalized/useful requirement requires it
- Docker
- npm workspaces monorepo

Databases

- PostgreSQL
- Separate logical database per service
- No cross-service foreign keys
- No service directly accessing another service's database

Databases:

auth_db
tournament_db
auction_db
competition_db
notification_db

Services

Frontend
    ↓
API Gateway
    ↓
Auth Service
Tournament Service
Auction Service
Competition Service
Notification Service

Shared packages

packages/
├── config/
├── logger/
├── types/
└── validation/

Shared packages may contain technical/common functionality.

They must not contain shared business ownership or domain logic.

---

5. Implementation Rules

Claude Code must follow these rules while executing the roadmap.

Rule 1 — Do not redesign finalized decisions

If a requirement, database schema, API contract, lifecycle, service boundary, or technology has already been finalized, implement it rather than redesigning it.

If implementation reveals a genuine technical contradiction, stop and explain the conflict before changing the design.

Rule 2 — Incremental implementation

Implement one logical sub-milestone at a time.

After each sub-milestone:

1. implement
2. typecheck
3. test
4. validate manually where appropriate
5. verify no existing functionality broke
6. update progress

Rule 3 — Database ownership

A service may only access its own database.

Never solve a cross-service problem by directly querying another service's database.

Use:

- REST for synchronous service interaction
- RabbitMQ for asynchronous/event-driven interaction

Rule 4 — Business rules belong to services

Examples:

- Tournament rules → Tournament Service
- Auction rules → Auction Service
- Match/bracket rules → Competition Service
- Authentication → Auth Service
- Notifications → Notification Service

Rule 5 — Gateway is not the business layer

The API Gateway handles concerns such as:

- routing
- authentication middleware
- request/correlation IDs
- rate limiting
- gateway-level request handling

Business authorization remains inside the owning service.

---

6. M1 — Requirements and Product Scope

Status: COMPLETED

This milestone established what Tournament Planner is and what belongs in the MVP.

Goal

Define the product scope and core user workflows before technical implementation.

M1.1 — Product Definition

Goal

Define the Tournament Planner application.

Implemented/decided

Tournament Planner is an online gaming tournament management platform.

Initial game:

EFOOTBALL

Initial tournament format:

KNOCKOUT

Supported team sizes:

1v1
2v2
3v3
4v4

Users can participate in multiple tournaments.

Definition of Done

- Product purpose defined.
- Initial game defined.
- Initial tournament format defined.
- Team sizes defined.
- MVP scope established.

---

M1.2 — Core Tournament Workflow

Goal

Define the complete user journey.

Workflow

Register/Login
    ↓
Create Tournament
    ↓
Open Registration
    ↓
Invite Players / Share Join Link
    ↓
Approve Participants
    ↓
Form Teams
    ↓
Finalize Teams
    ↓
Generate Knockout Bracket
    ↓
Schedule Matches
    ↓
Submit Lineups
    ↓
Play Matches
    ↓
Submit Result
    ↓
Confirm / Dispute Result
    ↓
Resolve Disputes if necessary
    ↓
Advance Winner
    ↓
Complete Tournament

Definition of Done

Core tournament lifecycle was agreed and documented.

---

7. M2 — Business Lifecycles and Domain Rules

Status: COMPLETED

Goal

Finalize domain behavior before database/API implementation.

---

M2.1 — Tournament Lifecycle

Final statuses:

DRAFT
REGISTRATION_OPEN
REGISTRATION_CLOSED
TEAM_FORMATION
TEAMS_FINALIZED
FIXTURES_GENERATED
SCHEDULED
IN_PROGRESS
COMPLETED
CANCELLED

Definition of Done

Tournament lifecycle is finalized and implemented consistently by the Tournament Service.

---

M2.2 — Competition Lifecycle

Final lifecycle:

NOT_CREATED
    ↓
BRACKET_GENERATED
    ↓
SCHEDULING
    ↓
SCHEDULED
    ↓
IN_PROGRESS
    ↓
COMPLETED

Exceptional state:

CANCELLED

---

M2.3 — Match Lifecycle

Normal flow:

SCHEDULED
    ↓
LINEUP_PENDING
    ↓
LINEUP_CONFIRMED
    ↓
IN_PROGRESS
    ↓
RESULT_PENDING
    ↓
CONFIRMED

Exceptional states:

FORFEIT
DISPUTED
CANCELLED

Only a confirmed official result advances the bracket.

---

M2.4 — Team and Participant Rules

Finalized rules include:

- Owner creates/approves teams.
- Owner selects captains.
- Players can request captain status.
- Owner has final captain-selection authority.
- A participant can participate in multiple tournaments.
- A participant can belong to only one team within a tournament.
- Captain must be a main player.
- A team may have at most one captain.
- Substitute rules depend on tournament configuration.

---

M2.5 — Substitute Rules

Substitutes are controlled by tournament configuration.

If substitutes are enabled:

Team Format| Substitute
1v1| None
2v2| Required
3v3| Required
4v4| Required

Required participant capacity is derived from:

number_of_teams ×
(team_size + substitute_requirement)

Capacity is not stored as a separate tournament column.

Tournament cannot start unless the required participant count is available.

---

M2.6 — Auction Lifecycle

Auction is optional.

Formation mode:

MANUAL
AUCTION

Auction lifecycle:

DRAFT
    ↓
READY
    ↓
IN_PROGRESS
    ↓
COMPLETED

Exceptional:

CANCELLED

Rules:

- One auction per tournament.
- Captains participate as bidders.
- One live lot at a time in MVP.
- Server controls auction timer.
- First bid must meet starting price.
- Subsequent bids must meet minimum increment.
- Sold player is allocated atomically.
- Unsold players move to next round.
- Final remaining unsold players are auto-allocated deterministically.
- Auction Service does not directly modify Tournament Service team membership.

---

M2.7 — Competition Rules

Finalized MVP rules:

- Knockout only.
- Number of teams must be a power of two.
- No byes in MVP.
- One fixture represents one match.
- "match_number" remains for future best-of-3/best-of-5 support.
- Match must produce a winner.
- Forfeit is distinct from normal result.
- Withdrawn teams forfeit their remaining applicable matches.
- Confirmed result is required before bracket advancement.

---

M2.8 — Result and Dispute Rules

Result flow:

Captain A submits result
        ↓
Captain B confirms
        ↓
Confirmed

If disputed:

Result Submitted
       ↓
Disputed
       ↓
Owner Resolves
       ↓
Official Result

Only the owner resolves disputes.

---

8. M3 — Database Architecture and Schema

Status: COMPLETED

Goal

Finalize database ownership and schema before implementation.

---

M3.1 — Database Architecture

Five logical databases:

auth_db
tournament_db
auction_db
competition_db
notification_db

Rules:

- UUID primary keys.
- No cross-database foreign keys.
- Services own their databases.
- PostgreSQL.
- "VARCHAR + CHECK" instead of PostgreSQL ENUM.
- Service-level validation for cross-service consistency.

---

M3.2 — Auth Database

Tables:

users
refresh_tokens
password_reset_tokens

Includes:

- case-insensitive email uniqueness
- password hashes
- account status
- refresh-token hashes
- password-reset token hashes
- expiry
- revocation/usage tracking
- required indexes
- foreign keys within auth DB only

---

M3.3 — Tournament Database

Tables:

tournaments
tournament_participants
invitations
join_requests
captain_requests
teams
team_members

---

M3.4 — Auction Database

Tables:

auctions
auction_rounds
auction_lots
auction_bidders
bids
allocations

---

M3.5 — Competition Database

Tables:

competitions
rounds
fixtures
matches
match_lineups
match_lineup_players
match_results
disputes

---

M3.6 — Notification Database

Tables:

notifications
notification_deliveries
notification_preferences

---

M3.7 — Database Integrity Decisions

Finalized:

- UUID IDs.
- Parameterized SQL.
- Unique constraints for business invariants where appropriate.
- Partial indexes where useful.
- Transactions for critical operations.
- Database constraints remain the final protection against race conditions.
- Cross-service relationships validated through service communication.

---

9. M4 — API Design

Status: COMPLETED

Goal

Finalize REST API contracts before implementation.

---

M4.1 — API Conventions

Base path:

/api/v1

Success:

{
  "data": {}
}

Collections:

{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}

Errors:

{
  "error": {
    "code": "TOURNAMENT_NOT_FOUND",
    "message": "Tournament not found",
    "details": null
  }
}

JSON field naming:

snake_case

---

M4.2 — Authentication APIs

Final API surface:

POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
GET  /api/v1/auth/me

---

M4.3 — Tournament APIs

Includes APIs for:

- tournament creation
- listing
- retrieval
- updating
- opening/closing/cancelling
- participants
- join requests
- invitations
- captain requests
- teams
- team members
- finalizing teams

---

M4.4 — Auction APIs

Includes APIs for:

- auction creation
- configuration
- readiness
- start
- rounds
- bidders
- lots
- bids
- allocations
- auto-allocation
- completion
- cancellation

---

M4.5 — Competition APIs

Includes APIs for:

- competition creation
- bracket generation
- rounds
- fixtures
- matches
- scheduling
- starting
- cancellation
- forfeits
- lineups
- results
- disputes
- dispute resolution

---

M4.6 — Notification APIs

Includes:

GET notifications
GET notification
PATCH notification/read
PATCH notifications/read-all
DELETE notification
GET notification-preferences
PUT notification-preferences

Notifications are generated from events rather than arbitrary external notification creation.

---

10. M5 — Repository and Implementation Preparation

Status: COMPLETED

---

M5.1 — Monorepo Decision

Status: COMPLETED

npm workspaces monorepo selected.

apps/
packages/
infrastructure/
docs/
.github/

---

M5.2 — Root Repository Setup

Status: COMPLETED

Completed:

- root "package.json"
- npm workspaces
- TypeScript base configuration
- ".gitignore"
- ".env.example"
- README
- root tooling

---

M5.3 — Service Folder Architecture

Status: COMPLETED

Backend service pattern:

service/
├── src/
│   ├── modules/
│   ├── middleware/
│   ├── config/
│   ├── infrastructure/
│   ├── app.ts
│   └── server.ts
├── tests/
├── package.json
└── tsconfig.json

No unnecessary Clean Architecture layers.

---

M5.4 — Shared Packages

Status: COMPLETED

packages/
├── config/
├── logger/
├── types/
└── validation/

No business domain sharing.

---

M5.5 — Environment Strategy

Status: COMPLETED

Service-specific configuration.

".env.example" files committed.

".env" ignored.

Production secrets will be managed externally.

---

M5.6 — Local Infrastructure

Status: COMPLETED

Local Docker infrastructure:

PostgreSQL
RabbitMQ

Redis intentionally deferred until a real requirement exists.

PostgreSQL uses one container with five logical databases.

---

M5.7 — Implementation Sequence

Status: COMPLETED

Final implementation dependency order:

Foundation
   ↓
Auth
   ↓
API Gateway
   ↓
Tournament
   ↓
Auction
   ↓
Competition
   ↓
Notification
   ↓
Frontend
   ↓
Integration
   ↓
Testing / Hardening
   ↓
Deployment Readiness
   ↓
MVP Validation

---

11. M6 — Auth Service Implementation

Status: IN PROGRESS

Auth Service implementation is the current development area.

---

M6.1 — Common Project Foundation

Status: COMPLETED

M6.1.1 — Monorepo and Root Structure

Completed.

M6.1.2 — Root Tooling Validation

Completed.

Validated:

build
test
lint
typecheck
format

M6.1.3 — Local Docker Infrastructure

Completed.

Validated:

- PostgreSQL
- five databases
- database users
- RabbitMQ
- RabbitMQ management UI
- health checks

Definition of Done

Local infrastructure starts successfully and supports service development.

---

M6.2 — Auth Service Foundation

Status: COMPLETED

M6.2.1 — Initialize Auth Service

Completed.

M6.2.2 — Install Fastify and Core Dependencies

Completed.

M6.2.3 — TypeScript Configuration

Completed.

M6.2.4 — Environment Configuration

Completed.

M6.2.5 — PostgreSQL Connection

Completed.

M6.2.6 — Fastify Application and Server

Completed.

M6.2.7 — Error Handling and Graceful Shutdown

Completed.

Definition of Done

Auth Service starts successfully, exposes health endpoint, connects to PostgreSQL and shuts down cleanly.

---

M6.3 — Auth Database and Migrations

Status: COMPLETED

M6.3.1 — Migration Structure

Completed.

M6.3.2 — Migration Runner

Completed.

Migration approach:

Version-controlled SQL
+
small Node.js migration runner
+
pg

No external migration framework.

M6.3.3 — Auth Schema Migration

Completed.

M6.3.4 — Migration Verification

Completed.

Validated:

- tables
- columns
- indexes
- constraints
- foreign keys
- cascade behavior
- unique email behavior
- migration tracking
- UUID generation

Definition of Done

Auth DB can be created from migrations and migrations are safely repeatable.

---

M6.4 — User Registration

Status: COMPLETED

M6.4.1 — Registration Contract

Completed.

Endpoint:

POST /api/v1/auth/register

M6.4.2 — Password Hashing

Completed.

Argon2id.

Passwords must never be stored or returned in plaintext.

M6.4.3 — User Repository

Completed.

Repository handles database access only.

M6.4.4 — Registration Service

Completed.

Responsibilities:

- normalize email
- detect existing user
- hash password
- create user
- return safe user

M6.4.5 — Registration Controller and Route

Completed.

M6.4.6 — Duplicate Email and Error Handling

Completed as part of registration hardening.

Requirements:

- application-level duplicate detection
- database unique constraint protection
- PostgreSQL "23505" handling for race conditions
- HTTP "409"
- no database error leakage

M6.4.7 — Registration Tests and Validation

Completed/validated.

Required coverage:

- successful registration
- invalid email
- invalid password
- invalid first name
- duplicate email
- case-insensitive email
- safe response
- password hash never returned
- database constraint behavior

Definition of Done

Registration works through the REST API and remains functional after subsequent Auth Service changes.

---

12. M6.5 — Login + Access JWT

Status: NEXT / PENDING

Goal

Implement username/password authentication and short-lived access JWT.

---

M6.5.1 — Login Contract

Endpoint:

POST /api/v1/auth/login

Request:

{
  "email": "player@example.com",
  "password": "SecurePassword123!"
}

Validation:

- email required
- valid email
- max 255 characters
- password required
- 8–128 characters

---

M6.5.2 — JWT Dependency

Install:

@fastify/jwt

Only in Auth Service.

---

M6.5.3 — JWT Configuration

Use:

JWT_ACCESS_SECRET
JWT_ACCESS_EXPIRES_IN

The refresh secret remains reserved for M6.6.

Access token lifetime is approximately:

15 minutes

---

M6.5.4 — Access Token Payload

Minimal payload:

{
  "sub": "user_uuid",
  "iat": 0,
  "exp": 0
}

Do not include:

- password
- password hash
- email
- first name
- last name
- unnecessary profile data
- business roles unless a finalized requirement introduces them

---

M6.5.5 — Login Service

Implement:

1. normalize email
2. find user
3. verify Argon2id password
4. reject invalid credentials
5. verify account status
6. generate access token
7. return safe user

Unknown email and wrong password must use the same authentication failure behavior.

This prevents account enumeration through login responses.

---

M6.5.6 — Account Status Rules

Only:

ACTIVE

users may authenticate successfully.

Reject:

SUSPENDED
DEACTIVATED

Do not reveal unnecessary account information.

---

M6.5.7 — Login Controller and Route

Implement:

POST /api/v1/auth/login

Success:

{
  "data": {
    "user": {},
    "access_token": "...",
    "token_type": "Bearer"
  }
}

Important boundary

M6.5 focuses on:

Login
+
Access JWT

Refresh-token persistence, rotation and logout belong to M6.6.

---

M6.5.8 — Login Tests

Test:

- valid credentials
- wrong password
- unknown email
- suspended user
- deactivated user
- invalid email
- invalid password
- safe response
- token generated
- token contains correct "sub"
- token expiration configured
- password hash not returned

---

M6.5.9 — Regression Validation

Verify:

- registration still works
- health endpoint works
- migration command works
- typecheck passes

Dependencies

- M6.4

Definition of Done

- Login endpoint works.
- Argon2id verification works.
- Invalid credentials are handled safely.
- Account status is enforced.
- Access JWT is generated.
- JWT contains minimal claims.
- No sensitive data is returned.
- Tests pass.
- Registration remains functional.

---

13. M6.6 — Refresh Token Lifecycle and Logout

Status: PENDING

Goal

Implement secure refresh-token sessions using the finalized "refresh_tokens" table.

---

M6.6.1 — Refresh Token Generation

Generate a secure refresh token.

Never store the plaintext refresh token in PostgreSQL.

Store:

token_hash

---

M6.6.2 — Login Refresh Token Integration

Extend successful login to establish a refresh-token session.

Final authentication flow becomes:

Login
↓
Access Token
+
Refresh Token

The refresh token is associated with the user.

---

M6.6.3 — Refresh Token Storage

Persist:

- user ID
- token hash
- expiry
- created timestamp
- last used timestamp
- revoked timestamp

---

M6.6.4 — Refresh Endpoint

Implement:

POST /api/v1/auth/refresh

Requirements:

- validate refresh token
- hash incoming token
- find active token record
- verify expiry
- verify not revoked
- rotate token
- issue new access token
- issue replacement refresh token
- revoke old refresh token

Rotation must be transactional.

---

M6.6.5 — Refresh Token Reuse Handling

If a revoked/previous refresh token is presented:

- reject request
- do not issue new tokens
- avoid leaking internal token state

Where appropriate, invalidate the associated refresh session.

---

M6.6.6 — Logout

Implement:

POST /api/v1/auth/logout

Logout invalidates the relevant refresh-token session.

Access JWTs remain naturally short-lived.

---

M6.6.7 — Refresh Token Tests

Test:

- valid refresh
- expired refresh
- revoked refresh
- rotated refresh
- reuse of old token
- invalid token
- logout
- repeated logout
- concurrent refresh behavior

Dependencies

- M6.5
- M6.3 refresh token schema

Definition of Done

Refresh rotation and logout work securely and refresh tokens are never stored plaintext.

---

14. M6.7 — Password Reset

Status: PENDING

Goal

Implement secure password-reset flow.

---

M6.7.1 — Forgot Password

Endpoint:

POST /api/v1/auth/forgot-password

Always return a generic success response such as:

202 Accepted

Do not reveal whether the email exists.

---

M6.7.2 — Password Reset Token

Generate a cryptographically secure reset token.

Store only:

token_hash

Persist:

- user
- expiry
- creation time
- used timestamp

---

M6.7.3 — Reset Password

Endpoint:

POST /api/v1/auth/reset-password

Validate:

- token
- token expiry
- token unused status
- new password

Hash the new password using Argon2id.

---

M6.7.4 — Invalidate Existing Refresh Sessions

After successful password reset:

invalidate existing refresh-token sessions

This prevents previously issued refresh sessions from continuing indefinitely.

---

M6.7.5 — Password Reset Tests

Test:

- unknown email
- valid reset
- expired token
- already-used token
- invalid token
- password validation
- refresh-session invalidation
- reset token cannot be reused

Dependencies

- M6.6
- M6.3 password-reset schema

Definition of Done

Complete password-reset flow is secure, one-time-use and does not reveal account existence.

---

15. M6.8 — Auth Testing and Hardening

Status: PENDING

Goal

Finish Auth Service as a production-oriented service before moving to other domain services.

---

M6.8.1 — Authentication Test Suite

Cover:

- registration
- login
- access JWT
- refresh
- rotation
- logout
- forgot password
- reset password
- account status
- duplicate registration
- validation
- error handling

---

M6.8.2 — Authentication Security Validation

Verify:

- Argon2id passwords
- hashed refresh tokens
- hashed reset tokens
- short access-token lifetime
- refresh rotation
- no sensitive response fields
- no account enumeration
- parameterized SQL
- validation
- error sanitization

---

M6.8.3 — Auth Service Integration Validation

Validate:

Register
↓
Login
↓
Access JWT
↓
Refresh
↓
Logout

and:

Forgot Password
↓
Reset Password
↓
Old Refresh Session Invalid

Definition of Done

Auth Service is independently functional and tested.

---

16. M7 — API Gateway

Status: PENDING

Goal

Create the single public API entry point.

---

M7.1 — Gateway Foundation

Relevant service:

apps/api-gateway

Use:

- Node.js
- TypeScript
- Fastify

---

M7.2 — Gateway Configuration

Configure service URLs:

AUTH_SERVICE_URL
TOURNAMENT_SERVICE_URL
AUCTION_SERVICE_URL
COMPETITION_SERVICE_URL
NOTIFICATION_SERVICE_URL

---

M7.3 — Request Routing

Route:

/api/v1/auth/*          → Auth Service
/api/v1/tournaments/*   → Tournament Service
/api/v1/auctions/*      → Auction Service
/api/v1/competitions/*  → Competition Service
/api/v1/notifications/* → Notification Service

---

M7.4 — Authentication Middleware

Gateway validates access JWT where required.

Public routes include appropriate authentication exceptions such as:

register
login
refresh
forgot-password
reset-password

Protected routes require valid authentication.

---

M7.5 — Request ID / Correlation

Every request should have a request/correlation identifier.

Forward the identifier to downstream services.

This will later support distributed logging.

---

M7.6 — Rate Limiting

Gateway-level rate limiting for sensitive endpoints.

At minimum:

- login
- register
- refresh
- forgot password
- reset password

Do not introduce Redis merely for rate limiting unless the finalized implementation requires distributed rate limiting.

For the initial local implementation, use the simplest production-appropriate approach compatible with the architecture.

---

M7.7 — Gateway Error Handling

Maintain the standard API error contract.

Do not expose internal service details.

---

M7.8 — Gateway Tests

Test:

- route forwarding
- authentication
- unauthorized requests
- request IDs
- error propagation
- rate limits
- service unavailable behavior

Dependencies

- M6 Auth Service

Definition of Done

Frontend can eventually use the Gateway as the only API entry point.

---

17. M8 — Tournament Service

Status: PENDING

Goal

Implement tournament registration, participants, teams, invitations, captain management and tournament lifecycle.

Database:

tournament_db

---

M8.1 — Tournament Service Foundation

Implement:

- Fastify
- TypeScript
- environment configuration
- PostgreSQL connection
- error handling
- graceful shutdown
- health endpoint
- service logging

Dependency

M7 / Auth foundation.

---

M8.2 — Tournament Database Migration

Implement all finalized tournament tables:

tournaments
tournament_participants
invitations
join_requests
captain_requests
teams
team_members

Add all finalized:

- indexes
- constraints
- unique rules
- status checks
- partial indexes

---

M8.3 — Tournament Creation

Implement:

POST /api/v1/tournaments

Validate:

- name
- description
- game
- format
- team size
- number of teams
- substitutes
- formation mode
- registration settings

Enforce:

game = EFOOTBALL
format = KNOCKOUT
team_size = 1..4
formation_mode = MANUAL/AUCTION

---

M8.4 — Tournament Configuration

Implement:

GET tournament
GET tournaments
PATCH tournament

Only owner may modify appropriate configuration.

Prevent configuration changes once they would conflict with later lifecycle stages.

---

M8.5 — Tournament Lifecycle

Implement:

open registration
close registration
cancel tournament

Enforce valid state transitions.

---

M8.6 — Participant Management

Implement:

GET participants

Support:

- approval
- withdrawal
- participant status
- capacity validation

Capacity is derived, not stored.

---

M8.7 — Invitations

Implement:

POST invitations
GET invitations
PATCH invitation

Support:

- pending
- accepted
- rejected
- expired
- cancelled

Prevent duplicate active invitations.

---

M8.8 — Public Join Requests

Implement public-link joining.

Flow:

Share Link
↓
Player Requests Join
↓
JOIN_REQUEST = PENDING
↓
Owner Approves
↓
Participant = APPROVED

Public link does not automatically bypass owner approval.

---

M8.9 — Captain Requests

Implement:

POST captain request
GET captain requests

Captain request represents interest.

It does not automatically assign captain status.

Owner makes final decision.

---

M8.10 — Team Creation

Implement:

POST /teams
GET /teams
GET /teams/:id
PATCH /teams/:id

Owner controls team creation.

Validate:

- unique team name per tournament
- tournament ownership
- valid lifecycle state

---

M8.11 — Team Member Management

Implement:

POST team member
PATCH team member
DELETE team member

Enforce:

- participant belongs to tournament
- participant can only belong to one team in tournament
- captain must be main
- one captain/team
- one substitute/team
- substitute rules
- team-size limits

---

M8.12 — Finalize Teams

Implement team finalization.

Before finalization verify:

- correct team count
- required players
- required substitutes
- captain assignments
- no participant assigned to multiple teams
- all teams valid

If auction mode is used, verify required auction allocation state.

---

M8.13 — Tournament Service Tests

Test:

- creation
- update
- lifecycle
- invitations
- join requests
- approval/rejection
- participant withdrawal
- captain requests
- team creation
- team membership
- substitutes
- captain uniqueness
- team capacity
- finalization
- authorization

Dependencies

- M7
- M6 Auth
- tournament DB migration

Definition of Done

Tournament registration and team-formation workflows work entirely through REST APIs and enforce all finalized business rules.

---

18. M9 — Auction Service

Status: PENDING

Goal

Implement optional auction-based team formation.

Database:

auction_db

---

M9.1 — Auction Service Foundation

Implement:

- Fastify
- TypeScript
- PostgreSQL
- configuration
- error handling
- health endpoint
- logging
- graceful shutdown

---

M9.2 — Auction Database Migration

Create:

auctions
auction_rounds
auction_lots
auction_bidders
bids
allocations

Implement finalized constraints/indexes.

---

M9.3 — Auction Creation

Implement:

POST /api/v1/auctions

Only valid tournament configurations can have an auction.

One auction per tournament.

---

M9.4 — Auction Configuration

Implement:

GET auction
PATCH auction

Configure:

- starting price
- bid increment
- rounds
- participating captains
- budget

---

M9.5 — Auction Ready State

Before READY verify:

- tournament is using AUCTION mode
- valid teams/captains exist
- required bidders are registered
- auction configuration valid

---

M9.6 — Auction Rounds

Implement:

create round
list rounds
get round

Round numbers must be unique within an auction.

---

M9.7 — Auction Bidders

Register eligible captains.

Maintain:

- budget
- team association
- auction participation

---

M9.8 — Auction Lots

Implement:

create lot
open lot
close lot
get lot
list lots

MVP rule:

one live lot per auction

---

M9.9 — Bid Processing

Implement:

POST /api/v1/auctions/:id/lots/:lot_id/bids

Validate:

- bidder belongs to auction
- bidder has sufficient budget
- bid >= starting price for first bid
- later bid >= current bid + increment
- lot is LIVE

Use transaction locking:

SELECT ... FOR UPDATE

on the live auction lot.

---

M9.10 — Lot Closing / Sale

When sold:

1. lock lot
2. lock bidder
3. validate winner
4. deduct budget
5. create allocation
6. mark lot SOLD
7. commit atomically

---

M9.11 — Unsold Player Handling

Unsold players:

Round N
↓
Next Round

Final unsold players:

Deterministic Auto Allocation

Auto-allocation must be deterministic.

Example principle already discussed:

highest remaining budget
+
deterministic tie-break

Do not invent a different business rule without revisiting the finalized decision.

---

M9.12 — Auction Events

Publish relevant events such as:

PlayerAllocated
AuctionCompleted

Do not directly modify Tournament Service team membership.

---

M9.13 — Auction Completion

Verify:

- auction state
- allocations
- team requirements
- all required players allocated
- final state

---

M9.14 — Auction Tests

Test:

- auction creation
- one auction/tournament
- bidder registration
- bid validation
- concurrent bids
- insufficient budget
- live lot enforcement
- sale transaction
- unsold rounds
- auto-allocation
- duplicate allocations
- completion
- cancellation

Dependencies

- M8 Tournament Service
- auction DB

Definition of Done

Auction mode can produce deterministic team/player allocations without violating service ownership.

---

19. M10 — Competition / Match Service

Status: PENDING

Goal

Implement knockout bracket generation, fixtures, match scheduling, lineups, results, disputes and advancement.

Database:

competition_db

---

M10.1 — Competition Service Foundation

Implement:

- Fastify
- TypeScript
- PostgreSQL
- configuration
- logging
- errors
- health
- graceful shutdown

---

M10.2 — Competition Database

Create finalized tables:

competitions
rounds
fixtures
matches
match_lineups
match_lineup_players
match_results
disputes

---

M10.3 — Competition Creation

Implement:

POST /api/v1/competitions

Validate tournament readiness.

Only finalized teams can enter competition.

---

M10.4 — Knockout Bracket Generation

Implement:

POST /competitions/:id/generate-bracket

Requirements:

- knockout only
- team count must be a power of two
- no byes
- generate rounds
- generate fixtures
- connect future fixtures through "next_fixture_id"

---

M10.5 — Competition Lifecycle

Implement:

NOT_CREATED
BRACKET_GENERATED
SCHEDULING
SCHEDULED
IN_PROGRESS
COMPLETED
CANCELLED

Enforce state transitions.

---

M10.6 — Fixture Management

Implement:

GET rounds
GET fixtures
GET fixture

Track:

- team A
- team B
- winner
- status
- next fixture

Pending bracket slots remain nullable until advancement fills them.

---

M10.7 — Match Creation

Each MVP fixture creates one match.

Keep:

match_number = 1

for future best-of-N support.

---

M10.8 — Match Scheduling

Owner schedules matches.

Implement:

POST /matches/:id/schedule

Validate:

- correct owner
- valid fixture
- both teams available
- lifecycle state

---

M10.9 — Lineup Management

Implement:

POST /matches/:id/lineups
GET /matches/:id/lineups
PATCH /matches/:id/lineups

Captains submit lineups.

Lineup must be submitted before match start.

Validate lineup against permanent Tournament Service team membership.

Competition Service must not directly query tournament DB.

Use appropriate service communication.

---

M10.10 — Match Start

Implement match start.

Transition:

LINEUP_CONFIRMED
    ↓
IN_PROGRESS

Owner/captain permissions must follow finalized rules.

---

M10.11 — Result Submission

Implement:

POST /matches/:id/results
GET /matches/:id/results

Result submission creates a result record.

"submission_number" preserves submission history.

---

M10.12 — Result Confirmation

Opponent captain confirms result.

On confirmation:

RESULT_PENDING
    ↓
CONFIRMED

Only confirmed official result advances bracket.

---

M10.13 — Result Dispute

Implement:

POST /matches/:id/dispute
GET disputes
GET dispute

Disputed match:

RESULT_PENDING
    ↓
DISPUTED

---

M10.14 — Dispute Resolution

Only tournament owner may resolve.

Resolution creates the official result.

Then:

DISPUTED
    ↓
CONFIRMED

where appropriate.

---

M10.15 — Forfeit

Implement:

POST /matches/:id/forfeit

Handle:

- team cannot play
- team withdrawal
- opponent automatically wins
- fixture advancement

Forfeit remains distinct from normal result.

---

M10.16 — Bracket Advancement

After official result:

1. identify winner
2. update fixture
3. populate next fixture
4. make next fixture READY when both teams are known
5. create/schedule next match according to lifecycle
6. eventually determine tournament winner

Only confirmed results or official forfeits can advance teams.

---

M10.17 — Competition Completion

When final fixture is completed:

IN_PROGRESS
    ↓
COMPLETED

Publish:

CompetitionCompleted

---

M10.18 — Competition Tests

Test:

- power-of-two validation
- bracket generation
- fixture linking
- scheduling
- lineup validation
- result submission
- result confirmation
- disputes
- dispute resolution
- forfeits
- withdrawal
- bracket advancement
- final completion
- concurrency
- authorization

Dependencies

- M8 Tournament Service
- competition DB
- authentication

Definition of Done

A complete knockout tournament can progress from finalized teams through matches to a confirmed winner.

---

20. M11 — Notification Service

Status: PENDING

Goal

Consume domain events and create user notifications.

Database:

notification_db

---

M11.1 — Notification Service Foundation

Implement:

- Fastify
- TypeScript
- PostgreSQL
- configuration
- RabbitMQ client
- error handling
- logging
- health endpoint

---

M11.2 — Notification Database

Create:

notifications
notification_deliveries
notification_preferences

---

M11.3 — Notification Creation

Notifications are generated from events.

Do not create arbitrary notification APIs for business services to bypass event ownership.

---

M11.4 — Notification Retrieval

Implement:

GET /notifications
GET /notifications/:id
PATCH /notifications/:id/read
PATCH /notifications/read-all
DELETE /notifications/:id

---

M11.5 — Notification Preferences

Implement:

GET /notification-preferences
PUT /notification-preferences

---

M11.6 — Event Consumers

Consume events such as:

TournamentInvitationCreated
JoinRequestApproved
CaptainRequestUpdated
PlayerAllocated
MatchScheduled
ResultSubmitted
ResultDisputed
ResultConfirmed
MatchForfeited
CompetitionCompleted
TeamWithdrawn

Use the finalized event naming/contracts.

---

M11.7 — Idempotent Event Processing

Consumers must safely handle duplicate delivery.

Use event IDs / deterministic processing rules.

A duplicate event must not create duplicate notifications.

---

M11.8 — Notification Delivery

MVP primarily supports:

IN_APP

Database structure supports:

EMAIL
PUSH

but full external email/push delivery is not required unless already finalized.

---

M11.9 — Notification Tests

Test:

- event consumption
- notification creation
- duplicate event
- read
- read-all
- deletion
- preferences
- delivery state

Dependencies

- RabbitMQ
- M8/M9/M10 event producers

Definition of Done

Domain events reliably create user notifications without duplicate notification creation.

---

21. M12 — Cross-Service Integration and RabbitMQ

Status: PENDING

Goal

Connect independently implemented services without violating service ownership.

---

M12.1 — RabbitMQ Infrastructure

Configure:

- exchange(s)
- queues
- routing keys
- consumers
- publisher configuration

Keep event contracts explicit.

---

M12.2 — Event Envelope

Use a common technical event structure containing information such as:

event_id
event_type
occurred_at
source
correlation_id
payload

The common package may contain the generic event envelope, but not domain ownership.

---

M12.3 — Transactional Outbox

Implement the transactional outbox where needed for reliable DB-to-event publication.

Important pattern:

Business DB Transaction
        +
Outbox Record
        ↓
Commit
        ↓
Publisher
        ↓
RabbitMQ

This prevents successful database operations from losing their corresponding event.

---

M12.4 — Event Consumers

Implement consumers for required cross-service workflows.

Examples:

Auction → Tournament
Competition → Notification
Tournament → Notification
Auction → Notification

---

M12.5 — Service-to-Service REST

Use REST only where synchronous information is required.

Examples include validating current tournament/team information.

Never directly access another service database.

---

M12.6 — Failure Handling

Handle:

- service unavailable
- RabbitMQ unavailable
- duplicate event
- message retry
- failed consumer
- malformed event
- timeout
- partial failure

---

M12.7 — Integration Tests

Test complete cross-service flows.

Definition of Done

Services communicate through the finalized REST/RabbitMQ architecture without database coupling.

---

22. M13 — Frontend Foundation

Status: PENDING

Goal

Create the React + TypeScript frontend foundation.

---

M13.1 — React Application Setup

Create:

apps/frontend

Use:

- React
- TypeScript

---

M13.2 — Frontend Project Structure

Establish maintainable structure for:

- pages
- components
- features
- API client
- authentication
- state
- routing
- forms
- shared UI

Avoid premature abstraction.

---

M13.3 — API Client

Frontend communicates only with:

API Gateway

Never directly call internal microservices.

---

M13.4 — Authentication Storage Strategy

Implement secure token handling consistent with finalized Auth API.

Avoid exposing refresh tokens unnecessarily to JavaScript if the final API/deployment model supports secure cookie handling.

The implementation must remain consistent with the finalized authentication contract.

---

M13.5 — Routing

Implement routes for:

- authentication
- dashboard
- tournaments
- tournament details
- teams
- auction
- competition
- notifications

---

M13.6 — Common UI States

Implement:

- loading
- empty
- validation error
- API error
- unauthorized
- forbidden
- not found

Definition of Done

Frontend can start and communicate with Gateway using typed API models.

---

23. M14 — Frontend Authentication and Tournament Management

Status: PENDING

Goal

Implement the main tournament-management user experience.

---

M14.1 — Registration UI

Implement:

- email
- password
- first name
- last name
- validation
- API error handling

---

M14.2 — Login UI

Implement:

- login form
- access-token handling
- authenticated state
- logout

---

M14.3 — Password Reset UI

Implement:

- forgot password
- reset password

---

M14.4 — Dashboard

Display:

- user's tournaments
- relevant invitations
- pending requests
- upcoming matches
- notifications

Only use information exposed by finalized APIs.

---

M14.5 — Tournament Creation UI

Fields:

- tournament name
- description
- game
- format
- team size
- number of teams
- substitutes enabled
- team formation mode

---

M14.6 — Tournament Management

Implement owner controls:

- open registration
- close registration
- cancel
- participants
- invitations
- join requests
- captain requests
- teams

---

M14.7 — Public Join Flow

Implement:

Public Link
↓
Tournament Information
↓
Join Request
↓
Pending Approval

---

M14.8 — Team Management UI

Implement:

- team creation
- team editing
- participant assignment
- captain assignment
- substitute assignment
- team validation
- team finalization

Definition of Done

Users can manage tournament registration and teams through the frontend.

---

24. M15 — Frontend Auction Flow

Status: PENDING

Goal

Implement optional auction workflow.

---

M15.1 — Auction Dashboard

Display:

- auction status
- rounds
- bidders
- budgets
- current lot
- current bid
- timer
- allocations

---

M15.2 — Auction Controls

Owner/captain controls based on authorization.

---

M15.3 — Live Bidding

Implement:

- current bid
- bidder
- minimum next bid
- bid submission
- error handling
- lot state

The backend remains authoritative.

---

M15.4 — Auction Results

Display:

- sold players
- unsold players
- allocations
- budgets
- final teams

---

M15.5 — Auto Allocation

Display final automatic allocations where applicable.

Definition of Done

Auction-mode tournament can be completed from the frontend.

---

25. M16 — Frontend Competition and Match Flow

Status: PENDING

Goal

Implement complete tournament competition experience.

---

M16.1 — Bracket UI

Display:

- rounds
- fixtures
- teams
- winners
- pending slots
- completed matches

---

M16.2 — Match Scheduling

Owner can schedule match.

Players/captains see scheduled date/time.

---

M16.3 — Lineup UI

Captains can:

- view squad
- choose lineup
- submit lineup
- correct lineup before match start

---

M16.4 — Match Start

Display match state transitions.

---

M16.5 — Result Submission

Captain submits result.

---

M16.6 — Result Confirmation

Opponent captain can confirm.

---

M16.7 — Result Dispute

Opponent can dispute.

Owner can resolve.

---

M16.8 — Forfeit

Support finalized forfeit workflow.

---

M16.9 — Bracket Advancement

Frontend updates after confirmed results/events.

Definition of Done

A complete knockout tournament can be managed from the frontend from bracket generation through final winner.

---

26. M17 — Frontend Notifications

Status: PENDING

Goal

Implement in-app notification experience.

---

M17.1 — Notification List

Display:

- unread/read state
- timestamp
- notification type
- resource navigation

---

M17.2 — Read State

Implement:

- mark read
- mark all read
- delete

---

M17.3 — Preferences

Implement notification preference management.

---

M17.4 — Event Navigation

Notifications should link users to relevant resources such as:

- tournament
- team
- auction
- match
- dispute

Definition of Done

Users receive and manage notifications generated from domain events.

---

27. M18 — End-to-End Integration

Status: PENDING

Goal

Validate the entire system as one application.

---

M18.1 — Registration to Login

Test:

Register
↓
Login
↓
Access Token
↓
Authenticated API

---

M18.2 — Tournament Registration Flow

Test:

Create Tournament
↓
Open Registration
↓
Invite / Public Link
↓
Join Request
↓
Owner Approval
↓
Participants

---

M18.3 — Manual Team Formation Flow

Test:

Participants
↓
Create Teams
↓
Assign Players
↓
Assign Captains
↓
Assign Substitutes
↓
Finalize Teams

---

M18.4 — Auction Team Formation Flow

Test:

Tournament
↓
Auction
↓
Bidders
↓
Rounds
↓
Bids
↓
Sold/Unsold
↓
Auto Allocation
↓
Final Teams

---

M18.5 — Competition Flow

Test:

Teams Finalized
↓
Bracket
↓
Schedule
↓
Lineup
↓
Match
↓
Result
↓
Confirmation
↓
Advancement
↓
Final
↓
Tournament Completed

---

M18.6 — Dispute Flow

Test:

Result
↓
Dispute
↓
Owner Resolution
↓
Official Result
↓
Bracket Advancement

---

M18.7 — Forfeit Flow

Test:

Team Cannot Play
↓
Forfeit
↓
Opponent Advances

Also test team withdrawal.

---

M18.8 — Notification Flow

Verify domain event:

Event
↓
RabbitMQ
↓
Notification Consumer
↓
Notification DB
↓
Frontend Notification

---

M18.9 — Cross-Service Failure Tests

Simulate:

- Auth unavailable
- Tournament unavailable
- RabbitMQ unavailable
- duplicate messages
- failed notification processing
- database connection failure
- invalid service response

Definition of Done

The major end-to-end MVP workflows function across all services.

---

28. M19 — Security, Reliability, Observability and Hardening

Status: PENDING

Goal

Prepare the application for portfolio-quality production-oriented delivery.

---

M19.1 — Authentication Security

Verify:

- Argon2id
- JWT validation
- refresh rotation
- token revocation
- password reset
- account status
- no sensitive data in responses

---

M19.2 — Authorization

Verify owner/captain/participant permissions.

Examples:

- only owner can resolve disputes
- only owner can finalize teams
- only eligible captains can bid
- only captains can submit/confirm applicable match results
- users can only access permitted resources

---

M19.3 — Input Validation

Every public API must validate:

- body
- params
- query
- enums/status values
- IDs
- dates
- numeric ranges

---

M19.4 — SQL Security

Verify:

- parameterized queries
- no SQL string interpolation from user input
- transactions where required
- database constraints
- correct indexes

---

M19.5 — API Security

Verify:

- authentication
- authorization
- rate limiting
- safe error responses
- request size limits where appropriate
- no stack traces in production responses

---

M19.6 — Logging

Use structured logs.

Include relevant:

- service name
- request ID
- event ID
- correlation ID
- error information

Do not log:

- passwords
- password hashes
- plaintext refresh tokens
- reset tokens
- sensitive secrets

---

M19.7 — Graceful Shutdown

All backend services should:

1. stop accepting new work
2. close Fastify
3. close database pools
4. close message consumers/connections
5. terminate cleanly

---

M19.8 — Error Handling

All services must follow the common error contract.

Errors must be:

- meaningful
- safe
- consistent
- service-owned

---

M19.9 — Concurrency Validation

Special attention:

- duplicate registration
- refresh-token rotation
- auction bids
- auction lot closing
- result confirmation
- bracket advancement
- event processing

Definition of Done

The system has consistent security, logging, error handling and reliability behavior across services.

---

29. M20 — Docker and Deployment Readiness

Status: PENDING

Goal

Prepare the complete application for containerized deployment.

---

M20.1 — Service Dockerfiles

Create production-oriented Dockerfiles for:

- API Gateway
- Auth Service
- Tournament Service
- Auction Service
- Competition Service
- Notification Service
- Frontend

---

M20.2 — Docker Compose Application Stack

Extend local infrastructure to include implemented services.

Expected architecture:

frontend
gateway
auth
tournament
auction
competition
notification
postgres
rabbitmq

---

M20.3 — Internal Networking

Internal services communicate through Docker network names.

Example:

http://auth-service:3001

Do not expose internal services unnecessarily.

---

M20.4 — Production Configuration

Verify:

- environment variables
- secret management boundaries
- production database URLs
- RabbitMQ configuration
- CORS
- API base URLs

---

M20.5 — Health Checks

Each service should expose a health endpoint.

Where appropriate distinguish:

liveness
readiness

without adding unnecessary infrastructure complexity.

---

M20.6 — Migration Execution

Ensure database migrations can be executed reliably for each service.

Do not rely on manually created database tables.

---

M20.7 — CI/CD Readiness

Prepare GitHub Actions for:

install
typecheck
lint
test
build

Deployment automation may remain environment-specific until cloud deployment is actually selected.

Definition of Done

The full application can be built and run through Docker with reproducible configuration.

---

30. M21 — Final MVP Validation

Status: PENDING

Goal

Confirm that the finalized MVP is actually complete.

---

M21.1 — MVP Functional Validation

Validate all required MVP functionality:

Authentication

- registration
- login
- JWT
- refresh
- logout
- password reset

Tournament

- create
- configure
- registration
- invitations
- public join request
- participant approval
- withdrawal

Teams

- manual team formation
- team sizes 1v1/2v2/3v3/4v4
- captains
- substitutes
- team validation
- finalization

Auction

- optional auction
- bidders
- budgets
- live lots
- bidding
- sold/unsold
- second round
- auto allocation
- completion

Competition

- knockout bracket
- match scheduling
- lineups
- match start
- results
- confirmation
- disputes
- owner resolution
- forfeits
- advancement
- tournament completion

Notifications

- domain event notifications
- in-app notifications
- read state
- preferences

---

M21.2 — Business Rule Validation

Verify:

- participant can join multiple tournaments
- participant cannot belong to multiple teams within one tournament
- captain is a main player
- one captain/team
- one substitute/team where applicable
- 1v1 does not require substitute
- 2v2/3v3/4v4 require substitute when enabled
- tournament cannot start without required participants
- knockout team count is power of two
- no MVP byes
- one fixture = one match
- only confirmed official result advances
- forfeit advances opponent
- withdrawn team causes applicable forfeits
- owner resolves disputes
- auction allocations are owned by Auction Service
- Notification Service consumes events rather than owning domain actions

---

M21.3 — API Validation

Verify all finalized endpoints.

Check:

- HTTP status
- request validation
- response structure
- error structure
- authentication
- authorization
- pagination
- snake_case naming

---

M21.4 — Database Validation

Verify:

- migrations work from clean databases
- migrations are repeatable
- indexes exist
- constraints exist
- no cross-service foreign keys
- services cannot access another DB
- transactions are used where required

---

M21.5 — Integration Validation

Verify:

Frontend
↓
API Gateway
↓
Services
↓
Service Databases

and:

Service
↓
RabbitMQ
↓
Notification Service

---

M21.6 — Failure Validation

Test:

- invalid authentication
- unauthorized access
- unavailable service
- database failure
- RabbitMQ failure
- duplicate event
- concurrent bid
- concurrent result confirmation
- duplicate registration
- expired token
- revoked token

---

M21.7 — Production-Oriented Validation

Verify:

- no secrets committed
- no passwords in logs
- no password hashes in API responses
- no plaintext refresh tokens in DB
- no reset tokens in DB
- no direct cross-service DB access
- no unnecessary public ports
- all services typecheck
- all tests pass
- builds succeed

---

31. Dependency Map

The complete implementation dependency chain is:

M1 Requirements
      ↓
M2 Business Lifecycles
      ↓
M3 Database Design
      ↓
M4 API Design
      ↓
M5 Repository / Infrastructure Planning
      ↓
M6 Auth Service
      ↓
M7 API Gateway
      ↓
M8 Tournament Service
      ↓
M9 Auction Service
      ↓
M10 Competition Service
      ↓
M11 Notification Service
      ↓
M12 Cross-Service Integration
      ↓
M13 Frontend Foundation
      ↓
M14 Frontend Tournament/Auth
      ↓
M15 Frontend Auction
      ↓
M16 Frontend Competition
      ↓
M17 Frontend Notifications
      ↓
M18 End-to-End Integration
      ↓
M19 Security / Reliability / Observability
      ↓
M20 Docker / Deployment Readiness
      ↓
M21 Final MVP Validation

---

32. Service Dependency Map

                    ┌──────────────┐
                    │ Auth Service │
                    └──────┬───────┘
                           │
                           ↓
                    ┌──────────────┐
                    │ API Gateway  │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ↓            ↓            ↓
       Tournament       Auction     Competition
          Service       Service       Service
              │            │            │
              └────────────┼────────────┘
                           ↓
                       RabbitMQ
                           ↓
                  Notification Service

The frontend communicates only with the API Gateway.

---

33. Database Ownership Map

Service| Database| Owns
Auth| "auth_db"| users, credentials, refresh sessions, reset tokens
Tournament| "tournament_db"| tournaments, participants, invitations, requests, teams
Auction| "auction_db"| auctions, rounds, lots, bids, allocations
Competition| "competition_db"| competitions, rounds, fixtures, matches, lineups, results, disputes
Notification| "notification_db"| notifications, deliveries, preferences

No service directly accesses another service's database.

---

34. Event-Driven Integration Map

Important domain events include:

Tournament / Registration Events
- TournamentInvitationCreated
- JoinRequestApproved
- CaptainRequestUpdated
- TeamWithdrawn

Auction Events
- PlayerAllocated
- AuctionCompleted

Competition Events
- BracketGenerated
- MatchScheduled
- LineupSubmitted
- MatchStarted
- ResultSubmitted
- ResultDisputed
- ResultConfirmed
- MatchForfeited
- TeamAdvanced
- CompetitionCompleted

Exact event contracts must remain consistent with the finalized project handover.

---

35. Testing Strategy Across the Project

Testing is not a final phase only.

Each milestone must add tests appropriate to its functionality.

Unit tests

Use for:

- business rules
- validation
- calculations
- state transitions
- pure utility functions

Integration tests

Use for:

- repositories
- PostgreSQL
- service APIs
- transactions
- authentication

API tests

Validate:

- HTTP status
- response contract
- authentication
- authorization
- validation
- error handling

Event tests

Validate:

- event publication
- event consumption
- idempotency
- retries

End-to-end tests

Validate complete user journeys.

---

36. Definition of Done — General Standard

A milestone is not complete merely because the code compiles.

A sub-milestone is considered complete when:

- implementation exists
- code follows project structure
- TypeScript passes
- relevant tests pass
- validation exists
- business rules are enforced
- authorization is enforced
- error handling is implemented
- no sensitive information leaks
- database changes have migrations
- API contract remains consistent
- existing functionality has not regressed
- documentation/progress is updated where appropriate

---

37. Claude Code Execution Protocol

Claude Code should use this document as the execution plan.

For each milestone:

Step 1 — Identify current position

Check:

PROGRESS.md

and the actual repository state.

Do not assume that a milestone is incomplete merely because this roadmap says "PENDING".

---

Step 2 — Verify dependencies

Before implementing a milestone:

- confirm required previous milestone exists
- inspect relevant files
- inspect current database state
- inspect existing APIs/tests

---

Step 3 — Implement one sub-milestone

Do not implement an entire service in one uncontrolled change.

Example:

M8.1
↓
M8.2
↓
M8.3
...

---

Step 4 — Validate

Run appropriate:

typecheck
lint
tests
build

and manual API tests where appropriate.

---

Step 5 — Check regressions

Ensure existing functionality still works.

---

Step 6 — Update progress

Update:

PROGRESS.md

with actual completed work.

Do not use this roadmap itself as the detailed daily progress log.

---

Step 7 — Continue

Only proceed to the next sub-milestone after the Definition of Done is satisfied.

---

38. MVP Scope

The finalized MVP includes:

Authentication

- registration
- login
- access JWT
- refresh tokens
- logout
- password reset
- account status

Tournament Management

- tournament creation
- eFootball
- knockout format
- team sizes 1v1–4v4
- participant registration
- invitations
- public join requests
- owner approval
- captain requests
- captain assignment
- manual team formation
- substitutes
- team finalization

Auction

- optional auction
- captain bidding
- budgets
- live lots
- multiple rounds
- unsold handling
- deterministic auto-allocation

Competition

- knockout bracket
- scheduling
- lineups
- match lifecycle
- results
- confirmation
- disputes
- owner resolution
- forfeits
- bracket advancement
- tournament completion

Notifications

- event-driven notifications
- in-app notifications
- notification read state
- notification preferences

Platform

- React frontend
- API Gateway
- Fastify microservices
- PostgreSQL
- RabbitMQ
- Docker
- automated tests
- structured logging
- security hardening

---

39. MVP Completion Criteria

The MVP is complete only when all of the following are true.

Functional

- [ ] User can register.
- [ ] User can log in.
- [ ] Access JWT works.
- [ ] Refresh token lifecycle works.
- [ ] Logout works.
- [ ] Password reset works.
- [ ] User can create tournament.
- [ ] User can configure tournament.
- [ ] Players can be invited.
- [ ] Players can request to join through public link.
- [ ] Owner can approve/reject requests.
- [ ] Owner can create teams.
- [ ] Players can be assigned to teams.
- [ ] Captains can be assigned.
- [ ] Substitute rules are enforced.
- [ ] Teams can be finalized.
- [ ] Manual team formation works.
- [ ] Auction team formation works.
- [ ] Knockout bracket can be generated.
- [ ] Matches can be scheduled.
- [ ] Lineups can be submitted.
- [ ] Results can be submitted.
- [ ] Results can be confirmed.
- [ ] Results can be disputed.
- [ ] Owner can resolve disputes.
- [ ] Forfeits work.
- [ ] Winners advance.
- [ ] Tournament completes.
- [ ] Notifications are generated from domain events.
- [ ] Notifications appear in the frontend.

Architecture

- [ ] Frontend communicates through Gateway.
- [ ] Services own their databases.
- [ ] No direct cross-service DB access.
- [ ] RabbitMQ event communication works.
- [ ] Event processing is idempotent where required.
- [ ] Service boundaries remain intact.

Quality

- [ ] TypeScript passes.
- [ ] Tests pass.
- [ ] Build passes.
- [ ] Security checks pass.
- [ ] Error handling is consistent.
- [ ] Logging is structured.
- [ ] No secrets are committed.
- [ ] Docker build works.
- [ ] Clean environment can run migrations and application.

---

40. Final Technical Validation Checklist

Repository

- [ ] npm workspaces valid
- [ ] package ownership correct
- [ ] no unnecessary dependencies
- [ ] no accidental root dependencies
- [ ] ".gitignore" correct
- [ ] no secrets committed

TypeScript

- [ ] strict mode enabled
- [ ] no avoidable "any"
- [ ] typecheck passes for all workspaces

Backend

- [ ] all services start
- [ ] all services expose health endpoint
- [ ] graceful shutdown implemented
- [ ] consistent error handling
- [ ] input validation everywhere

Database

- [ ] all schemas created through migrations
- [ ] migration runner works from clean DB
- [ ] indexes verified
- [ ] constraints verified
- [ ] transactions verified
- [ ] no cross-service foreign keys

Authentication

- [ ] Argon2id
- [ ] access JWT
- [ ] refresh rotation
- [ ] token revocation
- [ ] password reset
- [ ] account status
- [ ] no credential leakage

API Gateway

- [ ] routes configured
- [ ] authentication middleware
- [ ] request IDs
- [ ] rate limiting
- [ ] safe error handling

RabbitMQ

- [ ] publishers work
- [ ] consumers work
- [ ] event IDs
- [ ] idempotency
- [ ] retry/failure handling

Frontend

- [ ] authentication
- [ ] tournament management
- [ ] team management
- [ ] auction
- [ ] competition
- [ ] notifications
- [ ] API error handling

Docker

- [ ] services build
- [ ] services start
- [ ] databases start
- [ ] RabbitMQ starts
- [ ] migrations run
- [ ] internal networking works

---

41. Final Business-Flow Validation Checklist

Flow 1 — Manual Tournament

Register
↓
Login
↓
Create Tournament
↓
Open Registration
↓
Invite / Public Join
↓
Approve Participants
↓
Create Teams
↓
Assign Players
↓
Assign Captains
↓
Assign Substitutes
↓
Finalize Teams
↓
Generate Bracket
↓
Schedule Matches
↓
Submit Lineups
↓
Play Matches
↓
Submit Result
↓
Confirm Result
↓
Advance Winner
↓
Complete Final
↓
Tournament Completed

---

Flow 2 — Auction Tournament

Create Auction Tournament
↓
Participants
↓
Teams/Captains Ready
↓
Create Auction
↓
Register Bidders
↓
Round 1
↓
Live Lots
↓
Bids
↓
Sold / Unsold
↓
Round 2
↓
Final Auto Allocation
↓
Final Teams
↓
Bracket
↓
Matches
↓
Tournament Completion

---

Flow 3 — Dispute

Match
↓
Result Submitted
↓
Opponent Disputes
↓
Owner Reviews
↓
Owner Resolves
↓
Official Result
↓
Winner Advances

---

Flow 4 — Forfeit

Scheduled Match
↓
Team Cannot Play
↓
Forfeit
↓
Opponent Wins
↓
Next Fixture Updated

---

Flow 5 — Withdrawal

Team Withdraws
↓
Remaining Applicable Matches
↓
Forfeit Handling
↓
Opponents Advance

---

Flow 6 — Authentication

Register
↓
Login
↓
Access JWT
↓
Authenticated Requests
↓
Access Token Expires
↓
Refresh
↓
New Access + Refresh Token

---

Flow 7 — Password Reset

Forgot Password
↓
Generic 202 Response
↓
Reset Token
↓
Reset Password
↓
Invalidate Existing Refresh Sessions
↓
Login Again

---

42. Explicitly Deferred to Post-MVP

The following have been intentionally deferred and must not be introduced into MVP scope unless a new project decision explicitly changes the scope.

Tournament Features

- League tournaments
- Round-robin format
- Advanced tournament formats
- Tournament byes

Games

- PUBG
- Free Fire
- Additional game-specific implementations

MVP remains focused on:

EFOOTBALL

Match Features

- Best-of-3
- Best-of-5
- Advanced game-specific scoring/tiebreak systems

The "match_number" field remains available for future expansion.

Advanced Platform Features

- Advanced rankings
- Leaderboards
- Player statistics beyond MVP requirements
- Chat
- Payments
- Advanced administration
- Complex moderation systems

Infrastructure

- Kubernetes
- Redis without a concrete finalized use case
- Large-scale distributed infrastructure
- Unnecessary service decomposition

Notifications

- Full production email delivery
- Full push-notification infrastructure

The MVP primarily requires in-app notifications.

Deployment

Cloud-specific production architecture is not part of the core MVP implementation unless deployment is explicitly started.

---

43. Final Implementation Principle

The goal is not simply to make the application work.

The goal is to build a maintainable, testable and interview-ready microservices application while preserving the finalized product requirements.

The implementation should therefore follow:

Understand
   ↓
Implement
   ↓
Validate
   ↓
Test
   ↓
Harden
   ↓
Integrate
   ↓
Document
   ↓
Proceed

Do not skip validation to move faster.

Do not introduce complexity merely because the project uses microservices.

Do not bypass service boundaries for convenience.

Do not redesign finalized decisions without identifying the specific technical reason.

The final result should be a working Tournament Planner MVP that demonstrates:

- TypeScript
- React
- Node.js
- Fastify
- REST APIs
- microservices architecture
- PostgreSQL
- database-per-service
- RabbitMQ
- authentication/security
- transactions and concurrency handling
- event-driven communication
- testing
- Docker
- structured logging
- production-oriented engineering practices 