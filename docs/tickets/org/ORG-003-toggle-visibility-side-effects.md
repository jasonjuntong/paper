# ORG-003 — Toggle visibility + side effects

**Domain:** org
**Status:** Partial
**Spec:** docs/specs/org/org-overview.md#visibility
**Depends on:** PAPER-015, ORG-024

## Context
The Admin can toggle visibility anytime. Because join policy depends on visibility and public orgs feed the public paper pool, toggling has two side-effects that must run atomically with the visibility change.

## Scope / Tasks
- **Join-policy transition:** private→public sets policy to **request** (pending invites stay valid); public→private forces **invite-only** (pending join requests carry over).
- **publicOrgIds fan-out (PAPER-015):** private→public adds this org's ID to each shared paper's `publicOrgIds`; public→private removes it.
- Both side-effects fan out across the org's `sharedPapers`.

## Acceptance criteria
- [x] Visibility toggle adjusts join policy per the transition rules; pending invites/requests are preserved as specified.
- [ ] private→public adds the org ID to every shared paper's `publicOrgIds`; public→private removes it.
- [ ] Fan-out is consistent with the org's current `sharedPapers`.

## Affected files
- `src/app/api/orgs/[orgId]/route.ts` (PATCH)
