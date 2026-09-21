TOURNAMENT PLANNER

Complete Project Handover Document for Claude

Purpose: Full project handover from ChatGPT planning/implementation to Claude.

Project repository: "tournament-planner"

Current development phase: Implementation

Current major milestone: M6 — Auth Service

Current task: M6.4.7 — Registration Tests

---

0. IMPORTANT — SOURCE OF TRUTH

This document represents the current project state and should be treated as the primary source of truth for continuing development.

Rules:

- Decisions explicitly marked FINAL / LOCKED / COMPLETED must not be silently changed.
- Do not redesign the architecture.
- Do not replace technologies that were already selected.
- Do not reopen previously settled technology comparisons unless an actual implementation blocker makes it necessary.
- Do not introduce requirements that were never agreed upon.
- Do not remove existing business rules for simplicity.
- Do not restart completed implementation work.
- Do not assume that a discussed idea is finalized unless explicitly marked as finalized.
- If something is marked NOT FINALIZED, ask before making a major decision around it.
- Preserve the distinction between:
  - FINAL / LOCKED
  - COMPLETED
  - IN PROGRESS
  - PENDING
  - NOT FINALIZED

The project is simultaneously:

1. A real-world-quality portfolio project.
2. A learning project for understanding backend, microservices, PostgreSQL, messaging, API design, testing, security, and production architecture.

Claude should therefore explain important implementation decisions instead of only generating code.

---

1. PROJECT OVERVIEW

1.1 Project Name

Tournament Planner

Repository:

tournament-planner

---

1.2 Purpose

Tournament Planner is a web application for organizing and managing online gaming tournaments.

The initial domain is eFootball, with architecture designed so additional games can be supported later.

The application manages:

- users
- tournaments
- tournament invitations
- public tournament joining
- join approvals
- captain requests
- teams
- team members
- substitutes
- optional player auctions
- knockout competitions
- fixtures
- match scheduling
- lineups
- match results
- result confirmation
- disputes
- tournament completion
- notifications

---

1.3 Problem Being Solved

The application is intended to provide a structured way for online gaming communities to:

1. Create a tournament.
2. Invite players or share a public tournament link.
3. Approve participants.
4. Form teams.
5. Assign captains.
6. Optionally conduct an auction to build teams.
7. Generate a knockout competition.
8. Schedule matches.
9. Submit lineups.
10. Submit and confirm results.
11. Resolve disputes.
12. Automatically progress winners through the knockout bracket.
13. Notify participants about important tournament events.

---

1.4 Target Users

Primary users are online gamers participating in organized tournaments.

Initial example:

- eFootball players.

Future examples discussed:

- PUBG
- Free Fire
- other online games

However, only eFootball is part of the initial MVP.

---

2. MVP SCOPE

2.1 Initial Version

The initial version supports:

- eFootball
- knockout tournaments
- 1v1
- 2v2
- 3v3
- 4v4
- manual team formation
- optional auction team formation
- tournament invitations
- public tournament links
- owner approval
- captain requests
- captain assignment
- substitutes
- knockout fixtures
- match scheduling
- lineups
- result submission
- result confirmation
- disputes
- owner resolution
- automatic bracket progression
- notifications

---

2.2 Explicitly Outside Initial MVP

The following are NOT initial MVP requirements:

- League tournaments
- Multiple games
- Best-of-3
- Best-of-5
- Advanced rankings
- Chat
- Payments
- Advanced administration
- Kubernetes
- Redis before an actual requirement exists
- Other advanced infrastructure not currently required

These may be considered later.

---

3. CORE DOMAIN DECISIONS

The following decisions are FINAL / LOCKED.

3.1 Initial Game

EFOOTBALL

Multiple games are a future extension.

---

3.2 Initial Tournament Format

KNOCKOUT

League support is future work.

---

3.3 Team Sizes

Supported:

1v1
2v2
3v3
4v4

The database stores the team size as an integer:

1
2
3
4

---

3.4 Team Formation Modes

Supported:

MANUAL
AUCTION

Auction is optional.

The tournament owner selects the formation mode when creating the tournament.

---

3.5 User Participation

A user can participate in multiple tournaments.

There is no global rule restricting a user to a single tournament.

---

4. FUNCTIONAL REQUIREMENTS

4.1 User / Account

Users have:

- UUID user ID
- email
- password
- first name
- optional last name
- account status
- email verification status
- last login timestamp
- creation timestamp
- update timestamp

User statuses:

ACTIVE
SUSPENDED
DEACTIVATED

---

4.2 Registration

Endpoint:

POST /api/v1/auth/register

Registration requires:

{
  "email": "player@example.com",
  "password": "SecurePassword123!",
  "first_name": "Player",
  "last_name": "One"
}

Rules:

- email required
- email must be valid
- email maximum 255 characters
- email is normalized using trim + lowercase
- password required
- password 8–128 characters
- first name required
- first name 1–100 characters
- last name optional
- last name maximum 100 characters
- password is hashed with Argon2id
- plaintext password must never be stored
- "password_hash" must never be returned in API responses
- duplicate email returns HTTP 409
- database uniqueness remains the final protection against duplicate emails

---

4.3 Tournament Ownership

A tournament has an owner.

The owner is responsible for tournament administration, including:

- tournament configuration
- participant approval
- captain selection
- team administration
- finalization
- match scheduling
- dispute resolution
- relevant lifecycle transitions

Authorization must be enforced by the service.

---

4.4 Tournament Creation

Tournament configuration includes:

- name
- description
- game
- format
- team size
- number of teams
- substitutes enabled/disabled
- team formation mode
- registration period
- tournament status

Initial game:

EFOOTBALL

Initial format:

KNOCKOUT

Team formation:

MANUAL
AUCTION

---

4.5 Tournament Capacity

Capacity is derived, not stored as a separate database column.

For team formats:

required participants =
number_of_teams × (team_size + substitute_requirement)

When substitutes are disabled:

required participants =
number_of_teams × team_size

When substitutes are enabled:

required participants =
number_of_teams × (team_size + 1)

Exception:

1v1

does not require a substitute.

Therefore substitutes apply only to:

2v2
3v3
4v4

when enabled.

---

4.6 Tournament Joining

Players can join through:

1. Direct invitation.
2. Public tournament link.

Public-link joining does not automatically grant participation.

A public-link join creates a join request requiring owner approval.

---

4.7 Invitations

Tournament owners can invite users.

Invitation lifecycle includes statuses:

PENDING
ACCEPTED
REJECTED
EXPIRED
CANCELLED

There is a uniqueness rule preventing duplicate invitation records for the same tournament/invitee combination.

---

4.8 Join Requests

Public tournament links result in join requests.

Owner approves or rejects requests.

Join request statuses:

PENDING
APPROVED
REJECTED
CANCELLED
EXPIRED

The exact database status set should follow the finalized database schema where applicable.

Capacity must be considered before approving participants.

---

4.9 Captain Requests

Participants can express interest in becoming captain.

Captain request is not automatic captain assignment.

The owner has final authority.

Captain request statuses:

PENDING
REJECTED
CANCELLED

The request is primarily an interest/audit mechanism.

---

4.10 Captain Assignment

The tournament owner selects/assigns captains.

Captain status is associated with a team membership.

Important rule:

- A captain must be a main player.
- A substitute cannot be captain.

There is only one captain per team.

---

4.11 Teams

Teams belong to a tournament.

Team statuses:

FORMING
READY
ELIMINATED
WITHDRAWN

Teams have:

- team ID
- tournament ID
- name
- status
- timestamps

A team can contain:

- main players
- optional substitute
- one captain

---

4.12 Team Members

Team members are tournament participants.

Membership roles:

PLAYER
CAPTAIN

Squad status:

MAIN
SUBSTITUTE

Rules:

- captain must be MAIN
- only one captain per team
- only one substitute per team
- a participant can belong to only one team within a tournament
- service-level transaction logic enforces tournament/team consistency
- database-level cross-table tournament consistency is not implemented through cross-service FKs

---

4.13 Substitutes

Substitute functionality is optional.

Tournament owner decides whether substitutes are enabled.

For:

1v1

there is no substitute.

For:

2v2
3v3
4v4

if substitutes are enabled:

- each team requires a substitute
- substitute contributes to required participant capacity
- substitute is part of the team's permanent squad
- captain cannot be a substitute

In auction tournaments, the captain decides which purchased player becomes the substitute.

---

4.14 Tournament Start Conditions

A tournament cannot start unless the required participant/team configuration has been satisfied.

For knockout MVP, the number of teams must be a power of two:

2
4
8
16
...

This avoids byes in the initial implementation.

---

5. AUCTION

Auction is optional.

It is used when:

team_formation_mode = AUCTION

---

5.1 Auction Rules

Auction lifecycle is FINAL / LOCKED.

The auction supports:

- auction creation
- auction setup
- auction rounds
- auction lots
- captain/bidder participation
- player bidding
- player purchase
- sold players
- unsold players
- second round
- automatic allocation of remaining unsold players
- auction completion

---

5.2 Auction Captain Participation

Teams/captains participate as auction bidders.

The auction bidder represents the team/captain participating in the auction.

---

5.3 Auction Bidding

MVP auction model:

- manual ascending live bidding
- one live lot at a time
- server-controlled "ends_at"
- first bid must be at least starting price
- subsequent bids must be at least current bid + configured increment
- concurrent bidding is protected transactionally

The auction lot must be locked with:

SELECT ... FOR UPDATE

when processing a bid.

---

5.4 Auction Purchase

When a player is sold:

1. Lock the auction lot.
2. Lock the bidder.
3. Validate the winning bid.
4. Deduct the budget.
5. Create allocation.
6. Mark the lot as SOLD.

These actions should happen atomically.

---

5.5 Unsold Players

Unsold player lifecycle:

First auction round
        ↓
UNSOLD
        ↓
Second auction round
        ↓
UNSOLD
        ↓
Automatic allocation

Remaining unsold players after the second round are automatically allocated.

The exact deterministic auto-allocation strategy discussed was based on remaining budget and deterministic tie-breaking.

The exact detailed algorithm is NOT FINALIZED beyond the requirement that the remaining unsold players are auto-allocated deterministically.

Do not invent a different business rule without asking.

---

5.6 Auction Allocations

Allocation types:

AUCTION
AUTO_ALLOCATION

Auction Service owns allocation records.

Auction Service does NOT directly write Tournament Service's "team_members" table.

Instead, allocation information crosses the service boundary through events/integration.

---

5.7 Substitute Selection During Auction

After players are purchased, the captain determines which purchased player is the substitute.

The substitute remains part of the permanent team squad.

---

6. COMPETITION / MATCHES

Competition/Match Service owns the competition lifecycle.

---

6.1 Knockout Structure

MVP supports knockout only.

A competition contains:

Competition
  ↓
Rounds
  ↓
Fixtures
  ↓
Matches

One fixture corresponds to one match in MVP.

"match_number" remains in the schema for future best-of-3/best-of-5 support.

---

6.2 Knockout Teams

MVP supports only power-of-two team counts.

Examples:

2
4
8
16

No byes are required in MVP.

---

6.3 Match Scheduling

The tournament owner initially chooses match date/time.

Scheduling is owned by Competition Service.

Only authorized tournament owners can schedule matches.

---

6.4 Lineups

Captains submit lineups before a match starts.

The owner can override/correct a lineup before match start.

Lineup validity against the permanent Tournament Service squad is enforced at service/business level.

---

6.5 Match Result

The captain submits the result.

The opposing captain confirms or disputes it.

The result can therefore enter:

PENDING
CONFIRMED
DISPUTED
REJECTED

Only the confirmed official result advances the bracket.

---

6.6 Disputes

If the opposing captain disputes the result:

Result submitted
       ↓
Disputed
       ↓
Owner resolves

The owner has final resolution authority.

---

6.7 Forfeit

Forfeit is distinct from a normal match result.

If a team cannot play according to the finalized tournament/match rules, the relevant match can become a forfeit.

A team withdrawal can cause remaining applicable matches to become automatic wins/forfeits for the opponent.

---

6.8 Team Withdrawal

If a team leaves/withdraws:

- remaining applicable matches are handled as opponent automatic wins
- the withdrawn team does not continue in the competition
- bracket progression must reflect the withdrawal

This is represented separately from a normal score-based result.

---

6.9 Winner Advancement

Only a confirmed official result or valid forfeit can advance a team.

The Competition Service updates the appropriate bracket fixture.

---

6.10 Competition Completion

When the final required match is completed and the winner is determined:

Competition → COMPLETED

The tournament can then move through its corresponding completion lifecycle.

---

7. FINALIZED LIFECYCLES

7.1 Tournament Lifecycle

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

General lifecycle:

DRAFT
  ↓
REGISTRATION_OPEN
  ↓
REGISTRATION_CLOSED
  ↓
TEAM_FORMATION
  ↓
TEAMS_FINALIZED
  ↓
FIXTURES_GENERATED
  ↓
SCHEDULED
  ↓
IN_PROGRESS
  ↓
COMPLETED

"CANCELLED" is an exceptional terminal state.

Important validations:

- registration must satisfy configured rules
- teams must be valid
- required participants must exist
- knockout team count must be valid
- teams must be finalized before fixtures
- fixtures must exist before competition scheduling/start

---

7.2 Invitation Lifecycle

PENDING
  ├── ACCEPTED
  ├── REJECTED
  ├── EXPIRED
  └── CANCELLED

---

7.3 Join Request Lifecycle

General flow:

Public Link
    ↓
Join Request
    ↓
Owner Review
    ├── Approved
    └── Rejected

Capacity must be checked during approval.

---

7.4 Captain Request Lifecycle

PENDING
  ├── REJECTED
  └── CANCELLED

Owner uses the request to decide captain selection.

---

7.5 Team Lifecycle

General flow:

FORMING
   ↓
READY
   ↓
ELIMINATED

A team can also enter:

WITHDRAWN

Team creation and membership are managed by Tournament Service.

---

7.6 Auction Lifecycle

Auction statuses:

DRAFT
READY
IN_PROGRESS
COMPLETED
CANCELLED

Auction rounds contain lots.

Lots:

PENDING
LIVE
SOLD
UNSOLD
CANCELLED

Auction flow:

DRAFT
  ↓
READY
  ↓
IN_PROGRESS
  ↓
Rounds / Lots / Bidding
  ↓
Second Round for Unsold Players
  ↓
Automatic Allocation of Remaining Unsold Players
  ↓
COMPLETED

"CANCELLED" is exceptional.

---

7.7 Competition Lifecycle

Finalized statuses:

NOT_CREATED
BRACKET_GENERATED
SCHEDULING
SCHEDULED
IN_PROGRESS
COMPLETED
CANCELLED

Flow:

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

"CANCELLED" is exceptional.

---

7.8 Match Lifecycle

Finalized statuses:

SCHEDULED
LINEUP_PENDING
LINEUP_CONFIRMED
IN_PROGRESS
RESULT_PENDING
CONFIRMED

Exceptional states:

FORFEIT
DISPUTED
CANCELLED

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

---

8. EVENTS

Finalized event concepts include:

BracketGenerated
MatchScheduled
LineupSubmitted
MatchStarted
ResultSubmitted
ResultDisputed
ResultConfirmed
MatchForfeited
TeamAdvanced
CompetitionCompleted
TeamWithdrawn
PlayerAllocated

Cross-service event concepts include:

- MatchScheduled
- ResultConfirmed
- CompetitionCompleted
- TeamWithdrawn
- PlayerAllocated

The exact event naming/casing should remain consistent with the existing implementation/event contract when created.

Important

Event payload schemas were not fully finalized for every event in the planning phase.

Therefore:

Do not invent detailed event payloads without discussing them when implementation reaches the messaging stage.

The event ownership and purposes above are finalized; exact payload contracts can be finalized when RabbitMQ implementation is built.

---

9. ASYNCHRONOUS ARCHITECTURE

RabbitMQ is used for asynchronous cross-service communication.

REST is used for synchronous request/response operations.

General principle:

Frontend
   ↓
API Gateway
   ↓
Service REST API

For asynchronous side effects:

Service
   ↓
RabbitMQ
   ↓
Consumer Service

Notification Service primarily consumes domain events and creates notifications.

Event consumption must be idempotent.

Transactional outbox was identified as an appropriate production concern and should be addressed during messaging/infrastructure implementation.

Exact retry/dead-letter architecture was not fully finalized.

Do not invent a final retry/DLQ design without discussion.

---

10. NOTIFICATION SERVICE

Notification Service owns:

- notification records
- notification delivery records
- notification preferences

Notifications are generated from events rather than arbitrary external POST requests.

MVP primarily uses:

IN_APP

while the database structurally supports:

EMAIL
PUSH

Delivery statuses:

PENDING
SENT
DELIVERED
FAILED

Notifications contain resource references:

resource_id
resource_type

to allow frontend navigation.

---

11. FINAL ARCHITECTURE

The finalized architecture is:

React Frontend
      ↓
API Gateway
      ↓
┌─────┼──────────────┬───────────────┐
↓     ↓              ↓               ↓
Auth  Tournament     Auction     Competition
      Service        Service       Service
         │              │              │
         └──────────────┼──────────────┘
                        ↓
                    RabbitMQ
                        ↓
               Notification Service

Databases:

auth_db
tournament_db
auction_db
competition_db
notification_db

---

12. SERVICES

12.1 API Gateway

Responsibilities:

- frontend entry point
- authentication/token handling at gateway boundary
- rate limiting
- correlation/request ID
- routing
- common API concerns

Business authorization remains inside the owning service.

Gateway must not become the owner of business logic.

---

12.2 Auth Service

Owns:

- users
- credentials
- authentication
- access tokens
- refresh tokens
- password reset tokens
- account lifecycle

Database:

auth_db

Must NOT own:

- tournaments
- teams
- auctions
- matches
- notifications

---

12.3 Tournament Service

Owns:

- tournaments
- tournament participants
- invitations
- join requests
- captain requests
- teams
- team members

Database:

tournament_db

Must NOT own:

- authentication credentials
- auction bidding
- competition brackets/matches
- notification delivery

---

12.4 Auction Service

Owns:

- auctions
- auction rounds
- auction lots
- auction bidders
- bids
- allocations

Database:

auction_db

Must NOT directly modify Tournament Service's team membership database.

---

12.5 Competition Service

Also referred to as Competition/Match Service.

Owns:

- competitions
- rounds
- fixtures
- matches
- lineups
- lineup players
- results
- disputes

Database:

competition_db

Must NOT own:

- tournament participant master records
- auction budgets/bids
- authentication users

---

12.6 Notification Service

Owns:

- notifications
- deliveries
- preferences

Database:

notification_db

Consumes relevant domain events.

Must NOT own domain state belonging to other services.

---

13. SERVICE BOUNDARY TABLE

Service| Owns| Does NOT own
Auth| users, credentials, tokens, password reset| tournaments, teams, matches
Tournament| tournaments, participants, invitations, join requests, captain requests, teams, team members| users' passwords, auction bids, competition results
Auction| auctions, rounds, lots, bidders, bids, allocations| team membership DB, users' credentials
Competition| competitions, rounds, fixtures, matches, lineups, results, disputes| tournament participant master data, auction data
Notification| notifications, deliveries, preferences| business state of other services
API Gateway| routing/gateway concerns| business ownership

---

14. DATABASE ARCHITECTURE

14.1 Final Decision

Use:

PostgreSQL

with:

database-per-service

Logical databases:

auth_db
tournament_db
auction_db
competition_db
notification_db

Services must never directly access another service's database.

There are no cross-service foreign keys.

Cross-service relationships are represented by UUIDs and service communication.

---

15. AUTH DATABASE

Database:

auth_db

Tables:

users
refresh_tokens
password_reset_tokens
schema_migrations

---

15.1 users

Final schema:

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE','SUSPENDED','DEACTIVATED')),
    email_verified BOOLEAN NOT NULL DEFAULT false,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

Unique index:

CREATE UNIQUE INDEX uq_users_email_lower
ON users (LOWER(email));

Status index:

CREATE INDEX idx_users_status
ON users(status);

---

15.2 refresh_tokens

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    CHECK (revoked_at IS NULL OR revoked_at >= created_at)
);

Indexes:

CREATE UNIQUE INDEX uq_refresh_tokens_hash
ON refresh_tokens(token_hash);

CREATE INDEX idx_refresh_tokens_user_id
ON refresh_tokens(user_id);

CREATE INDEX idx_refresh_tokens_expires_at
ON refresh_tokens(expires_at);

CREATE INDEX idx_refresh_tokens_active
ON refresh_tokens(user_id, expires_at)
WHERE revoked_at IS NULL;

Important:

- refresh token plaintext is not stored
- only a hash is stored
- tokens can be revoked
- tokens expire
- active token lookup is indexed

---

15.3 password_reset_tokens

CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (used_at IS NULL OR used_at >= created_at)
);

Indexes:

CREATE UNIQUE INDEX uq_password_reset_tokens_hash
ON password_reset_tokens(token_hash);

CREATE INDEX idx_password_reset_tokens_user_id
ON password_reset_tokens(user_id);

CREATE INDEX idx_password_reset_tokens_expires_at
ON password_reset_tokens(expires_at);

CREATE INDEX idx_password_reset_tokens_active
ON password_reset_tokens(user_id, expires_at)
WHERE used_at IS NULL;

---

16. TOURNAMENT DATABASE

Database:

tournament_db

Final tables:

tournaments
tournament_participants
invitations
join_requests
captain_requests
teams
team_members

---

16.1 tournaments

Important fields finalized:

id
owner_id
name
description
game
format
team_size
number_of_teams
substitutes_enabled
team_formation_mode
status
registration_start_at
registration_end_at
created_at
updated_at

Business constraints:

game = EFOOTBALL
format = KNOCKOUT / LEAGUE
team_size = 1 / 2 / 3 / 4

Initial MVP only uses:

EFOOTBALL
KNOCKOUT

Statuses:

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

Capacity is derived and is not stored as a "capacity" column.

---

16.2 tournament_participants

Purpose:

Represents users approved/participating in a tournament.

Important finalized concepts:

id
tournament_id
user_id
status
withdrawn_at
created_at
updated_at

Unique:

(tournament_id, user_id)

Statuses:

APPROVED
WITHDRAWN

Withdrawal timestamp must be consistent with status.

---

16.3 invitations

Purpose:

Tournament invitations.

Important concepts:

id
tournament_id
invitee_id
status
timestamps

Unique:

(tournament_id, invitee_id)

Statuses:

PENDING
ACCEPTED
REJECTED
EXPIRED
CANCELLED

A partial pending index exists.

---

16.4 join_requests

Purpose:

Requests generated through public tournament joining.

Important concepts:

id
tournament_id
user_id
status
timestamps

Unique:

(tournament_id, user_id)

Status lifecycle includes pending/approved/rejected/cancelled semantics.

---

16.5 captain_requests

Purpose:

Participant request/interest in becoming captain.

Important concepts:

id
tournament_id
participant_id
status
timestamps

Unique:

(tournament_id, participant_id)

Statuses:

PENDING
REJECTED
CANCELLED

This does not automatically make a participant captain.

---

16.6 teams

Purpose:

Tournament teams.

Important concepts:

id
tournament_id
name
status
timestamps

Unique:

(tournament_id, name)

Statuses:

FORMING
READY
ELIMINATED
WITHDRAWN

---

16.7 team_members

Purpose:

Associates tournament participants with teams.

Important concepts:

id
team_id
participant_id
member_role
squad_status
timestamps

Member roles:

PLAYER
CAPTAIN

Squad status:

MAIN
SUBSTITUTE

Constraints:

- one captain per team
- one substitute per team
- captain must be MAIN
- participant belongs to only one team in the tournament
- some cross-table consistency is enforced at service level because no cross-service FK exists

---

17. AUCTION DATABASE

Database:

auction_db

Tables:

auctions
auction_rounds
auction_lots
auction_bidders
bids
allocations

---

17.1 auctions

Purpose:

Top-level auction.

Important concepts:

id
tournament_id
status
timestamps

Unique:

tournament_id

Statuses:

DRAFT
READY
IN_PROGRESS
COMPLETED
CANCELLED

---

17.2 auction_rounds

Purpose:

Auction rounds.

Important concepts:

id
auction_id
round_number
status/timestamps as finalized

Unique:

(auction_id, round_number)

---

17.3 auction_lots

Purpose:

Individual players/items being auctioned.

Important concepts include:

id
auction_round_id
participant_id
starting_price
current_bid
current_bidder
status
winning_bid
winning_team
ends_at

Statuses:

PENDING
LIVE
SOLD
UNSOLD
CANCELLED

Server controls the auction timer through "ends_at".

---

17.4 auction_bidders

Purpose:

Captains/teams participating in an auction.

Unique bidder/team relationships are enforced.

---

17.5 bids

Purpose:

Records bids.

Bid validation:

- first bid >= starting price
- subsequent bid >= current bid + increment
- bid concurrency must be transactionally protected

---

17.6 allocations

Purpose:

Represents the final player/team allocation.

Important constraints:

- one allocation per lot
- one allocation per participant per auction

Allocation type:

AUCTION
AUTO_ALLOCATION

---

18. COMPETITION DATABASE

Database:

competition_db

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

18.1 competitions

Purpose:

Represents a tournament competition.

Important fields:

id
tournament_id
format
status
timestamps

Unique:

tournament_id

Format:

KNOCKOUT

Statuses:

NOT_CREATED
BRACKET_GENERATED
SCHEDULING
SCHEDULED
IN_PROGRESS
COMPLETED
CANCELLED

---

18.2 rounds

Purpose:

Knockout rounds.

Unique:

(competition_id, round_number)

---

18.3 fixtures

Purpose:

Bracket fixture.

Important concepts:

id
round_id
team_a_id
team_b_id
winner_team_id
status
next_fixture_id

Teams can initially be nullable for pending bracket slots.

Statuses:

PENDING
READY
COMPLETED
FORFEITED
CANCELLED

There is a self-reference:

next_fixture_id

used for bracket progression.

---

18.4 matches

Purpose:

Actual playable match belonging to a fixture.

Important concepts:

id
fixture_id
match_number
scheduled_at
status

MVP:

one fixture = one match

"match_number" remains for future multi-match fixtures.

Statuses:

SCHEDULED
LINEUP_PENDING
LINEUP_CONFIRMED
IN_PROGRESS
RESULT_PENDING
CONFIRMED
DISPUTED
FORFEIT
CANCELLED

---

18.5 match_lineups

Purpose:

Stores each team's submitted lineup for a match.

One lineup per team per match.

Statuses:

SUBMITTED
CONFIRMED
OVERRIDDEN

---

18.6 match_lineup_players

Purpose:

Players included in a submitted lineup.

Squad role:

MAIN
SUBSTITUTE

Lineup validity is checked against the team's permanent squad through service-level logic.

---

18.7 match_results

Purpose:

Stores submitted match results.

Important concepts:

submission_number
submitted scores
winner
status

"submission_number" was explicitly added during the database review to preserve submission history.

Statuses:

PENDING
CONFIRMED
DISPUTED
REJECTED

Winner is server-derived rather than blindly trusted from the client.

---

18.8 disputes

Purpose:

Stores disputed match results and owner resolution.

Owner resolves the dispute.

---

19. NOTIFICATION DATABASE

Database:

notification_db

Tables:

notifications
notification_deliveries
notification_preferences

---

19.1 notifications

Notification types include categories for:

- tournament invitations
- join events
- captain events
- auction events
- team events
- match events
- result events
- tournament lifecycle
- SYSTEM

Important concepts:

resource_id
resource_type

These support navigation to the related resource.

---

19.2 notification_deliveries

Channels:

IN_APP
EMAIL
PUSH

Statuses:

PENDING
SENT
DELIVERED
FAILED

Retry metadata exists structurally.

MVP primarily uses IN_APP.

---

19.3 notification_preferences

Unique preference relationship by user/type/channel.

Purpose:

Allow users to control notification preferences.

---

20. DATABASE DESIGN DECISIONS

These decisions are FINAL.

PostgreSQL

Chosen instead of MongoDB.

Reason:

- relational domain
- many relationships
- constraints
- transactional requirements
- auction concurrency
- clear ownership
- strong consistency requirements

---

Database-per-service

Each microservice owns its database.

No direct cross-service database access.

---

No Cross-Service Foreign Keys

Cross-service relationships are represented using UUIDs.

Services communicate using REST/RabbitMQ.

---

UUIDs

UUIDs are used consistently for primary IDs.

Auth UUID generation:

gen_random_uuid()

via:

CREATE EXTENSION IF NOT EXISTS pgcrypto;

---

VARCHAR + CHECK

Business statuses use:

VARCHAR + CHECK

instead of PostgreSQL ENUM.

This was selected for easier schema evolution and explicit database constraints.

Do not convert these to PostgreSQL ENUMs.

---

Capacity

Capacity is derived.

Do not add a stored "capacity" column unless the requirements are explicitly changed.

---

Token Storage

Refresh tokens and password reset tokens are stored as hashes.

Plaintext token values are never persisted.

---

21. API DESIGN

21.1 Global API Rules

API version:

/api/v1

Frontend communicates through API Gateway.

Frontend should not directly call internal services in the production architecture.

---

21.2 Response Format

Single resource:

{
  "data": {}
}

Collection:

{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}

---

21.3 Error Format

{
  "error": {
    "code": "TOURNAMENT_NOT_FOUND",
    "message": "Tournament not found",
    "details": null
  }
}

Validation errors include details.

---

21.4 HTTP Status Conventions

200 OK
201 Created
202 Accepted
204 No Content
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
429 Too Many Requests
500 Internal Server Error

---

21.5 Naming

JSON uses:

snake_case

Example:

{
  "first_name": "Player",
  "last_name": "One"
}

---

22. AUTH API

POST "/api/v1/auth/register"

Purpose:

Create account.

Authentication:

Not required.

Success:

201

Validation:

- email
- password
- first_name
- last_name

Duplicate:

409 EMAIL_ALREADY_EXISTS

---

POST "/api/v1/auth/login"

Purpose:

Authenticate user.

Authentication:

Not required.

Returns authentication credentials according to the finalized JWT/refresh-token design.

---

POST "/api/v1/auth/refresh"

Purpose:

Refresh access token.

Authentication:

Refresh token required.

Refresh rotation is part of the finalized authentication design.

---

POST "/api/v1/auth/logout"

Purpose:

Invalidate refresh session/token.

---

POST "/api/v1/auth/forgot-password"

Purpose:

Request password reset.

Security requirement:

Return the same general "202" response regardless of whether the email exists, preventing account enumeration.

---

POST "/api/v1/auth/reset-password"

Purpose:

Reset password using valid reset token.

Password reset invalidates existing refresh sessions.

---

GET "/api/v1/auth/me"

Purpose:

Return authenticated user information.

Authentication:

Required.

---

23. TOURNAMENT API

Finalized endpoint set:

POST   /api/v1/tournaments
GET    /api/v1/tournaments
GET    /api/v1/tournaments/:id
PATCH  /api/v1/tournaments/:id

Lifecycle:

open
close
cancel

Participant operations:

GET participant list
create join request
approve join request
reject join request
withdraw self

Invitation operations:

create invitation
list invitations
update invitation
cancel invitation

Captain:

create captain request
list captain requests

Teams:

create team
list teams
get team
update team

Team members:

add member
remove member
update member

Finalization:

finalize teams

Exact route nesting should follow the previously designed API contract rather than inventing alternate paths.

Authorization is service-owned.

---

24. AUCTION API

Finalized operations:

create auction
get auction
patch auction
ready auction
start auction
cancel auction

Rounds:

create round
list rounds
get round

Bidders:

add bidder
list bidders

Lots:

create lot
list lots
get lot
open lot
close lot

Bids:

create bid
list bids

Allocations:

list allocations
auto-allocate

Auction completion:

complete auction

One live lot per auction is enforced.

---

25. COMPETITION API

Finalized operations include:

create competition
get competition
generate bracket
start competition
cancel competition

Rounds:

get rounds

Fixtures:

get fixtures

Matches:

get match
schedule match
start match
cancel match
forfeit match

Lineups:

submit lineup
get lineup
update lineup

Results:

submit result
get result

Result workflow:

confirm result
dispute result

Disputes:

get disputes
resolve dispute

Only appropriate actors can perform these operations.

---

26. NOTIFICATION API

Finalized operations:

GET    /api/v1/notifications
GET    /api/v1/notifications/:id
PATCH  /api/v1/notifications/:id/read
PATCH  /api/v1/notifications/read-all
DELETE /api/v1/notifications/:id

Preferences:

GET /api/v1/notification-preferences
PUT /api/v1/notification-preferences

Notifications are generated from events rather than arbitrary client POST requests.

---

27. AUTHENTICATION AND SECURITY

27.1 Password Hashing

Use:

Argon2id

The implementation already uses the "argon2" package.

Current implementation:

argon2.hash(password, {
  type: argon2.argon2id,
});

---

27.2 Password Rules

Registration:

8–128 characters

Password is never returned by API.

---

27.3 JWT

Access token:

- JWT
- minimal claims
- "sub"
- "iat"
- "exp"

Example access-token lifetime:

15m

Refresh token example lifetime:

7d

These values are configurable through environment variables.

---

27.4 Refresh Tokens

Refresh tokens:

- are stored as hashes
- support revocation
- support expiration
- are rotated during refresh
- are associated with a user

Logout invalidates the refresh session/token.

---

27.5 Password Reset

Reset tokens:

- stored as hashes
- expire
- are one-time use
- have "used_at"
- invalidate existing refresh sessions when password is reset

---

27.6 Email Verification

Database supports:

email_verified

but the complete email-verification workflow was not fully implemented in the current M6 registration phase.

Do not invent a separate email-verification service/workflow without discussing it.

---

27.7 Rate Limiting

Rate limiting is required for sensitive authentication endpoints, including:

- login
- registration
- forgot password
- reset password
- refresh

API Gateway has rate-limiting responsibility.

Exact production rate values are NOT FINALIZED.

---

27.8 Input Validation

Backend validates every request.

Fastify schema validation is being used for registration.

Unknown fields are rejected.

---

27.9 Error Security

Database internals must not be exposed to clients.

Example:

PostgreSQL:

23505

becomes:

409 EMAIL_ALREADY_EXISTS

Client should never receive raw PostgreSQL errors.

---

28. MONOREPO

Repository:

tournament-planner

Package manager:

npm

Workspace model:

npm workspaces

Do not introduce Turborepo/Nx unless a future requirement actually justifies it.

---

29. FINAL REPOSITORY STRUCTURE

tournament-planner/
├── apps/
│   ├── frontend/
│   ├── api-gateway/
│   ├── auth-service/
│   ├── tournament-service/
│   ├── auction-service/
│   ├── competition-service/
│   └── notification-service/
│
├── packages/
│   ├── config/
│   ├── logger/
│   ├── types/
│   └── validation/
│
├── infrastructure/
├── docs/
├── .github/
│   └── workflows/
│
├── package.json
├── tsconfig.base.json
├── .gitignore
├── .env.example
└── README.md

---

30. SERVICE FOLDER STRUCTURE

Backend services use:

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

Auth Service modules:

auth-service/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── sessions/
│   │   └── password-reset/
│   ├── middleware/
│   ├── config/
│   ├── infrastructure/
│   ├── app.ts
│   └── server.ts
├── tests/
├── package.json
└── tsconfig.json

Do not introduce Clean Architecture layers everywhere.

Avoid automatically adding:

domain/
use-cases/
ports/
adapters/

unless a specific service becomes sufficiently complex to justify them.

---

31. SHARED PACKAGES

Final packages:

packages/
├── config/
│   ├── src/
│   │   ├── env.ts
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
├── logger/
│   ├── src/
│   │   ├── logger.ts
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
├── types/
│   ├── src/
│   │   ├── common/
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
└── validation/
    ├── src/
    │   ├── common/
    │   └── index.ts
    ├── package.json
    └── tsconfig.json

Package names:

@tournament-planner/config
@tournament-planner/logger
@tournament-planner/types
@tournament-planner/validation

---

32. SHARED PACKAGE RULE

Share:

- technical infrastructure
- generic configuration
- generic logger
- generic types
- generic validation helpers

Do NOT share:

- domain models
- business services
- repositories
- database clients
- business rules
- service-specific types
- service-specific domain logic

A shared package must not become a hidden distributed monolith.

---

33. ENVIRONMENT STRATEGY

Three conceptual environments:

Development
Testing
Production

Service-specific environment files are preferred.

Example:

apps/
├── auth-service/.env.example
├── auth-service/.env
├── tournament-service/.env.example
├── tournament-service/.env
...

".env" files are ignored.

".env.example" is committed.

Production secrets must come from cloud/secret-management infrastructure.

No secrets in:

- source code
- README
- Dockerfile
- frontend
- committed compose
- package.json

---

34. LOCAL INFRASTRUCTURE

Docker is used for local infrastructure.

Current architecture:

One PostgreSQL container containing five logical databases.

Databases:

auth_db
tournament_db
auction_db
competition_db
notification_db

Users:

auth_user
tournament_user
auction_user
competition_user
notification_user

Each service user should only access its own logical database.

---

35. DOCKER

Current PostgreSQL image:

postgres:17

Current RabbitMQ image:

rabbitmq:4-management

RabbitMQ:

5672 → AMQP
15672 → Management UI

PostgreSQL:

5432

Current local service ports:

Gateway       3000
Auth          3001
Tournament    3002
Auction       3003
Competition   3004
Notification  3005
PostgreSQL    5432
RabbitMQ      5672
RabbitMQ UI   15672

Currently Node services run directly on the host during development.

Application containers can be added later.

---

36. REDIS

Redis is not currently included.

It was deliberately deferred.

Do not introduce Redis simply because this is a microservices project.

Only add it when there is a concrete finalized requirement such as an appropriate caching/rate-limiting/use-case decision.

---

37. TECHNOLOGY DECISIONS

Area| Final Decision| Reason
Frontend| React + TypeScript| Project requirement and portfolio relevance
Backend| Node.js + TypeScript| Existing ecosystem and learning goal
HTTP framework| Fastify| Selected for this project after comparing alternatives
Database| PostgreSQL| Relational domain, constraints, transactions
Architecture| Microservices| Learning + portfolio objective
API| REST| Synchronous service communication
Messaging| RabbitMQ| Async/event-driven communication
Cache| Redis deferred| Avoid unnecessary infrastructure
Containers| Docker| Local/prod consistency
Repository| Monorepo| Easier coordinated development
Workspace| npm workspaces| Simple native workspace approach
DB ownership| Database-per-service| Clear service boundaries
Status types| VARCHAR + CHECK| Flexible schema evolution
IDs| UUID| Consistent distributed IDs
Auth hashing| Argon2id| Secure password hashing
Migration| Version-controlled SQL + custom Node/pg runner| Transparency and PostgreSQL learning
Testing| Vitest + API/integration testing| Testable TypeScript service
Logging| Structured Fastify/shared logging direction| Production observability
CI/CD| GitHub Actions planned| Portfolio/production workflow
Cloud| Planned later| Not required during initial implementation

---

38. FASTIFY DECISION

Fastify is FINAL.

The project previously considered:

Express
Fastify
NestJS

Selected:

Fastify + TypeScript

Use Fastify consistently for:

- Auth
- Tournament
- Auction
- Competition
- Notification
- API Gateway

Do not mix Express and Fastify in different services without an explicit architectural reason.

Express remains relevant as a general interview/career technology, but this project uses Fastify.

---

39. MIGRATION STRATEGY

Selected:

Version-controlled SQL migrations
+
small Node.js migration runner using pg

Rejected for this project:

node-pg-migrate

Reason:

- already using "pg"
- transparent PostgreSQL learning
- avoids unnecessary migration abstraction

Migration structure:

apps/auth-service/
├── migrations/
│   └── 001_create_auth_tables.sql
└── src/
    └── infrastructure/
        └── database/
            ├── postgres.ts
            └── migrate.ts

Migration runner maintains:

schema_migrations

and skips already applied migrations.

---

40. AUTH SERVICE IMPLEMENTATION STATUS

M6.1 — Common Project Foundation

M6.1.1 Initialize Monorepo

✅ COMPLETED

---

M6.1.2 Root Tooling Validation

✅ COMPLETED

Root TypeScript and npm workspace tooling established.

---

M6.1.3 Local Docker Infrastructure

✅ COMPLETED

PostgreSQL and RabbitMQ are working.

---

41. M6.2 — AUTH SERVICE FOUNDATION

M6.2.1 Initialize Auth Service

✅ COMPLETED

Package:

@tournament-planner/auth-service

Scripts include:

dev
build
start
test
test:watch
typecheck
lint
migrate

Only root "package-lock.json" is used.

Dependencies conceptually belong to the Auth Service even if npm physically hoists them into root "node_modules".

---

M6.2.2 Install Fastify + Core Dependencies

✅ COMPLETED

Installed/verified:

- Fastify
- pg
- dotenv
- TypeScript
- tsx
- Node types
- Vitest
- ESLint

---

M6.2.3 TypeScript

✅ COMPLETED

Auth TypeScript configuration extends:

../../tsconfig.base.json

and uses:

rootDir = ./src
outDir = ./dist
types = node

---

M6.2.4 Environment

✅ COMPLETED

Auth configuration includes:

NODE_ENV
PORT
DATABASE_URL
JWT_ACCESS_SECRET
JWT_ACCESS_EXPIRES_IN
JWT_REFRESH_SECRET
JWT_REFRESH_EXPIRES_IN
RABBITMQ_URL

---

M6.2.5 PostgreSQL Connection

✅ COMPLETED

Uses:

Pool

from:

pg

Configuration:

max: 10
idleTimeoutMillis: 30000
connectionTimeoutMillis: 5000

---

M6.2.6 Fastify App + Server

✅ COMPLETED

Health endpoint:

GET /health

returns:

{
  "data": {
    "service": "auth-service",
    "status": "ok"
  }
}

---

M6.2.7 Error Handling + Graceful Shutdown

✅ COMPLETED

Implemented:

- Fastify global error handler
- validation errors
- HTTP errors
- internal errors
- SIGINT shutdown
- SIGTERM shutdown
- Fastify close
- PostgreSQL pool close

---

42. M6.3 — AUTH DB & MIGRATIONS

M6.3.1 Migration Runner

✅ COMPLETED

Custom SQL migration runner using "pg".

---

M6.3.2 Auth Schema Migration

✅ COMPLETED

Created:

users
refresh_tokens
password_reset_tokens
schema_migrations

---

M6.3.3 Database Verification

✅ COMPLETED

Verification covered:

- tables
- columns
- types
- nullability
- indexes
- foreign keys
- cascade rules
- CHECK constraints
- UUID generation
- email uniqueness
- migration tracking

M6.3 is complete.

---

43. M6.4 — USER REGISTRATION

M6.4.1 Registration Contract & Validation

✅ COMPLETED

Contract:

POST /api/v1/auth/register

---

M6.4.2 Password Hashing

✅ COMPLETED

Argon2id implemented.

File:

apps/auth-service/src/modules/auth/password.ts

Exports:

hashPassword()
verifyPassword()

---

M6.4.3 User Repository

✅ COMPLETED

File:

apps/auth-service/src/modules/users/user.repository.ts

Includes:

findByEmail()
createUser()

Repository uses parameterized SQL.

---

M6.4.4 Registration Service

✅ COMPLETED

File:

apps/auth-service/src/modules/auth/auth.service.ts

Responsibilities:

- normalize email
- check duplicate email
- hash password
- create user
- remove password_hash before returning user

"SafeUser" excludes:

password_hash

---

M6.4.5 Registration Controller + Route

🔄 IMPLEMENTATION PROVIDED / COMPLETION NOT EXPLICITLY CONFIRMED

Files:

apps/auth-service/src/modules/auth/auth.controller.ts
apps/auth-service/src/modules/auth/auth.routes.ts

Route:

POST /api/v1/auth/register

"app.ts" registers:

/api/v1/auth

---

M6.4.6 Duplicate Email & Error Handling

🔄 IMPLEMENTATION PROVIDED / COMPLETION NOT EXPLICITLY CONFIRMED

Added/planned:

AppError

File:

apps/auth-service/src/middleware/app-error.ts

Duplicate email:

409
EMAIL_ALREADY_EXISTS

PostgreSQL:

23505

must be translated into the same application error.

This protects against concurrent registration races.

---

M6.4.7 Registration Tests

🔄 CURRENT TASK / PENDING CONFIRMATION

Tests are being added for:

- successful registration
- response structure
- no password/password_hash exposure
- email lowercase normalization
- duplicate email
- invalid email
- password too short
- missing first_name
- unknown fields
- password actually stored as Argon2 hash

Vitest is the test framework.

Test DB must be separate from development DB.

---

44. CURRENT AUTH FILE STRUCTURE

The current Auth Service is approximately:

apps/auth-service/
├── migrations/
│   └── 001_create_auth_tables.sql
│
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.service.ts
│   │   │   └── password.ts
│   │   │
│   │   ├── users/
│   │   │   └── user.repository.ts
│   │   │
│   │   ├── sessions/
│   │   └── password-reset/
│   │
│   ├── middleware/
│   │   ├── error-handler.ts
│   │   └── app-error.ts
│   │
│   ├── config/
│   │   └── env.ts
│   │
│   ├── infrastructure/
│   │   └── database/
│   │       ├── postgres.ts
│   │       └── migrate.ts
│   │
│   ├── app.ts
│   └── server.ts
│
├── tests/
├── .env
├── .env.example
├── package.json
├── tsconfig.json
└── vitest.config.ts

Some directories such as "sessions/" and "password-reset/" are architectural targets and may not yet contain implementation files.

---

45. IMPLEMENTATION ROADMAP

Sprint 0 — Foundation

M6.1 Common Project Foundation

M6.1.1 Initialize Monorepo
M6.1.2 Root Tooling
M6.1.3 Docker Infrastructure

Status:

✅ COMPLETED

---

Sprint 1 — Auth Service

M6.2 Auth Service Foundation

M6.2.1 Initialize Auth Service
M6.2.2 Dependencies
M6.2.3 TypeScript
M6.2.4 Environment
M6.2.5 PostgreSQL
M6.2.6 Fastify App/Server
M6.2.7 Error Handling/Shutdown

Status:

✅ COMPLETED

---

M6.3 Auth DB & Migrations

M6.3.1 Migration Runner
M6.3.2 Auth Schema
M6.3.3 Verification

Status:

✅ COMPLETED

---

M6.4 User Registration

M6.4.1 Registration Contract
M6.4.2 Password Hashing
M6.4.3 User Repository
M6.4.4 Registration Service
M6.4.5 Controller + Route
M6.4.6 Duplicate Email + Error Handling
M6.4.7 Registration Tests

Current:

M6.4.7 → 🔄 CURRENT

M6.4.1–M6.4.4 are confirmed completed.

M6.4.5/M6.4.6 implementation was provided and treated as the current code direction, but explicit completion confirmation was not recorded.

---

46. FUTURE M6 ROADMAP

After registration:

M6.5 — Login + JWT

Planned:

- login validation
- password verification
- JWT access token
- JWT refresh token foundation
- account status validation
- authentication error handling
- rate limiting integration

Status:

⏳ PENDING

---

M6.6 — Refresh Token / Logout

Planned:

- refresh token persistence
- hashing
- rotation
- revocation
- logout
- expired token handling

Status:

⏳ PENDING

---

M6.7 — Password Reset

Planned:

- forgot password
- reset token
- expiration
- one-time usage
- password update
- refresh-session invalidation

Status:

⏳ PENDING

---

M6.8 — Auth Testing

Planned:

- authentication tests
- token tests
- refresh tests
- logout tests
- password reset tests
- security/error scenarios

Status:

⏳ PENDING

---

47. OVERALL SPRINT ROADMAP

Sprint 0

Foundation

Status:

✅ COMPLETED

---

Sprint 1

Auth Service

Status:

🔄 IN PROGRESS

---

Sprint 2

API Gateway

Dependency:

Auth Service

Status:

⏳ PENDING

---

Sprint 3

Tournament Service

Dependency:

Auth

Status:

⏳ PENDING

---

Sprint 4

Auction Service

Dependency:

Tournament Service

Status:

⏳ PENDING

---

Sprint 5

Competition Service

Dependency:

Tournament Service

Status:

⏳ PENDING

---

Sprint 6

Notification Service

Dependency:

RabbitMQ/events

Status:

⏳ PENDING

---

Sprint 7

Frontend

Dependency:

API Gateway + backend services

Status:

⏳ PENDING

---

Sprint 8

Integration / E2E Testing

Dependency:

All services

Status:

⏳ PENDING

---

48. IMPLEMENTATION PATTERN FOR EVERY SERVICE

Each service should generally follow:

1. Database schema
2. Migration
3. Configuration
4. Infrastructure
5. Repository
6. Service/business logic
7. Validation
8. Controller
9. Routes
10. Error handling
11. Tests

Do not skip directly from database to large controllers.

---

49. CODING STANDARDS

All implementation should be:

- production-oriented
- type-safe
- strict TypeScript
- modular
- maintainable
- secure
- testable
- properly validated
- properly error-handled
- meaningful in naming
- consistent with existing architecture

Avoid:

- unnecessary abstractions
- unnecessary libraries
- over-engineering
- huge unexplained code dumps
- duplicated business rules
- cross-service DB access
- shared business ownership
- leaking internal errors

---

50. TYPESCRIPT STANDARD

Root TypeScript uses strict settings including:

strict
noImplicitAny
noUncheckedIndexedAccess
exactOptionalPropertyTypes
forceConsistentCasingInFileNames

Target:

ES2022

Module system:

NodeNext

Backend Node types are service-specific rather than polluting the root browser-neutral configuration.

---

51. LOGGING

Fastify logging is enabled.

Structured logging is planned/shared through the logger package.

Useful fields include:

service_name
request_id
event_id

Do not log:

- passwords
- plaintext refresh tokens
- password reset tokens
- sensitive secrets

---

52. TESTING PHILOSOPHY

Testing is part of implementation, not an afterthought.

Expected testing categories:

- unit tests
- integration tests
- API tests
- security tests
- eventual E2E tests

For registration, API/integration tests intentionally use a real test PostgreSQL database because database constraints are part of the feature behavior.

Do not mock everything unnecessarily.

---

53. API GATEWAY SECURITY RESPONSIBILITIES

Gateway is responsible for common concerns such as:

- routing
- authentication boundary
- rate limiting
- request/correlation IDs

Business authorization remains in each owning service.

Example:

The gateway may establish:

authenticated user = X

but Tournament Service decides:

is X the owner of tournament Y?

---

54. AUTHORIZATION MODEL

Authorization is based on ownership and role/context.

Examples:

- tournament owner can approve participants
- tournament owner can select captains
- tournament owner can schedule matches
- tournament owner resolves disputes
- captains submit lineups/results
- participants cannot modify arbitrary tournaments

Do not centralize all business authorization inside the Gateway.

---

55. IMPORTANT CROSS-SERVICE RULE

Never do:

Tournament Service
      ↓
direct SQL
      ↓
auction_db

or:

Competition Service
      ↓
direct SQL
      ↓
tournament_db

Instead:

REST
or
RabbitMQ event

must be used.

---

56. IMPORTANT AUCTION OWNERSHIP RULE

Auction Service must never directly write:

tournament_db.team_members

It owns auction allocations.

A finalized player allocation is communicated to the appropriate service through service communication/events.

---

57. IMPORTANT COMPETITION OWNERSHIP RULE

Competition Service owns:

- bracket
- rounds
- fixtures
- matches
- schedules
- lineups
- results
- disputes
- advancement
- completion

Tournament Service owns:

- tournament
- participants
- teams
- team membership

Do not move these responsibilities between services.

---

58. REJECTED / NOT SELECTED ALTERNATIVES

Express

Considered.

Rejected for this project.

Reason:

Fastify was selected as the project's standard HTTP framework.

Express remains useful for interview/career knowledge but should not be mixed into this implementation.

---

NestJS

Considered.

Rejected for this project.

Reason:

The project is intended to teach underlying Node.js/microservice architecture without adding unnecessary framework abstraction.

---

MongoDB

Considered.

Rejected.

PostgreSQL was selected.

---

node-pg-migrate

Considered/used experimentally.

Rejected as the final migration strategy.

Final:

plain SQL migrations
+
custom pg-based runner

---

Turborepo / Nx

Considered as possible monorepo tooling.

Not selected.

Current:

npm workspaces

Keep the monorepo simple unless real complexity requires more tooling.

---

Redis

Not selected initially.

Deferred until a real requirement exists.

---

Multiple PostgreSQL Containers

Not selected for local development.

Current:

one PostgreSQL container
five logical databases

Production infrastructure can differ later.

---

Shared Domain Logic Package

Rejected.

Shared packages must not own business logic.

---

59. FUTURE / NOT CURRENT REQUIREMENTS

These were discussed as future possibilities rather than MVP requirements:

- league tournaments
- multiple games
- best-of-3
- best-of-5
- advanced ranking
- chat
- payments
- advanced administration
- Redis
- Kubernetes
- more advanced infrastructure

Do not implement these during the current MVP unless explicitly requested.

---

60. KNOWN ARCHITECTURAL RISKS

Microservice complexity

The application could technically be implemented more simply as a modular monolith.

However, microservices are deliberately being used because this is also a learning/portfolio project.

Do not collapse the architecture merely because it would be simpler.

At the same time, do not create additional services unnecessarily.

---

Distributed transactions

Cross-service operations cannot rely on database transactions spanning multiple databases.

Use:

- service-owned transactions
- REST where synchronous consistency is required
- RabbitMQ events for asynchronous operations
- idempotent event consumers
- transactional outbox where appropriate

---

Auction concurrency

Auction bidding is concurrency-sensitive.

Use PostgreSQL row locking:

SELECT ... FOR UPDATE

when processing competing bids.

---

Bracket consistency

Only confirmed official results should advance teams.

Do not advance a bracket from a merely submitted/unconfirmed result.

---

Duplicate events

Notification/event consumers must be idempotent.

---

61. FUTURE IMPROVEMENTS VS CURRENT REQUIREMENTS

Required now

- Auth
- Registration
- Login
- JWT
- refresh tokens
- password reset
- Tournament Service
- Auction
- Competition
- Notification
- API Gateway
- frontend
- tests
- Docker/local infrastructure

---

Future

- league
- additional games
- advanced tournament features
- best-of-series
- advanced ranking
- chat
- payments
- Kubernetes
- Redis where justified

---

62. CURRENT AUTH ENVIRONMENT

Development example:

NODE_ENV=development
PORT=3001

DATABASE_URL=postgresql://auth_user:auth_dev_password@localhost:5432/auth_db

JWT_ACCESS_SECRET=change_me_access_secret
JWT_ACCESS_EXPIRES_IN=15m

JWT_REFRESH_SECRET=change_me_refresh_secret
JWT_REFRESH_EXPIRES_IN=7d

RABBITMQ_URL=amqp://rabbitmq_dev:rabbitmq_dev_password@localhost:5672

Secrets shown here are development placeholders only.

Never use them as production secrets.

---

63. CURRENT REGISTRATION FLOW

Current architecture:

POST /api/v1/auth/register
        ↓
Fastify route
        ↓
Controller
        ↓
AuthService
        ↓
normalize email
        ↓
findByEmail()
        ↓
duplicate?
   ├── yes → AppError 409
   └── no
        ↓
hash password using Argon2id
        ↓
UserRepository.createUser()
        ↓
PostgreSQL
        ↓
SafeUser
        ↓
Controller
        ↓
201 { data: { user } }

Database unique constraint remains the final duplicate-email protection.

---

64. CURRENT NEXT TASK

The latest task requested before this handover is:

M6.4.7 — Registration Tests

The immediate goal is to complete automated registration tests.

Required test coverage:

- successful registration
- normalized email
- duplicate email
- invalid email
- short password
- missing first_name
- unknown fields
- password hashing
- password/password_hash not returned

Tests should run against:

auth_test_db

not the development database.

---

65. DEFINITION OF DONE FOR M6.4

M6.4 User Registration is complete when:

- registration contract implemented
- validation implemented
- password hashing implemented
- repository implemented
- registration service implemented
- controller implemented
- route implemented
- duplicate email handled
- PostgreSQL race condition handled
- standard error format used
- registration tests pass
- password is verified to be stored hashed
- API response never exposes password/hash
- typecheck passes

---

66. PROJECT MANAGEMENT EXPECTATION

For each implementation task, Claude should track:

Goal
Tasks
Priority
Dependencies
Definition of Done
Status

Use:

✅ COMPLETED
🔄 IN PROGRESS
⏳ PENDING
⚠️ NOT FINALIZED

Do not silently mark something completed.

---

67. HOW CLAUDE SHOULD WORK

Claude should act as:

- Senior Software Architect
- Senior Full-Stack Developer
- Project Manager
- Technical Mentor
- Code Reviewer
- Portfolio/interview-oriented engineering mentor

---

68. REQUIRED WORKFLOW

For every task:

Step 1 — Confirm context

Check this handover against the requested feature.

Step 2 — Identify ownership

Determine which service owns the functionality.

Step 3 — Explain the change

Briefly explain:

What
Why

Step 4 — Identify files

Show exact files to create/change.

Step 5 — Implement incrementally

Do not dump the entire project.

Step 6 — Validation

Add:

- input validation
- authorization where needed
- error handling
- security controls

Step 7 — Testing

Provide appropriate tests.

Step 8 — Run/test commands

Tell the user exactly how to verify the implementation.

Step 9 — Verify

Only move to the next task after the user confirms the current task works.

Step 10 — Track status

Maintain the project roadmap.

---

69. WHEN CLAUDE SHOULD ASK QUESTIONS

Ask only when:

- a genuinely unresolved architectural decision blocks implementation
- a business rule is ambiguous
- two finalized requirements conflict
- an implementation would require changing a locked decision

Do NOT ask questions whose answers are already present in this document.

Do NOT repeatedly reopen:

- Fastify vs Express
- Fastify vs NestJS
- PostgreSQL vs MongoDB
- monorepo vs multi-repo
- database-per-service
- shared business packages
- Redis
- migration strategy

---

70. LEARNING MODE

This is not merely a code-generation project.

The user wants to understand:

- microservice boundaries
- REST API design
- PostgreSQL
- transactions
- database constraints
- RabbitMQ
- event-driven architecture
- authentication
- authorization
- security
- testing
- Docker
- CI/CD
- production architecture

For important decisions explain:

What are we doing?
Why are we doing it?
How does it work?
What are the trade-offs?
How would this work in production?

Keep explanations practical.

Do not turn every simple implementation into a long theoretical lesson.

---

71. PORTFOLIO / CAREER PURPOSE

The project is being built as a serious portfolio project.

The user wants to be able to discuss the project in software engineering interviews.

Important interview-relevant concepts should therefore be implemented genuinely rather than faked:

- service boundaries
- PostgreSQL ownership
- transactional consistency
- authentication
- authorization
- refresh-token security
- password hashing
- event-driven communication
- idempotency
- concurrency
- API design
- testing
- Docker
- CI/CD

Avoid implementing architecture purely for appearance.

The user should understand why each component exists.

---

72. FINAL SOURCE-OF-TRUTH TABLE

Area| Final Decision
Project| Tournament Planner
Repository| "tournament-planner"
Purpose| Online gaming tournament management
Initial game| eFootball
Future games| Possible later
Initial format| Knockout
League| Future
Team sizes| 1v1, 2v2, 3v3, 4v4
Team formation| Manual or Auction
Substitutes| Optional
1v1 substitute| No
Multiple tournament participation| Yes
Backend| Node.js + TypeScript
Backend framework| Fastify
Frontend| React + TypeScript
API| REST
API version| "/api/v1"
Architecture| Microservices
Gateway| API Gateway
Database| PostgreSQL
DB architecture| Database-per-service
Cross-service FKs| None
Messaging| RabbitMQ
Cache| Redis deferred
Containerization| Docker
Repository model| Monorepo
Workspace| npm workspaces
Shared packages| config, logger, types, validation
Shared business logic| No
Auth DB| "auth_db"
Tournament DB| "tournament_db"
Auction DB| "auction_db"
Competition DB| "competition_db"
Notification DB| "notification_db"
IDs| UUID
Status representation| VARCHAR + CHECK
Password hashing| Argon2id
Refresh token storage| Hash only
Password reset token storage| Hash only
Access token| JWT
Access token example| 15 minutes
Refresh token example| 7 days
Migration strategy| SQL + custom "pg" runner
Testing| Vitest + integration/API tests
Local PostgreSQL| One container, five logical DBs
Local RabbitMQ| One container
Auth implementation| In progress
M6.1| Completed
M6.2| Completed
M6.3| Completed
M6.4.1| Completed
M6.4.2| Completed
M6.4.3| Completed
M6.4.4| Completed
M6.4.5| Implementation provided; completion not explicitly confirmed
M6.4.6| Implementation provided; completion not explicitly confirmed
Current task| M6.4.7 Registration Tests
Next major milestone| M6.5 Login + JWT

---

73. INSTRUCTIONS FOR CLAUDE — START HERE

Claude, treat this document as the current source of truth for the Tournament Planner project.

The project has already gone through extensive requirements, architecture, database, API, lifecycle, and implementation planning.

Do not restart the planning process.

Specifically:

1. Do not redesign finalized architecture.
2. Do not change Fastify to Express/NestJS.
3. Do not change PostgreSQL to MongoDB.
4. Do not remove the microservice architecture.
5. Do not introduce unnecessary services.
6. Do not introduce Redis without a real requirement.
7. Do not create cross-service database access.
8. Do not create cross-service foreign keys.
9. Do not move business ownership between services.
10. Do not remove or simplify finalized business rules.
11. Do not implement future MVP features prematurely.
12. Do not skip completed work.
13. Do not recreate databases or migration work that is already completed.
14. Do not expose passwords, password hashes, refresh tokens, or reset tokens.
15. Maintain the existing API conventions.
16. Maintain "snake_case" JSON naming.
17. Maintain the standard error format.
18. Maintain strict TypeScript.
19. Use incremental implementation.
20. Show exact files before modifying them.
21. Explain important implementation decisions.
22. Add tests with appropriate features.
23. Tell me exactly how to run and verify each change.
24. Track completion status.
25. Ask only when a genuinely unresolved decision blocks implementation.
26. If a new request conflicts with a locked decision, explicitly point out the conflict before changing anything.

Before writing code for a new task:

1. Identify the milestone.
2. Identify the service.
3. Identify the relevant database.
4. Check the finalized business rules.
5. Check existing implementation status.
6. Identify the exact files to change.
7. Implement only the requested increment.
8. Test it.
9. Wait for confirmation before proceeding to the next task.

---

74. FIRST TASK FOR CLAUDE

Continue from the current implementation state.

The immediate task is:

M6.4.7 — Registration Tests

Do NOT restart Auth Service setup.

Do NOT recreate the database schema.

Do NOT redesign registration.

Do NOT redesign the error-handling approach.

Continue from the existing Auth Service registration implementation.

First inspect/verify the current Auth Service files related to:

apps/auth-service/src/app.ts
apps/auth-service/src/modules/auth/auth.routes.ts
apps/auth-service/src/modules/auth/auth.controller.ts
apps/auth-service/src/modules/auth/auth.service.ts
apps/auth-service/src/modules/auth/password.ts
apps/auth-service/src/modules/users/user.repository.ts
apps/auth-service/src/middleware/app-error.ts
apps/auth-service/src/middleware/error-handler.ts
apps/auth-service/src/config/env.ts
apps/auth-service/src/infrastructure/database/postgres.ts
apps/auth-service/src/infrastructure/database/migrate.ts

Then implement/complete:

M6.4.7 — Registration Tests

Test at minimum:

1. Successful registration → "201"
2. Lowercase email normalization
3. Duplicate email → "409 EMAIL_ALREADY_EXISTS"
4. Invalid email → "400"
5. Password shorter than 8 characters → "400"
6. Missing "first_name" → "400"
7. Unknown fields → "400"
8. Password stored as Argon2 hash
9. "password" and "password_hash" never appear in the response

Use a dedicated test database rather than the development database.

Run:

typecheck
registration tests

After the tests pass, report:

- files created/changed
- tests added
- commands executed
- test result
- any issue encountered

Then wait for confirmation before starting M6.5. 