# ORG-006 — Member listing + role badges

**Domain:** org  
**Status:** Done — `MemberTable` refactored onto shadcn primitives (Table/Avatar/Badge/InputGroup/Empty) preserving the mono/pill aesthetic; component test added.  
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
- **Component (unit) — done (primary lane).** `src/app/(app)/orgs/[orgId]/_components/member-table.test.tsx` renders `MemberTable` (jsdom) and asserts the owned render logic: role→badge mapping with exactly one Admin, the "You" badge only on the viewer's row, join-timestamp formatting (ISO date vs em dash), case-insensitive name/handle search, the no-match `Empty` state, and the "+N more" cap hint (shown/hidden by query and total). No `next/navigation` mock — the component uses no router hooks.
- **e2e — N/A (optional).** A browser pass would only re-verify rendering the component test already covers; the ticket marks it optional, so it is intentionally skipped.

## Test commands
- **Unit:** `npx vitest run "src/app/(app)/orgs/[orgId]/_components/member-table.test.tsx"` (or the full lane, `npm test`).
