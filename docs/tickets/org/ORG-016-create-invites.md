# ORG-016 — Create invites (pool, limits, cap, collision)

**Domain:** org  
**Status:** Todo  
**Spec:** docs/specs/org/org-joining-invites.md#invites  
**Depends on:** ORG-007, ORG-023

## Context
Invites are entirely in-app (no email/URL), targeted at a specific Scolar user who shares ≥1 org with the Admin. Only the Admin creates them; single-use; **Admin-configurable expiry of 1–14 whole days (default 7)**, stored as a concrete `expiresAt` timestamp; max 50 active per org; they count toward the 1000-member cap.

## Scope / Tasks
- Invite UI: pool of users sharing ≥1 org with the Admin, excluding current org members and the Admin; searchable by display name.
- Expiry picker: any whole number of days 1–14, default 7 pre-selected; persist the chosen window as a concrete `expiresAt` timestamp on the invite.
- Create invite as an in-app notification (ORG-023). Enforce: 50-active limit; cap projection (ORG-007) incl. reconciliation prompt when pending requests block slots; 48-hr cooldown after a prior decline to the same user.
- Collision: inviting a user with a pending join request → prompt to approve the request instead; dismiss → invite not created, request untouched.

## Acceptance criteria
- [ ] Only the Admin can invite; recipients must be verified users sharing ≥1 org (pool excludes self + current members).
- [ ] Enforced: ≤50 active invites, 1000-cap projection (with reconciliation prompt), 48-hr post-decline cooldown.
- [ ] Inviting a user with a pending request prompts approval instead; no dual pending state.
- [ ] Invite delivered as an in-app notification; single-use, with an Admin-chosen 1–14-day expiry (default 7) stored as `expiresAt`.

## Affected files
- `src/app/api/orgs/[orgId]/invites/route.ts` (new)
- invite UI, ORG-007, ORG-023
