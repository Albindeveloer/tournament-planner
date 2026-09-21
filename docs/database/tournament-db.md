# Tournament Database

Database: `tournament_db`
Owner: Tournament Service
User: `tournament_user`

Source of truth: `docs/PROJECT-HANDOVER.md` §16

---

## Tables

- `tournaments`
- `tournament_participants`
- `invitations`
- `join_requests`
- `captain_requests`
- `teams`
- `team_members`

---

## tournaments

**Key fields:**

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| owner_id | UUID | References auth_db.users by UUID (no FK) |
| name | — | Required |
| description | — | Optional |
| game | VARCHAR + CHECK | `EFOOTBALL` (MVP only) |
| format | VARCHAR + CHECK | `KNOCKOUT` / `LEAGUE` (MVP: KNOCKOUT only) |
| team_size | INTEGER + CHECK | `1`, `2`, `3`, or `4` |
| number_of_teams | INTEGER | Must be power of two for knockout |
| substitutes_enabled | BOOLEAN | Controls substitute requirement |
| team_formation_mode | VARCHAR + CHECK | `MANUAL` or `AUCTION` |
| status | VARCHAR + CHECK | See lifecycle statuses below |
| registration_start_at | TIMESTAMPTZ | — |
| registration_end_at | TIMESTAMPTZ | — |
| created_at | TIMESTAMPTZ | — |
| updated_at | TIMESTAMPTZ | — |

**Status values:** `DRAFT`, `REGISTRATION_OPEN`, `REGISTRATION_CLOSED`, `TEAM_FORMATION`, `TEAMS_FINALIZED`, `FIXTURES_GENERATED`, `SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`

**Capacity** is derived — not stored. See `docs/requirements/business-rules.md`.

---

## tournament_participants

Represents users who have been approved to participate in a tournament.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| tournament_id | UUID | References tournaments.id |
| user_id | UUID | References auth_db.users by UUID (no FK) |
| status | VARCHAR + CHECK | `APPROVED`, `WITHDRAWN` |
| withdrawn_at | TIMESTAMPTZ | Nullable; set when status = WITHDRAWN |
| created_at | TIMESTAMPTZ | — |
| updated_at | TIMESTAMPTZ | — |

**Unique constraint:** `(tournament_id, user_id)`

---

## invitations

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| tournament_id | UUID | References tournaments.id |
| invitee_id | UUID | References auth_db.users by UUID (no FK) |
| status | VARCHAR + CHECK | `PENDING`, `ACCEPTED`, `REJECTED`, `EXPIRED`, `CANCELLED` |
| timestamps | — | created_at, updated_at |

**Unique constraint:** `(tournament_id, invitee_id)`

A partial index exists for pending invitations.

---

## join_requests

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| tournament_id | UUID | References tournaments.id |
| user_id | UUID | References auth_db.users by UUID (no FK) |
| status | VARCHAR + CHECK | `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`, `EXPIRED` |
| timestamps | — | created_at, updated_at |

**Unique constraint:** `(tournament_id, user_id)`

---

## captain_requests

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| tournament_id | UUID | References tournaments.id |
| participant_id | UUID | References tournament_participants.id |
| status | VARCHAR + CHECK | `PENDING`, `REJECTED`, `CANCELLED` |
| timestamps | — | created_at, updated_at |

**Unique constraint:** `(tournament_id, participant_id)`

A captain request does not automatically assign the participant as captain.

---

## teams

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| tournament_id | UUID | References tournaments.id |
| name | VARCHAR | Team name |
| status | VARCHAR + CHECK | `FORMING`, `READY`, `ELIMINATED`, `WITHDRAWN` |
| timestamps | — | created_at, updated_at |

**Unique constraint:** `(tournament_id, name)`

---

## team_members

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| team_id | UUID | References teams.id |
| participant_id | UUID | References tournament_participants.id |
| member_role | VARCHAR + CHECK | `PLAYER`, `CAPTAIN` |
| squad_status | VARCHAR + CHECK | `MAIN`, `SUBSTITUTE` |
| timestamps | — | created_at, updated_at |

**Constraints:**
- One captain per team
- One substitute per team
- Captain must have `squad_status = MAIN`
- A participant can belong to only one team within a tournament (enforced at service level)

---

## Design Notes

- No cross-service foreign keys. `owner_id`, `user_id`, and `invitee_id` reference Auth Service users by UUID only.
- All status columns use `VARCHAR + CHECK` — not PostgreSQL ENUMs.
- Cross-table tournament consistency (participant ↔ team ↔ tournament) is enforced at the service level through transactions.
