-- ============================================================
-- Auction Service Database
-- Database: auction_db
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ============================================================
-- 1. AUCTIONS
-- ============================================================

CREATE TABLE auctions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Cross-service reference to tournament_db.tournaments — no FK constraint
    tournament_id UUID NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
        CHECK (
            status IN (
                'DRAFT',
                'READY',
                'IN_PROGRESS',
                'COMPLETED',
                'CANCELLED'
            )
        ),

    -- Minimum increment between consecutive bids on the same lot
    bid_increment NUMERIC(10, 2) NOT NULL DEFAULT 1
        CHECK (bid_increment > 0),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One auction per tournament
    UNIQUE (tournament_id)
);


-- ============================================================
-- AUCTION INDEXES
-- ============================================================

CREATE INDEX idx_auctions_status
ON auctions(status);


-- ============================================================
-- 2. AUCTION ROUNDS
-- ============================================================

CREATE TABLE auction_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    auction_id UUID NOT NULL
        REFERENCES auctions(id)
        ON DELETE CASCADE,

    round_number INTEGER NOT NULL
        CHECK (round_number >= 1),

    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (
            status IN (
                'PENDING',
                'IN_PROGRESS',
                'COMPLETED',
                'CANCELLED'
            )
        ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One record per round number per auction
    UNIQUE (auction_id, round_number)
);


-- ============================================================
-- AUCTION ROUND INDEXES
-- ============================================================

CREATE INDEX idx_auction_rounds_auction_id
ON auction_rounds(auction_id);

CREATE INDEX idx_auction_rounds_status
ON auction_rounds(auction_id, status);


-- ============================================================
-- 3. AUCTION BIDDERS
-- ============================================================

-- Represents a captain/team registered to participate in an auction.
-- budget_remaining is decremented atomically on each successful purchase.

CREATE TABLE auction_bidders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    auction_id UUID NOT NULL
        REFERENCES auctions(id)
        ON DELETE CASCADE,

    -- Cross-service references to tournament_db — no FK constraints
    team_id UUID NOT NULL,
    captain_id UUID NOT NULL,

    budget NUMERIC(10, 2) NOT NULL
        CHECK (budget > 0),

    budget_remaining NUMERIC(10, 2) NOT NULL
        CHECK (budget_remaining >= 0),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- budget_remaining cannot exceed the original budget
    CHECK (budget_remaining <= budget),

    -- One bidder entry per team per auction
    UNIQUE (auction_id, team_id)
);


-- ============================================================
-- AUCTION BIDDER INDEXES
-- ============================================================

CREATE INDEX idx_auction_bidders_auction_id
ON auction_bidders(auction_id);

CREATE INDEX idx_auction_bidders_team_id
ON auction_bidders(auction_id, team_id);


-- ============================================================
-- 4. AUCTION LOTS
-- ============================================================

-- Represents a single player/participant being auctioned in a round.
-- current_bid and current_bidder_id are updated in-place as bids arrive,
-- protected by SELECT ... FOR UPDATE at the service layer.
-- ends_at is set by the server when the lot goes LIVE.

CREATE TABLE auction_lots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    auction_round_id UUID NOT NULL
        REFERENCES auction_rounds(id)
        ON DELETE CASCADE,

    -- Cross-service reference to tournament_db.tournament_participants
    participant_id UUID NOT NULL,

    starting_price NUMERIC(10, 2) NOT NULL
        CHECK (starting_price >= 0),

    -- Null until the first bid is placed
    current_bid NUMERIC(10, 2),

    -- Null until the first bid is placed
    current_bidder_id UUID
        REFERENCES auction_bidders(id),

    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (
            status IN (
                'PENDING',
                'LIVE',
                'SOLD',
                'UNSOLD',
                'CANCELLED'
            )
        ),

    -- Populated when the lot closes as SOLD
    winning_bid NUMERIC(10, 2),

    -- References the bidder who won; winning_bidder_id.team_id is the team
    winning_bidder_id UUID
        REFERENCES auction_bidders(id),

    -- Set by the server when the lot goes LIVE
    ends_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- winning_bid and winning_bidder_id must both be set or both null
    CHECK (
        (winning_bid IS NULL) = (winning_bidder_id IS NULL)
    ),

    -- A participant can appear only once per round
    UNIQUE (auction_round_id, participant_id)
);


-- ============================================================
-- AUCTION LOT INDEXES
-- ============================================================

CREATE INDEX idx_auction_lots_auction_round_id
ON auction_lots(auction_round_id);

CREATE INDEX idx_auction_lots_participant_id
ON auction_lots(participant_id);

-- Fast lookup of the currently LIVE lot within a round
CREATE INDEX idx_auction_lots_live
ON auction_lots(auction_round_id)
WHERE status = 'LIVE';

CREATE INDEX idx_auction_lots_status
ON auction_lots(auction_round_id, status);


-- ============================================================
-- 5. BIDS
-- ============================================================

-- Immutable bid history — rows are only inserted, never updated.
-- Bid validation (starting_price, increment) is enforced at service level.

CREATE TABLE bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    auction_lot_id UUID NOT NULL
        REFERENCES auction_lots(id)
        ON DELETE CASCADE,

    bidder_id UUID NOT NULL
        REFERENCES auction_bidders(id),

    amount NUMERIC(10, 2) NOT NULL
        CHECK (amount > 0),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- BID INDEXES
-- ============================================================

CREATE INDEX idx_bids_auction_lot_id
ON bids(auction_lot_id);

CREATE INDEX idx_bids_bidder_id
ON bids(bidder_id);

-- Chronological bid history per lot
CREATE INDEX idx_bids_lot_created
ON bids(auction_lot_id, created_at);


-- ============================================================
-- 6. ALLOCATIONS
-- ============================================================

-- Final player-to-team assignment after a lot closes.
-- AUCTION: player was sold in a live bidding round.
-- AUTO_ALLOCATION: player was unsold after both rounds and auto-assigned.
-- auction_lot_id always references the lot that produced this allocation
-- (the round-2 lot for auto-allocated players).

CREATE TABLE allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    auction_id UUID NOT NULL
        REFERENCES auctions(id)
        ON DELETE CASCADE,

    auction_lot_id UUID NOT NULL
        REFERENCES auction_lots(id),

    -- Cross-service reference to tournament_db.tournament_participants
    participant_id UUID NOT NULL,

    bidder_id UUID NOT NULL
        REFERENCES auction_bidders(id),

    allocation_type VARCHAR(20) NOT NULL
        CHECK (allocation_type IN ('AUCTION', 'AUTO_ALLOCATION')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One allocation per lot
    UNIQUE (auction_lot_id),

    -- One allocation per participant per auction
    UNIQUE (auction_id, participant_id)
);


-- ============================================================
-- ALLOCATION INDEXES
-- ============================================================

CREATE INDEX idx_allocations_auction_id
ON allocations(auction_id);

CREATE INDEX idx_allocations_bidder_id
ON allocations(auction_id, bidder_id);

CREATE INDEX idx_allocations_participant_id
ON allocations(participant_id);
