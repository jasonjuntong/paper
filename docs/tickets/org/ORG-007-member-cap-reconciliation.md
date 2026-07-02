# ORG-007 — Member cap + reconciliation prompt

**Domain:** org  
**Status:** Partial  
**Spec:** docs/specs/org/org-membership.md#membership  
**Depends on:** ORG-001

## Context
Flat cap of 1000 per org. The effective count is **members + pending invites + pending join requests**, projected before any invite/request is created. Priority: members > pending invites > pending join requests. Nothing is ever silently auto-declined.

## Scope / Tasks
- Compute effective count in transactions for join requests (ORG-015) and invites (ORG-016).
- At cap: disable the join-request action (existing pending requests freeze).
- Invites: block creation past available slots; if pending join requests occupy wanted slots, show the **reconciliation prompt** — (1) address requests first, or (2) Admin chooses specific N requests to decline to free slots (declined requesters notified; no cooldown on requests).

## Acceptance criteria
- [x] Effective count = members + pending invites + pending join requests, capped at 1000.
- [x] At cap, join-request action is disabled; pending requests are not auto-declined.
- [ ] Invite creation blocked by requests triggers the two-option reconciliation prompt; chosen declines free slots and notify the requesters.

## Affected files
- `src/app/api/orgs/[orgId]/join/route.ts`
- invite route (ORG-016), join-request route (ORG-015)
