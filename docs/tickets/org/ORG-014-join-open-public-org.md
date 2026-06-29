# ORG-014 — Join open public org

**Domain:** org
**Status:** Done
**Spec:** docs/specs/org/org-joining-invites.md#joining-an-org
**Depends on:** ORG-001

## Context
For public orgs with the **open** policy, any user can join freely (no approval). Capacity is enforced transactionally.

## Scope / Tasks
- Self-service join for open public orgs, with transaction-based capacity check against the 1000 cap.

## Acceptance criteria
- [ ] Any user can join an open public org without approval.
- [ ] Join is rejected when the org is at capacity.

## Affected files
- `src/app/api/orgs/[orgId]/join/route.ts`
