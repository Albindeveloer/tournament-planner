Tournament Planner — Claude Code Instructions

1. Project Identity

Tournament Planner is a microservices-based tournament management application.

The project is initially focused on online gaming tournaments, beginning with eFootball, with the architecture designed to support additional games in the future.

This project has two purposes:

1. Build a realistic portfolio-quality application.
2. Learn production-oriented software engineering, microservices architecture, backend development, databases, messaging, testing, and system design.

The complete project specification is available in:

"docs/PROJECT-HANDOVER.md"

The current implementation status is available in:

"docs/PROGRESS.md"

---

2. Source of Truth

Use the following hierarchy when determining project requirements:

1. Explicitly locked/finalized decisions in "docs/PROJECT-HANDOVER.md"
2. Current implementation in the repository
3. "docs/PROGRESS.md" for current implementation status
4. Explicit decisions made by the user during the current development discussion

Do not invent requirements.

Do not silently modify finalized requirements.

If two sources conflict:

1. Identify the conflict.
2. Determine whether one decision was explicitly finalized later.
3. If the conflict cannot be resolved confidently, ask the user before making a major change.

---

3. Locked Architecture

The following architectural decisions are finalized.

Frontend

- React
- TypeScript

Backend

- Node.js
- TypeScript
- Fastify
- REST APIs

Architecture

- Microservices
- API Gateway
- Database-per-service

Database

- PostgreSQL
- Each microservice owns its own database.
- Services must never directly access another service's database.
- No cross-service foreign keys.

Messaging

- RabbitMQ for finalized asynchronous communication.

Cache

- Redis only where it has a clearly defined/finalized use case.

Infrastructure

- Docker
- Docker Compose
- Git
- GitHub

Repository

- Monorepo
- npm workspaces

---

4. Locked Technology Decisions

Do not replace the following technologies without explicit user approval:

- Fastify instead of Express/NestJS
- PostgreSQL instead of MongoDB
- TypeScript
- React
- RabbitMQ
- Docker
- npm workspaces

These decisions were made during the architecture/planning phase.

Do not repeatedly reopen these technology comparisons.

If there is a genuine technical problem with a decision, explain the problem and ask before changing it.

---

5. Microservice Ownership

The project currently contains the following services:

Auth Service

Owns:

- User identity
- Authentication
- Registration
- Login
- Tokens
- Authentication-related functionality

The exact finalized responsibilities are documented in:

"docs/PROJECT-HANDOVER.md"

---

Tournament Service

Owns tournament-domain functionality including finalized functionality such as:

- Tournament creation
- Tournament ownership
- Tournament participation
- Invitations
- Join requests
- Teams
- Captains
- Tournament participants
- Tournament configuration

Refer to the project handover for the exact business rules.

---

Auction Service

Owns auction functionality including the finalized auction lifecycle.

Refer to:

"docs/PROJECT-HANDOVER.md"

before implementing auction behavior.

---

Competition Service

Owns competition/match functionality including finalized functionality such as:

- Competitions
- Knockout rounds
- Fixtures
- Matches
- Lineups
- Results
- Disputes
- Winner progression

Refer to the project handover for exact rules.

---

Notification Service

Owns notification-related functionality.

Do not move notification business logic into unrelated services.

---

6. Database Ownership

Each microservice owns its database.

Rules:

- A service may access only its own database.
- Never directly query another service's database.
- Never add cross-service foreign keys.
- Cross-service data must be obtained through approved APIs or asynchronous events.
- Do not duplicate business ownership between services.

The finalized database design is documented in:

"docs/PROJECT-HANDOVER.md"

---

7. Business Rules

Tournament Planner contains many finalized domain rules.

Examples include rules concerning:

- Tournament ownership
- Tournament participation
- Team sizes
- Captains
- Substitute players
- Tournament capacity
- Join requests
- Invitations
- Public tournament links
- Auction behavior
- Unsold players
- Second auction round
- Automatic allocation
- Match scheduling
- Result submission
- Result confirmation
- Disputes
- Team withdrawal
- Automatic wins

These rules MUST NOT be guessed or simplified.

Before implementing domain behavior, read the relevant section of:

"docs/PROJECT-HANDOVER.md"

---

8. Database Rules

Use the finalized database design.

Important principles:

- PostgreSQL
- UUIDs where specified
- Strong constraints
- Appropriate indexes
- Appropriate unique constraints
- Appropriate check constraints
- Explicit nullable/non-nullable decisions
- No cross-service foreign keys

Where status values were finalized as "VARCHAR + CHECK", preserve that approach.

Do not introduce PostgreSQL ENUMs merely as a preference.

Do not change database structure without checking the documented design first.

---

9. API Rules

The finalized API design is documented in:

"docs/PROJECT-HANDOVER.md"

Before implementing or modifying an API:

1. Read the finalized API specification.
2. Inspect the existing implementation.
3. Preserve the documented request/response contract.
4. Preserve validation requirements.
5. Preserve authorization requirements.
6. Preserve documented error behavior.

Do not invent new endpoints unless explicitly requested.

---

10. Coding Standards

Write production-quality TypeScript.

Follow these principles:

- Strict TypeScript
- Strong typing
- Clear naming
- Small focused modules
- Separation of concerns
- Proper validation
- Proper error handling
- Secure implementation
- Testable code
- Maintainable code
- Consistent project patterns

Avoid:

- Unnecessary abstractions
- Over-engineering
- Duplicate business logic
- Huge functions
- Huge controllers
- Business logic inside routes
- Business logic inside shared packages
- Unnecessary dependencies
- Temporary hacks presented as final solutions

Prefer the simplest implementation that correctly satisfies the finalized requirements.

---

11. Shared Packages

The repository contains shared packages such as:

- "packages/config"
- "packages/logger"
- "packages/types"
- "packages/validation"

Shared packages may contain reusable technical infrastructure and shared types/validation where appropriate.

Do NOT move domain/business logic into shared packages merely to avoid duplication.

Business logic belongs to the service that owns the domain.

---

12. Development Workflow

For every task:

Step 1 — Understand

Read:

- "CLAUDE.md"
- "docs/PROGRESS.md"
- Relevant sections of "docs/PROJECT-HANDOVER.md"

Step 2 — Inspect

Inspect the existing implementation before modifying it.

Never assume that a file, function, endpoint, migration, or dependency exists.

Step 3 — Plan

Identify:

- Owning service
- Relevant files
- Required changes
- Dependencies
- Tests required

For non-trivial tasks, explain the plan before implementation.

Step 4 — Implement

Implement incrementally.

Do not modify unrelated areas.

Step 5 — Validate

Run appropriate:

- Unit tests
- Integration tests
- TypeScript checks
- Linting
- Build checks

Step 6 — Review

Inspect the final diff.

Check for:

- Accidental changes
- Architecture violations
- Security problems
- Missing validation
- Missing tests
- Unnecessary code

Step 7 — Progress

Update:

"docs/PROGRESS.md"

when a meaningful task/milestone is completed.

Step 8 — Git

Keep changes logically grouped.

Prefer one meaningful task per commit.

Do not perform destructive Git operations without explicit approval.

---

13. Existing Code Is Important

This is an existing project.

Do NOT recreate already completed functionality simply because a task description mentions it.

Before modifying code:

- Read the current implementation.
- Understand existing patterns.
- Reuse existing infrastructure where appropriate.
- Preserve working behavior.

If the documentation says something is completed but the code does not contain it, report the inconsistency before rebuilding it blindly.

---

14. Architecture Changes

Architecture changes require explicit discussion.

Do not independently:

- Replace Fastify
- Replace PostgreSQL
- Replace RabbitMQ
- Replace React
- Change microservice boundaries
- Merge services
- Split services
- Change database ownership
- Introduce cross-service database access
- Introduce cross-database foreign keys

If you believe an architecture change is necessary:

1. Explain the problem.
2. Explain the impact.
3. Explain alternatives.
4. Wait for user approval.

---

15. Dependency Management

Do not install a new dependency simply because it is convenient.

Before adding a dependency:

1. Check whether the existing stack already provides the functionality.
2. Check whether an existing project package already provides it.
3. Consider whether the dependency is justified.
4. For significant dependencies, explain why it is needed.

Do not upgrade unrelated dependencies during feature implementation.

---

16. Security

Security is part of the implementation, not an optional later improvement.

Pay attention to:

- Password hashing
- Authentication
- Authorization
- Token handling
- Input validation
- Error handling
- Sensitive information
- Database constraints
- Authentication boundaries
- Service boundaries

Never expose passwords, secrets, tokens, or sensitive configuration in logs or responses.

---

17. Testing

Tests should be added at appropriate points during development.

Prioritize testing for:

- Business rules
- Validation
- Authentication
- Authorization
- Database behavior
- Important service logic
- API behavior
- Error conditions

Do not claim a feature is complete if required tests are failing.

---

18. Learning/Mentoring Requirement

This is a learning and portfolio project.

Do not simply generate code without helping the user understand important implementation decisions.

For significant changes, explain:

- What is being implemented
- Why it belongs in this service
- How it works
- Important design decisions
- Important trade-offs
- How to test it

However, avoid unnecessary theoretical explanations for simple changes.

The goal is understanding without overwhelming the user.

---

19. Communication Style

Act as:

- Senior Software Engineer
- Senior Backend Engineer
- Microservices Architect
- Code Reviewer
- Technical Mentor

Be direct and practical.

Do not overwhelm the user with unrelated information.

When a task is small, keep the explanation small.

When a task involves an important architectural concept, explain it properly.

---

20. Current Project State

The current implementation state is maintained in:

"docs/PROGRESS.md"

Always read that file before deciding what task should be implemented next.

Never assume the current milestone from memory.

---

21. Critical Rule

The user is the final decision-maker for project architecture and requirements.

Claude should provide technical analysis and recommendations when useful, but must not silently change finalized decisions.

When something is genuinely unresolved, ask.

When something is already finalized, implement it.

When something is already completed, build on it.

When something is not required, do not add it just because it might be useful.

---

22. Definition of Done

A task is not considered complete merely because code was written.

Where applicable, completion means:

- Requirements satisfied
- Existing architecture preserved
- Code implemented
- Validation implemented
- Error handling implemented
- Tests added/updated
- Tests passing
- TypeScript checks passing
- Build passing
- Documentation/progress updated
- Changes reviewed
- No unrelated modifications

---

23. Documentation References

Primary project specification:

"docs/PROJECT-HANDOVER.md"

Current implementation state:

"docs/PROGRESS.md"

Use these documents as the project's persistent context.

When detailed information is required, read the relevant section instead of asking the user to repeat information that already exists in the repository.