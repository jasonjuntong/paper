# ORG-005 — Private-with-no-members warning

**Domain:** org  
**Status:** Todo  
**Spec:** docs/specs/org/org-overview.md#visibility  
**Depends on:** ORG-003

## Context
Setting an org private with no other members is allowed (e.g. staging a library before flipping public), but the Admin should be warned about the invite limitation — you can only invite users who share another org with you, so an empty private org may not be able to grow.

## Scope / Tasks
- Show an informational (non-blocking) warning when choosing private with no other members, at creation and on toggle to private.
- Message conveys: not discoverable; invite-only; can only invite users sharing another org; cold-start may not grow.

## Acceptance criteria
- [ ] Warning appears when private is selected with no other members (creation + toggle).
- [ ] It is informational only — the action proceeds.

## Affected files
- creation form + `org-manage.tsx`

## Test commands
- **Unit:** _No unit test yet._
  - Lane: `npm test`
  - Single file: `npx vitest run <path>` (add `src/…/<name>.test.{ts,tsx}`)
- **E2E:** _No e2e spec yet._
  - Lane: `npm run test:e2e`
  - Single file: `firebase emulators:exec --project demo-paper --only auth,firestore 'npx playwright test <name>'` (add `e2e/<name>.spec.ts`)
