# USER-006 — Account deletion + full cascade

**Domain:** user
**Status:** Todo
**Spec:** docs/specs/user/user.md#account-deletion
**Depends on:** ORG-022, ORG-012, ORG-013, ORG-010, PAPER-016, ORG-023, USER-007

## Context
Deleting a Scolar account must leave no dangling state anywhere — with one deliberate exception: the user's `@handle` is **never released**. It removes the user from all orgs, unshares their papers, removes their library (running global-paper GC), deletes orgs they admin (into Ghost Mode), invalidates every pending item referencing the user, and **tombstones** their handle so it can never be reclaimed.

## Scope / Tasks
- Pre-deletion warning summarizing impact (e.g. "This will delete X Orgs with Y members") with an option to transfer Admin first (ORG-010).
- Cascade, per the spec:
  - Remove user from all orgs they're a member of; auto-unshare their shared papers (same as leaving — ORG-022).
  - Delete all library entries; run paper deletion + orphan GC for each (PAPER-016); decrement keywordProfile (handled by the delete path).
  - For every org the user Admins: enter Ghost Mode (ORG-012/ORG-013).
  - Invalidate all pending items tied to the user anywhere: invites sent to them, join requests they submitted, transfer offers sent/received, "request to be Admin" they made.
  - **Tombstone the `@handle`** (USER-007): retain the `/handles/{handle}` doc with `uid` cleared/marked retired — do **not** delete it, so the handle is never recycled.
- Delete the user doc and the Firebase Auth user.

## Acceptance criteria
- [ ] User is removed from all orgs and their shared papers are unshared.
- [ ] All library entries removed; orphaned global papers + their PDFs are cleaned up; keywordProfile gone with the user doc.
- [ ] Admin-owned orgs enter Ghost Mode; user is warned and offered Admin transfer beforehand.
- [ ] No pending invite, join request, transfer offer, or admin request referencing the user remains.
- [ ] The user's `/handles/{handle}` doc is retained as a tombstone (uid cleared/retired), not deleted; the handle cannot be reclaimed.
- [ ] Firebase Auth user + user doc are deleted.

## Affected files
- `src/app/api/account/delete/route.ts` (new)
- Reuses unshare (ORG-022), org-delete/ghost (ORG-012/013), paper GC (PAPER-016) logic
