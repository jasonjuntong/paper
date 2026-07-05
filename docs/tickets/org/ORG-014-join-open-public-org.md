# ORG-014 — Join open public org

**Domain:** org  
**Status:** Done  
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
- `src/app/(app)/orgs/[orgId]/_components/join-org-button.tsx` (UI polish — adopted the app's standard in-button `Loader2` spinner + `aria-busy`)
- `e2e/org-join-open-public.spec.ts` (new)
- `e2e/helpers/emulator.ts` (new `seedOrg` helper)

## Test coverage
- **e2e — green (`e2e/org-join-open-public.spec.ts`).** A registered user self-joins a seeded open public org through the real Join button → `POST /api/orgs/{id}/join` → member view re-renders. The 1000-cap is asserted twice: the UI gate (disabled Join + "This org is full", driven by `memberCount + inviteCount + requestCount`) and the route's in-transaction cap re-check (a direct authenticated `page.request.post` is rejected with `409 "This org is full"`). Orgs are seeded straight into Firestore via `seedOrg` (owner token) since the non-member page only reads the org doc + the viewer's own member doc.
- **Unit — N/A.** The capacity check is transactional Firestore I/O, not isolatable pure logic.

## Test commands
- **Unit:** N/A (see above).
- **E2E:** `firebase emulators:exec --project demo-paper --only auth,firestore 'npx playwright test org-join-open-public'`
  - Full lane: `npm run test:e2e`
