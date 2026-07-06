# ORG-025 — Firestore security rules + indexes

**Domain:** org (cross-cutting)  
**Status:** Recurring  
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
- [x] Rules enforce the full permissions table; unauthorized writes are denied. **All writes are server-side (`firebase-admin`, bypasses rules), so rules deny every client write (`allow write: if false`) and gate the table's *read* rows; the *mutation* rules live in the route handlers — see nuance N-004.** Added the public-org `sharedPapers` list-access read (any authed user) to match the table.
- [x] `/handles/{handle}` is readable but not client-writable; reservations/tombstones only succeed via the server transaction.
- [x] Collection-group `library` (paperId) and the vector/publicOrgIds indexes exist. **`library.paperId` CG index present; added the composite vector index (`publicOrgIds` array-contains + `embedding`) for the similarity-search pre-filter (PAPER-011/014).**
- [ ] Discovery/search queries have their required composite indexes. **Deferred (iterative): those queries aren't built and their doc shapes aren't final (`deletedAt` vs `status`, `joinPolicy: 'invite'` vs `'invite-only'`); add per-query when the discovery/search features land.**

## Affected files
- `firestore.rules`
- `firestore.indexes.json`

## Test commands
- **Unit:** N/A — security rules are validated by the rules lane, not a pure unit test.
- **E2E:** N/A — rule enforcement is asserted directly against the emulator.
- **Rules:** `tests/rules/firestore-rules.test.ts`
  - Lane: `npm run test:rules`
  - Single file: `firebase emulators:exec --project demo-paper --only firestore 'npx vitest run --config vitest.rules.config.ts tests/rules/firestore-rules.test.ts'`
