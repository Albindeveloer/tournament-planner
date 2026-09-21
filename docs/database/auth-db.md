# Auth Database

Database: `auth_db`
Owner: Auth Service
User: `auth_user`

Source of truth: `docs/PROJECT-HANDOVER.md` §15

---

## Tables

- `users`
- `refresh_tokens`
- `password_reset_tokens`
- `schema_migrations` (migration tracking)

---

## users

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'SUSPENDED', 'DEACTIVATED')),
    email_verified BOOLEAN NOT NULL DEFAULT false,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_users_email_lower
ON users (LOWER(email));

CREATE INDEX idx_users_status
ON users(status);
```

**Key rules:**
- `password_hash` is never returned in API responses
- Email uniqueness is enforced case-insensitively via the functional unique index
- `status` uses `VARCHAR + CHECK`, not a PostgreSQL ENUM
- UUID generated with `gen_random_uuid()` via the `pgcrypto` extension

---

## refresh_tokens

```sql
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    CHECK (revoked_at IS NULL OR revoked_at >= created_at)
);

CREATE UNIQUE INDEX uq_refresh_tokens_hash
ON refresh_tokens(token_hash);

CREATE INDEX idx_refresh_tokens_user_id
ON refresh_tokens(user_id);

CREATE INDEX idx_refresh_tokens_expires_at
ON refresh_tokens(expires_at);

CREATE INDEX idx_refresh_tokens_active
ON refresh_tokens(user_id, expires_at)
WHERE revoked_at IS NULL;
```

**Key rules:**
- Plaintext refresh token is never stored — only the hash
- Tokens can be revoked (`revoked_at`)
- Tokens expire (`expires_at`)
- The partial index (`WHERE revoked_at IS NULL`) optimizes active token lookups
- `ON DELETE CASCADE` removes tokens when the user is deleted

---

## password_reset_tokens

```sql
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (used_at IS NULL OR used_at >= created_at)
);

CREATE UNIQUE INDEX uq_password_reset_tokens_hash
ON password_reset_tokens(token_hash);

CREATE INDEX idx_password_reset_tokens_user_id
ON password_reset_tokens(user_id);

CREATE INDEX idx_password_reset_tokens_expires_at
ON password_reset_tokens(expires_at);

CREATE INDEX idx_password_reset_tokens_active
ON password_reset_tokens(user_id, expires_at)
WHERE used_at IS NULL;
```

**Key rules:**
- Plaintext reset token is never stored — only the hash
- Tokens are one-time use (`used_at` marks consumption)
- Tokens expire (`expires_at`)
- The partial index optimizes active (unused) token lookups

---

## Migration Strategy

- SQL migration files in `apps/auth-service/migrations/`
- Custom Node.js migration runner using `pg`
- Migration state tracked in `schema_migrations` table
- Applied migrations are skipped on re-run
- `pgcrypto` extension required for `gen_random_uuid()`
