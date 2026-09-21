# Competition Database

Database: `competition_db`
Owner: Competition Service
User: `competition_user`

Source of truth: `docs/PROJECT-HANDOVER.md` §18

---

## Tables

- `competitions`
- `rounds`
- `fixtures`
- `matches`
- `match_lineups`
- `match_lineup_players`
- `match_results`
- `disputes`

---

## competitions

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| tournament_id | UUID | References Tournament Service by UUID (no FK) |
| format | VARCHAR + CHECK | `KNOCKOUT` (MVP only) |
| status | VARCHAR + CHECK | See statuses below |
| timestamps | — | created_at, updated_at |

**Status values:** `NOT_CREATED`, `BRACKET_GENERATED`, `SCHEDULING`, `SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`

**Unique constraint:** `tournament_id` — one competition per tournament.

---

## rounds

Knockout rounds belonging to a competition.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| competition_id | UUID | References competitions.id |
| round_number | INTEGER | Round sequence |
| timestamps | — | — |

**Unique constraint:** `(competition_id, round_number)`

---

## fixtures

Bracket fixture — one fixture per match pairing in a round.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| round_id | UUID | References rounds.id |
| team_a_id | UUID | Nullable (pending bracket slot) |
| team_b_id | UUID | Nullable (pending bracket slot) |
| winner_team_id | UUID | Nullable until result confirmed |
| status | VARCHAR + CHECK | See statuses below |
| next_fixture_id | UUID | Self-reference for bracket progression |

**Status values:** `PENDING`, `READY`, `COMPLETED`, `FORFEITED`, `CANCELLED`

`next_fixture_id` is a self-referencing FK used to advance the winner to the next round.

Team IDs reference Tournament Service teams by UUID — no cross-service FK.

---

## matches

One match per fixture in the MVP (one fixture = one match).

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| fixture_id | UUID | References fixtures.id |
| match_number | INTEGER | Retained for future best-of-N support |
| scheduled_at | TIMESTAMPTZ | Match date/time |
| status | VARCHAR + CHECK | See statuses below |

**Status values:** `SCHEDULED`, `LINEUP_PENDING`, `LINEUP_CONFIRMED`, `IN_PROGRESS`, `RESULT_PENDING`, `CONFIRMED`, `DISPUTED`, `FORFEIT`, `CANCELLED`

---

## match_lineups

One lineup record per team per match.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| match_id | UUID | References matches.id |
| team_id | UUID | References Tournament Service team by UUID (no FK) |
| status | VARCHAR + CHECK | `SUBMITTED`, `CONFIRMED`, `OVERRIDDEN` |
| timestamps | — | — |

---

## match_lineup_players

Players in a submitted lineup.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| lineup_id | UUID | References match_lineups.id |
| participant_id | UUID | References Tournament Service participant by UUID (no FK) |
| squad_role | VARCHAR + CHECK | `MAIN`, `SUBSTITUTE` |

Lineup validity (player is on the permanent squad) is enforced at the service level through business logic, not cross-database queries.

---

## match_results

Submitted match results.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| match_id | UUID | References matches.id |
| submission_number | INTEGER | Preserves submission history (explicitly added) |
| submitted scores | — | Per-team scores |
| winner | UUID | Server-derived from scores — not blindly trusted from client |
| status | VARCHAR + CHECK | `PENDING`, `CONFIRMED`, `DISPUTED`, `REJECTED` |
| timestamps | — | — |

`submission_number` was explicitly added during database review to preserve submission history for dispute context.

**Rule:** Winner is derived server-side. The client submits scores; the server determines the winner.

---

## disputes

Stores disputed match results and owner resolution.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| match_result_id | UUID | References match_results.id |
| disputed_by | UUID | References disputing captain by UUID (no FK) |
| resolution | — | Owner resolution details |
| timestamps | — | — |

Owner has final resolution authority over disputes.
