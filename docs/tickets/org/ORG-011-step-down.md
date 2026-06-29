# ORG-011 — Step Down (request-to-be-admin, expiry→ghost)

**Domain:** org
**Status:** Todo
**Spec:** docs/specs/org/org-membership.md#step-down-admin-initiated-departure
**Depends on:** ORG-010, ORG-013, ORG-023

## Context
Step Down is an Admin intending to leave when other members exist. It sets `status: 'stepdown'` + `stepDownExpiresAt` (7 days) and notifies/warns all members that the org is deleted if no one takes over. During the window only, members can "request to be Admin".

## Scope / Tasks
- Initiate: offer to everyone (default) or specific members; notify + warn all members.
- During window: org operates normally; two handoff paths — accept a transfer offer (ORG-010), or a member "request to be Admin".
- Request matching: if requester has a pending offer → auto-grant; else Admin accepts/declines. One request per member per window; notify result.
- First successful handoff completes Step Down → original Admin becomes Member, all pending offers/requests invalidated, `status` back to `active`.
- Expiry with no handoff → org deleted → Ghost Mode (ORG-013); all members notified.

## Acceptance criteria
- [ ] Step Down sets `status: 'stepdown'` + 7-day expiry and warns all members.
- [ ] "Request to be Admin" is available only during Step Down; auto-grants on matching offer, else Admin decides; one per member.
- [ ] First successful handoff completes and invalidates other pending items; status returns to active.
- [ ] Expiry with no handoff deletes the org into Ghost Mode with notifications.

## Affected files
- `src/app/api/orgs/[orgId]/stepdown/` (new)
- `adminTransferOffers` (`direction: 'request'`), ORG-013, ORG-023
