# Service Boundaries

Source of truth: `docs/PROJECT-HANDOVER.md`

Service boundaries are FINAL. Do not move ownership between services without explicit discussion.

---

## 1. Boundary Table

| Service | Owns | Must NOT Own |
|---|---|---|
| Auth | Users, credentials, access tokens, refresh tokens, password reset tokens, account lifecycle | Tournaments, teams, auctions, matches, notifications |
| Tournament | Tournaments, tournament participants, invitations, join requests, captain requests, teams, team members | Users' passwords, auction bids, competition results |
| Auction | Auctions, auction rounds, auction lots, auction bidders, bids, allocations | Team membership DB, users' credentials |
| Competition | Competitions, rounds, fixtures, matches, lineups, lineup players, results, disputes | Tournament participant master records, auction data, authentication users |
| Notification | Notifications, notification deliveries, notification preferences | Business state belonging to other services |
| API Gateway | Routing, authentication boundary, rate limiting, correlation IDs | Business logic ownership |

---

## 2. Auth Service

**Owns:**
- User identity
- Registration
- Login
- Access tokens (JWT)
- Refresh tokens
- Password reset tokens
- Account lifecycle (status management)

**Database:** `auth_db`

---

## 3. Tournament Service

**Owns:**
- Tournaments
- Tournament participants
- Invitations
- Join requests
- Captain requests
- Teams
- Team members

**Database:** `tournament_db`

---

## 4. Auction Service

**Owns:**
- Auctions
- Auction rounds
- Auction lots
- Auction bidders
- Bids
- Allocations

**Database:** `auction_db`

**Critical rule:** The Auction Service must never directly write to `tournament_db.team_members`. Finalized player allocations cross the service boundary through events/integration only.

---

## 5. Competition Service

Also referred to as Competition/Match Service.

**Owns:**
- Competitions
- Knockout rounds
- Fixtures
- Matches
- Match lineups and lineup players
- Match results
- Disputes
- Winner advancement
- Competition completion

**Database:** `competition_db`

**Boundary note:** Tournament Service owns the participant master records. Competition Service refers to teams/participants by UUID only and validates squad eligibility through service-level logic, not cross-database queries.

---

## 6. Notification Service

**Owns:**
- Notifications
- Notification deliveries
- Notification preferences

**Database:** `notification_db`

Notifications are generated from domain events. The Notification Service must not receive arbitrary client POST requests to create notifications — it consumes events from RabbitMQ.

---

## 7. API Gateway

**Responsibilities:**
- Frontend entry point
- Authentication/token validation at the gateway boundary
- Rate limiting
- Correlation/request ID propagation
- Routing to backend services

**Must not** own business logic or authorization decisions. Business authorization (e.g., "is this user the tournament owner?") remains inside the owning service.

---

## 8. Cross-Service Rules

**Forbidden:**

```
Tournament Service → direct SQL → auction_db
Competition Service → direct SQL → tournament_db
Any service → direct SQL → another service's database
```

**Required instead:**

```
Synchronous:  REST API call to the owning service
Asynchronous: RabbitMQ event published/consumed
```

Cross-service relationships are represented by UUID references only. There are no cross-service foreign keys in any database.
