# INFRA-004 — Design-language token conformance sweep

**Domain:** infra (cross-cutting UI)  
**Status:** Done — should-fix (INFRA-002 Round 1, UI lane)  
**Spec:** docs/design-language.md  
**Depends on:** —

## Context
INFRA-002 Round 1 (UI lane, `frontend-design` + `shadcn` conformance) found several components
drifting from `docs/design-language.md` — most notably raw `oklch(...)` values inlined where a
token utility exists, which the design doc explicitly forbids ("never reach for raw oklch
values in components"). Individually minor; together they erode the bespoke mono/pill aesthetic.

## Scope / Tasks
**should-fix**
1. Replace inlined raw `oklch(0.9491 …)` with the `bg-pill` / `hover:bg-pill` token in
   `paper-card.tsx:49`, `org-card.tsx:16`, `paper-table.tsx:47,71`, `view-toggle.tsx:23,36`,
   `section-cards.tsx:34,41`, `paper-actions.tsx:23` (the value equals `--pill`/`--sidebar-accent`).
2. Add `font-mono` to keyword pills — `paper-card.tsx:70`, `continue-reading.tsx:74` (doc pill
   pattern + "keyword chips → Mono").
3. `add-paper-dialog.tsx:169` (`OrgBadges`) — chip uses `bg-muted`; doc: "never use `bg-muted`
   or `bg-secondary` for a chip-shaped element" → use `bg-pill`.

**nice-to-have**
4. `pending-activity.tsx:51` pill uses `rounded px-1.5 py-0.5` instead of the spec
   `rounded-[3px] … py-px`.
5. `section-cards.tsx:34` null footer falls back to a second em-dash (doc: short prose, not
   another em-dash); `:20` stats section label missing `uppercase`.
6. `settings-client.tsx:206` amber banner lacks the prescribed warning-triangle icon + dismiss ✕.
7. `delete-paper-dialog.tsx:88` confirm button inverts the documented reds (solid default → dark
   hover) vs. doc's text-red default → bright fill on hover.
8. Remove dead `font-base` class (not a Tailwind utility) on `paper-card.tsx:61`,
   `paper-table.tsx:77`.

## Acceptance criteria
- [x] No component references a raw `oklch(...)` string where a token utility exists
      (`grep -r "oklch(" src/components src/app | grep -v ui/` returns only intentional cases:
      Plus-circle in `nav-main`/`org-mark`; destructive reds in `paper-actions`/`delete-paper-dialog`/
      `org-manage`; amber notification theme in `settings-client`).
- [x] Keyword/metadata chips use `bg-pill` + `font-mono` + the documented radius/padding.
- [x] No chip uses `bg-muted`/`bg-secondary`.
- [x] Amber banner (icon + dismiss ✕ + ring) and destructive buttons (red-text default →
      bright fill on hover) match the documented patterns.
- [x] Dead `font-base` classes removed.

## Affected files
- `src/components/paper-card.tsx`, `org-card.tsx`, `continue-reading.tsx`, `section-cards.tsx`,
  `pending-activity.tsx`, `add-paper-dialog.tsx`
- `src/app/(app)/library/_components/paper-table.tsx`, `view-toggle.tsx`
- `src/app/(app)/library/[paperId]/_components/paper-actions.tsx`, `delete-paper-dialog.tsx`
- `src/components/settings/settings-client.tsx` (the amber banner lives here, not under
  `app/(app)/settings/` — the ticket's original path had drifted)
- `src/app/(app)/page.tsx` (dashboard — supplies the stats-card prose footer for the
  empty-library case, so the component no longer defaults a null footer to a second em-dash)

## Test coverage
- **Component (unit) — done, banner behavior only.** Most items are pure styling (no logic to
  test — per CLAUDE.md, don't test that a class renders), so the only behavioral surface is the
  amber banner's dismiss ✕. Added `src/components/settings/settings-client.test.tsx`
  (`@testing-library/react` + `user-event`, firebase mocked like the auth-form tests): banner is
  absent initially, appears on a failed notification toggle, and clears when the dismiss ✕ is
  clicked. Full suite green (194 tests, 22 files).
- **E2E — N/A (documented).** No behavior beyond the unit-covered dismiss; the rest is visual
  token conformance verified by the grep gate + a manual visual pass, not a browser flow.

## Verification (done)
- `grep -rn "oklch(" src/components src/app | grep -v ui/` → only the intentional exceptions
  above; no `0.9491_0.0041_91.616` pill value remains.
- `grep -rn "font-base" src/components src/app` → none.
- `grep -n "bg-muted\|bg-secondary" src/components/add-paper-dialog.tsx` → the `OrgBadges` chip
  no longer matches (remaining `bg-muted/*` are surfaces/inputs, not chip-shaped elements).
- `npx tsc --noEmit` clean; `npm test` 194/194. Lint: no new issues in touched files
  (pre-existing errors live in untouched files).
