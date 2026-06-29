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
- [ ] Public org policy can be set to open or request only.
- [ ] Private org policy is forced to invite-only.
- [ ] Invalid combinations are rejected server-side.

## Affected files
- `src/app/api/orgs/[orgId]/route.ts` (PATCH)
