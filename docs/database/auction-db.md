# Auction Database

Database: `auction_db`
Owner: Auction Service
User: `auction_user`

Source of truth: `docs/PROJECT-HANDOVER.md` §17

---

## Tables

- `auctions`
- `auction_rounds`
- `auction_lots`
- `auction_bidders`
- `bids`
- `allocations`

---

## auctions

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| tournament_id | UUID | References Tournament Service by UUID (no FK) |
| status | VARCHAR + CHECK | See statuses below |
| timestamps | — | created_at, updated_at |

**Status values:** `DRAFT`, `READY`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`

**Unique constraint:** `tournament_id` — one auction per tournament.

---

## auction_rounds

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| auction_id | UUID | References auctions.id |
| round_number | INTEGER | Round sequence number |
| status / timestamps | — | As finalized |

**Unique constraint:** `(auction_id, round_number)`

---

## auction_lots

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| auction_round_id | UUID | References auction_rounds.id |
| participant_id | UUID | References Tournament Service participant by UUID (no FK) |
| starting_price | — | Minimum opening bid |
| current_bid | — | Current highest bid amount |
| current_bidder | UUID | References auction_bidders.id |
| status | VARCHAR + CHECK | See statuses below |
| winning_bid | — | Final accepted bid amount |
| winning_team | UUID | References auction_bidders.id |
| ends_at | TIMESTAMPTZ | Server-controlled lot close time |

**Status values:** `PENDING`, `LIVE`, `SOLD`, `UNSOLD`, `CANCELLED`

**Rules:**
- Only one lot can be `LIVE` at a time per auction.
- Lot must be locked with `SELECT ... FOR UPDATE` when processing a bid.
- Server controls the auction timer via `ends_at`.

---

## auction_bidders

Represents captains/teams participating in an auction.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| auction_id | UUID | References auctions.id |
| team_id | UUID | References Tournament Service team by UUID (no FK) |
| budget | — | Available bid budget |
| timestamps | — | — |

Unique bidder/team relationship enforced per auction.

---

## bids

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| auction_lot_id | UUID | References auction_lots.id |
| bidder_id | UUID | References auction_bidders.id |
| amount | — | Bid amount |
| timestamps | — | — |

**Validation rules:**
- First bid must be >= starting price
- Subsequent bids must be >= `current_bid + configured_increment`
- Concurrent bids must be protected transactionally (`SELECT ... FOR UPDATE` on the lot)

---

## allocations

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| auction_lot_id | UUID | References auction_lots.id |
| participant_id | UUID | The allocated participant |
| team_id | UUID | The receiving team |
| allocation_type | VARCHAR + CHECK | `AUCTION` or `AUTO_ALLOCATION` |
| timestamps | — | — |

**Unique constraints:**
- One allocation per lot
- One allocation per participant per auction

**Service boundary:** Auction Service owns these records. It does not write to `tournament_db.team_members`. Allocations cross the service boundary via events.
