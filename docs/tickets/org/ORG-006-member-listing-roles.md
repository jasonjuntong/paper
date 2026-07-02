# ORG-006 — Member listing + role badges

**Domain:** org
**Status:** Partial — needs e2e (unit N/A)
**Spec:** docs/specs/org/org-membership.md#roles-within-an-org
**Depends on:** ORG-001

## Context
Each org has exactly one Admin and any number of Members. The org detail page lists members with their role and join time (member-only view).

## Scope / Tasks
- Member table with join timestamps and Admin/Member role badges.

## Acceptance criteria
- [ ] Members are listed with role badges and join times.
- [ ] Exactly one Admin is shown.

## Affected files
- `src/app/(app)/orgs/[orgId]/_components/member-table.tsx`
- `src/app/(app)/orgs/[orgId]/page.tsx`

## Test coverage
- **e2e — needed.** Member roster renders members with role badges and join times, showing exactly one Admin (member-only view).
- **Unit — not required.** Display/formatting only; no isolatable pure logic.
