# ORG-006 — Member listing + role badges

**Domain:** org  
**Status:** Partial — needs a component test for the member table (e2e optional)  
**Spec:** docs/specs/org/org-membership.md#roles-within-an-org  
**Depends on:** ORG-001

## Context
Each org has exactly one Admin and any number of Members. The org detail page lists members with their role and join time (member-only view).

## Scope / Tasks
- Member table with join timestamps and Admin/Member role badges.

## Acceptance criteria
- [x] Members are listed with role badges and join times.
- [x] Exactly one Admin is shown.

## Affected files
- `src/app/(app)/orgs/[orgId]/_components/member-table.tsx`
- `src/app/(app)/orgs/[orgId]/page.tsx`

## Test coverage
- **Component (unit) — needed (primary lane).** `MemberTable` is pure render logic — the ideal component test: given a member list, assert role badges, join-time formatting, exactly-one-Admin, and pagination behavior. This is the main coverage this ticket needs.
- **e2e — optional.** A browser pass would only re-verify rendering the component test already covers; nice-to-have, not required.
