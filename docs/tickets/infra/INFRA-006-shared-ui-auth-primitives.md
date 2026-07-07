# INFRA-006 — Extract shared UI/auth primitives (DRY)

**Domain:** infra (cross-cutting UI + auth)  
**Status:** Todo — nice-to-have (refactor; INFRA-002 Round 1, UI + auth lanes)  
**Spec:** — (code-quality; anchors CLAUDE.md "Extend, don't edit")  
**Depends on:** —

## Context
Duplication was the most recurring theme across INFRA-002 Round 1. Several UI and auth pieces
are copy-pasted across call-sites; extracting them into shared wrappers (never editing
`src/components/ui/`, per CLAUDE.md) removes divergent-change risk. This ticket is the
cross-cutting DRY roll-up; the org-profile schema/form duplication is owned separately by
**ORG-027** to avoid overlap.

## Scope / Tasks
**UI wrappers**
1. `ReadOnlyInput` / `ReadOnlyTextarea` are byte-duplicated across
   `add-paper-dialog.tsx:115-161` and `edit-paper-dialog.tsx:48-82` (only the "Not set" vs "Not
   extracted" placeholder differs) — extract one shared pair.
2. The "initials/mark from name" algorithm is reimplemented 5× (`org-mark.tsx:4`,
   `member-table.tsx:30`, `create-org-dialog.tsx:44`, `edit-org-profile.tsx:35`,
   `nav-user.tsx:28`) despite an exported `deriveOrgMark` — route all call-sites through it.
3. Three bespoke segmented toggles (`view-toggle.tsx`, `Segmented` in `create-org-dialog.tsx`,
   `OptionPill` in `org-manage.tsx`) styled differently — extract one shared toggle wrapping the
   shadcn primitive (coordinate with INFRA-005's toggle a11y).
4. Destructive-red oklch copy-pasted 4× (`delete-paper-dialog.tsx:88`, `paper-actions.tsx:32`,
   `settings-client.tsx:372`, `org-manage.tsx:241`) — a `DestructiveButton`/`cva` variant
   centralizes it (design doc treats it as inline, so judgement call).
5. `discover-client.tsx` and `orgs-client.tsx` duplicate the `selectTab` URL-mirroring + org-grid
   markup — extract the shared grid/tab logic.

**Auth**
6. `PasswordInput` wrapper for the show/hide `InputGroup` copy-pasted across `login-form.tsx`,
   `register-form.tsx`, `reset-password-form.tsx`.
7. Shared branded-email template + `oobCode` extraction helper (register + forgot-password
   builders duplicate the wrapper/eyebrow/CTA/footer and the `APP_URL` const).
8. Move `SESSION_COOKIE = '__session'` into a pure shared module so `proxy.ts` imports it
   instead of redeclaring the literal (proxy can't import `session.ts` — it pulls firebase-admin).

## Acceptance criteria
- [ ] Read-only field, org-mark, toggle, destructive-button, and password-input logic each live
      in one shared component/util; call-sites import them.
- [ ] `deriveOrgMark` is the only initials algorithm in the tree.
- [ ] `SESSION_COOKIE` is declared once and imported by both `session.ts` and `proxy.ts`.
- [ ] No file under `src/components/ui/` is edited (wrappers only).
- [ ] Pure refactor — existing component/auth tests stay green.

## Affected files
- `src/components/` (org-mark, nav-user, add-paper-dialog, paper-actions, auth/*)
- `src/app/(app)/**/_components/` (library dialogs, org dialogs, discover/orgs clients, view-toggle, org-manage, member-table)
- `src/lib/session.ts` + a new pure `src/lib/auth/cookie.ts` (or similar), `src/proxy.ts`, `src/lib/email.ts`

## Test coverage
- **Component (unit) — primary.** Existing dialog/form tests cover behavior; keep green.
  Add a focused test per new shared component that carries logic (e.g. `PasswordInput` toggles
  visibility, `deriveOrgMark` edge cases if not already tested). Pure style extractions need no
  new test (CLAUDE.md).
