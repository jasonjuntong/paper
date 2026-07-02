# ORG-025 — Firestore security rules + indexes

**Domain:** org (cross-cutting)  
**Status:** Partial  
**Spec:** docs/specs/org/org-papers-permissions.md#permissions-summary  
**Depends on:** —

## Context
The permissions table and data model require Firestore security rules and composite/collection-group indexes to enforce access and keep queries fast. Established early as a baseline, then iterated as each feature lands.

## Scope / Tasks
- Security rules enforcing the permissions table: org create (any authed), Admin-only mutations (edit/visibility/policy/invite/revoke/approve/reject/kick/transfer/step-down/delete), member-only content access, owner-only share/unshare, public-org list access.
- `/handles/{handle}` rules (USER-007): readable for availability checks; client writes locked down (reservation/tombstone happen via server transaction only) so handles can't be grabbed or freed outside the registration/deletion flows.
- Indexes: collection-group `library` by `paperId` ASC (orphan check, PAPER-016); vector index on `/papers.embedding` + `publicOrgIds` pre-filter (PAPER-011/014); any composite indexes for discovery/search queries.
- Keep `firestore.rules` and `firestore.indexes.json` in sync as features add queries.

## Acceptance criteria
- [ ] Rules enforce the full permissions table; unauthorized writes are denied.
- [x] `/handles/{handle}` is readable but not client-writable; reservations/tombstones only succeed via the server transaction.
- [ ] Collection-group `library` (paperId) and the vector/publicOrgIds indexes exist.
- [ ] Discovery/search queries have their required composite indexes.

## Affected files
- `firestore.rules`
- `firestore.indexes.json`
