-- ============================================================
-- Auth Service Database
-- Database: auth_db
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ============================================================
-- 1. USERS
-- ============================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    email VARCHAR(255) NOT NULL,

    password_hash TEXT NOT NULL,

    first_name VARCHAR(100) NOT NULL,

    last_name VARCHAR(100),

    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (
            status IN (
                'ACTIVE',
                'SUSPENDED',
                'DEACTIVATED'
            )
        ),

    email_verified BOOLEAN NOT NULL DEFAULT false,

    last_login_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- USER INDEXES
-- ============================================================

CREATE UNIQUE INDEX uq_users_email_lower
ON users (LOWER(email));

CREATE INDEX idx_users_status
ON users(status);


-- ============================================================
-- 2. REFRESH TOKENS
-- ============================================================

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    token_hash TEXT NOT NULL,

    expires_at TIMESTAMPTZ NOT NULL,

    revoked_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    last_used_at TIMESTAMPTZ,

    CHECK (
        revoked_at IS NULL
        OR revoked_at >= created_at
    )
);


-- ============================================================
-- REFRESH TOKEN INDEXES
-- ============================================================

CREATE UNIQUE INDEX uq_refresh_tokens_hash
ON refresh_tokens(token_hash);

CREATE INDEX idx_refresh_tokens_user_id
ON refresh_tokens(user_id);

CREATE INDEX idx_refresh_tokens_expires_at
ON refresh_tokens(expires_at);

CREATE INDEX idx_refresh_tokens_active
ON refresh_tokens(user_id, expires_at)
WHERE revoked_at IS NULL;


-- ============================================================
-- 3. PASSWORD RESET TOKENS
-- ============================================================

CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    token_hash TEXT NOT NULL,

    expires_at TIMESTAMPTZ NOT NULL,

    used_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (
        used_at IS NULL
        OR used_at >= created_at
    )
);


-- ============================================================
-- PASSWORD RESET TOKEN INDEXES
-- ============================================================

CREATE UNIQUE INDEX uq_password_reset_tokens_hash
ON password_reset_tokens(token_hash);

CREATE INDEX idx_password_reset_tokens_user_id
ON password_reset_tokens(user_id);

CREATE INDEX idx_password_reset_tokens_expires_at
ON password_reset_tokens(expires_at);

CREATE INDEX idx_password_reset_tokens_active
ON password_reset_tokens(user_id, expires_at)
WHERE used_at IS NULL;