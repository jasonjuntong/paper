# ORG-001 — Org creation + invariant

**Domain:** org  
**Status:** Done  
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
- **Unit — done (two files).**
  - `src/app/api/orgs/route.test.ts` — POST handler with mocked `getSession` + `adminFirestore`: 401 (no session), 400 (bad JSON, missing name, and each invalid invariant combo public+invite / private+open / private+request), 201 on each valid combo, creator-as-admin two-doc batch (org `adminId`/counters + member `role: 'admin'`), single commit, mark upper-cased, description defaults to `''`.
  - `src/app/(app)/orgs/_components/create-org-dialog.test.tsx` — form logic: defaults pre-selected (public + by-request, invite-only disabled), invariant coupling (Private forces invite-only + disables public policies, and back), name-required gating (no fetch), submit payload (auto-derived upper-cased mark) → `router.push('/orgs/{id}')`, and error mapping on a failed request.
- **e2e — done.** `e2e/org-creation.spec.ts` — register→verify→login, open the dialog, assert defaults, name-required gate (no nav), UI invariant (Private → invite-only), create a public org, land on `/orgs/{id}` as its Admin.

## Test commands
- **Unit:**
  - Lane: `npm test`
  - Single file: `npx vitest run src/app/api/orgs/route.test.ts` · `npx vitest run "src/app/(app)/orgs/_components/create-org-dialog.test.tsx"`
- **E2E:**
  - Lane: `npm run test:e2e`
  - Single file: `firebase emulators:exec --project demo-paper --only auth,firestore 'npx playwright test org-creation'`
