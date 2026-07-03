# ORG-013 — Ghost Mode lifecycle (status field)

**Domain:** org  
**Status:** Todo  
**Spec:** docs/specs/org/org-membership.md#deleting-an-org  
**Depends on:** ORG-001

## Context
An org's lifecycle is tracked via `status: 'active' | 'stepdown' | 'ghost'`. Ghost Mode is the 7-day soft-delete state entered on Admin deletion, Step-Down expiry, or Admin account deletion. It softens the experience for members but is not a recovery window.

## Scope / Tasks
- Add `status` field (+ `stepDownExpiresAt` for stepdown, `deletedAt` for ghost) to the org doc.
- During Ghost Mode (7 days): all features disabled; detail page shows "This Org has been deleted X ago by the admin." (reads `deletedAt`); org still appears greyed-out in each member's org list.
- After 7 days: org removed from all listings, search, and members' org lists (no longer discoverable).
- Gate all org actions on `status == 'active'` (stepdown allows normal operation + request-to-be-admin).

## Acceptance criteria
- [ ] Org doc carries `status` with `stepDownExpiresAt`/`deletedAt` as appropriate.
- [ ] Ghost orgs disable all features and show the "deleted X ago" message; appear greyed in member lists.
- [ ] After 7 days the org disappears from all listings/search/member lists.
- [ ] No restore path exists.

## Affected files
- org doc model + `src/app/api/orgs/[orgId]/route.ts`
- org detail page + org list rendering

## Test commands
- **Unit:** _No unit test yet_ — run the lane with `npm test`; add `src/…/<name>.test.{ts,tsx}` (single file: `npx vitest run <path>`).
- **E2E:** _No e2e spec yet_ — run the lane with `npm run test:e2e`; add `e2e/<name>.spec.ts`.
