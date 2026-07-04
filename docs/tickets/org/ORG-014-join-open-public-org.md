# ORG-014 — Join open public org

**Domain:** org  
**Status:** Partial — needs e2e/integration (unit N/A)  
**Spec:** docs/specs/org/org-joining-invites.md#joining-an-org  
**Depends on:** ORG-001

## Context
For public orgs with the **open** policy, any user can join freely (no approval). Capacity is enforced transactionally.

## Scope / Tasks
- Self-service join for open public orgs, with transaction-based capacity check against the 1000 cap.

## Acceptance criteria
- [x] Any user can join an open public org without approval.
- [x] Join is rejected when the org is at capacity.

## Affected files
- `src/app/api/orgs/[orgId]/join/route.ts`

## Test coverage
- **e2e/integration — needed.** A user self-joins an open public org (no approval); a join is rejected when the org is at the 1000-member cap (transactional capacity check).
- **Unit — not required.** The capacity check is transactional Firestore I/O, not isolatable pure logic.

## Test commands
- **Unit:** _No unit test yet._
  - Lane: `npm test`
  - Single file: `npx vitest run <path>` (add `src/…/<name>.test.{ts,tsx}`)
- **E2E:** _No e2e spec yet._
  - Lane: `npm run test:e2e`
  - Single file: `firebase emulators:exec --project demo-paper --only auth,firestore 'npx playwright test <name>'` (add `e2e/<name>.spec.ts`)
