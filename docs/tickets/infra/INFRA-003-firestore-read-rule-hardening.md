# INFRA-003 — Firestore read-rule hardening

**Domain:** infra (security rules)  
**Status:** Todo — **security, should-fix** (first actionable finding from INFRA-002 Round 1)  
**Spec:** docs/specs/org/org-papers-permissions.md#permissions-summary  
**Depends on:** — · relates to [ORG-025](../org/ORG-025-security-rules-indexes.md) (recurring rules ticket)

## Context
INFRA-002 Round 1 (rules/indexes lane) found two over-permissive **read** rules in
`firestore.rules`. They are latent today — per nuance **N-004** the client SDK never reads
these paths (all privileged access is server-side via `firebase-admin`) — but the rules are
the app's only client-facing gate, so they should match the permissions table as
defense-in-depth before any client read surface ships.

## Scope / Tasks
1. **Public-org read requires auth** (`firestore.rules:33`). Today:
   `allow read: if resource.data.visibility == 'public' || isOrgMember(orgId)` — the public
   branch has **no `isSignedIn()` guard**, so an unauthenticated client can read public org
   docs. The spec scopes browsing to *authenticated* users, and the sibling `sharedPapers`
   rule (`:40`) already gates on `isSignedIn() && isPublicOrg(orgId)`. Add `isSignedIn()`:
   `allow read: if isOrgMember(orgId) || (isSignedIn() && resource.data.visibility == 'public')`.
2. **Restrict moderation subcollections** (`firestore.rules:46-48`). The `{sub=**}` catch-all
   grants **every member** read on `invites`, `joinRequests`, and `adminTransferOffers`, which
   are Admin-moderation surfaces (join requests "surface to the Admin"), not member-visible.
   Split the catch-all: keep `members` member-readable; gate `invites`/`joinRequests`/
   `adminTransferOffers` to Admins (or to the target recipient for invites/offers). Confirm
   against the permissions table before choosing the predicate.
3. **Drop redundant `allow write: if false`** in the four match blocks (`:34,:41,:48`) — the
   terminal `/{document=**}` deny already covers unmatched writes. Keep or drop for clarity,
   but do so consistently (Fowler: Duplicated Code — judgement call).
4. **Note (optional):** `isPublicOrg()` issues a billed `get()` per `sharedPapers` read
   (`:22,:40`) — acceptable now; revisit only if list reads scale.

## Acceptance criteria
- [ ] Unauthenticated read of a public org doc is **denied**; authenticated read still allowed.
- [ ] Non-admin members can no longer read `invites`/`joinRequests`/`adminTransferOffers`;
      admins (and any documented recipient) still can.
- [ ] `members` reads unchanged for members; private-org reads still member-only.
- [ ] Rule tests cover the new gates **plus** the two branches Round 1 flagged as untested:
      a member reading a *public* org's `sharedPapers`, and an unauthenticated read of a
      *private* org's `sharedPapers`.

## Affected files
- `firestore.rules`
- `tests/rules/firestore-rules.test.ts`

## Test coverage
- **Rules lane (primary).** Extend `tests/rules/firestore-rules.test.ts`: assert the auth
  guard on public-org reads, the admin-vs-member split on moderation subcollections, and the
  two previously-uncovered `sharedPapers` branches. Unit/e2e N/A — rules are exercised only
  by the emulator rules lane.
