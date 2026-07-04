# ORG-008 — Kick member (+ auto-unshare)

**Domain:** org  
**Status:** Todo  
**Spec:** docs/specs/org/org-membership.md#leaving-an-org  
**Depends on:** ORG-022, ORG-023

## Context
The Admin can kick a Member. All of that member's papers shared to the org are automatically unshared, and the kicked user is notified.

## Scope / Tasks
- Admin-only kick action.
- Auto-unshare the kicked member's shared papers from this org (ORG-022 logic: snapshot delete + paperCount/publicOrgIds upkeep).
- Send "kicked" notification (ORG-023).

## Acceptance criteria
- [ ] Only the Admin can kick a Member.
- [ ] Kicked member's shared papers are unshared from the org with counters/flags maintained.
- [ ] Kicked user receives a notification.

## Affected files
- `src/app/api/orgs/[orgId]/members/[uid]/route.ts` (new, DELETE)
- reuses ORG-022 unshare, ORG-023 notifications

## Test commands
- **Unit:** _No unit test yet._
  - Lane: `npm test`
  - Single file: `npx vitest run <path>` (add `src/…/<name>.test.{ts,tsx}`)
- **E2E:** _No e2e spec yet._
  - Lane: `npm run test:e2e`
  - Single file: `firebase emulators:exec --project demo-paper --only auth,firestore 'npx playwright test <name>'` (add `e2e/<name>.spec.ts`)
