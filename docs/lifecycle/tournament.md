# Tournament Lifecycle

Source of truth: `docs/PROJECT-HANDOVER.md` §7.1

---

## Statuses

```
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
```

---

## Normal Flow

```
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
```

`CANCELLED` is an exceptional terminal state that can be reached from multiple points in the lifecycle.

---

## Transition Validations

| Transition | Requirement |
|---|---|
| → `IN_PROGRESS` | Registration must satisfy configured rules |
| → `IN_PROGRESS` | Teams must be valid and finalized |
| → `IN_PROGRESS` | Required participants must exist |
| → `IN_PROGRESS` | Knockout team count must be a power of two |
| → `FIXTURES_GENERATED` | Teams must be finalized before fixtures |
| → `SCHEDULED` | Fixtures must exist |

---

## Invitation Lifecycle

```
PENDING
  ├── ACCEPTED
  ├── REJECTED
  ├── EXPIRED
  └── CANCELLED
```

---

## Join Request Lifecycle

```
Public Link
    ↓
Join Request (PENDING)
    ↓
Owner Review
    ├── APPROVED
    └── REJECTED

Also:
PENDING → CANCELLED (by requesting user)
PENDING → EXPIRED   (registration period ends)
```

Capacity is checked before approval.

---

## Captain Request Lifecycle

```
PENDING
  ├── REJECTED (by owner)
  └── CANCELLED (by participant)
```

A captain request does not automatically assign captaincy. The owner uses it to identify interested participants and then makes an explicit captain assignment.

---

## Team Lifecycle

```
FORMING
   ↓
READY
   ↓
ELIMINATED
```

Exceptional state:

```
WITHDRAWN
```

A team can withdraw at any point before or during competition.

---

## Status Storage

All statuses are stored as `VARCHAR + CHECK` constraints in PostgreSQL. PostgreSQL ENUMs are not used for these fields.
