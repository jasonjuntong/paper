# ORG-018 — Invite revocation

**Domain:** org
**Status:** Todo
**Spec:** docs/specs/org/org-joining-invites.md#invites
**Depends on:** ORG-016

## Context
The Admin can view all pending invites and revoke any unused one before it expires. Revoked invites become unusable immediately; revocation imposes no cooldown (the Admin can re-invite freely).

## Scope / Tasks
- List pending invites for the org (wire the currently-display-only count in `org-manage.tsx`).
- Admin revoke action → invite unusable immediately; frees a slot toward the 50-limit and the cap.

## Acceptance criteria
- [ ] Admin can see all pending invites and revoke any unused one.
- [ ] Revoked invites are immediately unusable.
- [ ] Revocation imposes no re-invite cooldown.

## Affected files
- `src/app/api/orgs/[orgId]/invites/[inviteId]/route.ts` (DELETE)
- `src/app/(app)/orgs/[orgId]/_components/org-manage.tsx`
