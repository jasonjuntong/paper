# ORG-015 — Join requests (submit + admin approve/reject)

**Domain:** org  
**Status:** Partial — submit only  
**Spec:** docs/specs/org/org-joining-invites.md#join-requests-public-orgs-with-request-policy  
**Depends on:** ORG-023, ORG-007

## Context
For public orgs with the **request** policy, users submit join requests and the Admin explicitly approves/rejects each. Requesters are notified of the result. Pending requests carry over if the org goes private. Collision: a user can never have both a pending request and a pending invite for the same org.

## Scope / Tasks
- Submit join request (exists); enforce cap-disable at 1000 effective (ORG-007).
- Admin approve (add member) / reject; notify requester of the result (ORG-023).
- Collision: if the user already has a pending invite, prompt them to accept the invite instead; dismiss → request not created, invite untouched.
- Pending requests persist across public→private toggle.

## Acceptance criteria
- [ ] Admin sees pending requests and can approve (→ member) or reject; requester is notified either way.
- [x] Join-request action disabled at the cap; existing requests freeze (no auto-decline).
- [ ] A user with a pending invite is prompted to accept it instead; no dual pending state ever exists.
- [ ] Pending requests carry over when the org switches to private.

## Affected files
- `src/app/api/orgs/[orgId]/join/route.ts`
- `src/app/api/orgs/[orgId]/requests/` (new, admin approve/reject)
- ORG-023 notifications

## Test commands
- **Unit:** _No unit test yet_ — run the lane with `npm test`; add `src/…/<name>.test.{ts,tsx}` (single file: `npx vitest run <path>`).
- **E2E:** _No e2e spec yet_ — run the lane with `npm run test:e2e`; add `e2e/<name>.spec.ts`.
