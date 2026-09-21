# Business Rules

Source of truth: `docs/PROJECT-HANDOVER.md`

These rules are FINAL / LOCKED unless explicitly noted otherwise. Do not simplify or remove them.

---

## 1. Team Sizes

Supported team sizes (stored as integer):

- `1` — 1v1
- `2` — 2v2
- `3` — 3v3
- `4` — 4v4

---

## 2. Substitutes

- Substitutes are optional and configured per tournament.
- Substitute rule applies to: 2v2, 3v3, 4v4 only.
- **1v1 never has a substitute**, regardless of the `substitutes_enabled` setting.
- If substitutes are enabled: each team requires exactly one substitute.
- The substitute counts toward required participant capacity.
- The substitute is part of the permanent squad.
- A captain cannot be a substitute.

**In auction tournaments:** the captain decides which purchased player becomes the substitute after the auction.

---

## 3. Capacity Derivation

Capacity is always derived — it is never stored as a separate database column.

| Scenario | Formula |
|---|---|
| Substitutes disabled | `number_of_teams × team_size` |
| Substitutes enabled (2v2, 3v3, 4v4) | `number_of_teams × (team_size + 1)` |
| 1v1 | `number_of_teams × 1` (no substitute) |

---

## 4. Knockout Tournament Requirement

The number of teams must be a power of two:

- 2, 4, 8, 16, ...

This avoids bracket byes in the MVP. No byes are supported.

---

## 5. Captain Rules

- Only the tournament owner assigns captains.
- A captain request is not automatic captain assignment — it is a participant's expression of interest only.
- A captain must have squad status `MAIN`.
- A captain cannot have squad status `SUBSTITUTE`.
- There is exactly one captain per team.

---

## 6. Team Membership Rules

- A participant can belong to only one team within a tournament.
- There is exactly one captain per team.
- There is at most one substitute per team.
- Cross-table consistency (participant → team → tournament) is enforced at the service level, not through cross-service foreign keys.

---

## 7. Join Request Approval

- Owner approves or rejects join requests.
- Capacity must be checked before approving a participant.
- Approving a join request beyond capacity must be rejected.

---

## 8. Tournament Ownership

The tournament owner is responsible for:

- Tournament configuration and lifecycle transitions
- Approving/rejecting participants
- Captain selection
- Team administration
- Match scheduling
- Dispute resolution

Authorization is enforced by the Tournament Service and Competition Service respectively.

---

## 9. Auction Rules

### 9.1 Bidding

- Manual ascending live bidding.
- One live lot at a time.
- Server controls the lot timer via `ends_at`.
- First bid must be at least the starting price.
- Subsequent bids must be at least `current_bid + configured_increment`.
- Concurrent bidding is protected transactionally using `SELECT ... FOR UPDATE` on the auction lot.

### 9.2 Player Purchase (Atomic)

When a player is sold, the following must happen atomically:

1. Lock the auction lot (`SELECT ... FOR UPDATE`)
2. Lock the bidder record
3. Validate the winning bid
4. Deduct the budget from the bidder
5. Create an allocation record
6. Mark the lot as `SOLD`

### 9.3 Unsold Players

Unsold player progression:

```
First auction round
       ↓
    UNSOLD
       ↓
Second auction round
       ↓
    UNSOLD
       ↓
Automatic allocation
```

Remaining unsold players after the second round are automatically allocated deterministically.

> **Not yet finalized:** The exact automatic allocation algorithm (tie-breaking strategy, determinism rules). Do not invent a specific algorithm — this must be discussed before implementation.

### 9.4 Allocation Types

| Type | Description |
|---|---|
| `AUCTION` | Player purchased via bidding |
| `AUTO_ALLOCATION` | Player allocated automatically after second round |

### 9.5 Service Boundary

The Auction Service owns allocation records. It does **not** directly write to the Tournament Service's `team_members` table. Allocation results cross the service boundary through events/integration.

---

## 10. Result Confirmation Rules

- Only a confirmed official result or valid forfeit can advance a team through the bracket.
- A submitted but unconfirmed result does not advance the bracket.
- Disputed results go to the owner for resolution.

---

## 11. Team Withdrawal

If a team withdraws:

- Remaining applicable matches become automatic wins for the opponent.
- The withdrawn team does not continue in the competition.
- Bracket progression must reflect the withdrawal.
- This is represented separately from a normal score-based result.

---

## 12. Forfeit

A forfeit is distinct from a normal match result.

A team withdrawal can cause remaining applicable matches to become forfeits/automatic wins for the opponent.

---

## 13. Password Rules

- Minimum 8 characters, maximum 128 characters.
- Hashed with Argon2id before storage.
- Plaintext password is never stored.
- `password_hash` is never returned in any API response.

---

## 14. Authentication Token Rules

- Access tokens are JWT with claims: `sub`, `iat`, `exp`.
- Access token example lifetime: 15 minutes (configurable).
- Refresh tokens are stored as hashes only — plaintext is never persisted.
- Refresh token example lifetime: 7 days (configurable).
- Refresh tokens are rotated on each refresh.
- Refresh tokens are revoked on logout.
- Password reset invalidates all existing refresh sessions for that user.

---

## 15. Password Reset Security Rule

- Forgot-password endpoint always returns HTTP 202 regardless of whether the email exists.
- This prevents account enumeration attacks.

---

## 16. Error Security Rule

Internal database errors must never reach the client.

Example: PostgreSQL error code `23505` (unique violation) must be translated to:

```json
{
  "error": {
    "code": "EMAIL_ALREADY_EXISTS",
    "message": "An account with this email already exists",
    "details": null
  }
}
```

---

## 17. Email Normalization

Email addresses are always normalized before storage and lookup:

- Trimmed (leading/trailing whitespace removed)
- Converted to lowercase

---

## 18. Email Verification

The database supports `email_verified` but the complete email-verification workflow was not implemented in the M6 registration phase.

> **Not yet finalized:** The full email-verification workflow. Do not invent a separate implementation without discussion.
