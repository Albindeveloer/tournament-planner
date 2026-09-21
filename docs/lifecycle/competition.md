# Competition Lifecycle

Source of truth: `docs/PROJECT-HANDOVER.md` §7.7, §7.8, §6

---

## Competition Statuses

```
NOT_CREATED
BRACKET_GENERATED
SCHEDULING
SCHEDULED
IN_PROGRESS
COMPLETED
CANCELLED
```

`CANCELLED` is an exceptional terminal state.

---

## Competition Flow

```
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
```

---

## Match Statuses

Normal states:

```
SCHEDULED
LINEUP_PENDING
LINEUP_CONFIRMED
IN_PROGRESS
RESULT_PENDING
CONFIRMED
```

Exceptional states:

```
DISPUTED
FORFEIT
CANCELLED
```

---

## Match Flow

```
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
```

Exceptional paths:

```
RESULT_PENDING → DISPUTED → (owner resolves) → CONFIRMED / REJECTED
Any state → FORFEIT (team withdrawal or no-show)
Any state → CANCELLED
```

---

## Result Statuses

```
PENDING
CONFIRMED
DISPUTED
REJECTED
```

---

## Result Workflow

```
Captain submits result
        ↓
PENDING
        ↓
Opposing captain reviews
        ├── CONFIRMED → winner advances bracket
        └── DISPUTED
                ↓
           Owner resolves
                ├── Confirmed result → winner advances
                └── Rejected result → may require resubmission
```

**Rule:** Only a `CONFIRMED` official result or valid forfeit can advance a team in the bracket. A merely submitted, unconfirmed result does not advance the bracket.

---

## Fixture Statuses

```
PENDING    (bracket slot not yet filled)
READY      (both teams assigned)
COMPLETED  (match result confirmed)
FORFEITED  (team forfeited/withdrew)
CANCELLED
```

---

## Bracket Progression

- `next_fixture_id` on the fixture table links to the next round's fixture slot.
- When a match is confirmed, the Competition Service writes the winner's ID into the appropriate `next_fixture_id` slot.
- Only a confirmed result or valid forfeit triggers advancement.

---

## Knockout Structure

```
Competition
  ↓
Rounds (e.g., Round of 16, QF, SF, Final)
  ↓
Fixtures (one per match pairing per round)
  ↓
Matches (one per fixture in MVP)
```

`match_number` is retained on the `matches` table for future best-of-N support (not used in MVP).

---

## Team Withdrawal During Competition

- Remaining applicable matches become automatic wins for the opponent.
- The withdrawn team does not advance in the bracket.
- A `TeamWithdrawn` event is published by the Tournament Service.
- The Competition Service consumes the event and updates fixtures accordingly.

---

## Competition Completion

When the final match is confirmed and the tournament winner is determined:

```
Competition → COMPLETED
```

The `CompetitionCompleted` event is published, allowing the Tournament Service to advance the tournament to its completion lifecycle state.
