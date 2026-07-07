# INFRA-005 — Accessibility & form-semantics pass

**Domain:** infra (cross-cutting UI)  
**Status:** Todo — should-fix (INFRA-002 Round 1, UI lane)  
**Spec:** docs/design-language.md · `frontend-design` / `shadcn` a11y guidance  
**Depends on:** —

## Context
INFRA-002 Round 1 (UI lane) found accessibility/semantics inconsistencies where the *correct*
pattern already exists elsewhere in the codebase — so these are drift, not unknowns.
`join-org-button.tsx` sets `aria-busy` correctly and `pdf-reader-dialog.tsx` fit buttons use
`aria-pressed`; other components omit them.

## Scope / Tasks
1. **`aria-busy` on submit buttons** (should-fix). Add the spinner+`aria-busy` convention
   (matching `join-org-button.tsx:77`) to: `login-form.tsx:162`, `register-form.tsx:242`,
   `settings-client.tsx:137,340`, `create-org-dialog.tsx:343`, `edit-org-profile.tsx:215`,
   `add-paper-dialog.tsx:764`, `edit-paper-dialog.tsx:269`.
2. **Real `<form>` elements** (nice-to-have). `create-org-dialog.tsx` and `edit-org-profile.tsx`
   submit via a Button `onClick`, so Enter-to-submit and native form semantics are lost — wrap
   fields in `<form onSubmit>` like the other dialogs.
3. **Toggle-group semantics** (nice-to-have). `view-toggle.tsx`, the `Segmented` control in
   `create-org-dialog.tsx`, and `OptionPill` in `org-manage.tsx` lack `aria-pressed` /
   radiogroup roles — add them (pattern already in `pdf-reader-dialog.tsx`).

> If INFRA-006 lands a shared toggle/PasswordInput first, apply these semantics there once
> rather than per-call-site.

## Acceptance criteria
- [ ] Every submit button that shows a loading state also sets `aria-busy` while pending.
- [ ] The org create/edit dialogs submit on Enter via a `<form onSubmit>`.
- [ ] Segmented/toggle controls expose pressed/selected state to assistive tech.
- [ ] No behavior regressions in the affected forms/dialogs.

## Affected files
- `src/components/auth/login-form.tsx`, `register-form.tsx`
- `src/app/(app)/settings/_components/settings-client.tsx`
- `src/app/(app)/orgs/_components/create-org-dialog.tsx`
- `src/app/(app)/orgs/[orgId]/_components/edit-org-profile.tsx`, `org-manage.tsx`
- `src/components/add-paper-dialog.tsx`, `src/app/(app)/library/[paperId]/_components/edit-paper-dialog.tsx`
- `src/app/(app)/library/_components/view-toggle.tsx`

## Test coverage
- **Component (unit) — primary.** Assert `aria-busy` is set while a submit promise is pending
  (behavior we own) and that Enter triggers submit on the org dialogs. Toggle roles are static
  attributes — assert once per shared control, not per call-site.
