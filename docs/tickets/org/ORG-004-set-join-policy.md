# ORG-004 — Set/change join policy

**Domain:** org  
**Status:** Done  
**Spec:** docs/specs/org/org-joining-invites.md#joining-an-org  
**Depends on:** ORG-001

## Context
The Admin sets the join policy within the bounds of visibility: public orgs choose **open** or **request**; private orgs are **invite-only**.

## Scope / Tasks
- Admin-only join-policy change, validated against current visibility.

## Acceptance criteria
- [x] Public org policy can be set to open or request only.
- [x] Private org policy is forced to invite-only.
- [x] Invalid combinations are rejected server-side.

## Affected files
- `src/lib/orgs/join-policy.ts` (new — shared `isJoinPolicyValid` / `defaultJoinPolicy` + `Visibility`/`JoinPolicy` types)
- `src/app/api/orgs/[orgId]/route.ts` (PATCH — wired to the shared validator)
- `src/app/api/orgs/route.ts` (create — `.refine` wired to the shared validator)

The invariant was extracted from the two inline copies (create route `.refine`, PATCH route
`isPolicyValid`) into `src/lib/orgs/join-policy.ts` so there's a single source of truth — the
ticket's "ideally the shared validator" note. Pure refactor, no behavior change.

## Test coverage
- **Unit — done.** `src/lib/orgs/join-policy.test.ts` covers the pure validator across all six
  `visibility × policy` combos (2 valid public, 1 valid private, 3 rejected) + `defaultJoinPolicy`.
  `src/app/api/orgs/[orgId]/route.test.ts` (`PATCH — join policy invariant` block) covers the
  handler branching + `tx.update` payload: allowed public switch, rejected invalid combos (400,
  no write), visibility-carry (public→private forces invite, private→public falls back to request).
- **E2E — done.** `e2e/org-join-policy.spec.ts` drives the real Manage-tab pills → PATCH → Firestore
  emulator: switch policy, assert persistence across a reload, and the visibility→policy UI coupling
  (public-only pills disabled when private).
- **Integration — N/A.** The admin-only + invariant enforcement is HTTP-level route logic fully
  covered by the mocked-handler unit lane; the e2e exercises the persisted round trip.

## Test commands
- **Unit:**
  - Lane: `npm test`
  - Single file: `npx vitest run src/lib/orgs/join-policy.test.ts "src/app/api/orgs/[orgId]/route.test.ts"`
- **E2E:**
  - Lane: `npm run test:e2e`
  - Single file: `firebase emulators:exec --project demo-paper --only auth,firestore 'npx playwright test org-join-policy'`
