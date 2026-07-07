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

## Rules note (INFRA-003 / N-005)
[INFRA-003](../infra/INFRA-003-firestore-read-rule-hardening.md) gated `adminTransferOffers` to
**Admin-only** reads and deferred the recipient-read exception. This ticket writes the offer doc
(`direction: 'offer'`); if a targeted member reads their own offer via the client SDK, store the
target's uid on it and **un-defer N-005**: add `allow read: if isOrgAdmin(orgId) ||
request.auth.uid == resource.data.<targetUid>` to the `adminTransferOffers` match block, plus
rules-lane tests (target reads own offer → allow; other member → deny). If accept/decline runs
only through the server handler, no rule change is needed. See [N-005](../../nuances.md).

## Affected files
- `src/app/api/orgs/[orgId]/transfer/` (new)
- `firestore.rules` + `tests/rules/firestore-rules.test.ts` (only if the target reads offers via client SDK — see Rules note)
- `adminTransferOffers` subcollection, ORG-023 notifications

## Test commands
- **Unit:** _No unit test yet._
  - Lane: `npm test`
  - Single file: `npx vitest run <path>` (add `src/…/<name>.test.{ts,tsx}`)
- **E2E:** _No e2e spec yet._
  - Lane: `npm run test:e2e`
  - Single file: `firebase emulators:exec --project demo-paper --only auth,firestore 'npx playwright test <name>'` (add `e2e/<name>.spec.ts`)
