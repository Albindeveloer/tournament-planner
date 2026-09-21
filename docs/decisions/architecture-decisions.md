# Architecture Decisions

Source of truth: `docs/PROJECT-HANDOVER.md` §37, §58

All decisions in this document are FINAL / LOCKED unless explicitly marked otherwise. Do not reopen these decisions without an actual implementation blocker.

---

## Technology Decisions

| Area | Decision | Reason |
|---|---|---|
| Backend language | Node.js + TypeScript | Ecosystem + learning goal |
| Backend framework | **Fastify** | Selected after comparing Express and NestJS |
| Frontend | React + TypeScript | Project requirement and portfolio relevance |
| API style | REST | Synchronous service communication |
| API version | `/api/v1` | — |
| Architecture | Microservices | Learning + portfolio objective |
| Database | **PostgreSQL** | Relational domain, constraints, transactions, auction concurrency |
| DB architecture | Database-per-service | Clear service boundaries |
| Cross-service FKs | **None** | UUID references only; REST/events for cross-service data |
| Messaging | **RabbitMQ** | Async/event-driven communication |
| Cache | Redis deferred | Avoid unnecessary infrastructure until a real use case exists |
| Containerization | Docker | Local/production consistency |
| Repository model | Monorepo | Easier coordinated development |
| Workspace tool | npm workspaces | Simple native approach |
| Shared packages | config, logger, types, validation | Technical infrastructure only |
| Shared business logic | **None** | Business logic belongs to the owning service |
| Status types | VARCHAR + CHECK | Flexible schema evolution vs PostgreSQL ENUMs |
| IDs | UUID | Consistent distributed IDs |
| Password hashing | Argon2id | Industry-recommended secure hashing |
| Token storage | Hash only | Plaintext refresh/reset tokens never persisted |
| Access token | JWT | `sub`, `iat`, `exp` claims |
| Migration strategy | SQL files + custom `pg` runner | Transparency and PostgreSQL learning |
| Testing framework | Vitest | TypeScript-native, fast |
| Test approach | Integration tests with real test DB | DB constraints are part of feature behavior |
| CI/CD | GitHub Actions (planned) | Portfolio/production workflow |
| Cloud | Planned for later | Not required during initial implementation |

---

## Rejected Alternatives

| Alternative | Rejected In Favor Of | Reason |
|---|---|---|
| Express | Fastify | Project standard chosen after comparison |
| NestJS | Fastify | Avoid framework abstraction; learn underlying Node.js/microservice architecture |
| MongoDB | PostgreSQL | Relational domain, constraints, transactional requirements |
| node-pg-migrate | Custom SQL runner | Already using `pg`; avoids abstraction; transparent PostgreSQL learning |
| Turborepo / Nx | npm workspaces | Unnecessary complexity for current project size |
| Multiple PostgreSQL containers | Single container, five logical DBs | Simpler local development; production can differ |
| Redis (now) | Deferred | No concrete use case currently exists |
| Shared domain logic package | Service-owned domain | Shared business packages create hidden distributed monoliths |
| Clean Architecture layers everywhere | Simple module structure | Only introduce `domain/`, `use-cases/`, `ports/`, `adapters/` where complexity justifies it |

---

## Local Infrastructure Decisions

- **One PostgreSQL container** with five logical databases (`auth_db`, `tournament_db`, `auction_db`, `competition_db`, `notification_db`).
- Each database has a dedicated PostgreSQL user with access only to its own database.
- **One RabbitMQ container** for async messaging.
- Node.js services run directly on the host during development.
- Application containers can be added later; do not add them prematurely.

---

## Capacity Storage Decision

Tournament capacity is **derived**, never stored as a column.

Formula:
- Substitutes disabled: `number_of_teams × team_size`
- Substitutes enabled: `number_of_teams × (team_size + 1)`
- 1v1 never has a substitute

Do not add a `capacity` column unless requirements explicitly change.

---

## Status Representation Decision

Business statuses use `VARCHAR + CHECK` constraints throughout all services.

PostgreSQL ENUMs are not used.

Reason: `VARCHAR + CHECK` allows schema evolution (adding a new status value) without a migration that alters an ENUM type, which requires an `ALTER TYPE` and can be operationally awkward.

---

## Known Architectural Risks

| Risk | Mitigation |
|---|---|
| Microservice complexity (could be a simpler modular monolith) | Accepted — this is intentional for learning/portfolio purposes |
| Distributed transactions (no cross-DB transactions) | Use service-owned transactions; REST for sync consistency; RabbitMQ events for async; idempotent consumers; transactional outbox |
| Auction concurrency | `SELECT ... FOR UPDATE` on auction lots during bid processing |
| Bracket consistency | Only confirmed results or valid forfeits advance the bracket |
| Duplicate events | All event consumers must be idempotent |
