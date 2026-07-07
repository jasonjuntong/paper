# ORG-027 — Org route + profile-form consolidation

**Domain:** org  
**Status:** Todo — nice-to-have (refactor; INFRA-002 Round 1, org + UI lanes)  
**Spec:** docs/specs/org/org-overview.md#org-profile  
**Depends on:** [ORG-002](ORG-002-edit-name-description.md), [ORG-004](ORG-004-set-join-policy.md)

## Context
ORG-004 already extracted the visibility↔join-policy invariant into
`src/lib/orgs/join-policy.ts`, but INFRA-002 Round 1 found the **profile** half of the org
schema still duplicated across the create route, the PATCH route, and both dialogs — a change
to any limit needs edits in up to four places (Fowler: Duplicated Code / Divergent Change).

## Scope / Tasks
1. **Shared org-profile schema** — `NAME_MAX`/`MARK_MAX`/`DESCRIPTION_MAX` and the
   `name`/`mark`/`description` Zod fields are copy-pasted in `src/app/api/orgs/route.ts:7-22`
   and `src/app/api/orgs/[orgId]/route.ts:14-32` (the PATCH file literally comments "mirror the
   create route"). Extract the field limits + a reusable Zod shape into `join-policy.ts` (or a
   new `src/lib/orgs/profile.ts`) and wire both routes to it.
2. **Shared profile form** — `create-org-dialog.tsx` and `edit-org-profile.tsx` duplicate the
   same schema + the entire name/mark/description form block. Extract a shared `OrgProfileFields`
   (or a small form component) so create and edit compose it.
3. **Import the shared `JoinPolicy` type** in `src/app/api/orgs/[orgId]/join/route.ts:42`
   instead of the inline `as 'open' | 'request' | 'invite'`.
4. **Add `export const runtime = 'nodejs'`** to `src/app/api/orgs/route.ts` for consistency
   with both sibling routes (it uses `adminFirestore` too; works via the Node default today).

## Acceptance criteria
- [ ] Field limits + profile Zod shape live in one module; create + PATCH import them (no
      duplicated constants).
- [ ] Create and edit dialogs render the profile fields from one shared component.
- [ ] `join/route.ts` uses the imported `JoinPolicy` type.
- [ ] Create route declares the Node runtime.
- [ ] Pure refactor — no behavior change; existing org unit/e2e green.

## Affected files
- `src/lib/orgs/join-policy.ts` (or new `src/lib/orgs/profile.ts`)
- `src/app/api/orgs/route.ts`, `src/app/api/orgs/[orgId]/route.ts`, `src/app/api/orgs/[orgId]/join/route.ts`
- `src/app/(app)/orgs/_components/create-org-dialog.tsx`, `src/app/(app)/orgs/[orgId]/_components/edit-org-profile.tsx`

## Test coverage
- **Unit — primary.** The existing `route.test.ts` (create + PATCH) and the two dialog
  component tests already assert the behavior; keep them green through the refactor. Add a
  focused test for the shared schema module if it gains logic. e2e N/A — no behavior change.
