# ORG-017 — Invite recipient flow (accept/decline)

**Domain:** org  
**Status:** Todo  
**Spec:** docs/specs/org/org-joining-invites.md#invites  
**Depends on:** ORG-016, ORG-023

## Context
The invited user receives an in-app notification and accepts (joins immediately, invite consumed) or declines (invite consumed, Admin notified, 48-hr cooldown before re-invite). Once consumed (accepted/declined/expired), an invite can't be reused. Expiry is whenever the invite's stored `expiresAt` (the Admin-chosen 1–14-day window, ORG-016) has passed.

## Scope / Tasks
- Recipient accept → join org, consume invite.
- Recipient decline → consume invite, notify Admin (ORG-023), start 48-hr cooldown for re-invites to that user.
- Invites past their `expiresAt` are unusable; expiry does **not** trigger cooldown.

## Acceptance criteria
- [ ] Accept joins the org immediately and consumes the invite.
- [ ] Decline consumes the invite, notifies the Admin, and starts the 48-hr cooldown.
- [ ] Invites past `expiresAt` and consumed invites cannot be used; expiry/revocation impose no cooldown.

## Rules note (INFRA-003 / N-005)
[INFRA-003](../infra/INFRA-003-firestore-read-rule-hardening.md) gated `invites` to **Admin-only**
reads and deferred the recipient-read exception to this ticket. If the recipient reads their own
invite via the client SDK (e.g. to render the accept/decline card), **un-defer N-005**: add
`allow read: if isOrgAdmin(orgId) || request.auth.uid == resource.data.recipientUid` (the field
ORG-016 stores) to the `invites` match block, plus rules-lane tests in
`tests/rules/firestore-rules.test.ts` — recipient reads their own invite (allow), a stranger reads
it (deny). If accept/decline goes purely through the server handler (firebase-admin bypasses
rules), no rule change is needed and N-005 stays deferred; note which path was taken.
See [N-005](../../nuances.md).

## Affected files
- `src/app/api/orgs/[orgId]/invites/[inviteId]/route.ts` (new)
- `firestore.rules` + `tests/rules/firestore-rules.test.ts` (only if recipient reads via client SDK — see Rules note)
- ORG-023 notifications

## Test commands
- **Unit:** _No unit test yet._
  - Lane: `npm test`
  - Single file: `npx vitest run <path>` (add `src/…/<name>.test.{ts,tsx}`)
- **E2E:** _No e2e spec yet._
  - Lane: `npm run test:e2e`
  - Single file: `firebase emulators:exec --project demo-paper --only auth,firestore 'npx playwright test <name>'` (add `e2e/<name>.spec.ts`)
