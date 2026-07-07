# INFRA-004 — Design-language token conformance sweep

**Domain:** infra (cross-cutting UI)  
**Status:** Todo — should-fix (INFRA-002 Round 1, UI lane)  
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
- [ ] No component references a raw `oklch(...)` string where a token utility exists
      (`grep -r "oklch(" src/components src/app | grep -v ui/` returns only intentional cases).
- [ ] Keyword/metadata chips use `bg-pill` + `font-mono` + the documented radius/padding.
- [ ] No chip uses `bg-muted`/`bg-secondary`.
- [ ] Amber banner and destructive buttons match the documented patterns.
- [ ] Dead `font-base` classes removed.

## Affected files
- `src/components/paper-card.tsx`, `org-card.tsx`, `continue-reading.tsx`, `section-cards.tsx`,
  `pending-activity.tsx`, `add-paper-dialog.tsx`
- `src/app/(app)/library/_components/paper-table.tsx`, `view-toggle.tsx`
- `src/app/(app)/library/[paperId]/_components/paper-actions.tsx`, `delete-paper-dialog.tsx`
- `src/app/(app)/settings/_components/settings-client.tsx`

## Test coverage
- **Component (unit) — where behavior exists.** Most items are pure styling (no logic to test —
  per CLAUDE.md, don't test that a class renders). Add assertions only where a token choice is
  conditional (e.g. the amber banner's dismiss button appears/disappears). Primary verification
  is the grep gate above + a visual pass.
