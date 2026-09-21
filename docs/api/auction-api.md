# Auction API

Service: Auction Service
Base prefix: `/api/v1`

Source of truth: `docs/PROJECT-HANDOVER.md` §24

---

## Finalized Endpoint Set

The following endpoint categories are finalized. Exact route paths must follow the handover contract when implemented.

---

## Auctions

| Operation | Purpose |
|---|---|
| Create auction | Create an auction for a tournament |
| Get auction | Get auction details |
| Patch auction | Update auction configuration |
| Ready auction | Transition auction to `READY` |
| Start auction | Transition auction to `IN_PROGRESS` |
| Cancel auction | Cancel the auction |

---

## Auction Rounds

| Operation | Purpose |
|---|---|
| Create round | Create an auction round |
| List rounds | List rounds for an auction |
| Get round | Get a specific round |

---

## Auction Bidders

| Operation | Purpose |
|---|---|
| Add bidder | Register a captain/team as a bidder |
| List bidders | List registered bidders |

---

## Auction Lots

| Operation | Purpose |
|---|---|
| Create lot | Create a lot (player to be auctioned) |
| List lots | List lots for a round |
| Get lot | Get a specific lot |
| Open lot | Set lot status to `LIVE` |
| Close lot | Close the live lot |

**Rule:** Only one lot can be `LIVE` at a time per auction.

---

## Bids

| Operation | Purpose |
|---|---|
| Create bid | Submit a bid on a live lot |
| List bids | List bids for a lot |

**Bid rules:**
- First bid >= starting price
- Subsequent bids >= `current_bid + configured_increment`
- Concurrent bids are protected with `SELECT ... FOR UPDATE` on the lot

---

## Allocations

| Operation | Purpose |
|---|---|
| List allocations | List allocations for an auction |
| Auto-allocate | Trigger automatic allocation of remaining unsold players |

---

## Auction Completion

| Operation | Purpose |
|---|---|
| Complete auction | Finalize the auction and transition to `COMPLETED` |

---

## Authorization

Only authorized participants (captains for bidding, owners for auction management) can perform these operations. Authorization is enforced inside the Auction Service.
