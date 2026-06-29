# ORG-009 — Leave org (+ auto-unshare; sole-admin delete)

**Domain:** org
**Status:** Todo
**Spec:** docs/specs/org/org-membership.md#leaving-an-org
**Depends on:** ORG-022, ORG-013, ORG-023

## Context
A Member can leave anytime; their shared papers auto-unshare from that org. The Admin cannot leave directly while other members exist (must Step Down — ORG-011). Exception: a sole-member Admin can leave directly, which auto-deletes the org into Ghost Mode.

## Scope / Tasks
- Member leave action with auto-unshare (ORG-022 logic).
- Block direct leave for an Admin who has other members (route them to Step Down).
- Sole-member Admin leave → org auto-deletes → Ghost Mode (ORG-013).

## Acceptance criteria
- [ ] A Member can leave; their shared papers are unshared from the org with counters/flags maintained.
- [ ] An Admin with other members cannot leave directly (directed to Step Down).
- [ ] A sole-member Admin leaving auto-deletes the org into Ghost Mode.

## Affected files
- `src/app/api/orgs/[orgId]/leave/route.ts` (new)
- reuses ORG-022, ORG-013
