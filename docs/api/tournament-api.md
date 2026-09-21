# Tournament API

Service: Tournament Service
Base prefix: `/api/v1`

Source of truth: `docs/PROJECT-HANDOVER.md` §23

---

## Finalized Endpoint Set

The following endpoint categories are finalized. Exact route paths should follow the project handover contract and must not be invented independently.

---

## Tournaments

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/tournaments` | Create a tournament |
| GET | `/api/v1/tournaments` | List tournaments |
| GET | `/api/v1/tournaments/:id` | Get a tournament |
| PATCH | `/api/v1/tournaments/:id` | Update a tournament |

### Lifecycle transitions

| Operation | Purpose |
|---|---|
| open | Move tournament to `REGISTRATION_OPEN` |
| close | Move tournament to `REGISTRATION_CLOSED` |
| cancel | Cancel the tournament |

---

## Participants

| Operation | Purpose |
|---|---|
| GET participant list | List approved participants |
| Create join request | Public-link join (creates a join request) |
| Approve join request | Owner approves a pending join request |
| Reject join request | Owner rejects a pending join request |
| Withdraw self | Participant withdraws from tournament |

---

## Invitations

| Operation | Purpose |
|---|---|
| Create invitation | Owner invites a user |
| List invitations | List tournament invitations |
| Update invitation | Accept or reject (invitee) |
| Cancel invitation | Owner cancels a pending invitation |

---

## Captain Requests

| Operation | Purpose |
|---|---|
| Create captain request | Participant requests captain role |
| List captain requests | Owner reviews captain interest |

---

## Teams

| Method | Purpose |
|---|---|
| POST | Create a team |
| GET (list) | List teams in a tournament |
| GET (single) | Get a specific team |
| PATCH | Update a team |

---

## Team Members

| Operation | Purpose |
|---|---|
| Add member | Add a participant to a team |
| Remove member | Remove a participant from a team |
| Update member | Change role or squad status |

---

## Finalization

| Operation | Purpose |
|---|---|
| Finalize teams | Mark teams as finalized; moves tournament to `TEAMS_FINALIZED` |

---

## Authorization

All mutating operations enforce ownership and role checks inside the Tournament Service. The API Gateway validates the token; the Tournament Service validates the business authorization (e.g., "is this user the tournament owner?").

> **Not yet finalized:** Exact route nesting and path structure for nested resources (e.g., `/tournaments/:id/participants`, `/tournaments/:id/teams/:teamId/members`). Follow the finalized API contract from the handover when implementing — do not invent alternate paths.
