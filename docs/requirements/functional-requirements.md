# Functional Requirements

Source of truth: `docs/PROJECT-HANDOVER.md`

---

## 1. Project Purpose

Tournament Planner is a web application for organizing and managing online gaming tournaments.

Initial domain: **eFootball**. Architecture is designed to support additional games in future.

The application manages:

- Users and accounts
- Tournament creation and configuration
- Tournament invitations and public joining
- Join approvals and participant management
- Captain requests and assignment
- Teams and team members
- Substitutes
- Optional player auctions
- Knockout competitions
- Fixtures and match scheduling
- Lineups
- Match results, confirmation, and disputes
- Tournament completion
- Notifications

---

## 2. Initial MVP Scope

**Supported:**

- eFootball only
- Knockout tournament format only
- Team sizes: 1v1, 2v2, 3v3, 4v4
- Manual team formation
- Auction team formation (optional)
- Tournament invitations
- Public tournament links
- Owner approval of join requests
- Captain requests and assignment
- Substitutes (optional, not applicable to 1v1)
- Knockout fixture generation
- Match scheduling
- Lineups
- Result submission, confirmation, and disputes
- Owner dispute resolution
- Automatic bracket progression
- Notifications

**Explicitly outside initial MVP:**

- League tournaments
- Multiple games beyond eFootball
- Best-of-3 or Best-of-5 formats
- Advanced rankings
- Chat
- Payments
- Advanced administration
- Kubernetes
- Redis (deferred until a concrete requirement exists)

---

## 3. User / Account

Users have:

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key, `gen_random_uuid()` |
| email | VARCHAR(255) | Unique (case-insensitive), normalized |
| password | — | Never stored in plaintext |
| password_hash | TEXT | Argon2id hash |
| first_name | VARCHAR(100) | Required |
| last_name | VARCHAR(100) | Optional |
| status | VARCHAR(20) | `ACTIVE`, `SUSPENDED`, `DEACTIVATED` |
| email_verified | BOOLEAN | Default false |
| last_login_at | TIMESTAMPTZ | Nullable |
| created_at | TIMESTAMPTZ | Set on creation |
| updated_at | TIMESTAMPTZ | Updated on change |

---

## 4. Registration

**Endpoint:** `POST /api/v1/auth/register`

**Required fields:**

- `email` — valid email format, max 255 characters
- `password` — 8–128 characters
- `first_name` — 1–100 characters

**Optional fields:**

- `last_name` — max 100 characters

**Rules:**

- Email is normalized: trimmed and lowercased before storage
- Password is hashed with Argon2id before storage
- `password_hash` is never returned in API responses
- Duplicate email returns HTTP 409 (`EMAIL_ALREADY_EXISTS`)
- Unknown fields in the request body are rejected (HTTP 400)
- Database unique constraint is the final protection against duplicate emails (race condition safety)

---

## 5. Tournament Creation

Tournament configuration includes:

| Field | Notes |
|---|---|
| name | Required |
| description | Optional |
| game | `EFOOTBALL` (MVP only) |
| format | `KNOCKOUT` (MVP only) |
| team_size | `1`, `2`, `3`, or `4` |
| number_of_teams | Must be power of two for knockout |
| substitutes_enabled | Boolean |
| team_formation_mode | `MANUAL` or `AUCTION` |
| registration_start_at | Registration period start |
| registration_end_at | Registration period end |
| status | Tournament lifecycle status |

Capacity is **derived**, not stored:

- Substitutes disabled: `number_of_teams × team_size`
- Substitutes enabled: `number_of_teams × (team_size + 1)`
- 1v1 never has a substitute regardless of the setting

---

## 6. Tournament Joining

Players join through:

1. **Direct invitation** — owner sends invitation; invited user accepts
2. **Public tournament link** — creates a join request requiring owner approval

Public-link joining does not automatically grant participation.

---

## 7. Invitations

Owner sends invitations to specific users.

Status lifecycle:

```
PENDING
  ├── ACCEPTED
  ├── REJECTED
  ├── EXPIRED
  └── CANCELLED
```

Uniqueness: one invitation record per `(tournament_id, invitee_id)`.

---

## 8. Join Requests

Generated when a user joins via public tournament link.

Status lifecycle:

```
PENDING
  ├── APPROVED
  ├── REJECTED
  ├── CANCELLED
  └── EXPIRED
```

Capacity must be checked before approving a join request.

---

## 9. Captain Requests

Participants can express interest in becoming captain.

- A captain request is not automatic captain assignment.
- The owner has final authority over captain selection.
- Status lifecycle: `PENDING → REJECTED / CANCELLED`
- One captain request per `(tournament_id, participant_id)`.

---

## 10. Captain Assignment

- Owner selects and assigns captains.
- Captain status is associated with a team membership.
- Captain must be a main player (not a substitute).
- Only one captain per team.

---

## 11. Teams

Teams belong to a tournament.

Status lifecycle:

```
FORMING → READY → ELIMINATED
                 → WITHDRAWN
```

A team contains main players, an optional substitute, and one captain.

---

## 12. Team Members

Team membership roles:

| Role | Description |
|---|---|
| `PLAYER` | Regular team member |
| `CAPTAIN` | Team captain (must be MAIN) |

Squad status:

| Status | Description |
|---|---|
| `MAIN` | Starting player |
| `SUBSTITUTE` | Substitute player |

Constraints:

- One captain per team
- One substitute per team
- Captain must be `MAIN` (not `SUBSTITUTE`)
- A participant can belong to only one team within a tournament

---

## 13. Tournament Start Conditions

A tournament cannot start unless:

- Required participant count is satisfied
- All teams are valid
- For knockout: number of teams is a power of two (2, 4, 8, 16...)

No byes are supported in the MVP.

---

## 14. Auction (Optional)

Used when `team_formation_mode = AUCTION`.

See `docs/requirements/business-rules.md` for auction rules.

---

## 15. Match Scheduling

- Tournament owner initially schedules match date/time.
- Only authorized tournament owners can schedule matches.
- Scheduling is owned by the Competition Service.

---

## 16. Lineups

- Captains submit lineups before a match starts.
- Owner can override/correct a lineup before match start.
- Lineup validity is checked against the permanent tournament squad.

---

## 17. Match Results

- Captain submits the result.
- Opposing captain confirms or disputes.
- Only a confirmed result advances the bracket.
- Owner resolves disputed results.

---

## 18. Notifications

Notification Service generates notifications from domain events.

MVP delivery channel: `IN_APP`.

Database supports future channels: `EMAIL`, `PUSH`.

Users can configure notification preferences.
