# ORG-002 — Edit org name/description

**Domain:** org  
**Status:** Done — Admin-only profile edit shipped across the shared `[orgId]` PATCH route and a new `EditOrgProfile` card in the Manage tab. Scope was extended from the literal "name/description" to also cover the org `mark` (the 1–2-letter avatar badge), which is coupled to the name at creation — editing the name without it would leave a stale avatar.  
**Spec:** docs/specs/org/org-overview.md#org-profile  
**Depends on:** ORG-001

## Context
The Admin can edit the org's name and description after creation.

## Scope / Tasks
- Admin-only edit of `name` (required), `mark` (required, upper-cased), and `description` (optional).

## Acceptance criteria
- [x] Only the Admin can edit name/description. (route enforces `adminId === session.uid` → 403 otherwise; Manage tab is admin-only)
- [x] `name` cannot be cleared; `description` may be empty. (Zod `name` min-1 both client + server; `description` accepts `''` and writes it through)

## Test coverage
- **Unit (route):** `src/app/api/orgs/[orgId]/route.test.ts` — PATCH handler with mocked `getSession`/`adminFirestore.runTransaction`: 401 no session, 400 empty body / whitespace name, 403 non-admin, 410 deleted, 404 missing; 200 name+mark+description (mark upper-cased), description cleared to `''`, name-only update, and no-op when unchanged (asserts the `tx.update` payload carries only changed fields).
- **Unit (component):** `src/app/(app)/orgs/[orgId]/_components/edit-org-profile.test.tsx` — populated from props, Save disabled until a field changes (dirty gate), name-required blocks submit, PATCH payload (mark upper-cased) → `router.refresh()`, cleared description sends `''`, server error mapped to inline message.
- **E2E:** `e2e/org-edit-profile.spec.ts` — register→login→create org→Manage tab→edit name+description→Save→server-rendered header heading + description re-render.

## Affected files
- `src/app/api/orgs/[orgId]/route.ts` (PATCH)
- org manage UI (`src/app/(app)/orgs/[orgId]/_components/org-manage.tsx`)

## Test commands
- **Unit:** `src/app/api/orgs/[orgId]/route.test.ts` (route) + `src/app/(app)/orgs/[orgId]/_components/edit-org-profile.test.tsx` (component)
  - Lane: `npm test`
  - Single file: `npx vitest run "src/app/api/orgs/[orgId]/route.test.ts"` / `npx vitest run "src/app/(app)/orgs/[orgId]/_components/edit-org-profile.test.tsx"`
- **E2E:** `e2e/org-edit-profile.spec.ts`
  - Lane: `npm run test:e2e`
  - Single file: `firebase emulators:exec --project demo-paper --only auth,firestore 'npx playwright test org-edit-profile'`
