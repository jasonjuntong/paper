# ORG-001 — Org creation + invariant

**Domain:** org
**Status:** Done
**Spec:** docs/specs/org/org-overview.md#creation
**Depends on:** —

## Context
Any authenticated user can create an org; the creator becomes Admin. Required: `name`. Optional: `description`. Visibility + join policy set at creation, with the visibility↔join-policy invariant enforced (public → open/request; private → invite-only). Form pre-selects public + request.

## Scope / Tasks
- Creation form (name, optional description, visibility, join policy) pre-selecting public + request.
- Server: assign creator as Admin; enforce invariant (reject invalid visibility/policy combos).

## Acceptance criteria
- [ ] Any authenticated user can create an org and becomes its Admin.
- [ ] `name` required, `description` optional.
- [ ] Invariant enforced server-side: public → open|request, private → invite-only.
- [ ] Defaults pre-selected (public + request) but changeable.

## Affected files
- `src/app/api/orgs/route.ts`
- creation form component
