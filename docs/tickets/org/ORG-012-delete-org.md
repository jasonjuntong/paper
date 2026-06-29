# ORG-012 — Delete org (warnings, seal pending, ghost)

**Domain:** org
**Status:** Todo — UI stub only
**Spec:** docs/specs/org/org-membership.md#deleting-an-org
**Depends on:** ORG-022, ORG-013, ORG-023

## Context
Only the Admin can delete an org. It's intentional and permanent (no restore). On confirm, all members' papers auto-unshare, members are notified, all pending flows are sealed, and the org enters Ghost Mode.

## Scope / Tasks
- Pre-delete warning: "This will delete this Org with Y members and unshare Z papers"; if pending transfer offers exist, also warn they'll be cancelled and suggest transferring instead.
- On confirm: auto-unshare all members' papers (ORG-022 logic); notify all members; invalidate all pending invites, join requests, transfer offers/requests; set `status: 'ghost'` + `deletedAt` (ORG-013).

## Acceptance criteria
- [ ] Only the Admin can delete; warning shows member + paper counts and the pending-offers off-ramp.
- [ ] On confirm, all shared papers are unshared and all members notified.
- [ ] All pending invites/requests/offers are invalidated (nothing flows in or out).
- [ ] Org enters Ghost Mode; deletion is final (no undo).

## Affected files
- `src/app/api/orgs/[orgId]/route.ts` (DELETE) or dedicated route
- `org-manage.tsx` (wire the stubbed button), ORG-013, ORG-022, ORG-023
