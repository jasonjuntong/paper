# ORG-002 — Edit org name/description

**Domain:** org
**Status:** Partial — verify
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
