-- ============================================================
-- Tournament Service Database
-- Database: tournament_db
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ============================================================
-- 1. TOURNAMENTS
-- ============================================================

CREATE TABLE tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Cross-service reference to auth_db.users — no FK constraint
    owner_id UUID NOT NULL,

    name VARCHAR(200) NOT NULL,

    description TEXT,

    game VARCHAR(50) NOT NULL
        CHECK (game IN ('EFOOTBALL')),

    format VARCHAR(20) NOT NULL
        CHECK (format IN ('KNOCKOUT', 'LEAGUE')),

    team_size INTEGER NOT NULL
        CHECK (team_size IN (1, 2, 3, 4)),

    number_of_teams INTEGER NOT NULL
        CHECK (number_of_teams >= 2),

    substitutes_enabled BOOLEAN NOT NULL DEFAULT false,

    team_formation_mode VARCHAR(10) NOT NULL DEFAULT 'MANUAL'
        CHECK (team_formation_mode IN ('MANUAL', 'AUCTION')),

    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT'
        CHECK (
            status IN (
                'DRAFT',
                'REGISTRATION_OPEN',
                'REGISTRATION_CLOSED',
                'TEAM_FORMATION',
                'TEAMS_FINALIZED',
                'FIXTURES_GENERATED',
                'SCHEDULED',
                'IN_PROGRESS',
                'COMPLETED',
                'CANCELLED'
            )
        ),

    registration_start_at TIMESTAMPTZ,

    registration_end_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- TOURNAMENT INDEXES
-- ============================================================

CREATE INDEX idx_tournaments_owner_id
ON tournaments(owner_id);

CREATE INDEX idx_tournaments_status
ON tournaments(status);

CREATE INDEX idx_tournaments_game
ON tournaments(game);


-- ============================================================
-- 2. TOURNAMENT PARTICIPANTS
-- ============================================================

CREATE TABLE tournament_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    tournament_id UUID NOT NULL
        REFERENCES tournaments(id)
        ON DELETE CASCADE,

    -- Cross-service reference to auth_db.users — no FK constraint
    user_id UUID NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'APPROVED'
        CHECK (status IN ('APPROVED', 'WITHDRAWN')),

    withdrawn_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- withdrawn_at must be consistent with WITHDRAWN status
    CHECK (
        withdrawn_at IS NULL
        OR status = 'WITHDRAWN'
    ),

    UNIQUE (tournament_id, user_id)
);


-- ============================================================
-- TOURNAMENT PARTICIPANT INDEXES
-- ============================================================

CREATE INDEX idx_tournament_participants_tournament_id
ON tournament_participants(tournament_id);

CREATE INDEX idx_tournament_participants_user_id
ON tournament_participants(user_id);

CREATE INDEX idx_tournament_participants_active
ON tournament_participants(tournament_id, status)
WHERE status = 'APPROVED';


-- ============================================================
-- 3. INVITATIONS
-- ============================================================

CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    tournament_id UUID NOT NULL
        REFERENCES tournaments(id)
        ON DELETE CASCADE,

    -- Cross-service reference to auth_db.users — no FK constraint
    invitee_id UUID NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (
            status IN (
                'PENDING',
                'ACCEPTED',
                'REJECTED',
                'EXPIRED',
                'CANCELLED'
            )
        ),

    expires_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- INVITATION INDEXES
-- ============================================================

-- Only one active (PENDING) invitation per invitee per tournament.
-- Allows re-inviting after a prior invitation is cancelled or expired.
CREATE UNIQUE INDEX uq_invitations_pending
ON invitations(tournament_id, invitee_id)
WHERE status = 'PENDING';

CREATE INDEX idx_invitations_tournament_id
ON invitations(tournament_id);

CREATE INDEX idx_invitations_invitee_id
ON invitations(invitee_id);

CREATE INDEX idx_invitations_status
ON invitations(tournament_id, status);


-- ============================================================
-- 4. JOIN REQUESTS
-- ============================================================

CREATE TABLE join_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    tournament_id UUID NOT NULL
        REFERENCES tournaments(id)
        ON DELETE CASCADE,

    -- Cross-service reference to auth_db.users — no FK constraint
    user_id UUID NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (
            status IN (
                'PENDING',
                'APPROVED',
                'REJECTED',
                'CANCELLED'
            )
        ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- JOIN REQUEST INDEXES
-- ============================================================

-- Only one active (PENDING) join request per user per tournament.
-- Allows re-requesting after a prior request is rejected or cancelled.
CREATE UNIQUE INDEX uq_join_requests_pending
ON join_requests(tournament_id, user_id)
WHERE status = 'PENDING';

CREATE INDEX idx_join_requests_tournament_id
ON join_requests(tournament_id);

CREATE INDEX idx_join_requests_user_id
ON join_requests(user_id);


-- ============================================================
-- 5. CAPTAIN REQUESTS
-- ============================================================

CREATE TABLE captain_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    tournament_id UUID NOT NULL
        REFERENCES tournaments(id)
        ON DELETE CASCADE,

    participant_id UUID NOT NULL
        REFERENCES tournament_participants(id)
        ON DELETE CASCADE,

    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'REJECTED', 'CANCELLED')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (tournament_id, participant_id)
);


-- ============================================================
-- CAPTAIN REQUEST INDEXES
-- ============================================================

CREATE INDEX idx_captain_requests_tournament_id
ON captain_requests(tournament_id);

CREATE INDEX idx_captain_requests_participant_id
ON captain_requests(participant_id);


-- ============================================================
-- 6. TEAMS
-- ============================================================

CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    tournament_id UUID NOT NULL
        REFERENCES tournaments(id)
        ON DELETE CASCADE,

    name VARCHAR(100) NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'FORMING'
        CHECK (status IN ('FORMING', 'READY', 'ELIMINATED', 'WITHDRAWN')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (tournament_id, name)
);


-- ============================================================
-- TEAM INDEXES
-- ============================================================

CREATE INDEX idx_teams_tournament_id
ON teams(tournament_id);

CREATE INDEX idx_teams_status
ON teams(tournament_id, status);


-- ============================================================
-- 7. TEAM MEMBERS
-- ============================================================

CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    team_id UUID NOT NULL
        REFERENCES teams(id)
        ON DELETE CASCADE,

    participant_id UUID NOT NULL
        REFERENCES tournament_participants(id)
        ON DELETE CASCADE,

    member_role VARCHAR(20) NOT NULL
        CHECK (member_role IN ('PLAYER', 'CAPTAIN')),

    squad_status VARCHAR(20) NOT NULL
        CHECK (squad_status IN ('MAIN', 'SUBSTITUTE')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Captain must always be a main squad player
    CHECK (
        member_role != 'CAPTAIN'
        OR squad_status = 'MAIN'
    ),

    -- A participant can only belong to one team per tournament.
    -- participant_id already encodes (tournament, user) uniqueness
    -- via tournament_participants, so this enforces the cross-team rule.
    UNIQUE (participant_id)
);


-- ============================================================
-- TEAM MEMBER INDEXES
-- ============================================================

CREATE INDEX idx_team_members_team_id
ON team_members(team_id);

-- At most one captain per team
CREATE UNIQUE INDEX uq_team_members_captain
ON team_members(team_id)
WHERE member_role = 'CAPTAIN';

-- At most one substitute per team
CREATE UNIQUE INDEX uq_team_members_substitute
ON team_members(team_id)
WHERE squad_status = 'SUBSTITUTE';
