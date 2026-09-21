# Auction Lifecycle

Source of truth: `docs/PROJECT-HANDOVER.md` §7.6, §5

---

## Auction Statuses

```
DRAFT
READY
IN_PROGRESS
COMPLETED
CANCELLED
```

`CANCELLED` is an exceptional terminal state.

---

## Auction Flow

```
DRAFT
  ↓
READY
  ↓
IN_PROGRESS
  ↓
Rounds / Lots / Bidding
  ↓
Second Round (for unsold players)
  ↓
Automatic Allocation (remaining unsold players)
  ↓
COMPLETED
```

---

## Lot Statuses

```
PENDING
LIVE
SOLD
UNSOLD
CANCELLED
```

---

## Lot Flow

```
PENDING
  ↓
LIVE  (one live lot at a time)
  ↓
SOLD     (winning bid accepted, purchase committed atomically)
UNSOLD   (lot timer expires with no valid winner)
```

---

## Unsold Player Progression

```
First round → UNSOLD
     ↓
Second round → UNSOLD (if still unsold)
     ↓
Automatic allocation
```

After the second round, all remaining unsold players are automatically allocated deterministically.

> **Not yet finalized:** The exact automatic allocation algorithm. Do not implement without discussion.

---

## Bid Rules

- One live lot at a time per auction.
- First bid must be >= starting price.
- Subsequent bids must be >= `current_bid + configured_increment`.
- Concurrent bids are transactionally protected with `SELECT ... FOR UPDATE`.

---

## Purchase Atomicity

When a player is sold, these steps must happen in a single atomic transaction:

1. Lock the auction lot (`SELECT ... FOR UPDATE`)
2. Lock the bidder record
3. Validate the winning bid
4. Deduct the budget from the bidder
5. Create an allocation record
6. Mark the lot as `SOLD`

---

## Allocation Types

| Type | Description |
|---|---|
| `AUCTION` | Player purchased via live bidding |
| `AUTO_ALLOCATION` | Player allocated after second round |

---

## Service Boundary

The Auction Service owns all allocation records. It does not write to `tournament_db.team_members`. The allocation result is communicated to the Tournament Service through a domain event (`PlayerAllocated`).
