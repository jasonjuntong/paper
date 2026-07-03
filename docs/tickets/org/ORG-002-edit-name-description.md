# ORG-002 — Edit org name/description

**Domain:** org  
**Status:** Todo — not started. The `[orgId]` PATCH route and `org-manage.tsx` only handle visibility/join policy; no name/description edit path (route or UI) exists yet.  
**Spec:** docs/specs/org/org-overview.md#org-profile  
**Depends on:** ORG-001

## Context
The Admin can edit the org's name and description after creation.

## Scope / Tasks
- Admin-only edit of `name` (required) and `description` (optional).

## Acceptance criteria
- [ ] Only the Admin can edit name/description.
- [ ] `name` cannot be cleared; `description` may be empty.

## Affected files
- `src/app/api/orgs/[orgId]/route.ts` (PATCH)
- org manage UI (`src/app/(app)/orgs/[orgId]/_components/org-manage.tsx`)

## Test commands
- **Unit:** _No unit test yet_ — run the lane with `npm test`; add `src/…/<name>.test.{ts,tsx}` (single file: `npx vitest run <path>`).
- **E2E:** _No e2e spec yet_ — run the lane with `npm run test:e2e`; add `e2e/<name>.spec.ts`.
