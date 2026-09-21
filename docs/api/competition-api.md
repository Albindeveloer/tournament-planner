# Competition API

Service: Competition Service
Base prefix: `/api/v1`

Source of truth: `docs/PROJECT-HANDOVER.md` §25

---

## Finalized Endpoint Set

The following endpoint categories are finalized. Exact route paths must follow the handover contract when implemented.

---

## Competitions

| Operation | Purpose |
|---|---|
| Create competition | Create a competition for a tournament |
| Get competition | Get competition details |
| Generate bracket | Generate the knockout bracket |
| Start competition | Transition competition to `IN_PROGRESS` |
| Cancel competition | Cancel the competition |

---

## Rounds

| Operation | Purpose |
|---|---|
| Get rounds | List knockout rounds for a competition |

---

## Fixtures

| Operation | Purpose |
|---|---|
| Get fixtures | List fixtures for a round |

---

## Matches

| Operation | Purpose |
|---|---|
| Get match | Get a specific match |
| Schedule match | Set the match date/time (owner only) |
| Start match | Transition match to `IN_PROGRESS` |
| Cancel match | Cancel the match |
| Forfeit match | Record a forfeit |

---

## Lineups

| Operation | Purpose |
|---|---|
| Submit lineup | Captain submits team lineup |
| Get lineup | Get submitted lineup for a team |
| Update lineup | Override/correct a lineup (owner or captain before match start) |

---

## Results

| Operation | Purpose |
|---|---|
| Submit result | Captain submits match result |
| Get result | Get the submitted result |
| Confirm result | Opposing captain confirms the result |
| Dispute result | Opposing captain disputes the result |

---

## Disputes

| Operation | Purpose |
|---|---|
| Get disputes | List disputes for a match or competition |
| Resolve dispute | Owner resolves a disputed result |

---

## Authorization

- Match scheduling: tournament owner only.
- Lineup submission: captain of the relevant team.
- Result submission: captain of the relevant team.
- Result confirmation/dispute: opposing captain.
- Dispute resolution: tournament owner.

Authorization is enforced inside the Competition Service.
