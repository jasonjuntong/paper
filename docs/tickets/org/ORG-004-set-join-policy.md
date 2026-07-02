# ORG-004 — Set/change join policy

**Domain:** org
**Status:** Partial — needs unit + integration/e2e
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
- `src/app/api/orgs/[orgId]/route.ts` (PATCH)

## Test coverage
- **Unit — needed.** Policy-validity-against-visibility is the same pure invariant as ORG-001; unit-test the allowed/forced/rejected combos (ideally the shared validator).
- **Integration/e2e — needed.** Admin-only PATCH enforces the invariant and persists the change; a non-admin or invalid combination is rejected server-side.
