# ORG-010 — Admin transfer offers

**Domain:** org  
**Status:** Todo  
**Spec:** docs/specs/org/org-membership.md#admin-transfer  
**Depends on:** ORG-023

## Context
Admin role hand-off is acceptance-based. The Admin sends transfer offers to one or more members (not themselves); first to accept wins and roles swap, invalidating all other pending offers. Offers expire after 7 days. A plain transfer (Admin stays) differs from Step Down (Admin leaves): if a plain transfer expires unaccepted, nothing happens.

## Scope / Tasks
- Send offers to selected member(s); notify targets (ORG-023).
- Accept (first-wins swap + invalidate others) / decline (notify Admin) / Admin cancel.
- 7-day expiry. Storage: `/orgs/{orgId}/adminTransferOffers/{offerId}` with `direction: 'offer'`.
- Exactly one Admin at all times throughout.

## Acceptance criteria
- [ ] Admin can send offers to members (never self); targets are notified.
- [ ] First acceptance swaps roles and invalidates all other pending offers/requests.
- [ ] Decline notifies the Admin; Admin can cancel pending offers; offers expire at 7 days.
- [ ] Plain-transfer expiry with no acceptance is a no-op (Admin stays).

## Affected files
- `src/app/api/orgs/[orgId]/transfer/` (new)
- `adminTransferOffers` subcollection, ORG-023 notifications

## Test commands
- **Unit:** _No unit test yet._
  - Lane: `npm test`
  - Single file: `npx vitest run <path>` (add `src/…/<name>.test.{ts,tsx}`)
- **E2E:** _No e2e spec yet._
  - Lane: `npm run test:e2e`
  - Single file: `firebase emulators:exec --project demo-paper --only auth,firestore 'npx playwright test <name>'` (add `e2e/<name>.spec.ts`)
