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

## Affected files
- `src/app/api/orgs/[orgId]/invites/[inviteId]/route.ts` (new)
- ORG-023 notifications
