# ORG-001 — Org creation + invariant

**Domain:** org  
**Status:** Partial — needs unit + e2e  
**Spec:** docs/specs/org/org-overview.md#creation  
**Depends on:** —

## Context
Any authenticated user can create an org; the creator becomes Admin. Required: `name`. Optional: `description`. Visibility + join policy set at creation, with the visibility↔join-policy invariant enforced (public → open/request; private → invite-only). Form pre-selects public + request.

## Scope / Tasks
- Creation form (name, optional description, visibility, join policy) pre-selecting public + request.
- Server: assign creator as Admin; enforce invariant (reject invalid visibility/policy combos).

## Acceptance criteria
- [x] Any authenticated user can create an org and becomes its Admin.
- [x] `name` required, `description` optional.
- [x] Invariant enforced server-side: public → open|request, private → invite-only.
- [x] Defaults pre-selected (public + request) but changeable.

## Affected files
- `src/app/api/orgs/route.ts`
- creation form component

## Test coverage
- **Unit — needed.** The visibility↔join-policy invariant (public → open|request, private → invite-only) is pure and should be unit-tested across valid/invalid combos.
- **e2e — needed.** Create an org → creator becomes Admin; `name` required / `description` optional; defaults pre-selected (public + request) but changeable.

## Test commands
- **Unit:** _No unit test yet_ — run the lane with `npm test`; add `src/…/<name>.test.{ts,tsx}` (single file: `npx vitest run <path>`).
- **E2E:** _No e2e spec yet_ — run the lane with `npm run test:e2e`; add `e2e/<name>.spec.ts`.
